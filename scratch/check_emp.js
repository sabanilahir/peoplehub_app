const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'ARI TEGAR', mode: 'insensitive' } }
  });
  console.log({
    id: emp.id,
    name: emp.name,
    jobPosition: emp.jobPosition,
    jobTitle: emp.jobTitle,
    position: emp.position,
    location: emp.location,
    workLocationCode: emp.workLocationCode,
    address: emp.address,
    dept: emp.dept
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

