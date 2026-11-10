import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const leaves = await prisma.leave.findMany({
    include: { user: true }
  })
  console.log('ALL DB LEAVES count:', leaves.length)
  leaves.forEach(l => console.log('Leave ID:', l.id, 'user:', l.user?.name, 'status:', l.status, 'customData:', l.customData))

  const appStates = await prisma.appState.findMany()
  for (const a of appStates) {
    if (a.key.includes('leave') || a.key.includes('notif')) {
      console.log('AppState KEY:', a.key, 'length:', a.value.length)
    }
  }

  // Check hcm-leave-v1 content
  const leaveStore = await prisma.appState.findUnique({ where: { key: 'hcm-leave-v1' } })
  if (leaveStore) {
    const parsed = JSON.parse(leaveStore.value)
    console.log('hcm-leave-v1 leaves:', parsed.state?.leaves?.map(l => ({ id: l.id, name: l.name, userId: l.userId, status: l.status, steps: l.steps })))
  }
}

main().finally(() => prisma.$disconnect())
