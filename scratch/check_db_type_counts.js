const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSync() {
  const empList = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, odoo_id: true, employmentType: true }
  });
  console.log(`Total Odoo employees in DB: ${empList.length}`);
  const counts = {};
  empList.forEach(e => {
    counts[e.employmentType] = (counts[e.employmentType] || 0) + 1;
  });
  console.log("Current DB employmentType counts:", counts);
}

checkSync().catch(console.error).finally(() => prisma.$disconnect());

