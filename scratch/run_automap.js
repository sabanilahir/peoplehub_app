const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAutoMap() {
  console.log('Running Auto-Mapping on all employees in database...');

  const employees = await prisma.employee.findMany();
  let updated = 0;

  for (const emp of employees) {
    let loc = (emp.location || '').trim();
    let code = emp.workLocationCode;
    let dept = (emp.dept || '').toLowerCase();
    let odooWorkLocationId = emp.odooWorkLocationId;

    if (!code || !loc || loc === 'Office' || loc === 'Other' || loc === 'Home') {
      const norm = loc.toLowerCase();
      if (norm.includes('head office') || norm === 'ho' || norm === 'office') {
        loc = 'Head Office';
        code = 'ho';
        odooWorkLocationId = '8';
      } else if (norm.includes('gudang') || norm.includes('warehouse')) {
        loc = 'Gudang';
        code = 'gudang';
        odooWorkLocationId = '9';
      } else if (norm.includes('manhattan') || norm.includes('live')) {
        loc = 'Manhattan';
        code = 'livestream';
        odooWorkLocationId = '10';
      } else if (norm.includes('others') || norm.includes('sales')) {
        loc = 'Others';
        code = 'sales';
        odooWorkLocationId = '11';
      } else {
        // Smart fallback by department
        if (dept.includes('sales')) {
          loc = 'Others';
          code = 'sales';
          odooWorkLocationId = '11';
        } else if (dept.includes('live')) {
          loc = 'Manhattan';
          code = 'livestream';
          odooWorkLocationId = '10';
        } else if (dept.includes('fullfilment') || dept.includes('gudang') || dept.includes('supplychain')) {
          loc = 'Gudang';
          code = 'gudang';
          odooWorkLocationId = '9';
        } else {
          loc = 'Head Office';
          code = 'ho';
          odooWorkLocationId = '8';
        }
      }

      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          location: loc,
          workLocationCode: code,
          odooWorkLocationId: odooWorkLocationId,
          address: emp.address || 'PT Gemilang Nusantara Pantai Indah Kapuk',
        },
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} employees with auto-mapped location and workLocationCode.`);

  const summary = await prisma.employee.groupBy({
    by: ['location', 'workLocationCode'],
    _count: { id: true },
  });
  console.table(summary);

  await prisma.$disconnect();
}

runAutoMap().catch(console.error);

