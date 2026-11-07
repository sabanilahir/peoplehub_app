// scripts/seed-work-locations.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Seeding WorkLocationConfig Presets ---')

  const configs = [
    {
      locationCode: 'ho',
      locationName: 'Head Office (HO)',
      workDays: 'Senin - Jumat',
      gracePeriodMinutes: 0, // Toleransi 0 menit sesuai instruksi user
      schedules: [
        { day: 'Senin - Jumat', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
      ],
      latePenalties: [
        { min: 1, max: 10, amount: 10000, label: '1 - 10 Menit' },
        { min: 11, max: 30, amount: 25000, label: '11 - 30 Menit' },
        { min: 31, max: 60, amount: 50000, label: '31 - 60 Menit' },
        { min: 61, max: 999, amount: 100000, label: '> 60 Menit / Potong Gaji Harian' },
      ],
      rewardAmount: 200000,
      rewardCriteria: 'Kehadiran 100% tanpa terlambat dan tanpa mangkir dalam 1 bulan',
      active: true,
    },
    {
      locationCode: 'gudang',
      locationName: 'Gudang / Warehouse',
      workDays: 'Senin - Sabtu',
      gracePeriodMinutes: 0, // Toleransi 0 menit
      schedules: [
        { day: 'Senin - Jumat', startTime: '08:00', endTime: '17:00', breakMinutes: 60 },
        { day: 'Sabtu', startTime: '08:00', endTime: '15:00', breakMinutes: 60 },
      ],
      latePenalties: [
        { min: 1, max: 15, amount: 15000, label: '1 - 15 Menit' },
        { min: 16, max: 45, amount: 35000, label: '16 - 45 Menit' },
        { min: 46, max: 999, amount: 75000, label: '> 45 Menit' },
      ],
      rewardAmount: 250000,
      rewardCriteria: 'Kehadiran penuh sesuai shift operasional logistik',
      active: true,
    },
    {
      locationCode: 'sales',
      locationName: 'Area Sales / Lapangan',
      workDays: 'Senin - Jumat',
      gracePeriodMinutes: 0, // Toleransi 0 menit
      schedules: [
        { day: 'Senin - Jumat', startTime: '08:30', endTime: '17:30', breakMinutes: 60 },
      ],
      latePenalties: [
        { min: 1, max: 30, amount: 15000, label: '1 - 30 Menit' },
        { min: 31, max: 999, amount: 50000, label: '> 30 Menit' },
      ],
      rewardAmount: 150000,
      rewardCriteria: 'Disiplin check-in harian & target kunjungan sales tercapai',
      active: true,
    },
    {
      locationCode: 'livestream',
      locationName: 'Studio Live Streaming',
      workDays: 'Setiap Hari (24 Jam Non-Stop)',
      gracePeriodMinutes: 0, // Toleransi 0 menit
      schedules: [
        { day: 'Setiap Hari', startTime: '00:00', endTime: '24:00', breakMinutes: 120 },
      ],
      latePenalties: [
        { min: 1, max: 10, amount: 10000, label: 'Per 1-10 menit keterlambatan sesi live' },
      ],
      rewardAmount: 300000,
      rewardCriteria: 'Mencapai target tier jam siaran 120+ jam/bulan tanpa cancel slot',
      active: true,
    },
  ]

  for (const c of configs) {
    const upserted = await prisma.workLocationConfig.upsert({
      where: { locationCode: c.locationCode },
      create: c,
      update: c,
    })
    console.log(`✓ WorkLocationConfig upserted: ${upserted.locationName} (${upserted.locationCode})`)
  }

  // Also register menu in MenuItem under sysadmin (id: 50)
  const sysadminParent = await prisma.menuItem.findUnique({ where: { id: 50 } })
  if (sysadminParent) {
    await prisma.menuItem.upsert({
      where: { key: 'sysadmin-work-location' },
      create: {
        key: 'sysadmin-work-location',
        label: 'Aturan Jam Kerja & Lokasi',
        icon: 'clock',
        href: '/sysadmin/settings/work-location',
        parentId: 50,
        roles: JSON.stringify(['superadmin', 'hr', 'hr_manager']),
        order: 10,
        active: true,
      },
      update: {
        label: 'Aturan Jam Kerja & Lokasi',
        href: '/sysadmin/settings/work-location',
        parentId: 50,
        order: 10,
      },
    })
    console.log('✓ Menu sysadmin-work-location registered')
  }

  console.log('--- Seeding completed successfully ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

