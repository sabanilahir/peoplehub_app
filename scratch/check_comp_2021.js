const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkComp2021() {
  const comp = await prisma.company.findUnique({ where: { id: 2021 } });
  console.log("Company 2021:", comp);
}

checkComp2021().catch(console.error).finally(() => prisma.$disconnect());

