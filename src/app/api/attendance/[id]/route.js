// src/app/api/attendance/[id]/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// PUT: update record (clock out, atau koreksi HR)
export async function PUT(req, props) {
  try {
    const params = await props.params
    const id     = Number(params.id)
    const body   = await req.json()
    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn:       body.checkIn       !== undefined ? body.checkIn       : undefined,
        checkOut:      body.checkOut      !== undefined ? body.checkOut      : undefined,
        status:        body.status        !== undefined ? body.status        : undefined,
        lateMinutes:   body.lateMinutes   !== undefined ? Number(body.lateMinutes) : undefined,
        penaltyAmount: body.penaltyAmount !== undefined ? Number(body.penaltyAmount) : undefined,
        note:          body.note          !== undefined ? body.note          : undefined,
      },
    })
    return Response.json(updated)
  } catch (err) {
    console.error('Error updating attendance:', err)
    return dbDown()
  }
}

// DELETE: hapus satu record (koreksi HR)
export async function DELETE(_req, props) {
  try {
    const params = await props.params
    await prisma.attendance.delete({ where: { id: Number(params.id) } })
    return new Response(null, { status: 204 })
  } catch {
    return dbDown()
  }
}
