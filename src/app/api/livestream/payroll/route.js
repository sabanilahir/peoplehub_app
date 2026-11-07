// src/app/api/livestream/payroll/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const month = searchParams.get('month') || defaultMonth
    const hostId = searchParams.get('hostId')

    // 1. Get Rate Config
    const rateConfig = await prisma.livestreamRateConfig.findFirst({
      where: { active: true },
    })

    const tiers = rateConfig?.tiers || [
      { minHours: 60, maxHours: 90, ratePerHour: 60000 },
      { minHours: 91, maxHours: 120, ratePerHour: 65000 },
      { minHours: 121, maxHours: 150, ratePerHour: 70000 },
    ]
    const underMinRate = rateConfig?.underMinRate ?? 50000
    const overMaxRate = rateConfig?.overMaxRate ?? 70000

    // 2. Fetch all hosts (Livestream dept or anyone with session logs)
    let hosts = await prisma.employee.findMany({
      where: {
        OR: [
          { dept: { contains: 'Livestream', mode: 'insensitive' } },
          { position: { contains: 'Live', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        dept: true,
        position: true,
        location: true,
      },
      orderBy: { name: 'asc' },
    })

    // If specific host requested
    if (hostId) {
      hosts = hosts.filter((h) => h.id === Number(hostId))
    }

    // 3. Fetch Session Logs for this month
    const sessionLogs = await prisma.livestreamSessionLog.findMany({
      where: {
        date: {
          startsWith: month,
        },
        ...(hostId ? { hostId: Number(hostId) } : {}),
      },
      orderBy: { date: 'asc' },
    })

    // Group logs by hostId
    const logsByHost = {}
    for (const log of sessionLogs) {
      if (!logsByHost[log.hostId]) {
        logsByHost[log.hostId] = []
      }
      logsByHost[log.hostId].push(log)
    }

    // 4. Calculate for each host
    const summaryList = hosts.map((host) => {
      const logs = logsByHost[host.id] || []
      const totalSessions = logs.length
      const totalMinutes = logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0)
      const totalHours = parseFloat((totalMinutes / 60).toFixed(2))
      const totalLateMinutes = logs.reduce((sum, l) => sum + (l.lateMinutes || 0), 0)
      const totalPenalty = logs.reduce((sum, l) => sum + (l.penaltyAmount || 0), 0)

      // Tier evaluation
      let ratePerHour = underMinRate
      let tierName = '< 60 Jam (Base Rate)'
      let tierLevel = 0
      let nextTierHours = 60
      let nextTierRate = 60000

      if (totalHours < 60) {
        ratePerHour = underMinRate
        tierName = 'Belum Capai Tier (< 60 Jam)'
        tierLevel = 0
        nextTierHours = 60
        nextTierRate = 60000
      } else if (totalHours >= 60 && totalHours <= 90) {
        ratePerHour = tiers[0]?.ratePerHour || 60000
        tierName = 'Tier 1 (60 - 90 Jam)'
        tierLevel = 1
        nextTierHours = 91
        nextTierRate = tiers[1]?.ratePerHour || 65000
      } else if (totalHours > 90 && totalHours <= 120) {
        ratePerHour = tiers[1]?.ratePerHour || 65000
        tierName = 'Tier 2 (91 - 120 Jam)'
        tierLevel = 2
        nextTierHours = 121
        nextTierRate = tiers[2]?.ratePerHour || 70000
      } else if (totalHours > 120 && totalHours <= 150) {
        ratePerHour = tiers[2]?.ratePerHour || 70000
        tierName = 'Tier 3 (121 - 150 Jam)'
        tierLevel = 3
        nextTierHours = null
        nextTierRate = null
      } else {
        ratePerHour = overMaxRate
        tierName = 'Maksimal Tier (> 150 Jam)'
        tierLevel = 4
        nextTierHours = null
        nextTierRate = null
      }

      const grossHonor = Math.round(totalHours * ratePerHour)
      const netHonor = Math.max(0, grossHonor - totalPenalty)
      const hoursToNextTier = nextTierHours ? Math.max(0, parseFloat((nextTierHours - totalHours).toFixed(2))) : 0

      return {
        hostId: host.id,
        hostName: host.name,
        dept: host.dept,
        position: host.position,
        totalSessions,
        totalMinutes,
        totalHours,
        totalLateMinutes,
        totalPenalty,
        tierLevel,
        tierName,
        ratePerHour,
        nextTierHours,
        nextTierRate,
        hoursToNextTier,
        grossHonor,
        netHonor,
        logs,
      }
    })

    // Overall Totals
    const grandTotalHours = summaryList.reduce((sum, h) => sum + h.totalHours, 0)
    const grandTotalGross = summaryList.reduce((sum, h) => sum + h.grossHonor, 0)
    const grandTotalPenalty = summaryList.reduce((sum, h) => sum + h.totalPenalty, 0)
    const grandTotalNet = summaryList.reduce((sum, h) => sum + h.netHonor, 0)

    return Response.json({
      success: true,
      month,
      rateConfig: {
        tiers,
        underMinRate,
        overMaxRate,
        penaltyPer10Min: rateConfig?.penaltyPer10Min || 10000,
      },
      grandTotals: {
        totalHours: parseFloat(grandTotalHours.toFixed(2)),
        totalGross: grandTotalGross,
        totalPenalty: grandTotalPenalty,
        totalNet: grandTotalNet,
        activeHostsCount: summaryList.filter((s) => s.totalSessions > 0).length,
      },
      summary: summaryList,
    })
  } catch (error) {
    console.error('Error in livestream payroll calculation:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

