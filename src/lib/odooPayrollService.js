// src/lib/odooPayrollService.js
import { prisma } from './prisma.js'
import {
  getSalaryBreakdownConfig,
  getEmployeeAllowanceOverrides,
  calculateSalaryBreakdown,
} from './odooWageService.js'

/**
 * Menghitung rentang tanggal cut-off presensi (26 bulan lalu s/d 25 bulan berjalan)
 * @param {string|Date} [dateRef] - Tanggal acuan (default hari ini)
 * @returns {{ dateFrom: string, dateTo: string, label: string }}
 */
export function getCutoffDateRange(dateRef) {
  const d = dateRef ? new Date(dateRef) : new Date()
  const year = d.getFullYear()
  const month = d.getMonth() // 0-11
  const day = d.getDate()

  let startYear, startMonth, endYear, endMonth

  if (day >= 26) {
    // Sedang berada di siklus berjalan menuju tanggal 25 bulan depan
    startYear = year
    startMonth = month
    const nextDate = new Date(year, month + 1, 1)
    endYear = nextDate.getFullYear()
    endMonth = nextDate.getMonth()
  } else {
    // Sedang berada sebelum tanggal 26, berarti cut-off saat ini adalah 26 bulan lalu s/d 25 bulan ini
    const prevDate = new Date(year, month - 1, 1)
    startYear = prevDate.getFullYear()
    startMonth = prevDate.getMonth()
    endYear = year
    endMonth = month
  }

  const pad = (n) => String(n).padStart(2, '0')
  const dateFrom = `${startYear}-${pad(startMonth + 1)}-26`
  const dateTo = `${endYear}-${pad(endMonth + 1)}-25`

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]

  const label = `26 ${monthNames[startMonth]} ${startYear} - 25 ${monthNames[endMonth]} ${endYear}`

  return { dateFrom, dateTo, label, periodKey: `${endYear}-${pad(endMonth + 1)}` }
}

/**
 * Mengambil dan mengagregasi data presensi cut-off untuk seluruh karyawan
 */
