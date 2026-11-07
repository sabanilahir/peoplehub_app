const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPosIds() {
  const odooPositions = await prisma.position.findMany({
    where: { odoo_id: { not: null } }
  });
  console.log("Positions in DB with odoo_id:", odooPositions);

  const emps = await prisma.employee.findMany({
    where: { odoo_id: { in: ['523', '607', '518', '5'] } },
    select: { id: true, name: true, odoo_id: true, positionId: true, position: true, jobTitle: true, jobPosition: true }
  });
  console.log("Sample emps position in DB:", emps);
}

checkPosIds().catch(console.error).finally(() => prisma.$disconnect());

