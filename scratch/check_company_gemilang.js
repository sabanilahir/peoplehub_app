const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGN() {
  const comp = await prisma.company.findFirst({
    where: { name: { contains: 'Gemilang', mode: 'insensitive' } }
  });
  console.log("Existing company with 'Gemilang':", comp);

  const allComps = await prisma.company.findMany({
    select: { id: true, code: true, companyCode: true, name: true }
  });
  console.log("All companies:", allComps);
}

checkGN().catch(console.error).finally(() => prisma.$disconnect());

