import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// PUT: update satu menu by id
export async function PUT(req, { params }) {
  try {
    const id = Number(params.id)
    const body = await req.json()
    const parentId = body.parentId !== undefined
      ? (body.parentId ? parseInt(body.parentId) : null)
      : undefined

    const updateData = {
      label:  body.label,
      icon:   body.icon ?? null,
      href:   body.href ?? null,
      roles:  typeof body.roles === 'string' ? body.roles : JSON.stringify(body.roles || ['*']),
      departments: typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments || ['*']),
      order:  Number(body.order) || 0,
      active: body.active ?? true,
    }

    if (parentId !== undefined) {
      updateData.parentId = parentId
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: updateData,
    })
    return Response.json(updated)
  } catch (err) {
    console.error('Update menu error:', err)
    return dbDown()
  }
}

// DELETE: hapus satu menu by id (dan hapus child-nya dulu agar tidak orphan)
export async function DELETE(_req, { params }) {
  try {
    const id = Number(params.id)
    // Hapus child menus dulu (foreign key ke parentId)
    await prisma.menuItem.deleteMany({ where: { parentId: id } })
    await prisma.menuItem.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch {
    return dbDown()
  }
}
