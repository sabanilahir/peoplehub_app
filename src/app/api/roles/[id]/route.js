import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req, { params }) {
  try {
    const resolvedParams = params && typeof params.then === 'function' ? await params : params
    const id = parseInt(resolvedParams?.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await req.json()
    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(body.name || body.key ? { name: body.name || body.key } : {}),
        ...(body.label ? { label: body.label } : {}),
        ...(body.color ? { color: body.color } : {}),
        ...(body.desc !== undefined || body.description !== undefined
          ? { description: body.desc ?? body.description }
          : {}),
        ...(body.permissions ? { permissions: body.permissions } : {}),
      }
    })

    return NextResponse.json({
      ...updated,
      key: updated.name,
      desc: updated.description
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = params && typeof params.then === 'function' ? await params : params
    const id = parseInt(resolvedParams?.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    await prisma.role.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
