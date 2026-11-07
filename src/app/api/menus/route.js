import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// GET: ambil semua menu dari PostgreSQL (bukan dari Zustand!)
export async function GET() {
  try {
    const menus = await prisma.menuItem.findMany({
      orderBy: { order: 'asc' },
    })
    return Response.json(menus)
  } catch {
    return dbDown()
  }
}

// POST: buat satu menu baru di DB
export async function POST(req) {
  try {
    const body = await req.json()
    const parentId = body.parentId ? parseInt(body.parentId) : null
    const created = await prisma.menuItem.create({
      data: {
        key:      body.key,
        label:    body.label,
        icon:     body.icon     ?? null,
        href:     body.href     ?? null,
        parentId: parentId,
        roles:    typeof body.roles === 'string' ? body.roles : JSON.stringify(body.roles || ['*']),
        departments: typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments || ['*']),
        order:    Number(body.order) || 0,
        active:   body.active   ?? true,
      },
    })
    return Response.json(created, { status: 201 })
  } catch {
    return dbDown()
  }
}

// PUT: update semua menu sekaligus (bulk upsert — dipakai Menu Management page)
export async function PUT(req) {
  try {
    const { menus } = await req.json()
    // Jalankan semua upsert dalam satu transaction
    await prisma.$transaction(
      menus.map((m) => {
        const parentId = m.parentId ? parseInt(m.parentId) : null
        return prisma.menuItem.upsert({
          where:  { key: m.key },
          create: {
            key: m.key, label: m.label, icon: m.icon ?? null,
            href: m.href ?? null, parentId: parentId,
            roles: typeof m.roles === 'string' ? m.roles : JSON.stringify(m.roles || ['*']),
            departments: typeof m.departments === 'string' ? m.departments : JSON.stringify(m.departments || ['*']),
            order: Number(m.order) || 0, active: m.active ?? true,
          },
          update: {
            label: m.label, icon: m.icon ?? null, href: m.href ?? null,
            parentId: parentId,
            roles: typeof m.roles === 'string' ? m.roles : JSON.stringify(m.roles || ['*']),
            departments: typeof m.departments === 'string' ? m.departments : JSON.stringify(m.departments || ['*']),
            order: Number(m.order) || 0, active: m.active ?? true,
          },
        })
      })
    )
    return Response.json({ success: true })
  } catch {
    return dbDown()
  }
}