export async function aggregateCutoffAttendance({ dateFrom, dateTo }) {
  // 1. Ambil seluruh karyawan aktif
  const employees = await prisma.employee.findMany({
    where: { status: 'Active' },
    select: {
      id: true,
      odoo_id: true,
      nik: true,
      name: true,
      dept: true,
      location: true,
      workLocationCode: true,
      salary: true,
    },
    orderBy: { name: 'asc' },
  })

  // 2. Ambil seluruh record presensi dalam rentang tanggal cut-off
  const attendances = await prisma.attendance.findMany({
    where: {
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    orderBy: { date: 'asc' },
  })

  // 3. Ambil konfigurasi reward per lokasi dari workLocationConfig
  const configs = await prisma.workLocationConfig.findMany({ where: { active: true } })
  const configMap = new Map(configs.map((c) => [c.locationCode, c]))
  const hoConfig = configs.find((c) => c.locationCode === 'ho') || configs[0]

  // 3b. Ambil konfigurasi rasio gaji dan override tunjangan per karyawan
  const salaryConfig = await getSalaryBreakdownConfig()
  const overrides = await getEmployeeAllowanceOverrides() || {}

  // Kelompokkan presensi per empId
  const attByEmp = new Map()
  for (const att of attendances) {
    if (!attByEmp.has(att.empId)) {
      attByEmp.set(att.empId, [])
    }
    attByEmp.get(att.empId).push(att)
  }

  // 4. Hitung rekap per karyawan
  const summaryList = employees.map((emp) => {
    const records = attByEmp.get(emp.id) || []
    let presentDays = 0
    let lateDays = 0
    let lateMinutes = 0
    let totalPenalty = 0
    let halfDayCutCount = 0
    let absentDays = 0
    let leaveDays = 0

    records.forEach((r) => {
      if (r.status === 'Present') presentDays++
      else if (r.status === 'Late') {
        lateDays++
        lateMinutes += Number(r.lateMinutes) || 0
        totalPenalty += Number(r.penaltyAmount) || 0
        if (r.note && r.note.toLowerCase().includes('setengah hari')) {
          halfDayCutCount++
        }
      } else if (r.status === 'Absent') absentDays++
      else if (r.status === 'Leave') leaveDays++
    })

    // Hitung reward kehadiran (syarat: tidak ada telat, tidak ada absent, tidak ada leave)
    const locCode = emp.workLocationCode || 'ho'
    const locConf = configMap.get(locCode) || hoConfig
    const rewardBase = locConf ? Number(locConf.rewardAmount) || 0 : 0
    let isEligibleReward = false
    let rewardAmount = 0

    if (records.length > 0 && rewardBase > 0) {
      if (lateDays === 0 && absentDays === 0 && leaveDays === 0) {
        isEligibleReward = true
        rewardAmount = rewardBase
      }
    }

    // Hitung breakdown komponen gaji (Basic 75%, Transport 15%, KPI 10%)
    const empOverride = overrides[emp.id] || overrides[String(emp.id)] || null
    const breakdown = calculateSalaryBreakdown(
      emp.salary,
      salaryConfig,
      {
        locationCode: locCode,
        employeeOverride: empOverride,
      }
    )

    return {
      empId: emp.id,
      odoo_id: emp.odoo_id ? Number(emp.odoo_id) : null,
      hasOdoo: !!emp.odoo_id,
      nik: emp.nik,
      name: emp.name,
      dept: emp.dept || 'General',
      location: emp.location || 'Head Office',
      locationCode: locCode,
      dateFrom,
      dateTo,
      // Gaji & Tunjangan
      salary: Number(emp.salary) || 0,
      basicSalary: breakdown.basicSalary,
      transportAllowance: breakdown.transportAllowance,
      kpiAllowance: breakdown.kpiAllowance,
      grossSalary: breakdown.grossSalary,
      enableTransport: breakdown.enableTransport,
      enableKpi: breakdown.enableKpi,
      isOverridden: breakdown.isOverridden,
      // Presensi
      attendanceCount: records.length,
      presentDays,
      lateDays,
      lateMinutes,
      totalPenalty,
      halfDayCutCount,
      absentDays,
      leaveDays,
      isEligibleReward,
      rewardAmount,
    }
  })

  return summaryList
}

/**
 * Mengirim data items payroll (denda keterlambatan & reward) ke Odoo ERP
 */
export async function syncCutoffToOdoo({
  dateFrom,
  dateTo,
  employeeIds,
  dryRun = false,
  onlyUpdateExistingDraft = true,
}) {
  // 1. Ambil pengaturan Odoo
  const s = await prisma.odooSettings.findFirst()
  if (!s || !s.url || !s.db || !s.user || !s.apiKey) {
    throw new Error('Kredensial Odoo belum dikonfigurasi di OdooSettings.')
  }

  const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '')
  const jsonRpcUrl = `${baseUrl}/jsonrpc`

  // 2. Authenticate ke Odoo
  const authRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service: 'common', method: 'authenticate', args: [s.db, s.user, s.apiKey, {}] },
      id: 1,
    }),
  })
  const authData = await authRes.json()
  const uid = authData.result
  if (!uid) {
    throw new Error(`Autentikasi Odoo gagal: ${authData.error?.data?.message || authData.error?.message || 'Invalid credentials'}`)
  }

  // 3. Ambil data agregasi presensi cut-off
  let summary = await aggregateCutoffAttendance({ dateFrom, dateTo })

  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    const idSet = new Set(employeeIds.map(Number))
    summary = summary.filter((item) => idSet.has(item.empId))
  }

  // Filter hanya karyawan yang memiliki odoo_id
  const syncableEmployees = summary.filter((item) => item.odoo_id)

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      dateFrom,
      dateTo,
      totalEmployees: summary.length,
      syncableEmployees: syncableEmployees.length,
      details: syncableEmployees,
    }
  }

  // 4. Cari input types di Odoo (Ded_abs untuk denda, REIMBURSEMENT untuk reward)
  const inputTypeRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.input.type', 'search_read', [[]], { fields: ['id', 'name', 'code'] }],
      },
      id: 2,
    }),
  })
  const inputTypes = (await inputTypeRes.json()).result || []

  // Prioritas ID untuk denda keterlambatan: code 'Late', fallback 'ded_abs' atau 'DEDUCTION'
  let dedType = inputTypes.find((t) => t.code?.toLowerCase() === 'late')
  if (!dedType) dedType = inputTypes.find((t) => t.code?.toLowerCase() === 'ded_abs')
  if (!dedType) dedType = inputTypes.find((t) => t.code?.toLowerCase() === 'deduction')
  const dedTypeId = dedType ? dedType.id : 27

  // Prioritas ID untuk reward kehadiran: code 'Attendance Reward', fallback 'reimbursement'
  let reimbType = inputTypes.find((t) => t.code?.toLowerCase() === 'attendance reward')
  if (!reimbType) reimbType = inputTypes.find((t) => t.code?.toLowerCase() === 'reimbursement')
  const reimbTypeId = reimbType ? reimbType.id : 20

  // ID Input Type untuk Potongan Cuti & Izin:
  const sickLeaveType = inputTypes.find((t) => t.code?.toLowerCase() === 'sick leave')
  const sickLeaveTypeId = sickLeaveType ? sickLeaveType.id : 24

  const leaveType = inputTypes.find((t) => t.code?.toLowerCase() === 'leave')
  const leaveTypeId = leaveType ? leaveType.id : 25

  const halfLeaveType = inputTypes.find((t) => t.code?.toLowerCase() === 'half leave')
  const halfLeaveTypeId = halfLeaveType ? halfLeaveType.id : 26

  // ID Input Type untuk Tunjangan Transport & KPI (Insentif)
  let transportType = inputTypes.find((t) => t.code?.toLowerCase() === 'transport')
  const transportTypeId = transportType ? transportType.id : 12

  let kpiType = inputTypes.find((t) => t.code?.toLowerCase() === 'kpi' || t.name?.toLowerCase().includes('kpi'))
  if (!kpiType) kpiType = inputTypes.find((t) => t.code?.toLowerCase() === 'insentif')
  const kpiTypeId = kpiType ? kpiType.id : 13

  const managedInputTypeIds = [
    dedTypeId,
    reimbTypeId,
    transportTypeId,
    kpiTypeId,
    sickLeaveTypeId,
    leaveTypeId,
    halfLeaveTypeId,
  ]

  // 5. Pay Run Batch (hr.payslip.run) - dibuat jika ada slip baru yang perlu dibuat
  const runName = `Pay Run Cut-off ${dateFrom} s/d ${dateTo}`
  let runId = null

  const getOrCreateRunId = async () => {
    if (runId) return runId
    const existingRunRes = await fetch(jsonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            s.db, uid, s.apiKey, 'hr.payslip.run', 'search_read',
            [[['date_start', '<=', dateTo], ['date_end', '>=', dateFrom]]],
            { fields: ['id', 'name', 'state'], limit: 1 },
          ],
        },
        id: 3,
      }),
    })
    const existingRuns = (await existingRunRes.json()).result || []
    if (existingRuns.length > 0) {
      runId = existingRuns[0].id
    } else {
      const createRunRes = await fetch(jsonRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              s.db, uid, s.apiKey, 'hr.payslip.run', 'create',
              [{
                name: runName,
                date_start: dateFrom,
                date_end: dateTo,
                structure_id: 6,
              }],
            ],
          },
          id: 4,
        }),
      })
      runId = (await createRunRes.json()).result
    }
    return runId
  }

  // 6. Sinkronkan masing-masing karyawan ke hr.payslip & hr.payslip.input
  const results = []
  let successCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const emp of syncableEmployees) {
    try {
      const odooEmpId = emp.odoo_id
      const hasDenda = emp.totalPenalty > 0
      const hasReward = emp.rewardAmount > 0

      // Smart Search: Cari slip gaji karyawan di Odoo yang beririsan dengan periode cut-off
      const slipRes = await fetch(jsonRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              s.db, uid, s.apiKey, 'hr.payslip', 'search_read',
              [[
                ['employee_id', '=', odooEmpId],
                ['date_from', '<=', dateTo],
                ['date_to', '>=', dateFrom],
              ]],
              { fields: ['id', 'name', 'state', 'input_line_ids'], order: 'id desc', limit: 5 },
            ],
          },
          id: 5,
        }),
      })
      const slips = (await slipRes.json()).result || []

      // Prioritaskan slip berstatus draft jika ada
      let targetSlip = slips.find((sl) => sl.state === 'draft') || slips[0] || null

      if (!targetSlip) {
        if (onlyUpdateExistingDraft) {
          skippedCount++
          results.push({
            empId: emp.empId,
            name: emp.name,
            odoo_id: odooEmpId,
            status: 'pending_draft',
            message: 'Draft slip gaji belum dibuat di Odoo untuk periode ini. Silakan buat draft payslip / batch run di Odoo terlebih dahulu.',
          })
          continue
        } else {
          // Buat draft payslip baru jika diperbolehkan
          const activeRunId = await getOrCreateRunId()
          const slipName = `Salary Slip - ${emp.name} - Cutoff ${dateFrom} - ${dateTo}`
          const createSlipRes = await fetch(jsonRpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'call',
              params: {
                service: 'object',
                method: 'execute_kw',
                args: [
                  s.db, uid, s.apiKey, 'hr.payslip', 'create',
                  [{
                    name: slipName,
                    employee_id: odooEmpId,
                    date_from: dateFrom,
                    date_to: dateTo,
                    struct_id: 6,
                    payslip_run_id: activeRunId || false,
                  }],
                ],
              },
              id: 6,
            }),
          })
          const slipCreateData = await createSlipRes.json()
          const newId = slipCreateData.result
          if (newId) {
            targetSlip = { id: newId, name: slipName, state: 'draft' }
          }
        }
      }

      if (!targetSlip) {
        failedCount++
        results.push({
          empId: emp.empId,
          name: emp.name,
          odoo_id: odooEmpId,
          status: 'failed',
          message: 'Gagal membuat/menemukan hr.payslip di Odoo',
        })
        continue
      }

      // Proteksi Status: Jika slip gaji di Odoo sudah final (validated / paid / done)
      if (['validated', 'done', 'paid'].includes(targetSlip.state)) {
        skippedCount++
        results.push({
          empId: emp.empId,
          name: emp.name,
          odoo_id: odooEmpId,
          payslipId: targetSlip.id,
          status: 'locked',
          message: `Slip gaji #${targetSlip.id} (${targetSlip.name}) di Odoo sudah final (${targetSlip.state}). Tidak dapat diubah.`,
        })
        continue
      }

      const payslipId = targetSlip.id

      // Bersihkan input denda presensi lama pada payslip ini agar tidak double count
      const oldInputsRes = await fetch(jsonRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              s.db, uid, s.apiKey, 'hr.payslip.input', 'search_read',
              [[
                ['payslip_id', '=', payslipId],
                ['input_type_id', 'in', managedInputTypeIds],
              ]],
              { fields: ['id'] },
            ],
          },
          id: 7,
        }),
      })
      const oldInputs = (await oldInputsRes.json()).result || []
      if (oldInputs.length > 0) {
        const delIds = oldInputs.map((x) => x.id)
        await fetch(jsonRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'unlink', [delIds]],
            },
            id: 8,
          }),
        })
      }

      // Masukkan item payroll baru ke hr.payslip.input
      const newInputs = []

      // 1. Denda Keterlambatan Presensi
      if (hasDenda) {
        newInputs.push({
          payslip_id: payslipId,
          input_type_id: dedTypeId,
          name: 'Late',
          amount: emp.totalPenalty,
        })
      }

      // 2. Reward Kehadiran Penuh
      if (hasReward) {
        newInputs.push({
          payslip_id: payslipId,
          input_type_id: reimbTypeId,
          name: 'Attendance Reward',
          amount: emp.rewardAmount,
        })
      }

      // 3. Tunjangan Transportasi (TRANSPORT)
      if (emp.enableTransport && emp.transportAllowance > 0) {
        newInputs.push({
          payslip_id: payslipId,
          input_type_id: transportTypeId,
          name: 'Transport Allowance',
          amount: emp.transportAllowance,
        })
      }

      // 4. Tunjangan KPI (INSENTIF / KPI)
      if (emp.enableKpi && emp.kpiAllowance > 0) {
        newInputs.push({
          payslip_id: payslipId,
          input_type_id: kpiTypeId,
          name: 'KPI Allowance',
          amount: emp.kpiAllowance,
        })
      }

      for (const inputVal of newInputs) {
        await fetch(jsonRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'create', [inputVal]],
            },
            id: 9,
          }),
        })
      }

      // Jalankan compute_sheet agar Odoo otomatis menghitung potongan Late dan reward ke take-home pay
      try {
        await fetch(jsonRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [s.db, uid, s.apiKey, 'hr.payslip', 'compute_sheet', [[payslipId]]],
            },
            id: 10,
          }),
        })
      } catch (cErr) {
        console.warn(`[Compute Sheet Warning] Payslip ${payslipId}:`, cErr.message)
      }

      successCount++
      results.push({
        empId: emp.empId,
        name: emp.name,
        odoo_id: odooEmpId,
        payslipId,
        payslipName: targetSlip.name,
        penaltyAmount: emp.totalPenalty,
        rewardAmount: emp.rewardAmount,
        transportAmount: emp.enableTransport ? emp.transportAllowance : 0,
        kpiAmount: emp.enableKpi ? emp.kpiAllowance : 0,
        status: 'synced',
        message: `Berhasil diupdate ke Draft Slip #${payslipId} (${targetSlip.name}). Denda: Rp ${emp.totalPenalty.toLocaleString('id-ID')}, Reward: Rp ${emp.rewardAmount.toLocaleString('id-ID')}, Transport: Rp ${(emp.enableTransport ? emp.transportAllowance : 0).toLocaleString('id-ID')}, KPI: Rp ${(emp.enableKpi ? emp.kpiAllowance : 0).toLocaleString('id-ID')}`,
      })
    } catch (empErr) {
      failedCount++
      results.push({
        empId: emp.empId,
        name: emp.name,
        odoo_id: emp.odoo_id,
        status: 'failed',
        message: empErr.message || 'Error sync per employee',
      })
    }
  }

  return {
    success: true,
    runId,
    runName,
    dateFrom,
    dateTo,
    totalSyncable: syncableEmployees.length,
    successCount,
    skippedCount,
    failedCount,
    results,
  }
}

