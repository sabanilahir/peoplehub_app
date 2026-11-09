// src/app/api/payroll/ho-calculator/route.js
import { prisma } from '@/lib/prisma'
import { getCutoffDateRange } from '@/lib/odooPayrollService'
import { getWorkingDaysFromDb, calculateWorkingDays } from '@/lib/workdayCalculator'
import {
  calcHoOvertimeRate,
  calcHoOvertimeFee,
  calcHoHalfDayDeduction,
  calcHoSickLeaveDeduction,
  calcHoUnpaidLeaveDeduction,
  calcHoProratedSalary,
  calculateHoFullPayroll,
  parseOvertimeDuration,
} from '@/lib/hoPayrollEngine'

export const dynamic = 'force-dynamic'

/**
 * Helper untuk menghitung hari kerja aktif antara 2 tanggal (inklusif) untuk HO
 */
async function countActiveWorkingDays(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return 0
  const result = await getWorkingDaysFromDb({
    startDate,
    endDate,
    workLocationCode: 'ho',
  })
  return result.workingDays || 0
}

/**
 * GET /api/payroll/ho-calculator
 * Mengambil rekapitulasi 6 aturan payroll HO secara komprehensif untuk data riil karyawan
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    let dateFrom = searchParams.get('dateFrom')
    let dateTo = searchParams.get('dateTo')
    const empIdParam = searchParams.get('empId')
    const overrideWorkingDays = searchParams.get('workingDays')

    // 1. Tentukan rentang cut-off jika tidak diberikan
    let rangeLabel = ''
    if (!dateFrom || !dateTo) {
      const defRange = getCutoffDateRange()
      dateFrom = defRange.dateFrom
      dateTo = defRange.dateTo
      rangeLabel = defRange.label
    } else {
      rangeLabel = `${dateFrom} s/d ${dateTo}`
    }

    // 2. Hitung hari kerja efektif HO (Senin-Jumat dikurangi libur nasional)
    const workDayInfo = await getWorkingDaysFromDb({
      startDate: dateFrom,
      endDate: dateTo,
      workLocationCode: 'ho',
    })

    const workingDays = overrideWorkingDays ? Number(overrideWorkingDays) : (workDayInfo.workingDays || 22)

    // 3. Ambil data lembur periode ini (hanya yang Approved)
    const overtimeRecords = await prisma.overtimeRecord.findMany({
      where: {
        date: { gte: dateFrom, lte: dateTo },
        status: 'Approved',
      },
      include: {
        employee: { select: { id: true, name: true, nik: true, salary: true, location: true, workLocationCode: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    // Kelompokkan lembur per karyawan
    const otByEmp = new Map()
    overtimeRecords.forEach((ot) => {
      if (!otByEmp.has(ot.empId)) otByEmp.set(ot.empId, [])
      otByEmp.get(ot.empId).push(ot)
    })

    const empIdsWithOvertime = [...new Set(overtimeRecords.map((o) => o.empId))]

    // 4. Ambil data izin/cuti dalam periode ini
    const leaveRecords = await prisma.leave.findMany({
      where: {
        status: 'Approved',
        OR: [
          { startDate: { lte: dateTo }, endDate: { gte: dateFrom } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        leaveType: true,
      },
    })

    // Kelompokkan leave per empId (link melalui userId atau user.employeeId)
    const leavesByEmp = new Map()
    leaveRecords.forEach((lv) => {
      const eId = lv.user?.employeeId || lv.userId
      if (!leavesByEmp.has(eId)) leavesByEmp.set(eId, [])
      leavesByEmp.get(eId).push(lv)
    })

    const empIdsWithLeave = [...new Set(leaveRecords.map((lv) => lv.user?.employeeId || lv.userId).filter(Boolean))]

    // 5. Ambil seluruh karyawan aktif (HO dan karyawan lain yang memiliki lembur/cuti di periode ini)
    let empWhere = {}
    if (empIdParam && empIdParam !== 'all') {
      empWhere = {
        status: 'Active',
        id: Number(empIdParam),
      }
    } else {
      empWhere = {
        status: 'Active',
        OR: [
          { workLocationCode: 'ho' },
          { location: { contains: 'Head Office', mode: 'insensitive' } },
          { location: { contains: 'HO', mode: 'insensitive' } },
          ...(empIdsWithOvertime.length > 0 ? [{ id: { in: empIdsWithOvertime } }] : []),
          ...(empIdsWithLeave.length > 0 ? [{ id: { in: empIdsWithLeave } }] : []),
        ],
      }
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        nik: true,
        name: true,
        dept: true,
        position: true,
        location: true,
        workLocationCode: true,
        salary: true,
        joinDate: true,
        endDate: true,
      },
      orderBy: { name: 'asc' },
    })

    // Ambil daftar seluruh karyawan aktif (untuk pilihan modal input lembur)
    const allEmployees = await prisma.employee.findMany({
      where: { status: 'Active' },
      select: {
        id: true,
        nik: true,
        name: true,
        dept: true,
        position: true,
        location: true,
        workLocationCode: true,
        salary: true,
      },
      orderBy: { name: 'asc' },
    })

    // 7. Hitung perhitungan per karyawan menggunakan hoPayrollEngine
    const calculatedRows = []
    const allHalfDayEntries = []
    const allSickEntries = []
    const allUnpaidEntries = []
    const allProrateEntries = []

    for (const emp of employees) {
      const rawSalary = Number(emp.salary) || 0
      const basic = Math.round(rawSalary * 0.75)
      const transport = Math.round(rawSalary * 0.15)
      const kpi = Math.round(rawSalary * 0.10)

      // Cek Overtime
      const empOvertimes = otByEmp.get(emp.id) || []

      // Cek Leaves
      const empLeaves = leavesByEmp.get(emp.id) || []
      let halfDayCount = 0
      let sickDays = 0
      let hasValidDoctorCert = true
      let unpaidDays = 0

      empLeaves.forEach((lv) => {
        const typeLower = (lv.typeName || lv.leaveType?.name || '').toLowerCase()
        const days = Number(lv.days) || 1

        if (typeLower.includes('setengah')) {
          halfDayCount += days
          allHalfDayEntries.push({
            empId: emp.id,
            name: emp.name,
            date: lv.startDate,
            days,
            salaryGross: rawSalary,
            basicSalary: basic,
            transportAllowance: transport,
            kpiAllowance: kpi,
            fullDayRate: Math.round(rawSalary / workingDays),
            halfDayRate: Math.round((rawSalary / workingDays) / 2),
            deduction: Math.round(((rawSalary / workingDays) / 2) * days),
            note: lv.note || 'Izin Setengah Hari',
          })
        } else if (typeLower.includes('sakit')) {
          const hasDoc = Boolean(lv.attachment && String(lv.attachment).trim().length > 0)
          if (!hasDoc) {
            hasValidDoctorCert = false
            unpaidDays += days
            allUnpaidEntries.push({
              empId: emp.id,
              name: emp.name,
              date: lv.startDate,
              days,
              salaryGross: rawSalary,
              fullDayRate: Math.round(rawSalary / workingDays),
              deduction: Math.round((rawSalary / workingDays) * days),
              reason: 'Sakit tanpa surat dokter (dialihkan ke Unpaid)',
            })
          } else {
            sickDays += days
            allSickEntries.push({
              empId: emp.id,
              name: emp.name,
              date: lv.startDate,
              days,
              salaryGross: rawSalary,
              basicSalary: basic,
              transportAllowance: transport,
              kpiAllowance: kpi,
              transportPerDay: Math.round(transport / workingDays),
              deduction: Math.round((transport / workingDays) * days),
              attachment: lv.attachment,
              doctorCertValid: true,
              note: lv.note || 'Surat Sakit Terverifikasi',
            })
          }
        } else if (typeLower.includes('unpaid') || typeLower.includes('potong gaji')) {
          unpaidDays += days
          allUnpaidEntries.push({
            empId: emp.id,
            name: emp.name,
            date: lv.startDate,
            days,
            salaryGross: rawSalary,
            fullDayRate: Math.round(rawSalary / workingDays),
            deduction: Math.round((rawSalary / workingDays) * days),
            reason: lv.note || 'Izin Potong Gaji (Unpaid Leave)',
          })
        }
      })

      // Cek Prorata Join Tengah Bulan
      let isMidMonthJoin = false
      let joinActiveDays = null
      if (emp.joinDate && emp.joinDate >= dateFrom && emp.joinDate <= dateTo) {
        isMidMonthJoin = true
        joinActiveDays = await countActiveWorkingDays(emp.joinDate, dateTo)
        const prorateResult = calcHoProratedSalary(rawSalary, workingDays, joinActiveDays)
        allProrateEntries.push({
          empId: emp.id,
          name: emp.name,
          type: 'Join Tengah Bulan',
          joinDate: emp.joinDate,
          endDate: null,
          salaryGross: rawSalary,
          workingDays,
          activeWorkingDays: joinActiveDays,
          proratedGross: prorateResult.proratedSalary,
          dailyRate: prorateResult.dailyRate,
          description: `Join pada ${emp.joinDate}, menjalani ${joinActiveDays} hari kerja aktif dari ${workingDays} hari.`,
        })
      }

      // Cek Prorata Resign Tengah Bulan
      let isMidMonthResign = false
      let resignActiveDays = null
      if (emp.endDate && emp.endDate >= dateFrom && emp.endDate <= dateTo) {
        isMidMonthResign = true
        resignActiveDays = await countActiveWorkingDays(dateFrom, emp.endDate)
        const prorateResult = calcHoProratedSalary(rawSalary, workingDays, resignActiveDays)
        allProrateEntries.push({
          empId: emp.id,
          name: emp.name,
          type: 'Resign Tengah Bulan',
          joinDate: null,
          endDate: emp.endDate,
          salaryGross: rawSalary,
          workingDays,
          activeWorkingDays: resignActiveDays,
          proratedGross: prorateResult.proratedSalary,
          dailyRate: prorateResult.dailyRate,
          description: `Resign efektif ${emp.endDate}, menjalani ${resignActiveDays} hari kerja aktif dari ${workingDays} hari.`,
        })
      }

      // Hitung menyeluruh
      const full = calculateHoFullPayroll({
        employee: emp,
        grossSalary: rawSalary,
        basicSalary: basic,
        transportAllowance: transport,
        kpiAllowance: kpi,
        workingDays,
        overtimeEntries: empOvertimes,
        halfDayCount,
        sickLeaveDays: sickDays,
        hasValidDoctorCert,
        unpaidDays,
        isMidMonthJoin,
        joinActiveDays,
        isMidMonthResign,
        resignActiveDays,
      })

      calculatedRows.push({
        empId: emp.id,
        nik: emp.nik,
        name: emp.name,
        dept: emp.dept || 'Head Office',
        position: emp.position || 'Staff',
        joinDate: emp.joinDate,
        endDate: emp.endDate,
        ...full,
      })
    }

    // Hitung ringkasan statistik
    const stats = {
      totalEmployees: calculatedRows.length,
      workingDays,
      totalGrossSum: calculatedRows.reduce((s, r) => s + r.grossSalary, 0),
      totalOvertimeSum: calculatedRows.reduce((s, r) => s + r.totalOvertimeFee, 0),
      totalHalfDayDeductionSum: calculatedRows.reduce((s, r) => s + r.halfDayDeduction, 0),
      totalSickDeductionSum: calculatedRows.reduce((s, r) => s + r.sickLeaveDeduction, 0),
      totalUnpaidDeductionSum: calculatedRows.reduce((s, r) => s + r.unpaidLeaveDeduction, 0),
      totalNetPaySum: calculatedRows.reduce((s, r) => s + r.netBeforeTaxAndBpjs, 0),
    }

    return Response.json({
      success: true,
      range: {
        dateFrom,
        dateTo,
        label: rangeLabel,
        totalCalendarDays: workDayInfo.totalCalendarDays,
        totalWeekendDays: workDayInfo.totalWeekendDays,
        totalHolidayDays: workDayInfo.totalHolidayDays,
        workingDays,
      },
      stats,
      employees: calculatedRows,
      allEmployees,
      tables: {
        rekapPayroll: calculatedRows,
        overtimes: overtimeRecords,
        halfDays: allHalfDayEntries,
        sickLeaves: allSickEntries,
        unpaidLeaves: allUnpaidEntries,
        prorates: allProrateEntries,
      },
    })
  } catch (error) {
    console.error('[API /api/payroll/ho-calculator GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/payroll/ho-calculator
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    return Response.json({ success: true, message: `Action ${action || 'default'} diterima.` })
  } catch (error) {
    console.error('[API /api/payroll/ho-calculator POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
