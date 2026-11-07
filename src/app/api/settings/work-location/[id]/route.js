// src/app/api/settings/work-location/[id]/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const config = await prisma.workLocationConfig.findUnique({
      where: { id: Number(id) },
    })

    if (!config) {
      return Response.json({ success: false, error: 'Konfigurasi lokasi tidak ditemukan' }, { status: 404 })
    }

    return Response.json({ success: true, config })
  } catch (error) {
    console.error('Error fetching work location config:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      locationCode,
      locationName,
      workDays,
      gracePeriodMinutes,
      schedules,
      latePenalties,
      rewardAmount,
      rewardCriteria,
      active,
    } = body

    const updated = await prisma.workLocationConfig.update({
      where: { id: Number(id) },
      data: {
        locationCode: locationCode ? locationCode.toLowerCase().trim() : undefined,
        locationName: locationName ? locationName.trim() : undefined,
        workDays: workDays !== undefined ? workDays : undefined,
        gracePeriodMinutes: gracePeriodMinutes !== undefined ? Number(gracePeriodMinutes) : undefined,
        schedules: schedules !== undefined ? schedules : undefined,
        latePenalties: latePenalties !== undefined ? latePenalties : undefined,
        rewardAmount: rewardAmount !== undefined ? Number(rewardAmount) : undefined,
        rewardCriteria: rewardCriteria !== undefined ? rewardCriteria : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
      },
    })

    return Response.json({ success: true, config: updated })
  } catch (error) {
    console.error('Error updating work location config:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params
    await prisma.workLocationConfig.delete({
      where: { id: Number(id) },
    })
    return Response.json({ success: true, message: 'Konfigurasi berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting work location config:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

