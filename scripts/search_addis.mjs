import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://sumopod_user:SumoPod_Secure_Pass_2026%21@43.134.228.70:5432/peoplehub_db?schema=public&sslmode=prefer&connection_limit=10&pool_timeout=30' }
  }
})

async function run() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type IN ('text', 'character varying', 'jsonb', 'json');
  `)

  console.log(`Searching ${cols.length} text/json columns...`)
  for (const c of cols) {
    try {
      const res = await prisma.$queryRawUnsafe(`
        SELECT "${c.column_name}"::text as val FROM "${c.table_name}"
        WHERE "${c.column_name}"::text ILIKE '%addis%' LIMIT 5;
      `)
      if (res.length > 0) {
        console.log(`=== MATCH in ${c.table_name}.${c.column_name} (${res.length} rows) ===`)
        for (const r of res) {
          const s = String(r.val || '')
          console.log('  ', s.length > 160 ? s.slice(0, 160) + '...' : s)
        }
      }
    } catch (e) {}
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
