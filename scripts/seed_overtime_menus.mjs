import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const essParent = await prisma.menuItem.findFirst({ where: { key: 'ess' } });
  const mssParent = await prisma.menuItem.findFirst({ where: { key: 'mss' } });

  console.log('ESS Parent:', essParent?.id, 'MSS Parent:', mssParent?.id);

  if (essParent) {
    const essOt = await prisma.menuItem.upsert({
      where: { key: 'ess-overtime' },
      create: {
        id: 109,
        key: 'ess-overtime',
        label: 'Pengajuan Lembur',
        icon: 'clock',
        href: '/ess/overtime',
        parentId: essParent.id,
        roles: JSON.stringify(['*']),
        departments: JSON.stringify(['*']),
        order: 10,
        active: true,
      },
      update: {
        label: 'Pengajuan Lembur',
        icon: 'clock',
        href: '/ess/overtime',
        parentId: essParent.id,
        roles: JSON.stringify(['*']),
        departments: JSON.stringify(['*']),
        order: 10,
        active: true,
      },
    });
    console.log('Upserted ess-overtime:', essOt);
  }

  if (mssParent) {
    const mssOt = await prisma.menuItem.upsert({
      where: { key: 'mss-approve-overtime' },
      create: {
        id: 405,
        key: 'mss-approve-overtime',
        label: 'Approve Overtime',
        icon: 'check-circle',
        href: '/mss/approve-overtime',
        parentId: mssParent.id,
        roles: JSON.stringify(['*']),
        departments: JSON.stringify(['*']),
        order: 5,
        active: true,
      },
      update: {
        label: 'Approve Overtime',
        icon: 'check-circle',
        href: '/mss/approve-overtime',
        parentId: mssParent.id,
        roles: JSON.stringify(['*']),
        departments: JSON.stringify(['*']),
        order: 5,
        active: true,
      },
    });
    console.log('Upserted mss-approve-overtime:', mssOt);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
