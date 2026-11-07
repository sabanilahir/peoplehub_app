// src/app/api/livestream/schedule/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_SLOTS = [
  { slotNumber: 1, startTime: '00:00', endTime: '02:00', timeRange: '00:00 - 02:00' },
  { slotNumber: 2, startTime: '02:00', endTime: '04:00', timeRange: '02:00 - 04:00' },
  { slotNumber: 3, startTime: '04:00', endTime: '06:00', timeRange: '04:00 - 06:00' },
  { slotNumber: 4, startTime: '06:00', endTime: '08:00', timeRange: '06:00 - 08:00' },
  { slotNumber: 5, startTime: '08:00', endTime: '10:00', timeRange: '08:00 - 10:00' },
  { slotNumber: 6, startTime: '10:00', endTime: '12:00', timeRange: '10:00 - 12:00' },
  { slotNumber: 7, startTime: '12:00', endTime: '14:00', timeRange: '12:00 - 14:00' },
  { slotNumber: 8, startTime: '14:00', endTime: '16:00', timeRange: '14:00 - 16:00' },
  { slotNumber: 9, startTime: '16:00', endTime: '18:00', timeRange: '16:00 - 18:00' },
  { slotNumber: 10, startTime: '18:00', endTime: '20:00', timeRange: '18:00 - 20:00' },
  { slotNumber: 11, startTime: '20:00', endTime: '22:00', timeRange: '20:00 - 22:00' },
  { slotNumber: 12, startTime: '22:00', endTime: '24:00', timeRange: '22:00 - 24:00' },
]

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const today = new Date().toISOString().split('T')[0]
    const date = searchParams.get('date') || today
    const channel = searchParams.get('channel') || 'TikTok Live'

    let slots = await prisma.livestreamSlot.findMany({
      where: { date, channel },
      include: {
        sessionLogs: true,
      },
      orderBy: { slotNumber: 'asc' },
    })

    // If slots not yet generated for this date and channel, initialize empty 12 slots
    if (slots.length === 0) {
      await prisma.$transaction(
        DEFAULT_SLOTS.map((s) =>
          prisma.livestreamSlot.create({
            data: {
              date,
              channel,
              slotNumber: s.slotNumber,
              startTime: s.startTime,
              endTime: s.endTime,
              timeRange: s.timeRange,
              status: 'Empty',
            },
          })
        )
      )

      slots = await prisma.livestreamSlot.findMany({
        where: { date, channel },
        include: { sessionLogs: true },
        orderBy: { slotNumber: 'asc' },
      })
    }

    return Response.json({ success: true, date, channel, slots })
  } catch (error) {
    console.error('Error fetching livestream slots:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action, date, channel = 'TikTok Live' } = body

    // 1. Action: Manual Slot Update (hanya memerlukan slotId)
    if (action === 'update-slot') {
      const { slotId, hostId, hostName, notes, status } = body
      if (!slotId) {
        return Response.json({ success: false, error: 'slotId is required' }, { status: 400 })
      }
      const updated = await prisma.livestreamSlot.update({
        where: { id: Number(slotId) },
        data: {
          hostId: hostId ? Number(hostId) : null,
          hostName: hostName || null,
          notes: notes !== undefined ? notes : undefined,
          status: status || (hostId ? 'Scheduled' : 'Empty'),
        },
      })
      return Response.json({ success: true, slot: updated })
    }

    // Validasi date untuk action lain (auto-generate dan reset-day)
    if (!date) {
      return Response.json({ success: false, error: 'Date is required' }, { status: 400 })
    }

    // 2. Action: Auto-generate 6 Hosts Rotation Pattern
    // Pola: 2 Jam Live -> 2 Jam Istirahat -> 2 Jam Live
    // Pair 1 (Slot 1, 3: Host 0 | Slot 2, 4: Host 1)
    // Pair 2 (Slot 5, 7: Host 2 | Slot 6, 8: Host 3)
    // Pair 3 (Slot 9, 11: Host 4 | Slot 10, 12: Host 5)
    if (action === 'auto-generate') {
      const { hosts } = body // Array of 6 host objects: [{ id, name }, ...]
      if (!Array.isArray(hosts) || hosts.length < 6) {
        return Response.json(
          { success: false, error: 'Auto-generate requires 6 hosts' },
          { status: 400 }
        )
      }

      // Map each of the 12 slots to the respective host
      const slotAssignmentMap = {
        1: hosts[0],
        2: hosts[1],
        3: hosts[0],
        4: hosts[1],
        5: hosts[2],
        6: hosts[3],
        7: hosts[2],
        8: hosts[3],
        9: hosts[4],
        10: hosts[5],
        11: hosts[4],
        12: hosts[5],
      }

      const updates = DEFAULT_SLOTS.map((def) => {
        const host = slotAssignmentMap[def.slotNumber]
        return prisma.livestreamSlot.upsert({
          where: {
            date_slotNumber_channel: {
              date,
              slotNumber: def.slotNumber,
              channel,
            },
          },
          create: {
            date,
            channel,
            slotNumber: def.slotNumber,
            startTime: def.startTime,
            endTime: def.endTime,
            timeRange: def.timeRange,
            hostId: host?.id ? Number(host.id) : null,
            hostName: host?.name || null,
            status: host ? 'Scheduled' : 'Empty',
          },
          update: {
            hostId: host?.id ? Number(host.id) : null,
            hostName: host?.name || null,
            status: host ? 'Scheduled' : 'Empty',
          },
        })
      })

      await prisma.$transaction(updates)

      const updatedSlots = await prisma.livestreamSlot.findMany({
        where: { date, channel },
        orderBy: { slotNumber: 'asc' },
      })

      return Response.json({
        success: true,
        message: 'Roster 24 jam berhasil digenerate otomatis dengan 6 host',
        slots: updatedSlots,
      })
    }

    // 3. Action: Clear / Reset Day Schedule
    if (action === 'reset-day') {
      await prisma.livestreamSlot.updateMany({
        where: { date, channel },
        data: {
          hostId: null,
          hostName: null,
          status: 'Empty',
          notes: null,
        },
      })
      const resetSlots = await prisma.livestreamSlot.findMany({
        where: { date, channel },
        orderBy: { slotNumber: 'asc' },
      })
      return Response.json({ success: true, slots: resetSlots })
    }

    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error saving livestream schedule:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

