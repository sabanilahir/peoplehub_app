import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function setAriLate() {
  const ari = await prisma.employee.findFirst({
    where: { name: { contains: 'ARI TEGAR', mode: 'insensitive' } }
  });
  console.log('Employee:', ari?.id, ari?.name, 'odoo_id:', ari?.odoo_id);

  if (!ari) {
    console.error('Ari Tegar not found');
    return;
  }

  // Ensure late record exists on 2026-10-15 (in cut-off 26 Sep - 25 Oct)
  const existing = await prisma.attendance.findFirst({
    where: { empId: ari.id, date: '2026-10-15' }
  });

  if (existing) {
    const up = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        status: 'Late',
        lateMinutes: 35,
        penaltyAmount: 50000,
        checkIn: '08:35',
        checkOut: '17:00',
        note: 'Terlambat 35 menit',
      }
    });
    console.log('✅ Updated late record:', up);
  } else {
    const cr = await prisma.attendance.create({
      data: {
        empId: ari.id,
        date: '2026-10-15',
        status: 'Late',
        lateMinutes: 35,
        penaltyAmount: 50000,
        checkIn: '08:35',
        checkOut: '17:00',
        note: 'Terlambat 35 menit',
      }
    });
    console.log('✅ Created late record:', cr);
  }
}

setAriLate().finally(async () => {
  await prisma.$disconnect();
});

