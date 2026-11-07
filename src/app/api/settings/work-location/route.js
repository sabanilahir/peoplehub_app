// src/app/api/settings/work-location/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const configs = await prisma.workLocationConfig.findMany({
      orderBy: { id: 'asc' },
    })
    return Response.json({ success: true, configs })
  } catch (error) {
    console.error('Error fetching work location configs:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      locationCode,
      locationName,
      workDays,
      gracePeriodMinutes = 0,
      schedules = [],
      latePenalties = [],
      rewardAmount = 0,
      rewardCriteria,
      active = true,
    } = body

    if (!locationCode || !locationName) {
      return Response.json(
        { success: false, error: 'Kode lokasi dan Nama lokasi wajib diisi' },
        { status: 400 }
      )
    }

    const created = await prisma.workLocationConfig.create({
      data: {
        locationCode: locationCode.toLowerCase().trim(),
        locationName: locationName.trim(),
        workDays: workDays || 'Senin - Jumat',
        gracePeriodMinutes: Number(gracePeriodMinutes) || 0,
        schedules: Array.isArray(schedules) ? schedules : [],
        latePenalties: Array.isArray(latePenalties) ? latePenalties : [],
        rewardAmount: Number(rewardAmount) || 0,
        rewardCriteria: rewardCriteria || null,
        active: Boolean(active),
      },
    })

    return Response.json({ success: true, config: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating work location config:', error)
    if (error.code === 'P2002') {
      return Response.json(
        { success: false, error: 'Kode lokasi sudah terdaftar. Gunakan kode lain.' },
        { status: 400 }
      )
    }
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

