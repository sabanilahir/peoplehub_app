// src/app/api/overtime/route.js
import { prisma } from '@/lib/prisma'
import {
  calcHoOvertimeRate,
  calcHoOvertimeFee,
  calcWarehouseOvertime,
  resolveEmployeeOvertimeRate,
  parseOvertimeDuration,
} from '@/lib/hoPayrollEngine'
import {
  ensureOvertimeProcessDeployed,
  startProcess,
  getTasks,
  completeTask,
} from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

/**
 * GET /api/overtime
 * Ambil daftar entri lembur dengan filter opsional: empId, startDate, endDate, status
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const empId = searchParams.get('empId')
    const approverId = searchParams.get('approverId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    const where = {}
    if (empId) {
      where.empId = Number(empId)
    } else if (approverId) {
      // Ambil seluruh bawahan yang disupervisi oleh approver ini
      const subordinates = await prisma.employee.findMany({
        where: {
          OR: [
            { approver1Id: Number(approverId) },
            { approver2Id: Number(approverId) },
            { managerId: Number(approverId) },
          ],
        },
        select: { id: true },
      })
      const subIds = subordinates.map((s) => s.id)
      where.empId = { in: subIds }
    }

    if (status && status !== 'all') where.status = status

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
    } else if (startDate) {
      where.date = { gte: startDate }
    } else if (endDate) {
      where.date = { lte: endDate }
    }

    const records = await prisma.overtimeRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            nik: true,
            name: true,
            dept: true,
            jobTitle: true,
            location: true,
            workLocationCode: true,
            salary: true,
            approver1Id: true,
            approver2Id: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    })

    return Response.json({ success: true, data: records })
  } catch (error) {
    console.error('[API /api/overtime GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/overtime
 * Menambahkan entri lembur baru dan menghitung fee otomatis berdasarkan Gaji Pokok / Hari Kerja / 8
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const {
      empId,
      date,
      startTime,
      endTime,
      taskNote = '',
      workingDays = 22,
      status = 'Pending',
      approvedById = null,
    } = body

    if (!empId || !date || !startTime || !endTime) {
      return Response.json(
        { success: false, error: 'Karyawan, Tanggal, Jam Mulai, dan Jam Selesai wajib diisi.' },
        { status: 400 }
      )
    }

    // Ambil data karyawan beserta lokasi kerja
    const employee = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: {
        id: true,
        name: true,
        salary: true,
        location: true,
        workLocationCode: true,
        position: true,
        approver1Id: true,
      },
    })

    if (!employee) {
      return Response.json({ success: false, error: 'Karyawan tidak ditemukan.' }, { status: 404 })
    }

    // Hitung durasi jam
    const duration = parseOvertimeDuration(startTime, endTime)
    if (duration.hours <= 0) {
      return Response.json(
        { success: false, error: 'Durasi lembur harus lebih dari 0 jam.' },
        { status: 400 }
      )
    }

    // Tentukan hari dalam bahasa Indonesia
    const d = new Date(date + 'T00:00:00')
    const dayName = DAY_NAMES_ID[d.getDay()] || ''

    // Cek apakah tanggal lembur adalah Tanggal Merah / Libur Nasional di DB
    const holidayRecord = await prisma.holiday.findFirst({
      where: { date },
    })
    const isHoliday = !!holidayRecord

    // Hitung tarif dan total fee lembur sesuai lokasi kerja (HO vs Gudang)
    const loc = (employee.workLocationCode || employee.location || '').toLowerCase()
    const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')

    let hourlyRate = 0
    let totalFee = 0

    if (isGudang) {
      // Aturan Khusus Gudang:
      // Senin - Sabtu: Rp 15.000 / Jam
      // Minggu & Tanggal Merah: Rp 25.000 / Jam
      const gudangCalc = calcWarehouseOvertime({
        date,
        hours: duration.hours,
        isHoliday,
      })
      hourlyRate = gudangCalc.hourlyRate
      totalFee = gudangCalc.fee
    } else {
      // Aturan Standar Head Office (HO):
      // Rate = (Gaji Pokok / Hari Kerja Cut-off) / 8
      const basicSalary = Math.round((Number(employee.salary) || 0) * 0.75)
      const totalDays = Number(workingDays) > 0 ? Number(workingDays) : 22
      const hoCalc = calcHoOvertimeFee(basicSalary, totalDays, duration.hours)
      hourlyRate = hoCalc.hourlyRate
      totalFee = hoCalc.fee
    }

    const created = await prisma.overtimeRecord.create({
      data: {
        empId: Number(empId),
        date,
        dayName,
        startTime,
        endTime,
        totalHours: Math.round(duration.hours * 100) / 100,
        hourlyRate,
        totalFee,
        taskNote,
        status,
        approvedById: approvedById ? Number(approvedById) : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nik: true,
            dept: true,
            salary: true,
            location: true,
            workLocationCode: true,
          },
        },
      },
    })

    // Otomatis picu Flowable BPMN Workflow Engine untuk persetujuan lembur
    try {
      await ensureOvertimeProcessDeployed()

      let approverUsername = 'admin'
      let approverName = 'Supervisor / Manager'
      if (employee.approver1Id) {
        const approverUser = await prisma.user.findFirst({
          where: { employeeId: employee.approver1Id },
          select: { username: true, name: true },
        })
        if (approverUser) {
          approverUsername = approverUser.username
          approverName = approverUser.name || approverUser.username
        }
      }

      const flowVars = [
        { name: 'overtimeId', value: String(created.id) },
        { name: 'empId', value: String(employee.id) },
        { name: 'employeeName', value: employee.name },
        { name: 'date', value: created.date },
        { name: 'dayName', value: created.dayName || '' },
        { name: 'startTime', value: created.startTime },
        { name: 'endTime', value: created.endTime },
        { name: 'totalHours', value: String(created.totalHours) },
        { name: 'totalFee', value: String(created.totalFee) },
        { name: 'taskNote', value: created.taskNote || '' },
        { name: 'currentApproverUsername', value: approverUsername },
        { name: 'currentApproverId', value: String(employee.approver1Id || '') },
        { name: 'currentStepLabel', value: `Persetujuan Lembur: ${approverName}` },
      ]

      const procRes = await startProcess('overtime-request-process', flowVars)
      if (procRes.success && procRes.data?.id) {
        const customData = {
          flowableProcessInstanceId: procRes.data.id,
          approverUsername,
          approverName,
        }
        await prisma.overtimeRecord.update({
          where: { id: created.id },
          data: { customData },
        })
        created.customData = customData
      }
    } catch (flowErr) {
      console.warn('[Flowable Overtime startProcess warning]:', flowErr.message)
    }

    return Response.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('[API /api/overtime POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/overtime
 * Mengubah status / data entri lembur
 */
