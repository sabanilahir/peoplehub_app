const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDepts() {
  const emps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, odoo_id: true, departmentId: true, dept: true }
  });
  console.log(`Total Odoo emps in DB: ${emps.length}`);
  const sample = emps.slice(0, 10);
  console.log("Sample emps dept fields:", sample);

  const deptsInDb = await prisma.department.findMany();
  console.log("Total departments in DB:", deptsInDb.length);
  console.log("Departments in DB:", deptsInDb.map(d => ({ id: d.id, name: d.name, odoo_id: d.odoo_id })));
}

checkDepts().catch(console.error).finally(() => prisma.$disconnect());

