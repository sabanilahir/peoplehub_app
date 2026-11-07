import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function setAriLateCurrentCutoff() {
  const ari = await prisma.employee.findFirst({
    where: { name: { contains: 'ARI TEGAR', mode: 'insensitive' } }
  });

  // Cut-off period 26 Oct - 25 Nov: set record on 2026-11-03
  const date = '2026-11-03';
  const existing = await prisma.attendance.findFirst({
    where: { empId: ari.id, date }
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        status: 'Late',
        lateMinutes: 45,
        penaltyAmount: 50000,
        checkIn: '08:45',
        checkOut: '17:00',
        note: 'Terlambat 45 menit (Traffic)',
      }
    });
  } else {
    await prisma.attendance.create({
      data: {
        empId: ari.id,
        date,
        status: 'Late',
        lateMinutes: 45,
        penaltyAmount: 50000,
        checkIn: '08:45',
        checkOut: '17:00',
        note: 'Terlambat 45 menit (Traffic)',
      }
    });
  }
  console.log('✅ Added late record on 2026-11-03 for Ari Tegar Riawan.');
}

setAriLateCurrentCutoff().finally(async () => {
  await prisma.$disconnect();
});

