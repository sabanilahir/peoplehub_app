import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.odooSettings.findMany();
  console.log('Existing OdooSettings in DB:', settings);
}

main().finally(async () => {
  await prisma.$disconnect();
});

