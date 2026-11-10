import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const leaveStore = await prisma.appState.findUnique({ where: { key: 'hcm-leave-v1' } })
  const parsed = JSON.parse(leaveStore.value)
  const addisLeave = parsed.state?.leaves?.find(l => l.name?.includes('ADDIS') || l.userId === 300029)
  console.log('ADDIS LEAVE IN HCM-LEAVE-V1:', JSON.stringify(addisLeave, null, 2))
}

main().finally(() => prisma.$disconnect())
