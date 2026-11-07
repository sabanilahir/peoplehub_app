// scripts/find_matrix_employees.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const targetNames = [
    'Melyta', 'Raul', 'Devita', 'Sherly', 'Wanda', 'Ronny',
    'Vidya', 'Asyuni', 'Elza', 'Sandy', 'Novi Atien', 'Tarono',
    'Warsito', 'Sofyan', 'Rakhmat'
  ]

  console.log('Searching for target matrix employees in database...')
  for (const q of targetNames) {
    const matches = await prisma.employee.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' }
      },
      select: {
        id: true,
        nik: true,
        name: true,
        dept: true,
        jobPosition: true,
        managerId: true,
        approver1Id: true,
        approver2Id: true,
      }
    })
    console.log(`Query "${q}": found ${matches.length} matches:`, matches)
  }
}

main().finally(() => prisma.$disconnect())

