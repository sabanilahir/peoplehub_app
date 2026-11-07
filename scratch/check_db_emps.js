const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDbEmps() {
  const emps = await prisma.employee.findMany({
    where: { odoo_id: { in: ['523', '607', '518', '5'] } }
  });
  console.log("DB Employees in screenshot:");
  for (const e of emps) {
    console.log(`- NIK: ${e.nik}, Name: ${e.name}, employmentType: "${e.employmentType}"`);
  }
}

checkDbEmps().catch(console.error).finally(() => prisma.$disconnect());

