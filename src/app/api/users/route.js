import { prisma } from '@/lib/prisma'
import { pickUser } from '@/lib/dbMap'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// GET: all login accounts. 503 → client falls back to the static /data JSON.
export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
    return Response.json(users)
  } catch {
    return dbDown()
  }
}

// POST: create one user (id supplied by the client store).
export async function POST(req) {
  try {
    const created = await prisma.user.create({ data: pickUser(await req.json(), { withId: true }) })
    return Response.json(created, { status: 201 })
  } catch {
    return dbDown()
  }
}
