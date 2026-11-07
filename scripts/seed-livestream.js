// scripts/seed-livestream.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Seeding Livestream Configuration & Data ---')

  // 1. Rate Configuration
  const existingConfig = await prisma.livestreamRateConfig.findFirst()
  if (!existingConfig) {
    await prisma.livestreamRateConfig.create({
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
    console.log('✓ LivestreamRateConfig created')
  } else {
    console.log('ℹ LivestreamRateConfig already exists')
  }

  // 2. Sample 6 Hosts from spreadsheet
  const hostNames = ['Melly', 'Sevia', 'Romi', 'Rizki', 'Cecil', 'Mella']
  const maxAgg = await prisma.employee.aggregate({ _max: { id: true } })
  let nextId = (maxAgg._max.id || 300022) + 1

  for (let i = 0; i < hostNames.length; i++) {
    const name = hostNames[i]
    let emp = await prisma.employee.findFirst({ where: { name } })
    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          id: nextId++,
          nik: `LIVE${1001 + i}`,
          name,
          dept: 'Livestream',
          position: 'Live Stream Host',
          location: 'Studio Live',
          status: 'Active',
          employmentType: 'Freelance / Contract',
        },
      })
      console.log(`✓ Host employee created: ${name} (ID: ${emp.id})`)
    }

    // Ensure User account exists for host login
    const username = name.toLowerCase().replace(/\s+/g, '')
    const user = await prisma.user.findFirst({ where: { username } })
    if (!user) {
      await prisma.user.create({
        data: {
          id: emp.id,
          username,
          password: 'password123',
          name,
          role: 'employee',
          dept: 'Livestream',
          position: 'Live Stream Host',
          employeeId: emp.id,
        },
      })
      console.log(`✓ User account created: ${username} (password: password123)`)
    }
  }

  // 3. Menus in MenuItem
  // Check ESS parent (id: 10)
  const essParent = await prisma.menuItem.findUnique({ where: { id: 10 } })
  if (essParent) {
    await prisma.menuItem.upsert({
      where: { key: 'ess-livestream' },
      create: {
        key: 'ess-livestream',
        label: 'Live Streaming Host',
        icon: 'Video',
        href: '/ess/livestream',
        parentId: 10,
        roles: JSON.stringify(['*']),
        order: 9,
        active: true,
      },
      update: {
        label: 'Live Streaming Host',
        href: '/ess/livestream',
        parentId: 10,
        order: 9,
      },
    })
    console.log('✓ Menu ESS Live Streaming registered')
  }

  // Check HR parent (id: 30)
  const hrParent = await prisma.menuItem.findUnique({ where: { id: 30 } })
  if (hrParent) {
    await prisma.menuItem.upsert({
      where: { key: 'hr-livestream-schedule' },
      create: {
        key: 'hr-livestream-schedule',
        label: 'Livestream Schedule',
        icon: 'CalendarCheck',
        href: '/hr/livestream/schedule',
        parentId: 30,
        roles: JSON.stringify(['hr', 'hr_officer', 'hr_manager', 'superadmin']),
        order: 9,
        active: true,
      },
      update: {
        label: 'Livestream Schedule',
        href: '/hr/livestream/schedule',
        parentId: 30,
        order: 9,
      },
    })

    await prisma.menuItem.upsert({
      where: { key: 'hr-livestream-payroll' },
      create: {
        key: 'hr-livestream-payroll',
        label: 'Livestream Payroll',
        icon: 'Coins',
        href: '/hr/livestream/payroll',
        parentId: 30,
        roles: JSON.stringify(['hr', 'hr_officer', 'hr_manager', 'superadmin']),
        order: 10,
        active: true,
      },
      update: {
        label: 'Livestream Payroll',
        href: '/hr/livestream/payroll',
        parentId: 30,
        order: 10,
      },
    })
    console.log('✓ Menus HR Livestream Schedule & Payroll registered')
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
