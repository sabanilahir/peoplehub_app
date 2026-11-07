const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkAddresses() {
  const emps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, address: true, companyId: true }
  });
  console.log(`Total Odoo emps: ${emps.length}`);
  
  const sample = emps.slice(0, 10);
  console.log("Sample addresses in DB:");
  sample.forEach(e => console.log(`[${e.name}]:\n${e.address}\n---`));

  // Check distinct first lines of address
  const firstLines = {};
  emps.forEach(e => {
    const firstLine = (e.address || '').split('\n')[0].trim() || 'EMPTY';
    firstLines[firstLine] = (firstLines[firstLine] || 0) + 1;
  });
  console.log("Distinct first lines (Company candidate):", firstLines);

  // Check companies in DB
  const companies = await prisma.company.findMany();
  console.log("Current companies in DB:", companies);
}

checkWorkAddresses().catch(console.error).finally(() => prisma.$disconnect());

