const { prisma } = require('../src/lib/prisma')

async function main() {
  const activity = await prisma.$queryRawUnsafe(
    'SELECT count(*), state, client_addr FROM pg_stat_activity GROUP BY state, client_addr'
  )
  console.log('Activity:', activity)
  const maxConn = await prisma.$queryRawUnsafe('SHOW max_connections')
  console.log('Max conn:', maxConn)
}

main().catch(console.error).finally(() => prisma.$disconnect())
