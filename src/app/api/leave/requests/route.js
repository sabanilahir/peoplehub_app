// src/app/api/leave/requests/route.js
import { prisma } from '@/lib/prisma'
import { startProcess, ensureLeaveProcessDeployed } from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

function calcDaysBetween(startStr, endStr) {
  if (!startStr || !endStr) return 1
  const s = new Date(startStr)
  const e = new Date(endStr)
  const diffTime = Math.abs(e - s)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const supervisorId = searchParams.get('supervisorId')

    const where = {}
    if (userId) where.userId = Number(userId)
    if (status && status !== 'all') where.status = status

    let leaves = await prisma.leave.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            dept: true,
            position: true,
            email: true,
            employeeId: true,
          },
        },
        leaveType: true,
      },
      orderBy: { id: 'desc' },
    })

    // Filter jika mencari pengajuan bawahan untuk supervisor tertentu (Approval 1 / Approval 2)
    if (supervisorId) {
      const sId = Number(supervisorId)
      // Dapatkan daftar id bawahan dari Employee table
      const subordinates = await prisma.employee.findMany({
        where: {
          OR: [
            { managerId: sId },
            { approver1Id: sId },
            { approver2Id: sId },
          ],
        },
        select: { id: true },
      })
      const subIds = new Set(subordinates.map((e) => e.id))

      leaves = leaves.filter((l) => {
        // Cek apakah bawahan langsung di matriks
        if (subIds.has(l.userId)) return true

        // Cek apakah task saat ini sedang pending untuk approver ini
        const steps = Array.isArray(l.steps) ? l.steps : []
        const currentPendingStep = steps.find((s) => s.status === 'Pending')
        if (currentPendingStep && currentPendingStep.approverId === sId) return true

        return false
      })
    }

    return Response.json({ success: true, data: leaves })
  } catch (error) {
    console.error('[API /api/leave/requests GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      userId,
      typeId,
      startDate,
      endDate,
      note = '',
      customData = {},
      attachment = null,
    } = body

    if (!userId || !typeId || !startDate || !endDate) {
      return Response.json(
        { success: false, error: 'User ID, Jenis Cuti, Tanggal Mulai dan Selesai wajib diisi' },
        { status: 400 }
      )
    }

    if (endDate < startDate) {
      return Response.json(
        { success: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' },
        { status: 400 }
      )
    }

    // Ambil data Jenis Cuti dari DB
    let leaveType = await prisma.leaveType.findUnique({
      where: { id: Number(typeId) },
    })

    if (!leaveType) {
      return Response.json({ success: false, error: 'Jenis cuti tidak ditemukan' }, { status: 404 })
    }

    // Penanganan Khusus Kebijakan Cuti Sakit (Point 1, 2, 3):
    // 1. Wajib melampirkan Surat sakit dari minimal HaloDoc, Puskesmas, dan Rumah Sakit
    // 2. Wajib melampirkan di hari H ybs sakit
    // 3. Tidak ada surat sakit akan dianggap Unpaid Leave
    let finalTypeId = Number(typeId)
    let finalTypeName = leaveType.name
    let autoConvertedNote = ''

    const isSickLeave = leaveType.name.toLowerCase().includes('sakit')
    if (isSickLeave) {
      const todayStr = new Date().toISOString().slice(0, 10)
      const isDayH = startDate === todayStr
      const hasAttachment = Boolean(attachment && String(attachment).trim().length > 0)

      if (!hasAttachment || !isDayH) {
        // Cari jenis cuti Unpaid Leave di DB
        const unpaidType = await prisma.leaveType.findFirst({
          where: {
            OR: [
              { name: { contains: 'Unpaid', mode: 'insensitive' } },
              { name: { contains: 'Potong Gaji', mode: 'insensitive' } },
            ],
          },
        })

        if (unpaidType) {
          finalTypeId = unpaidType.id
          finalTypeName = unpaidType.name
        }

        const reason = !hasAttachment
          ? 'tidak melampirkan Surat Sakit (HaloDoc/Puskesmas/RS)'
          : 'pengajuan melewati hari H sakit'
        autoConvertedNote = ` [Otomatis Dialihkan ke Unpaid Leave: ${reason}]`
      }
    }

    // Resolve User & Employee records (mendukung baik userId maupun employeeId)
    let finalUserId = Number(userId)
    let userRecord = await prisma.user.findUnique({ where: { id: finalUserId } })
    let employee = await prisma.employee.findUnique({ where: { id: finalUserId } })

    if (!userRecord && employee) {
      // Cari apakah ada user yang employeeId-nya sama
      const userByEmp = await prisma.user.findFirst({ where: { employeeId: finalUserId } })
      if (userByEmp) {
        finalUserId = userByEmp.id
        userRecord = userByEmp
      } else {
        // Buat user record otomatis jika belum ada agar FK Leave_userId_fkey terpenuhi
        userRecord = await prisma.user.create({
          data: {
            id: finalUserId,
            username: employee.nik || `user_${finalUserId}`,
            password: 'defaultPassword123',
            name: employee.name,
            role: employee.role || 'employee',
            dept: employee.dept || '',
            position: employee.position || '',
            email: employee.email || '',
            employeeId: employee.id,
          },
        })
      }
    } else if (userRecord && !employee && userRecord.employeeId) {
      employee = await prisma.employee.findUnique({ where: { id: userRecord.employeeId } })
    }

    const days = calcDaysBetween(startDate, endDate)

    // Resolusi daftar approver bertingkat (mendukung Dynamic N-Tier approvalMatrix)
    let rawMatrix = []
    if (Array.isArray(employee?.approvalMatrix) && employee.approvalMatrix.length > 0) {
      rawMatrix = employee.approvalMatrix.filter(m => m && m.employeeId)
    } else {
      // Fallback ke approver1Id dan approver2Id / managerId jika approvalMatrix belum diisi
      const a1 = employee?.approver1Id || employee?.managerId || null
      const a2 = employee?.approver2Id || null
      if (a1) rawMatrix.push({ level: 1, employeeId: a1, label: 'Approval 1 (Operasional)' })
      if (a2 && a2 !== a1) rawMatrix.push({ level: 2, employeeId: a2, label: 'Approval 2 (Manager)' })
    }

    const resolvedMatrix = []
    for (const [idx, item] of rawMatrix.entries()) {
      const empRecord = await prisma.employee.findUnique({
        where: { id: item.employeeId },
        select: { id: true, name: true, jobPosition: true, position: true, role: true, nik: true, odoo_id: true },
      })
      if (!empRecord) continue

      const uRecord = await prisma.user.findFirst({
        where: {
          OR: [
            { id: empRecord.id },
            { employeeId: empRecord.id },
            ...(empRecord.nik ? [{ username: empRecord.nik }] : []),
          ],
        },
        select: { id: true, username: true, name: true },
      })

      let username = uRecord?.username
      if (!username) {
        if (empRecord.odoo_id) username = `ODOO-${empRecord.odoo_id}`
        else if (empRecord.nik) username = empRecord.nik
        else username = empRecord.name
      }
      if (!username) username = 'admin'

      resolvedMatrix.push({
        level: idx + 1,
        employeeId: empRecord.id,
        name: empRecord.name,
        username,
        jobPosition: empRecord.jobPosition || empRecord.position || 'Approver',
        label: item.label || `Approval ${idx + 1} (${empRecord.jobPosition || empRecord.name})`,
      })
    }

    const steps = []

    if (leaveType.autoApprove) {
      steps.push({
        level: 1,
        tier: 'auto_approved',
        type: 'auto',
        label: 'Otomatis Disetujui Sistem',
        status: 'Approved',
        approverId: null,
        approverName: 'Sistem',
        actedAt: new Date().toISOString(),
        note: 'Auto approve by policy',
      })
    } else {
      let firstPendingAssigned = false

      for (const m of resolvedMatrix) {
        const isSelf = Boolean(employee?.id && employee.id === m.employeeId)
        let stepStatus = 'Waiting'
        let actedAt = null
        let note = ''

        if (isSelf) {
          stepStatus = 'Approved'
          actedAt = new Date().toISOString()
          note = `Auto-Bypass: Pemohon adalah ${m.label}`
        } else if (!firstPendingAssigned) {
          stepStatus = 'Pending'
          firstPendingAssigned = true
        }

        steps.push({
          level: steps.length + 1,
          tier: `approval_${m.level}`,
          type: m.level === 1 ? 'coordinator' : m.level === 2 ? 'manager' : 'director',
          label: m.label,
          status: stepStatus,
          approverId: m.employeeId,
          approverName: m.name,
          actedAt,
          note,
        })
      }

      // Step Final: HR Approval (Persetujuan Akhir oleh HR)
      steps.push({
        level: steps.length + 1,
        tier: 'hr_approval',
        type: 'hr',
        label: 'HR Approval (Persetujuan Akhir HR)',
        status: resolvedMatrix.length === 0 || resolvedMatrix.every(m => m.employeeId === employee?.id) ? 'Pending' : 'Waiting',
        approverId: null,
        approverName: 'HR Department',
        actedAt: null,
        note: '',
      })
    }

    // Filter daftar approver aktif yang BUKAN pemohon itu sendiri (untuk alur BPMN)
    const activeApprovers = resolvedMatrix.filter(m => m.employeeId !== employee?.id)

    // Validasi field dinamis dari Form Builder
    const fields = Array.isArray(leaveType.formFields) ? leaveType.formFields : []
    const filledCustomData = {
      ...(customData || {}),
      flowableMatrix: activeApprovers.map((m, idx) => ({
        stepIndex: idx,
        level: m.level,
        employeeId: m.employeeId,
        username: m.username,
        name: m.name,
        label: m.label,
      })),
      currentMatrixIndex: 0,
    }
    for (const f of fields) {
      if (f.required) {
        let val = filledCustomData[f.id]
        if (val === undefined || val === null || val === '') {
          // Jika pengajuan dari MSS / HR atau form yang tidak menyediakan input form dinamis,
          // berikan nilai default yang aman agar proses pengajuan cuti tidak terhambat
          if (f.id === 'f_handover') {
            val = 'Handover ke Rekan Tim'
            filledCustomData[f.id] = val
          } else if (f.id === 'f_emergency') {
            val = '-'
            filledCustomData[f.id] = val
          } else if (f.id === 'f_wedding_date') {
            val = startDate
            filledCustomData[f.id] = val
          } else if (f.id === 'f_hpl') {
            val = startDate
            filledCustomData[f.id] = val
          } else {
            return Response.json(
              { success: false, error: `Kolom '${f.label}' wajib diisi!` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Simpan ke database
    const finalNote = (note || '') + autoConvertedNote
    const created = await prisma.leave.create({
      data: {
        userId: finalUserId,
        typeId: finalTypeId,
        typeName: finalTypeName,
        startDate,
        endDate,
        days,
        note: finalNote.trim() || null,
        customData: filledCustomData,
        attachment,
        status: leaveType.autoApprove ? 'Approved' : 'Pending',
        steps,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, dept: true },
        },
        leaveType: true,
      },
    })

    // Otomatis picu Flowable BPMN Engine untuk persetujuan workflow
    if (!leaveType.autoApprove) {
      try {
        const noOperationalApprovers = activeApprovers.length === 0
        const firstApprover = activeApprovers[0] || null
        const hasMoreApprovers = activeApprovers.length > 1

        const flowVariables = [
          { name: 'leaveId', value: String(created.id), type: 'string' },
          { name: 'employeeId', value: String(finalUserId), type: 'string' },
          { name: 'employeeName', value: userRecord?.name || employee?.name || 'Karyawan', type: 'string' },
          { name: 'employeeNik', value: employee?.nik || userRecord?.username || '', type: 'string' },
          { name: 'employeeDept', value: employee?.dept || userRecord?.dept || '', type: 'string' },
          {
            name: 'employeePosition',
            value: employee?.jobPosition || employee?.position || userRecord?.position || '',
            type: 'string',
          },
          { name: 'leaveType', value: finalTypeName, type: 'string' },
          { name: 'startDate', value: startDate, type: 'string' },
          { name: 'endDate', value: endDate, type: 'string' },
          { name: 'days', value: String(days), type: 'string' },
          { name: 'reason', value: finalNote.trim() || 'Pengajuan Cuti', type: 'string' },
          { name: 'attachment', value: String(attachment || ''), type: 'string' },

          // Dynamic N-Tier Loop variables
          { name: 'noOperationalApprovers', value: noOperationalApprovers, type: 'boolean' },
          { name: 'hasMoreApprovers', value: hasMoreApprovers, type: 'boolean' },
          { name: 'currentApproverUsername', value: firstApprover ? firstApprover.username : 'admin', type: 'string' },
          { name: 'currentStepLabel', value: firstApprover ? firstApprover.label : 'HR Approval', type: 'string' },
          { name: 'stepIndex', value: '0', type: 'string' },
          { name: 'approved', value: true, type: 'boolean' },

          // Backward compatibility variables
          { name: 'approver1Id', value: String(resolvedMatrix[0]?.employeeId || ''), type: 'string' },
          { name: 'approver1Username', value: String(resolvedMatrix[0]?.username || 'admin'), type: 'string' },
          { name: 'approver1Name', value: String(resolvedMatrix[0]?.name || 'Approval 1'), type: 'string' },
          { name: 'hasApproval2', value: resolvedMatrix.length > 1, type: 'boolean' },
          { name: 'skipApprover1', value: noOperationalApprovers, type: 'boolean' },
          { name: 'supervisorUsername', value: String(resolvedMatrix[0]?.username || 'admin'), type: 'string' },
        ]

        // Pastikan definisi LeaveRequest sudah ter-deploy di Flowable Engine
        await ensureLeaveProcessDeployed()

        const procRes = await startProcess('LeaveRequest', flowVariables)
        if (procRes.success && procRes.data?.id) {
          const updatedCustom = {
            ...filledCustomData,
            flowableProcessInstanceId: procRes.data.id,
          }
          await prisma.leave.update({
            where: { id: created.id },
            data: { customData: updatedCustom },
          })
          created.customData = updatedCustom
        } else {
          console.warn('[Flowable BPMN startProcess warning]:', procRes.error)
        }
      } catch (flowErr) {
        console.error('[Flowable BPMN startProcess error]:', flowErr.message)
      }
    }

    return Response.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('[API /api/leave/requests POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
