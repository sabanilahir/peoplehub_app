import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const all = await prisma.employee.findMany({
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
  const diffs = all.filter((e) => e.managerId !== e.approver1Id)
  console.log('Total employees where managerId !== approver1Id:', diffs.length)
  console.log('Sample differences (first 10):', diffs.slice(0, 10))

  // Also check how workflow settings or leave type configures approvals!
  const leaveTypes = await prisma.leaveType.findMany()
  console.log('Leave Types:', leaveTypes.map(lt => ({ id: lt.id, name: lt.name, autoApprove: lt.autoApprove })))
}

main().finally(() => prisma.$disconnect())
