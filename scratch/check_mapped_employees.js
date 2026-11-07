const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const summary = await prisma.employee.groupBy({
    by: ['location', 'workLocationCode', 'odooWorkLocationId'],
    _count: { id: true },
  });
  console.log('Employee location and mapping summary:');
  console.table(summary);
  await prisma.$disconnect();
}
main().catch(console.error);

