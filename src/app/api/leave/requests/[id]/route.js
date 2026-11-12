// src/app/api/leave/requests/[id]/route.js
import { prisma } from '@/lib/prisma'
import { deleteProcessInstance, getTasks, completeTask } from '@/lib/flowable/client'

export const dynamic = 'force-dynamic'

// Helper untuk sinkronisasi record hcm-leave-v1 di AppState
async function syncAppStateLeave(leaveId, status, steps) {
  try {
    const row = await prisma.appState.findUnique({ where: { key: 'hcm-leave-v1' } })
    if (row?.value) {
      const data = JSON.parse(row.value)
      if (Array.isArray(data?.state?.leaves)) {
        const idx = data.state.leaves.findIndex((l) => l.id === Number(leaveId))
        if (idx !== -1) {
          data.state.leaves[idx].status = status
          if (steps) data.state.leaves[idx].steps = steps
          await prisma.appState.update({
            where: { key: 'hcm-leave-v1' },
            data: { value: JSON.stringify(data) },
          })
        }
      }
    }
  } catch (e) {
    console.warn('[syncAppStateLeave warning]:', e.message)
  }
}

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const leave = await prisma.leave.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { id: true, name: true, role: true, dept: true, email: true } },
        leaveType: true,
      },
    })

    if (!leave) {
      return Response.json({ success: false, error: 'Pengajuan cuti tidak ditemukan' }, { status: 404 })
    }

    return Response.json({ success: true, data: leave })
  } catch (error) {
    console.error('[API /api/leave/requests/[id] GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, approverId, approverName, note = '' } = body

    if (!['approve', 'reject', 'withdraw'].includes(action)) {
      return Response.json(
        { success: false, error: 'Action harus bernilai approve, reject, atau withdraw' },
        { status: 400 }
      )
    }

    const leave = await prisma.leave.findUnique({
      where: { id: Number(id) },
    })

    if (!leave) {
      return Response.json({ success: false, error: 'Pengajuan cuti tidak ditemukan' }, { status: 404 })
    }

    const flowProcId = leave.customData?.flowableProcessInstanceId

    // Aksi withdraw oleh pengaju
    if (action === 'withdraw') {
      if (flowProcId) {
        try {
          await deleteProcessInstance(flowProcId, 'Withdrawn by employee')
        } catch (e) {
          console.warn('[Flowable deleteProcessInstance warning]:', e.message)
        }
      }
      const updated = await prisma.leave.update({
        where: { id: Number(id) },
        data: { status: 'Withdrawn' },
      })
      await syncAppStateLeave(id, 'Withdrawn', null)
      return Response.json({ success: true, data: updated })
    }

    let steps = Array.isArray(leave.steps) ? [...leave.steps] : []
    const pendingIdx = steps.findIndex((s) => s.status === 'Pending')

    if (pendingIdx === -1 && leave.status !== 'Pending') {
      return Response.json(
        { success: false, error: `Pengajuan cuti ini sudah berstatus ${leave.status}` },
        { status: 400 }
      )
    }

    const nowStr = new Date().toISOString()

    // Sinkronisasi ke Flowable task jika instance Flowable aktif
    const syncFlowableTask = async (isApproved) => {
      if (!flowProcId) return
      try {
        const tasksRes = await getTasks({ processInstanceId: flowProcId })
        const activeTask = tasksRes?.data?.data?.[0]
        if (activeTask?.id) {
          await completeTask(activeTask.id, [
            { name: 'approved', value: isApproved, type: 'boolean' },
            { name: 'approverName', value: approverName || 'Approver', type: 'string' },
            { name: 'approvalNote', value: note || (isApproved ? 'Disetujui' : 'Ditolak'), type: 'string' },
          ])
        }
      } catch (e) {
        console.warn('[syncFlowableTask warning]:', e.message)
      }
    }

    if (action === 'reject') {
      await syncFlowableTask(false)

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
        where: { id: Number(id) },
        data: {
          status: 'Rejected',
          steps,
        },
      })
      await syncAppStateLeave(id, 'Rejected', steps)
      return Response.json({ success: true, data: updated })
    }

    if (action === 'approve') {
      await syncFlowableTask(true)

      if (pendingIdx !== -1) {
        steps[pendingIdx] = {
          ...steps[pendingIdx],
          status: 'Approved',
          approverId: approverId ? Number(approverId) : steps[pendingIdx].approverId,
          approverName: approverName || 'Approver',
          actedAt: nowStr,
          note,
        }

        // Cek apakah ada langkah berikutnya
        if (pendingIdx + 1 < steps.length) {
          steps[pendingIdx + 1] = {
            ...steps[pendingIdx + 1],
            status: 'Pending',
          }
          const updated = await prisma.leave.update({
            where: { id: Number(id) },
            data: {
              status: 'Pending',
              steps,
            },
          })
          await syncAppStateLeave(id, 'Pending', steps)
          return Response.json({ success: true, data: updated })
        }
      }

      // Semua step telah disetujui
      const updated = await prisma.leave.update({
        where: { id: Number(id) },
        data: {
          status: 'Approved',
          steps,
        },
      })
      await syncAppStateLeave(id, 'Approved', steps)
      return Response.json({ success: true, data: updated })
    }
  } catch (error) {
    console.error('[API /api/leave/requests/[id] PUT] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

