import { PrismaClient } from '@prisma/client';
import { syncCutoffToOdoo, getCutoffDateRange } from '../src/lib/odooPayrollService.js';

const prisma = new PrismaClient();

async function testSyncPayrollToOdoo() {
  const ari = await prisma.employee.findFirst({
    where: { name: { contains: 'ARI TEGAR', mode: 'insensitive' } },
    select: { id: true, name: true, odoo_id: true }
  });
  console.log('Employee in DB:', ari);

  // Check or ensure Ari has a late attendance record in October cut-off
  const range = getCutoffDateRange('2026-10-25');
  console.log('Cutoff range:', range);

  // Upsert a test late attendance record for Ari in this cut-off period
  const testDate = '2026-10-15';
  let att = await prisma.attendance.findFirst({
    where: { empId: ari.id, date: testDate }
  });

  if (!att) {
    att = await prisma.attendance.create({
      data: {
        empId: ari.id,
        date: testDate,
        status: 'Late',
        lateMinutes: 35,
        penaltyAmount: 50000,
        checkIn: '08:35',
        checkOut: '17:00',
        note: 'Terlambat 35 menit',
      }
    });
    console.log('Created test late attendance record:', att);
  } else {
    att = await prisma.attendance.update({
      where: { id: att.id },
      data: {
        status: 'Late',
        lateMinutes: 35,
        penaltyAmount: 50000,
      }
    });
    console.log('Updated test late attendance record:', att);
  }

  // Now execute syncCutoffToOdoo for Ari
  console.log('Executing syncCutoffToOdoo for Ari...');
  const syncRes = await syncCutoffToOdoo({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    employeeIds: [ari.id],
    dryRun: false,
  });

  console.log('Sync Result:', JSON.stringify(syncRes, null, 2));
}

testSyncPayrollToOdoo().finally(async () => {
  await prisma.$disconnect();
});
