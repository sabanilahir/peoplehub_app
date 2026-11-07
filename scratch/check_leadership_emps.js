const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificEmps() {
  const emps = await prisma.employee.findMany({
    where: {
      OR: [
        { jobPosition: { in: ['Manager', 'Supervisor / Coordinator'] } },
        { dept: 'HR/GA' }
      ]
    },
    select: { id: true, name: true, dept: true, jobPosition: true, jobTitle: true, role: true }
  });
  console.log(`Total key leadership emps: ${emps.length}`);
  console.log(JSON.stringify(emps, null, 2));
}

checkSpecificEmps().catch(console.error).finally(() => prisma.$disconnect());

