import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vira = await prisma.employee.findMany({
    where: { name: { contains: 'Vira', mode: 'insensitive' } },
    select: { id: true, name: true, dept: true }
  });
  console.log('Vira search in Employee:', vira);

  const andy = await prisma.employee.findMany({
    where: { name: { contains: 'Andy', mode: 'insensitive' } },
    select: { id: true, name: true, dept: true }
  });
  console.log('Andy search in Employee:', andy);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Andy', mode: 'insensitive' } },
        { name: { contains: 'Lesmana', mode: 'insensitive' } },
        { role: 'director' },
        { role: 'superadmin' }
      ]
    },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('Andy/Director search in User:', users);
}

main().finally(async () => {
  await prisma.$disconnect();
});

