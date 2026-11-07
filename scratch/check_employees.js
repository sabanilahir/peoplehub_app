const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const locs = await prisma.employee.groupBy({
    by: ['location'],
    _count: { id: true }
  });
  console.log('Employee location counts:', locs);

  const odooLocs = await prisma.employee.groupBy({
    by: ['location', 'imported_from'],
    _count: { id: true }
  });
  console.log('By imported_from & location:', odooLocs);

  const odooEmployees = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, location: true, dept: true, odoo_id: true }
  });
  console.log('Total Odoo employees in DB:', odooEmployees.length);
  console.log('Sample 10 Odoo employees:', odooEmployees.slice(0, 10));

  await prisma.$disconnect();
}
run().catch(console.error);