export async function PUT(req) {
  try {
    const body = await req.json()
    const { id, status, taskNote, startTime, endTime, workingDays, approvedById, rejectReason } = body

    if (!id) {
      return Response.json({ success: false, error: 'ID lembur wajib diisi.' }, { status: 400 })
    }

    const existing = await prisma.overtimeRecord.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            salary: true,
            location: true,
            workLocationCode: true,
          },
        },
      },
    })

    if (!existing) {
      return Response.json({ success: false, error: 'Entri lembur tidak ditemukan.' }, { status: 404 })
    }

    const updateData = {}
    if (status) updateData.status = status
    if (approvedById !== undefined) updateData.approvedById = approvedById ? Number(approvedById) : null
    if (rejectReason) {
      updateData.taskNote = existing.taskNote
        ? `${existing.taskNote} [Alasan Penolakan: ${rejectReason}]`
        : `[Alasan Penolakan: ${rejectReason}]`
    } else if (taskNote !== undefined) {
      updateData.taskNote = taskNote
    }

    // Selesaikan (complete) User Task di Flowable BPMN jika instance aktif
    const procId = existing.customData?.flowableProcessInstanceId
    if (procId && (status === 'Approved' || status === 'Rejected')) {
      try {
        const tasksRes = await getTasks({ processInstanceId: procId })
        if (tasksRes.success && Array.isArray(tasksRes.data?.data) && tasksRes.data.data.length > 0) {
          const taskId = tasksRes.data.data[0].id
          await completeTask(taskId, [
            { name: 'approved', value: status === 'Approved' },
            { name: 'rejectReason', value: rejectReason || '' },
          ])
        }
      } catch (flowErr) {
        console.warn('[Flowable Overtime completeTask warning]:', flowErr.message)
      }
    }

    const updatedCustom = {
      ...(typeof existing.customData === 'object' && existing.customData !== null ? existing.customData : {}),
      status: status || existing.status,
      approvedById: approvedById !== undefined ? (approvedById ? Number(approvedById) : null) : existing.approvedById,
      decidedAt: new Date().toISOString(),
      rejectReason: rejectReason || null,
    }
    updateData.customData = updatedCustom

    if (startTime || endTime) {
      const s = startTime || existing.startTime
      const e = endTime || existing.endTime
      const duration = parseOvertimeDuration(s, e)
      const loc = (existing.employee?.workLocationCode || existing.employee?.location || '').toLowerCase()
      const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')

      let hourlyRate = 0
      let totalFee = 0

      if (isGudang) {
        const holidayRecord = await prisma.holiday.findFirst({ where: { date: existing.date } })
        const gudangCalc = calcWarehouseOvertime({
          date: existing.date,
          hours: duration.hours,
          isHoliday: !!holidayRecord,
        })
        hourlyRate = gudangCalc.hourlyRate
        totalFee = gudangCalc.fee
      } else {
        const basicSalary = Math.round((Number(existing.employee?.salary) || 0) * 0.75)
        const days = Number(workingDays) > 0 ? Number(workingDays) : 22
        const hoCalc = calcHoOvertimeFee(basicSalary, days, duration.hours)
        hourlyRate = hoCalc.hourlyRate
        totalFee = hoCalc.fee
      }

      updateData.startTime = s
      updateData.endTime = e
      updateData.totalHours = Math.round(duration.hours * 100) / 100
      updateData.hourlyRate = hourlyRate
      updateData.totalFee = totalFee
    }

    const updated = await prisma.overtimeRecord.update({
      where: { id: Number(id) },
      data: updateData,
    })

    return Response.json({ success: true, data: updated })
  } catch (error) {
    console.error('[API /api/overtime PUT] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/overtime
 * Menghapus entri lembur
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ success: false, error: 'ID lembur wajib diisi.' }, { status: 400 })
    }

    await prisma.overtimeRecord.delete({
      where: { id: Number(id) },
    })

    return Response.json({ success: true, message: 'Entri lembur berhasil dihapus.' })
  } catch (error) {
    console.error('[API /api/overtime DELETE] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
