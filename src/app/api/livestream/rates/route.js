// src/app/api/livestream/rates/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let config = await prisma.livestreamRateConfig.findFirst({
      where: { active: true },
    })

    if (!config) {
      config = await prisma.livestreamRateConfig.create({
        data: {
          name: 'Standar Host Livestreaming 24 Jam',
          tiers: [
            { minHours: 60, maxHours: 90, ratePerHour: 60000 },
            { minHours: 91, maxHours: 120, ratePerHour: 65000 },
            { minHours: 121, maxHours: 150, ratePerHour: 70000 },
          ],
          underMinRate: 50000,
          overMaxRate: 70000,
          penaltyPer10Min: 10000,
          active: true,
        },
      })
    }

    return Response.json({ success: true, config })
  } catch (error) {
    console.error('Error fetching rate config:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const { tiers, underMinRate, overMaxRate, penaltyPer10Min, name } = body

    const existing = await prisma.livestreamRateConfig.findFirst({
      where: { active: true },
    })

    let updated
    if (existing) {
      updated = await prisma.livestreamRateConfig.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          tiers: tiers || existing.tiers,
          underMinRate: underMinRate !== undefined ? Number(underMinRate) : existing.underMinRate,
          overMaxRate: overMaxRate !== undefined ? Number(overMaxRate) : existing.overMaxRate,
          penaltyPer10Min: penaltyPer10Min !== undefined ? Number(penaltyPer10Min) : existing.penaltyPer10Min,
        },
      })
    } else {
      updated = await prisma.livestreamRateConfig.create({
        data: {
          name: name || 'Standar Host Livestreaming 24 Jam',
          tiers: tiers || [
            { minHours: 60, maxHours: 90, ratePerHour: 60000 },
            { minHours: 91, maxHours: 120, ratePerHour: 65000 },
            { minHours: 121, maxHours: 150, ratePerHour: 70000 },
          ],
          underMinRate: underMinRate ? Number(underMinRate) : 50000,
          overMaxRate: overMaxRate ? Number(overMaxRate) : 70000,
          penaltyPer10Min: penaltyPer10Min ? Number(penaltyPer10Min) : 10000,
          active: true,
        },
      })
    }

    return Response.json({ success: true, config: updated })
  } catch (error) {
    console.error('Error updating rate config:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