/**
 * Mengambil peta draft payslip dari Odoo yang beririsan dengan periode cut-off
 * @returns {Promise<Map<number, { id: number, name: string, state: string, hasInputs: boolean }>>}
 */
export async function getOdooDraftPayslipsMap({ dateFrom, dateTo }) {
  try {
    const s = await prisma.odooSettings.findFirst()
    if (!s || !s.url || !s.db || !s.user || !s.apiKey) return new Map()

    const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '')
    const jsonRpcUrl = `${baseUrl}/jsonrpc`

    const authRes = await fetch(jsonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service: 'common', method: 'authenticate', args: [s.db, s.user, s.apiKey, {}] },
        id: 1,
      }),
    })
    const authData = await authRes.json()
    const uid = authData.result
    if (!uid) return new Map()

    const res = await fetch(jsonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            s.db, uid, s.apiKey, 'hr.payslip', 'search_read',
            [[['date_from', '<=', dateTo], ['date_to', '>=', dateFrom]]],
            { fields: ['id', 'name', 'employee_id', 'state', 'input_line_ids'], order: 'id desc' },
          ],
        },
        id: 2,
      }),
    })
    const slips = (await res.json()).result || []
    const map = new Map()
    for (const slip of slips) {
      const odooEmpId = Array.isArray(slip.employee_id) ? slip.employee_id[0] : slip.employee_id
      if (!map.has(odooEmpId) || (slip.state === 'draft' && map.get(odooEmpId).state !== 'draft')) {
        map.set(odooEmpId, {
          id: slip.id,
          name: slip.name,
          state: slip.state,
          hasInputs: Array.isArray(slip.input_line_ids) && slip.input_line_ids.length > 0,
        })
      }
    }
    return map
  } catch (err) {
    console.warn('Failed to fetch Odoo draft payslips map:', err.message)
    return new Map()
  }
}
