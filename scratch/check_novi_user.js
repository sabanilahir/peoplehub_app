const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNovi() {
  const noviEmp = await prisma.employee.findFirst({
    where: { name: { contains: 'Novi Atien', mode: 'insensitive' } }
  });
  console.log("Novi Employee:", noviEmp);

  const noviUser = await prisma.user.findFirst({
    where: {
      OR: [
        { employeeId: noviEmp?.id },
        { name: { contains: 'Novi Atien', mode: 'insensitive' } },
        { odoo_id: noviEmp?.odoo_id }
      ]
    }
  });
  console.log("Novi User in DB:", noviUser);

  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, employeeId: true }
  });
  console.log("Total users in DB:", allUsers.length);
  console.log("Users in DB:", allUsers);
}

checkNovi().catch(console.error).finally(() => prisma.$disconnect());

