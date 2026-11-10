import { PrismaClient } from '@prisma/client'
import { resolveUserRole } from '../src/lib/roleResolver.js'

const prisma = new PrismaClient()

async function main() {
  console.log('--- TEST 1: Role Resolver Validation ---')
  const samplePositions = [
    { name: 'Nico', jobPosition: 'Manager', dept: 'Sales Offline' },
    { name: 'Addis', jobPosition: 'Supervisor / Coordinator', dept: 'Sales Offline' },
    { name: 'Rini', jobPosition: 'Supervisor / Coordinator', dept: 'Sales Offline' },
    { name: 'Antonius', jobPosition: 'Staff', dept: 'Brand Marketing' },
    { name: 'Senior', jobPosition: 'Senior Staff', dept: 'Engineering' },
    { name: 'Rina', jobPosition: 'Staff', dept: 'HR/GA' },
  ]
  samplePositions.forEach(p => {
    console.log(`[${p.name}] ${p.jobPosition} (${p.dept}) => Role: ${resolveUserRole(p)}`)
  })

  console.log('\n--- TEST 2: Approver Isolation Test ---')
  const addis = await prisma.employee.findUnique({ where: { id: 300029 } })
  const rini = await prisma.employee.findUnique({ where: { id: 300137 } })
  const ronny = await prisma.employee.findUnique({ where: { id: 300143 } })

  console.log(`Addis approver1Id: ${addis?.approver1Id}`)
  console.log(`Ronny employee ID: ${ronny?.id}`)
  console.log(`Rini employee ID: ${rini?.id}`)

  const isRonnyApprover = addis?.approver1Id === ronny?.id
  const isRiniApprover = addis?.approver1Id === rini?.id
  console.log(`Does Ronny act on Addis's leave? ${isRonnyApprover} (Expected: TRUE)`)
  console.log(`Does Rini act on Addis's leave? ${isRiniApprover} (Expected: FALSE)`)

  console.log('\n--- TEST 3: Auto-Bypass Check for Self Approver 1 ---')
  const raul = await prisma.employee.findUnique({ where: { id: 300090 } })
  const isRaulSelfApprover1 = raul?.approver1Id === raul?.id
  console.log(`Raul ID: ${raul?.id}, Approver1: ${raul?.approver1Id}, Approver2: ${raul?.approver2Id}`)
  console.log(`Is Raul Self Approver 1 (Auto-Bypass to Level 2)? ${isRaulSelfApprover1} (Expected: TRUE)`)
}

main().finally(() => prisma.$disconnect())
