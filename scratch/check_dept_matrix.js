const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeptsAndLocations() {
  const emps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { dept: true, location: true, workLocationCode: true, jobTitle: true }
  });

  const matrix = {};
  emps.forEach(e => {
    const key = `${e.dept} (${e.location || 'No Loc'})`;
    matrix[key] = (matrix[key] || 0) + 1;
  });
  console.log("Dept + Location matrix in Odoo emps:", matrix);
}

checkDeptsAndLocations().catch(console.error).finally(() => prisma.$disconnect());

