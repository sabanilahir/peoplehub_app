const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const e = await prisma.employee.findFirst({
    where: { name: { contains: 'ARI TEGAR', mode: 'insensitive' } },
    select: { id: true, name: true, jobPosition: true, jobTitle: true, position: true, location: true }
  });
  console.log('Ari Tegar in DB:', e);
  await prisma.$disconnect();
}
main().catch(console.error);

