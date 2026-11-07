const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIds() {
  const empSample = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, departmentId: true, dept: true },
    take: 5
  });
  console.log("DB emp departmentId:", empSample);

  for (const e of empSample) {
    const d = await prisma.department.findUnique({ where: { id: e.departmentId } });
    console.log(`Emp ${e.name} has departmentId=${e.departmentId} -> DB Department:`, d);
  }
}

checkIds().catch(console.error).finally(() => prisma.$disconnect());
