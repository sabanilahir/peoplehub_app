import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MENUS } from '@/store/menuStore'

export async function POST() {
  try {
    for (const m of DEFAULT_MENUS) {
      await prisma.menuItem.upsert({
        where: { key: m.key },
        update: {
          key: m.key,
          label: m.label,
          icon: m.icon,
          href: m.href,
          parentId: m.parentId,
          roles: m.roles,
          departments: m.departments || '["*"]',
          order: m.order,
          active: m.active,
        },
        create: {
          key: m.key,
          label: m.label,
          icon: m.icon,
          href: m.href,
          parentId: m.parentId,
          roles: m.roles,
          departments: m.departments || '["*"]',
          order: m.order,
          active: m.active,
        },
      })
    }
    return NextResponse.json({ success: true, count: DEFAULT_MENUS.length })
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const menus = await prisma.menuItem.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json(menus)
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
