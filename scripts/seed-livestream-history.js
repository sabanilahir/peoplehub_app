// scripts/seed-livestream-history.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Generating Realistic Livestream History for Oct 2026 ---')

  const hosts = await prisma.employee.findMany({
    where: {
      name: { in: ['Melly', 'Sevia', 'Romi', 'Rizki', 'Cecil', 'Mella'] },
    },
  })

  // Target hours per host for realistic tier demonstration
  const targets = {
    Melly: 78,   // Tier 1 (60-90): Rp 60k
    Sevia: 104,  // Tier 2 (91-120): Rp 65k
    Romi: 132,   // Tier 3 (121-150): Rp 70k
    Rizki: 84,   // Tier 1 (60-90): Rp 60k
    Cecil: 112,  // Tier 2 (91-120): Rp 65k
    Mella: 142,  // Tier 3 (121-150): Rp 70k
  }

  // Clear existing logs for fresh simulation
  await prisma.livestreamSessionLog.deleteMany({})

  for (const host of hosts) {
    const targetHours = targets[host.name] || 80
    console.log(`Generating sessions for ${host.name} to reach ~${targetHours} hours...`)

    let hoursAccumulated = 0
    let sessionIdx = 1

    for (let day = 1; day <= 28; day++) {
      if (hoursAccumulated >= targetHours) break

      const dateStr = `2026-10-${String(day).padStart(2, '0')}`
      // Sesi 1
      const isLate = sessionIdx % 9 === 0
      const lateMins = isLate ? 8 : 0
      const penalty = isLate ? 10000 : 0
      const dur = isLate ? 1.87 : 2.0
      const durMin = isLate ? 112 : 120

      await prisma.livestreamSessionLog.create({
        data: {
          hostId: host.id,
          hostName: host.name,
          date: dateStr,
          scheduledStart: '08:00',
          scheduledEnd: '10:00',
          actualStart: isLate ? '08:08' : '08:00',
          actualEnd: '10:00',
          durationMinutes: durMin,
          durationHours: dur,
          lateMinutes: lateMins,
          penaltyAmount: penalty,
          status: isLate ? 'Late' : 'Completed',
          notes: isLate ? 'Telat 8 menit' : 'Siaran lancar',
        },
      })
      hoursAccumulated += dur
      sessionIdx++

      // Sesi 2
      if (hoursAccumulated < targetHours) {
        await prisma.livestreamSessionLog.create({
          data: {
            hostId: host.id,
            hostName: host.name,
            date: dateStr,
            scheduledStart: '12:00',
            scheduledEnd: '14:00',
            actualStart: '12:00',
            actualEnd: '14:00',
            durationMinutes: 120,
            durationHours: 2.0,
            lateMinutes: 0,
            penaltyAmount: 0,
            status: 'Completed',
            notes: 'Sesi 2 lancar',
          },
        })
        hoursAccumulated += 2.0
        sessionIdx++
      }

      // Sesi 3 (untuk host rajin lembur seperti Romi & Mella)
      if (['Romi', 'Mella'].includes(host.name) && hoursAccumulated < targetHours) {
        await prisma.livestreamSessionLog.create({
          data: {
            hostId: host.id,
            hostName: host.name,
            date: dateStr,
            scheduledStart: '16:00',
            scheduledEnd: '18:00',
            actualStart: '16:00',
            actualEnd: '18:00',
            durationMinutes: 120,
            durationHours: 2.0,
            lateMinutes: 0,
            penaltyAmount: 0,
            status: 'Completed',
            notes: 'Sesi tambahan malam',
          },
        })
        hoursAccumulated += 2.0
        sessionIdx++
      }
    }
  }

  console.log('✓ Simulated October sessions generated successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
