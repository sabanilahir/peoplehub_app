import { prisma } from '@/lib/prisma'
import { pickUser } from '@/lib/dbMap'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// PUT: update one user (partial fields).
export async function PUT(req, props) {
  try {
    const params = await props.params
    const updated = await prisma.user.update({
      where: { id: Number(params.id) },
      data: pickUser(await req.json()),
    })
    return Response.json(updated)
  } catch {
    return dbDown()
  }
}

// DELETE: remove one user.
export async function DELETE(_req, props) {
  try {
    const params = await props.params
    await prisma.user.delete({ where: { id: Number(params.id) } })
    return new Response(null, { status: 204 })
  } catch {
    return dbDown()
  }
}
