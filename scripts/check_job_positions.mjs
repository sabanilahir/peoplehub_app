import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      jobPosition: true,
      role: true,
    },
  })
  
  const positions = {}
  const roles = {}
  employees.forEach(e => {
    const pos = e.jobPosition || '(empty)'
    positions[pos] = (positions[pos] || 0) + 1
    const r = e.role || '(empty)'
    roles[r] = (roles[r] || 0) + 1
  })
  
  console.log('Distinct jobPosition in Employee:', positions)
  console.log('Distinct role in Employee:', roles)

  const users = await prisma.user.findMany({
    select: { id: true, role: true }
  })
  const userRoles = {}
  users.forEach(u => {
    userRoles[u.role] = (userRoles[u.role] || 0) + 1
  })
  console.log('Distinct role in User:', userRoles)
}

main().finally(() => prisma.$disconnect())
