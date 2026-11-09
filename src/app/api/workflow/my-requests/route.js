// src/app/api/workflow/my-requests/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workflow/my-requests
 * Mengambil seluruh pengajuan (Cuti & Lembur) milik user login
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userIdParam = searchParams.get('userId')

    if (!userIdParam) {
      return Response.json({ success: false, error: 'User ID wajib disertakan' }, { status: 400 })
    }

    const userId = Number(userIdParam)

    // Ambil employeeId jika ada
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, employeeId: true },
    })

    const empId = user?.employeeId || userId

    // 1. Ambil cuti
    const leaves = await prisma.leave.findMany({
      where: { userId },
      include: { leaveType: true },
      orderBy: { id: 'desc' },
    })

    // 2. Ambil lembur
    const overtimes = await prisma.overtimeRecord.findMany({
      where: { empId },
      orderBy: { id: 'desc' },
    })

    const requests = [
      ...leaves.map((l) => ({
        id: `leave-${l.id}`,
        category: 'leave',
        typeName: l.typeName,
        title: `Pengajuan ${l.typeName}`,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        duration: `${l.days} Hari`,
        note: l.note || '-',
        attachment: l.attachment,
        status: l.status,
        steps: Array.isArray(l.steps) ? l.steps : [],
        createdAt: l.createdAt,
      })),
      ...overtimes.map((ot) => ({
        id: `overtime-${ot.id}`,
        category: 'overtime',
        typeName: 'Lembur',
        title: `Pengajuan Lembur (${ot.dayName || 'Hari Kerja'})`,
        startDate: ot.date,
        endDate: ot.date,
        days: 1,
        duration: `${ot.totalHours} Jam (${ot.startTime} - ${ot.endTime})`,
        note: ot.taskNote || '-',
        attachment: null,
        status: ot.status,
        steps: [
          {
            level: 1,
            label: 'Atasan Langsung',
            status: ot.status,
            actedAt: ot.updatedAt,
          },
        ],
        createdAt: ot.createdAt,
      })),
    ]

    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return Response.json({ success: true, data: requests })
  } catch (error) {
    console.error('[API /api/workflow/my-requests GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
