// src/app/api/workflow/tasks/[id]/route.js
import { prisma } from '@/lib/prisma'
import { getTask, getTaskVariables } from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

function parseTaskIdentifier(idStr) {
  if (!idStr) return { type: 'leave', numId: 0 }
  if (idStr.startsWith('flowable-')) {
    return { type: 'flowable', flowableTaskId: idStr.replace('flowable-', '') }
  }
  if (idStr.startsWith('leave-')) {
    return { type: 'leave', numId: Number(idStr.replace('leave-', '')) }
  }
  if (idStr.startsWith('overtime-')) {
    return { type: 'overtime', numId: Number(idStr.replace('overtime-', '')) }
  }
  return { type: 'leave', numId: Number(idStr) }
}

/**
 * GET /api/workflow/tasks/[id]
 * Mengambil detail tugas workflow (Cuti DB, Cuti Flowable, Lembur DB)
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params
    const { type, numId, flowableTaskId } = parseTaskIdentifier(id)

    // 1. Flowable Task
    if (type === 'flowable') {
      const taskRes = await getTask(flowableTaskId)
      if (!taskRes.success || !taskRes.data) {
        return Response.json({ success: false, error: 'Tugas workflow tidak ditemukan' }, { status: 404 })
      }
      const task = taskRes.data
      const varsRes = await getTaskVariables(flowableTaskId)
      const vars = varsRes.success ? varsRes.data : []
      const varMap = {}
      vars.forEach((v) => {
        varMap[v.name] = v.value
      })

      const leaveType = varMap.leaveType || 'Cuti Tahunan'
      const applicantName = varMap.employeeName || task.description || 'Karyawan'
      const applicantNik = varMap.employeeNik || (varMap.employeeId ? `EMP-${varMap.employeeId}` : '-')
      const applicantDept = varMap.employeeDept || 'Operasional'
      const applicantPosition = varMap.employeePosition || 'Staff'
      const startDate = varMap.startDate || task.createTime?.slice(0, 10) || ''
      const endDate = varMap.endDate || startDate
      const days = Number(varMap.days) || 1

      return Response.json({
        success: true,
        data: {
          id: `flowable-${task.id}`,
          taskId: task.id,
          isFlowable: true,
          category: 'leave',
          type: 'Permohonan Cuti (Workflow)',
          title: `${leaveType} · ${applicantName}`,
          applicantName,
          applicantNik,
          applicantDept,
          applicantPosition,
          applicantEmail: '-',
          leaveType,
          startDate,
          endDate,
          durationText: `${days} Hari Kerja`,
          days,
          note: varMap.reason || task.description || 'Pengajuan via Workflow Engine',
          attachment: null,
          status: 'Pending',
          currentStep: task.name || 'Supervisor Approval',
          steps: [
            {
              level: 1,
              label: task.name || 'Supervisor Approval',
              status: 'Pending',
              approverName: task.assignee || 'Supervisor',
            },
          ],
          payrollImpact: 'Akan memotong kuota cuti tahunan dan masuk ke HO Calculator',
          payrollTone: 'blue',
          createdAt: task.createTime || new Date().toISOString(),
        },
      })
    }

    // 2. Database Leave
    if (type === 'leave') {
      const leave = await prisma.leave.findUnique({
        where: { id: numId },
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
      })

      if (!leave) {
        return Response.json({ success: false, error: 'Tugas cuti tidak ditemukan' }, { status: 404 })
      }

      const steps = Array.isArray(leave.steps) ? leave.steps : []
      const currentPendingStep = steps.find((s) => s.status === 'Pending') || steps[0]

      let payrollImpact = 'Memotong kuota cuti tahunan'
      let payrollTone = 'blue'
      const typeLower = (leave.typeName || '').toLowerCase()
      if (typeLower.includes('setengah')) {
        payrollImpact = 'Akan memotong 50% Gaji Gross harian di HO Calculator'
        payrollTone = 'amber'
      } else if (typeLower.includes('sakit')) {
        if (leave.attachment) {
          payrollImpact = 'Hanya memotong Prorata Tunjangan Transport di HO Calculator (Surat Dokter Valid)'
          payrollTone = 'emerald'
        } else {
          payrollImpact = 'Tanpa surat dokter: dialihkan memotong 100% Gaji Gross (Unpaid Leave)'
          payrollTone = 'red'
        }
      } else if (typeLower.includes('unpaid') || typeLower.includes('potong gaji')) {
        payrollImpact = 'Akan memotong 100% Gaji Gross harian di HO Calculator'
        payrollTone = 'red'
      }

      return Response.json({
        success: true,
        data: {
          id: `leave-${leave.id}`,
          taskId: leave.id,
          category: 'leave',
          type: 'Permohonan Cuti / Izin',
          title: `${leave.typeName} · ${leave.user?.name || 'Karyawan'}`,
          applicantName: leave.user?.name || 'Karyawan',
          applicantNik: leave.user?.employeeId ? `EMP-${leave.user.employeeId}` : `USR-${leave.userId}`,
          applicantDept: leave.user?.dept || 'Head Office',
          applicantPosition: leave.user?.position || 'Staff',
          applicantEmail: leave.user?.email || '-',
          leaveType: leave.typeName,
          startDate: leave.startDate,
          endDate: leave.endDate,
          durationText: `${leave.days} Hari Kerja`,
          days: leave.days,
          note: leave.note || 'Tidak ada catatan pemohon',
          attachment: leave.attachment || null,
          status: leave.status,
          currentStep: currentPendingStep?.label || 'Approval',
          steps,
          payrollImpact,
          payrollTone,
          createdAt: leave.createdAt,
        },
      })
    }

    // 3. Database Overtime
    if (type === 'overtime') {
      const ot = await prisma.overtimeRecord.findUnique({
        where: { id: numId },
        include: {
          employee: true,
        },
      })

      if (!ot) {
        return Response.json({ success: false, error: 'Tugas lembur tidak ditemukan' }, { status: 404 })
      }

      return Response.json({
        success: true,
        data: {
          id: `overtime-${ot.id}`,
          taskId: ot.id,
          category: 'overtime',
          type: 'Permohonan Lembur',
          title: `Lembur ${ot.totalHours} Jam · ${ot.employee?.name}`,
          applicantName: ot.employee?.name || 'Karyawan',
          applicantNik: ot.employee?.nik || `EMP-${ot.empId}`,
          applicantDept: ot.employee?.dept || ot.employee?.location || 'Operasional',
          applicantPosition: ot.employee?.position || 'Staff',
          leaveType: 'Lembur',
          startDate: ot.date,
          endDate: ot.date,
          durationText: `${ot.totalHours} Jam (${ot.startTime} - ${ot.endTime})`,
          hours: ot.totalHours,
          fee: ot.totalFee,
          note: ot.taskNote || 'Tidak ada catatan lembur',
          attachment: null,
          status: ot.status,
          currentStep: ot.status === 'Approved' ? 'Selesai (Disetujui)' : 'Persetujuan Atasan',
          steps: [
            {
              level: 1,
              label: 'Atasan Langsung',
              status: ot.status,
              approverId: ot.approvedById,
              actedAt: ot.updatedAt,
            },
          ],
          payrollImpact: `Akan menambah Uang Lembur (+Rp ${ot.totalFee.toLocaleString('id-ID')}) di HO Calculator`,
          payrollTone: 'emerald',
          createdAt: ot.createdAt,
        },
      })
    }

    return Response.json({ success: false, error: 'Tipe tugas tidak valid' }, { status: 400 })
  } catch (error) {
    console.error('[API /api/workflow/tasks/[id] GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/workflow/tasks/[id]
 * Memproses aksi persetujuan (approve) atau penolakan (reject) tugas workflow
 */
