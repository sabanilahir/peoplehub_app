const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkScreenshotEmps() {
  const emps = await prisma.employee.findMany({
    where: { odoo_id: { in: ['523', '607', '518', '5'] } },
    select: { id: true, name: true, odoo_id: true, departmentId: true, dept: true }
  });
  console.log("Employees in screenshot from DB:", emps);
}

checkScreenshotEmps().catch(console.error).finally(() => prisma.$disconnect());

