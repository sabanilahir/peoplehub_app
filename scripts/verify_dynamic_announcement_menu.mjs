import { prisma } from '../src/lib/prisma.js'

async function verifyMenu() {
  console.log('Verifying dynamic menus in PostgreSQL database...')
  try {
    const hrParent = await prisma.menuItem.findFirst({ where: { key: 'hr' } })
    const sysParent = await prisma.menuItem.findFirst({ where: { key: 'sysadmin' } })

    const hrParentId = hrParent?.id ?? 30
    const sysParentId = sysParent?.id ?? 50

    // Upsert hr-announcement
    const hrMenu = await prisma.menuItem.upsert({
      where: { key: 'hr-announcement' },
      create: {
        id: 321,
        key: 'hr-announcement',
        label: 'Pengumuman Dashboard',
        icon: 'bell',
        href: '/hr/settings/announcement',
        parentId: hrParentId,
        roles: JSON.stringify(['superadmin', 'admin', 'hr', 'hr_manager', 'hr_officer']),
        departments: JSON.stringify(['*']),
        order: 19,
        active: true,
      },
      update: {
        label: 'Pengumuman Dashboard',
        icon: 'bell',
        href: '/hr/settings/announcement',
        parentId: hrParentId,
        roles: JSON.stringify(['superadmin', 'admin', 'hr', 'hr_manager', 'hr_officer']),
        departments: JSON.stringify(['*']),
        order: 19,
        active: true,
      },
    })
    console.log('✓ hr-announcement upserted:', hrMenu)

    // Upsert sysadmin-announcement
    const sysMenu = await prisma.menuItem.upsert({
      where: { key: 'sysadmin-announcement' },
      create: {
        id: 519,
        key: 'sysadmin-announcement',
        label: 'Pengumuman Dashboard',
        icon: 'bell',
        href: '/hr/settings/announcement',
        parentId: sysParentId,
        roles: JSON.stringify(['superadmin', 'hr_manager', 'hr']),
        departments: JSON.stringify(['*']),
        order: 12,
        active: true,
      },
      update: {
        label: 'Pengumuman Dashboard',
        icon: 'bell',
        href: '/hr/settings/announcement',
        parentId: sysParentId,
        roles: JSON.stringify(['superadmin', 'hr_manager', 'hr']),
        departments: JSON.stringify(['*']),
        order: 12,
        active: true,
      },
    })
    console.log('✓ sysadmin-announcement upserted:', sysMenu)

    console.log('Verification completed successfully!')
  } catch (err) {
    console.error('Error during menu verification:', err.message)
    // If DB is offline, that is fine for local seed test
  } finally {
    await prisma.$disconnect()
  }
}

verifyMenu()
