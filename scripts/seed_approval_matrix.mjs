// scripts/seed_approval_matrix.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Inspecting current employees in peoplehub_db...')
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      nik: true,
      dept: true,
      jobPosition: true,
      managerId: true,
      approver1Id: true,
      approver2Id: true,
    },
    take: 30,
  })

  console.log(`Found ${employees.length} employees.`)
  employees.forEach((e) => {
    console.log(`- ID: ${e.id} | NIK: ${e.nik} | Name: ${e.name} | Dept: ${e.dept} | Pos: ${e.jobPosition}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

