const { prisma } = require('../src/lib/prisma')

async function main() {
  const terminated = await prisma.$queryRawUnsafe(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE state = 'idle' 
      AND pid <> pg_backend_pid()
      AND query_start < NOW() - INTERVAL '5 minutes'
  `)
  console.log('Terminated old idle backends:', terminated.length)

  const activity = await prisma.$queryRawUnsafe(
    'SELECT count(*), state, client_addr FROM pg_stat_activity GROUP BY state, client_addr'
  )
  console.log('Current activity:', activity)
}

main().catch(console.error).finally(() => prisma.$disconnect())
