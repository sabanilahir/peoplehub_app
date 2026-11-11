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

    // Resolve Approver 1 & Approver 2 from matrix
    const app1Id = employee?.approver1Id || employee?.managerId || null
    const app2Id = employee?.approver2Id || null

    let approver1 = null
    let approver2 = null
    if (app1Id) {
      approver1 = await prisma.employee.findUnique({
        where: { id: app1Id },
        select: { id: true, name: true, jobPosition: true, role: true, nik: true, odoo_id: true },
      })
    }
    if (app2Id) {
      approver2 = await prisma.employee.findUnique({
        where: { id: app2Id },
        select: { id: true, name: true, jobPosition: true, role: true, nik: true, odoo_id: true },
      })
    }

    // Smart Auto-Bypass: Jika pemohon adalah Approval 1 itu sendiri (Koordinator / Lead)
    const isSelfApprover1 = Boolean(app1Id && employee?.id === app1Id)

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
      // Step 1: Approval 1 (Koordinator / Team Lead / SPV)
      if (app1Id) {
        steps.push({
          level: 1,
          tier: 'approval_1',
          type: 'coordinator',
          label: `Approval 1 (${approver1?.jobPosition || approver1?.name || 'Koordinator / Lead'})`,
          status: isSelfApprover1 ? 'Approved' : 'Pending',
          approverId: app1Id,
          approverName: approver1?.name || 'Approval 1',
          actedAt: isSelfApprover1 ? new Date().toISOString() : null,
          note: isSelfApprover1 ? 'Auto-Bypass: Pemohon adalah Approval 1 (Koordinator)' : '',
        })
      }

      // Step 2: Approval 2 (Manager / Dept Head)
      if (app2Id && app2Id !== app1Id) {
        steps.push({
          level: steps.length + 1,
          tier: 'approval_2',
          type: 'manager',
          label: `Approval 2 (${approver2?.jobPosition || approver2?.name || 'Manager / Head'})`,
          status: isSelfApprover1 ? 'Pending' : 'Waiting',
          approverId: app2Id,
          approverName: approver2?.name || 'Approval 2',
          actedAt: null,
          note: '',
        })
      }

      // Step Final: HR Approval (Persetujuan Akhir oleh HR)
      steps.push({
        level: steps.length + 1,
        tier: 'hr_approval',
        type: 'hr',
        label: 'HR Approval (Persetujuan Akhir HR)',
        status: 'Waiting',
        approverId: null,
        approverName: 'HR Department',
        actedAt: null,
        note: '',
      })
    }

    // Validasi field dinamis dari Form Builder
    const fields = Array.isArray(leaveType.formFields) ? leaveType.formFields : []
    const filledCustomData = { ...(customData || {}) }
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
        // Resolusi akun approver 1 di tabel User
        let approver1User = null
        if (app1Id) {
          approver1User = await prisma.user.findFirst({
            where: {
              OR: [
                { id: app1Id },
                { employeeId: app1Id },
                ...(approver1?.nik ? [{ username: approver1.nik }] : []),
              ],
            },
            select: { id: true, username: true, name: true },
          })
        }

        let approver1Username = approver1User?.username
        if (!approver1Username && approver1) {
          if (approver1.odoo_id) approver1Username = `ODOO-${approver1.odoo_id}`
          else if (approver1.nik) approver1Username = approver1.nik
          else approver1Username = approver1.name
        }
        if (!approver1Username) {
          approver1Username = 'admin'
        }

        // Resolusi akun approver 2 di tabel User
        let approver2User = null
        if (app2Id) {
          approver2User = await prisma.user.findFirst({
            where: {
              OR: [
                { id: app2Id },
                { employeeId: app2Id },
                ...(approver2?.nik ? [{ username: approver2.nik }] : []),
              ],
            },
            select: { id: true, username: true, name: true },
          })
        }

        let approver2Username = approver2User?.username
        if (!approver2Username && approver2) {
          if (approver2.odoo_id) approver2Username = `ODOO-${approver2.odoo_id}`
          else if (approver2.nik) approver2Username = approver2.nik
          else approver2Username = approver2.name
        }
        if (!approver2Username) {
          approver2Username = 'rina.marlina'
        }

        const hasApproval2 = Boolean(app2Id && app2Id !== app1Id)

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
          { name: 'approver1Id', value: String(app1Id || ''), type: 'string' },
          { name: 'approver1Username', value: String(approver1Username), type: 'string' },
          { name: 'approver1Name', value: approver1?.name || 'Approval 1', type: 'string' },
          { name: 'approver2Id', value: String(app2Id || ''), type: 'string' },
          { name: 'approver2Username', value: String(approver2Username), type: 'string' },
          { name: 'approver2Name', value: approver2?.name || 'Approval 2', type: 'string' },
          { name: 'hasApproval2', value: hasApproval2, type: 'boolean' },
          { name: 'skipApprover1', value: isSelfApprover1, type: 'boolean' },
          // Backward compatibility
          { name: 'supervisorId', value: String(app1Id || ''), type: 'string' },
          { name: 'supervisorUsername', value: String(approver1Username), type: 'string' },
          { name: 'attachment', value: String(attachment || ''), type: 'string' },
        ]

        // Pastikan definisi LeaveRequest sudah ter-deploy di Flowable Engine
        await ensureLeaveProcessDeployed()

        const procRes = await startProcess('LeaveRequest', flowVariables)
        if (procRes.success && procRes.data?.id) {
          const updatedCustom = {
            ...(customData || {}),
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