export async function POST(req, { params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, approverId, approverName, note = '' } = body

    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ success: false, error: "Action harus 'approve' atau 'reject'" }, { status: 400 })
    }

    const { type, numId, flowableTaskId } = parseTaskIdentifier(id)
    const nowStr = new Date().toISOString()

    // 1. Proses Tugas Flowable
    if (type === 'flowable') {
      const res = await fetch(`http://localhost:3000/api/flowable/tasks/${flowableTaskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          variables: [
            { name: 'approved', value: action === 'approve', type: 'boolean' },
            { name: 'approverName', value: approverName || 'Approver', type: 'string' },
            { name: 'approvalNote', value: note || (action === 'approve' ? 'Disetujui' : 'Ditolak'), type: 'string' },
            { name: 'actedAt', value: nowStr, type: 'string' },
          ],
        }),
      })

      const data = await res.json()
      if (data.success) {
        return Response.json({
          success: true,
          message: action === 'approve'
            ? 'Permohonan berhasil disetujui & otomatis masuk ke HO Calculator!'
            : 'Permohonan berhasil ditolak.',
          data,
        })
      } else {
        return Response.json({ success: false, error: data.error || 'Gagal memproses tugas workflow' }, { status: 400 })
      }
    }

    // 2. Proses Cuti PostgreSQL
    if (type === 'leave') {
      const leave = await prisma.leave.findUnique({
        where: { id: numId },
      })

      if (!leave) {
        return Response.json({ success: false, error: 'Pengajuan cuti tidak ditemukan' }, { status: 404 })
      }

      let steps = Array.isArray(leave.steps) ? [...leave.steps] : []
      const pendingIdx = steps.findIndex((s) => s.status === 'Pending')

      if (action === 'reject') {
        if (pendingIdx !== -1) {
          steps[pendingIdx] = {
            ...steps[pendingIdx],
            status: 'Rejected',
            approverId: approverId ? Number(approverId) : steps[pendingIdx].approverId,
            approverName: approverName || 'Approver',
            actedAt: nowStr,
            note,
          }
        }
        const updated = await prisma.leave.update({
          where: { id: numId },
          data: {
            status: 'Rejected',
            steps,
          },
        })
        return Response.json({
          success: true,
          message: 'Permohonan cuti telah ditolak.',
          data: updated,
        })
      }

      if (action === 'approve') {
        if (pendingIdx !== -1) {
          steps[pendingIdx] = {
            ...steps[pendingIdx],
            status: 'Approved',
            approverId: approverId ? Number(approverId) : steps[pendingIdx].approverId,
            approverName: approverName || 'Approver',
            actedAt: nowStr,
            note,
          }

          if (pendingIdx + 1 < steps.length) {
            steps[pendingIdx + 1] = {
              ...steps[pendingIdx + 1],
              status: 'Pending',
            }
            const updated = await prisma.leave.update({
              where: { id: numId },
              data: {
                status: 'Pending',
                steps,
              },
            })
            return Response.json({
              success: true,
              message: `Level ${steps[pendingIdx].level} disetujui. Diteruskan ke ${steps[pendingIdx + 1].label}.`,
              data: updated,
            })
          }
        }

        const updated = await prisma.leave.update({
          where: { id: numId },
          data: {
            status: 'Approved',
            steps,
          },
        })

        return Response.json({
          success: true,
          message: 'Permohonan cuti telah sepenuhnya disetujui dan otomatis masuk ke HO Calculator!',
          data: updated,
        })
      }
    }

    // 3. Proses Lembur PostgreSQL
    if (type === 'overtime') {
      const ot = await prisma.overtimeRecord.findUnique({
        where: { id: numId },
      })

      if (!ot) {
        return Response.json({ success: false, error: 'Pengajuan lembur tidak ditemukan' }, { status: 404 })
      }

      const newStatus = action === 'approve' ? 'Approved' : 'Rejected'
      const updated = await prisma.overtimeRecord.update({
        where: { id: numId },
        data: {
          status: newStatus,
          approvedById: approverId ? Number(approverId) : null,
        },
      })

      return Response.json({
        success: true,
        message: action === 'approve' ? 'Entri lembur disetujui dan otomatis masuk ke HO Calculator!' : 'Entri lembur ditolak.',
        data: updated,
      })
    }

    return Response.json({ success: false, error: 'Tipe tugas tidak dikenali' }, { status: 400 })
  } catch (error) {
    console.error('[API /api/workflow/tasks/[id] POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
