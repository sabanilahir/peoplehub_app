import { prisma } from '@/lib/prisma'
import { pickEmployee } from '@/lib/dbMap'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// PUT: update one employee (partial fields).
export async function PUT(req, { params }) {
  try {
    const updated = await prisma.employee.update({
      where: { id: Number(params.id) },
      data: pickEmployee(await req.json()),
    })
    return Response.json(updated)
  } catch {
    return dbDown()
  }
}

// DELETE: remove one employee.
export async function DELETE(_req, { params }) {
  try {
    await prisma.employee.delete({ where: { id: Number(params.id) } })
    return new Response(null, { status: 204 })
  } catch {
    return dbDown()
  }
}
