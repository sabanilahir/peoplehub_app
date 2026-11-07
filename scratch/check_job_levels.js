const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJobPositions() {
  const emps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, jobPosition: true, jobTitle: true, dept: true }
  });
  console.log(`Total Odoo emps: ${emps.length}`);

  const counts = {};
  const byDept = {};

  emps.forEach(e => {
    const jp = e.jobPosition || 'EMPTY';
    counts[jp] = (counts[jp] || 0) + 1;

    const d = e.dept || 'EMPTY';
    if (!byDept[d]) byDept[d] = {};
    byDept[d][jp] = (byDept[d][jp] || 0) + 1;
  });

  console.log("Overall Job Position counts in Odoo emps:", counts);
  console.log("\nBreakdown Job Position by Department:");
  console.log(JSON.stringify(byDept, null, 2));

  // Let's also check all roles currently in User table and in roles.js
  const users = await prisma.user.findMany({
    select: { role: true }
  });
  const userRoleCounts = {};
  users.forEach(u => {
    userRoleCounts[u.role] = (userRoleCounts[u.role] || 0) + 1;
  });
  console.log("\nCurrent User table role counts:", userRoleCounts);
}

checkJobPositions().catch(console.error).finally(() => prisma.$disconnect());

