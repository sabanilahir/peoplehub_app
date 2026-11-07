const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHrEmps() {
  const emps = await prisma.employee.findMany({
    where: {
      OR: [
        { dept: { contains: 'HR', mode: 'insensitive' } },
        { jobPosition: { contains: 'Manager', mode: 'insensitive' } },
        { position: { contains: 'Manager', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, nik: true, dept: true, position: true, jobPosition: true, jobTitle: true, role: true }
  });
  console.log(`Matching employees (${emps.length}):`);
  emps.forEach(e => {
    console.log(`- [ID: ${e.id}] ${e.name} | Dept: "${e.dept}" | JobPos: "${e.jobPosition}" | JobTitle: "${e.jobTitle}" | Pos: "${e.position}" | Role: "${e.role}"`);
  });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { dept: { contains: 'HR', mode: 'insensitive' } },
        { position: { contains: 'Manager', mode: 'insensitive' } }
      ]
    },
    select: { id: true, username: true, name: true, role: true, dept: true, position: true, employeeId: true }
  });
  console.log(`\nMatching users (${users.length}):`);
  users.forEach(u => {
    console.log(`- [User ID: ${u.id}] ${u.name} (${u.username}) | Role: "${u.role}" | Dept: "${u.dept}" | Pos: "${u.position}" | EmpId: ${u.employeeId}`);
  });
}

checkHrEmps().catch(console.error).finally(() => prisma.$disconnect());

