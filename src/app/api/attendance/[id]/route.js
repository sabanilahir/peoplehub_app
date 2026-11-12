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

        // Geofencing & Anti-Fake GPS
        checkInLat:       body.checkInLat       !== undefined ? (body.checkInLat ? parseFloat(body.checkInLat) : null) : undefined,
        checkInLng:       body.checkInLng       !== undefined ? (body.checkInLng ? parseFloat(body.checkInLng) : null) : undefined,
        checkInDistance:  body.checkInDistance  !== undefined ? Number(body.checkInDistance) : undefined,
        checkInLocation:  body.checkInLocation  !== undefined ? body.checkInLocation : undefined,
        checkOutLat:      body.checkOutLat      !== undefined ? (body.checkOutLat ? parseFloat(body.checkOutLat) : null) : (body.lat ? parseFloat(body.lat) : undefined),
        checkOutLng:      body.checkOutLng      !== undefined ? (body.checkOutLng ? parseFloat(body.checkOutLng) : null) : (body.lng ? parseFloat(body.lng) : undefined),
        checkOutDistance: body.checkOutDistance !== undefined ? Number(body.checkOutDistance) : (body.distance !== undefined ? Number(body.distance) : undefined),
        checkOutLocation: body.checkOutLocation !== undefined ? body.checkOutLocation : (body.targetLocationName !== undefined ? body.targetLocationName : undefined),
        isWithinRadius:   body.isWithinRadius   !== undefined ? Boolean(body.isWithinRadius) : undefined,
        accuracyMeters:   body.accuracyMeters   !== undefined ? parseFloat(body.accuracyMeters) : (body.accuracy ? parseFloat(body.accuracy) : undefined),
        isMockGps:        body.isMockGps        !== undefined ? Boolean(body.isMockGps) : undefined,
        mockGpsReason:    body.mockGpsReason    !== undefined ? body.mockGpsReason : undefined,
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
