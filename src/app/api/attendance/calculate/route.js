// src/app/api/attendance/calculate/route.js
import { prisma } from '@/lib/prisma'
import { calculateAttendancePenalty, resolveLocationCode } from '@/lib/attendanceCalculator'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const body = await req.json()
    const { empId, date, clockInTime, clockOutTime } = body

    if (!empId) {
      return Response.json({ error: 'empId is required' }, { status: 400 })
    }

    // 1. Ambil data karyawan dari DB untuk mendapatkan lokasi kerja, departemen, dan gaji pokok
    let emp = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: {
        id: true,
        name: true,
        location: true,
        dept: true,
        workLocationCode: true,
        salary: true,
      },
    })

    // Fallback jika empId adalah user.id yang menunjuk ke employee lain
    if (!emp) {
      const user = await prisma.user.findUnique({
        where: { id: Number(empId) },
        select: { employeeId: true, dept: true },
      })
      if (user?.employeeId) {
        emp = await prisma.employee.findUnique({
          where: { id: user.employeeId },
          select: {
            id: true,
            name: true,
            location: true,
            dept: true,
            workLocationCode: true,
            salary: true,
          },
        })
      }
    }

    const locRaw = emp?.workLocationCode || emp?.location || 'HO'
    const locCode = resolveLocationCode(locRaw, emp?.dept)

    // 2. Jalankan mesin kalkulasi presensi terparameterisasi
    const result = await calculateAttendancePenalty({
      clockInTime: clockInTime || null,
      date: date || new Date().toISOString().slice(0, 10),
      locationCode: locCode,
      locationName: locRaw,
      deptName: emp?.dept,
      basicSalary: emp?.salary ? Number(emp.salary) : 0,
    })

    return Response.json({
      success: true,
      empId: Number(empId),
      employeeName: emp?.name || `Employee #${empId}`,
      date: date || new Date().toISOString().slice(0, 10),
      clockInTime: clockInTime || null,
      clockOutTime: clockOutTime || null,
      status: result.status,
      lateMinutes: result.lateMinutes || 0,
      penaltyAmount: result.penaltyAmount || 0,
      isHalfDayCut: !!result.isHalfDayCut,
      penaltyLabel: result.penaltyLabel || (result.status === 'Present' ? 'Tepat Waktu' : '-'),
      scheduledStart: result.scheduledStart || '09:00',
      locationName: result.locationName || locRaw,
      locationCode: result.locationCode || locCode,
      isOffDay: !!result.isOffDay,
    })
  } catch (err) {
    console.error('Error calculating attendance penalty:', err)
    return Response.json(
      { error: 'calculation_failed', details: err?.message },
      { status: 500 }
    )
  }
}
