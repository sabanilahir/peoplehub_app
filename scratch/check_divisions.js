const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDivisions() {
  const divs = await prisma.division.findMany();
  console.log("Divisions:", divs);
}

checkDivisions().catch(console.error).finally(() => prisma.$disconnect());

