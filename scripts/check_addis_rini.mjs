import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Addis', mode: 'insensitive' } },
        { name: { contains: 'Rini', mode: 'insensitive' } },
      ],
    },
  })
  console.log('USERS:', users)

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { name: { contains: 'Addis', mode: 'insensitive' } },
        { name: { contains: 'Rini', mode: 'insensitive' } },
      ],
    },
  })
  console.log('EMPLOYEES:', employees)

  const leaves = await prisma.leave.findMany({
    where: {
      OR: [
        { user: { name: { contains: 'Addis', mode: 'insensitive' } } },
        { user: { name: { contains: 'Rini', mode: 'insensitive' } } },
      ],
    },
    include: { user: true, leaveType: true },
  })
  console.log('LEAVES:', leaves)
}

main().finally(() => prisma.$disconnect())
