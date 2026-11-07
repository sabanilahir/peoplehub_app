const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinalRoles() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, dept: true, position: true }
  });

  const roleCounts = {};
  users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  console.log("Updated Role distribution in User table:", roleCounts);

  // Check sample key users
  const hrManagerUsers = users.filter(u => u.role === 'hr_manager');
  console.log("\nUsers with role 'hr_manager':", hrManagerUsers);

  const hrOfficerUsers = users.filter(u => u.role === 'hr_officer' || u.role === 'hr');
  console.log(`\nUsers with role 'hr_officer' / 'hr' (${hrOfficerUsers.length}):`, hrOfficerUsers.map(u => ({ username: u.username, name: u.name, dept: u.dept, pos: u.position })));

  const managerUsers = users.filter(u => u.role === 'manager');
  console.log(`\nUsers with role 'manager' (${managerUsers.length}):`, managerUsers.slice(0, 10).map(u => ({ username: u.username, name: u.name, dept: u.dept, pos: u.position })));
}

checkFinalRoles().catch(console.error).finally(() => prisma.$disconnect());

