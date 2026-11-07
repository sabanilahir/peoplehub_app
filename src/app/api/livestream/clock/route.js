// src/app/api/livestream/clock/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const toMinutes = (hhmm) => {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const getNowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const hostId = searchParams.get('hostId')
    const today = new Date().toISOString().split('T')[0]
    const date = searchParams.get('date') || today

    if (!hostId) {
      return Response.json({ success: false, error: 'hostId is required' }, { status: 400 })
    }

    const hostNum = Number(hostId)

    // Check active on-air session for this host
    const activeSession = await prisma.livestreamSessionLog.findFirst({
      where: {
        hostId: hostNum,
        status: 'On-Air',
      },
      include: {
        slot: true,
      },
    })

    // Get today's scheduled slots for this host
    const mySlots = await prisma.livestreamSlot.findMany({
      where: {
        hostId: hostNum,
        date,
      },
      orderBy: { slotNumber: 'asc' },
    })

    // Get today's logs for this host
    const todayLogs = await prisma.livestreamSessionLog.findMany({
      where: {
        hostId: hostNum,
        date,
      },
      orderBy: { id: 'desc' },
    })

    return Response.json({
      success: true,
      date,
      activeSession,
      slots: mySlots,
      logs: todayLogs,
    })
  } catch (error) {
    console.error('Error in livestream clock GET:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action, hostId, slotId, logId, notes, customTime } = body
    const nowHHMM = customTime || getNowHHMM()
    const today = new Date().toISOString().split('T')[0]

    // Fetch rate config for penalty calculation
    const rateConfig = await prisma.livestreamRateConfig.findFirst({
      where: { active: true },
    })
    const penaltyUnit = rateConfig?.penaltyPer10Min || 10000

    // 1. CLOCK IN (Mulai Sesi Live)
    if (action === 'clock-in') {
      if (!hostId) {
        return Response.json({ success: false, error: 'hostId is required' }, { status: 400 })
      }

      const hostNum = Number(hostId)

      // Prevent multiple concurrent active sessions
      const ongoing = await prisma.livestreamSessionLog.findFirst({
        where: { hostId: hostNum, status: 'On-Air' },
      })
      if (ongoing) {
        return Response.json(
          { success: false, error: 'Anda masih memiliki sesi live yang sedang On-Air. Selesaikan sesi tersebut terlebih dahulu.' },
          { status: 400 }
        )
      }

      // Find host employee details
      const host = await prisma.employee.findUnique({
        where: { id: hostNum },
      })

      let slot = null
      if (slotId) {
        slot = await prisma.livestreamSlot.findUnique({
          where: { id: Number(slotId) },
        })
      } else {
        // Find nearest slot today
        slot = await prisma.livestreamSlot.findFirst({
          where: { hostId: hostNum, date: today },
          orderBy: { slotNumber: 'asc' },
        })
      }

      const scheduledStart = slot?.startTime || nowHHMM
      const scheduledEnd = slot?.endTime || '02:00'

      // Calculate tardiness (grace period: 3 minutes)
      const nowMin = toMinutes(nowHHMM)
      const schedMin = toMinutes(scheduledStart)
      let lateMinutes = 0
      let penaltyAmount = 0

      // Only evaluate tardiness if within regular day window
      if (nowMin > schedMin + 3) {
        lateMinutes = nowMin - schedMin
        // Penalty: Rp 10.000 per 1-10 menit
        penaltyAmount = Math.ceil(lateMinutes / 10) * penaltyUnit
      }

      const log = await prisma.livestreamSessionLog.create({
        data: {
          slotId: slot?.id || null,
          hostId: hostNum,
          hostName: host?.name || `Host #${hostNum}`,
          date: slot?.date || today,
          scheduledStart,
          scheduledEnd,
          actualStart: nowHHMM,
          lateMinutes,
          penaltyAmount,
          status: 'On-Air',
          notes: notes || null,
        },
      })

      if (slot) {
        await prisma.livestreamSlot.update({
          where: { id: slot.id },
          data: { status: 'On-Air' },
        })
      }

      return Response.json({
        success: true,
        message: `Clock In Berhasil! Sesi live dimulai pukul ${nowHHMM}`,
        log,
      })
    }

    // 2. CLOCK OUT (Selesai Sesi Live)
    if (action === 'clock-out') {
      let log = null
      if (logId) {
        log = await prisma.livestreamSessionLog.findUnique({ where: { id: Number(logId) } })
      } else if (hostId) {
        log = await prisma.livestreamSessionLog.findFirst({
          where: { hostId: Number(hostId), status: 'On-Air' },
          orderBy: { id: 'desc' },
        })
      }

      if (!log) {
        return Response.json({ success: false, error: 'Tidak ditemukan sesi aktif untuk di-Clock Out' }, { status: 404 })
      }

      const startMin = toMinutes(log.actualStart)
      let endMin = toMinutes(nowHHMM)

      // Handle midnight crossing (e.g. 23:00 to 01:00)
      if (endMin < startMin) {
        endMin += 1440
      }

      const durationMinutes = Math.max(0, endMin - startMin)
      const durationHours = parseFloat((durationMinutes / 60).toFixed(2))

      const updatedLog = await prisma.livestreamSessionLog.update({
        where: { id: log.id },
        data: {
          actualEnd: nowHHMM,
          durationMinutes,
          durationHours,
          status: log.lateMinutes > 0 ? 'Late' : 'Completed',
          notes: notes !== undefined ? notes : log.notes,
        },
      })

      if (log.slotId) {
        await prisma.livestreamSlot.update({
          where: { id: log.slotId },
          data: { status: 'Completed' },
        })
      }

      return Response.json({
        success: true,
        message: `Clock Out Berhasil! Durasi siaran: ${durationHours} jam (${durationMinutes} menit)`,
        log: updatedLog,
      })
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in livestream clock POST:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

