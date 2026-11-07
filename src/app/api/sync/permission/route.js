import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const permissions = await request.json()
    await prisma.permission.deleteMany()
    for (const perm of permissions) {
      await prisma.permission.create({
        data: { key: perm.key, name: perm.label, module: perm.group || 'common', description: perm.key }
      })
    }
    return NextResponse.json({ success: true, count: permissions.length })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { name: 'asc' }] })
    return NextResponse.json(permissions)
  } catch (error) {
    return NextResponse.json([], { status: 500 })
  }
}
