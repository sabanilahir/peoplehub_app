import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const sample = await prisma.employee.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      jobPosition: true,
      dept: true,
      managerId: true,
      approver1Id: true,
      approver2Id: true,
    },
  })
  console.log('Sample Employees Approvers:', sample)

  // Find who approver1 and approver2 are for Addis, Rini, and Nico
  const targetEmps = await prisma.employee.findMany({
    where: {
      OR: [
        { name: { contains: 'Addis', mode: 'insensitive' } },
        { name: { contains: 'Rini', mode: 'insensitive' } },
        { name: { contains: 'Nico', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      jobPosition: true,
      dept: true,
      managerId: true,
      approver1Id: true,
      approver2Id: true,
    },
  })
  console.log('Target Employees:', targetEmps)

  // Fetch approver names
  const approverIds = [
    ...new Set(
      targetEmps.flatMap((e) => [e.managerId, e.approver1Id, e.approver2Id]).filter(Boolean)
    ),
  ]
  const approverEmps = await prisma.employee.findMany({
    where: { id: { in: approverIds } },
    select: { id: true, name: true, jobPosition: true, dept: true },
  })
  console.log('Approver Details:', approverEmps)

  // Check stats
  const totalWithApp1 = await prisma.employee.count({ where: { approver1Id: { not: null } } })
  const totalWithApp2 = await prisma.employee.count({ where: { approver2Id: { not: null } } })
  const totalEmployees = await prisma.employee.count()
  console.log({ totalEmployees, totalWithApp1, totalWithApp2 })
}

main().finally(() => prisma.$disconnect())
