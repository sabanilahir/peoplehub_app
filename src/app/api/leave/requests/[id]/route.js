// src/app/api/leave/requests/[id]/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    // Aksi withdraw oleh pengaju
    if (action === 'withdraw') {
      const updated = await prisma.leave.update({
        where: { id: Number(id) },
        data: { status: 'Withdrawn' },
      })
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
        where: { id: Number(id) },
        data: {
          status: 'Rejected',
          steps,
        },
      })
      return Response.json({ success: true, data: updated })
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
      return Response.json({ success: true, data: updated })
    }
  } catch (error) {
    console.error('[API /api/leave/requests/[id] PUT] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

