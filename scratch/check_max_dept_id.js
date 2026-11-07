const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMaxDeptId() {
  const max = await prisma.department.aggregate({ _max: { id: true } });
  console.log("Max department ID in DB:", max);
  const min = await prisma.department.aggregate({ _min: { id: true } });
  console.log("Min department ID in DB:", min);
}

checkMaxDeptId().catch(console.error).finally(() => prisma.$disconnect());

