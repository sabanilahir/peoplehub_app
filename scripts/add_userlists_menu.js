const { prisma } = require('../src/lib/prisma');

async function execute() {
  try {
    // 1. Geser order analytics dan flowable settings
    await prisma.menuItem.updateMany({
      where: { key: 'sysadmin-workflow-analytics' },
      data: { order: 5 }
    });
    await prisma.menuItem.updateMany({
      where: { key: 'sysadmin-workflow-settings' },
      data: { order: 6 }
    });

    // 2. Izinkan role hr_manager & hr pada root sysadmin-workflow (ID 510)
    await prisma.menuItem.update({
      where: { id: 510 },
      data: {
        roles: JSON.stringify(['superadmin', 'sysadmin', 'hr_manager', 'hr'])
      }
    });

    // 3. Upsert menu Userlists di bawah parent 510
    const upserted = await prisma.menuItem.upsert({
      where: { key: 'sysadmin-workflow-userlists' },
      create: {
        id: 517,
        key: 'sysadmin-workflow-userlists',
        label: 'Userlists (Grup Penyetuju)',
        icon: 'users',
        href: '/sysadmin/workflow/userlists',
        parentId: 510,
        roles: JSON.stringify(['superadmin', 'sysadmin', 'hr_manager', 'hr']),
        departments: JSON.stringify(['*']),
        order: 4,
        active: true,
      },
      update: {
        label: 'Userlists (Grup Penyetuju)',
        icon: 'users',
        href: '/sysadmin/workflow/userlists',
        parentId: 510,
        roles: JSON.stringify(['superadmin', 'sysadmin', 'hr_manager', 'hr']),
        departments: JSON.stringify(['*']),
        order: 4,
        active: true,
      }
    });

    console.log('Successfully upserted menu item:', upserted.id, upserted.label);

    // 4. Verifikasi seluruh item di parent 510
    const items = await prisma.menuItem.findMany({
      where: { parentId: 510 },
      orderBy: { order: 'asc' }
    });
    console.log('\nUpdated parent 510 items:');
    items.forEach(it => console.log(`[Order ${it.order}] ${it.key} -> ${it.label} (${it.href})`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

execute();
