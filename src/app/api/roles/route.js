import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_SYSTEM_ROLES = [
  { name: 'superadmin', label: 'Superadmin', color: '#dc2626', description: 'Akses penuh ke semua fitur sistem', isSystem: true },
  { name: 'hr_manager', label: 'HR Manager', color: '#2563eb', description: 'Manajer HR dengan akses penuh ke modul HR', isSystem: true },
  { name: 'hr', label: 'HR Staff', color: '#7c3aed', description: 'Staff HR dengan akses operasional HR', isSystem: true },
  { name: 'hr_officer', label: 'HR Officer', color: '#0891b2', description: 'Officer HR untuk operasional harian', isSystem: true },
  { name: 'manager', label: 'Manager', color: '#059669', description: 'Manager dengan akses MSS dan tim', isSystem: true },
  { name: 'supervisor', label: 'Supervisor / Coordinator', color: '#0891b2', description: 'Supervisor & Koordinator tim dengan akses MSS', isSystem: true },
  { name: 'senior_staff', label: 'Senior Staff', color: '#6366f1', description: 'Senior Staff operasional & lead teknis', isSystem: true },
  { name: 'staff', label: 'Staff', color: '#d97706', description: 'Staff operasional dengan akses ESS', isSystem: true },
  { name: 'employee', label: 'Employee', color: '#64748b', description: 'Karyawan umum dengan akses ESS', isSystem: true },
]

export async function GET() {
  try {
    let roles = await prisma.role.findMany({
      orderBy: { id: 'asc' }
    })

    // Auto-seed default roles jika tabel masih kosong
    if (!roles || roles.length === 0) {
      for (const r of DEFAULT_SYSTEM_ROLES) {
        await prisma.role.upsert({
          where: { name: r.name },
          update: {},
          create: {
            name: r.name,
            label: r.label,
            color: r.color,
            description: r.description,
            isSystem: r.isSystem,
            permissions: [],
          }
        })
      }
      roles = await prisma.role.findMany({ orderBy: { id: 'asc' } })
    }

    const formatted = roles.map(r => ({
      id: r.id,
      key: r.name,
      name: r.name,
      label: r.label,
      color: r.color || '#666666',
      desc: r.description,
      description: r.description,
      permissions: r.permissions || [],
      isSystem: r.isSystem || false,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    return NextResponse.json(formatted)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const name = (body.key || body.name || '').trim().toLowerCase()
    const label = (body.label || '').trim()

    if (!name || !label) {
      return NextResponse.json({ error: 'Key (name) and Label are required' }, { status: 400 })
    }

    const role = await prisma.role.upsert({
      where: { name },
      update: {
        label,
        color: body.color || '#666666',
        description: body.desc ?? body.description ?? null,
      },
      create: {
        name,
        label,
        color: body.color || '#666666',
        description: body.desc ?? body.description ?? null,
        permissions: body.permissions || [],
        isSystem: body.isSystem || false,
      }
    })

    return NextResponse.json({
      id: role.id,
      key: role.name,
      name: role.name,
      label: role.label,
      color: role.color,
      desc: role.description,
      description: role.description,
      permissions: role.permissions || [],
      isSystem: role.isSystem || false,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const name = (body.key || body.name || '').trim().toLowerCase()
    const permissions = Array.isArray(body.permissions) ? body.permissions : null

    if (!name) {
      return NextResponse.json({ error: 'Role key (name) is required' }, { status: 400 })
    }

    const updated = await prisma.role.update({
      where: { name },
      data: {
        ...(permissions ? { permissions } : {}),
        ...(body.label ? { label: body.label.trim() } : {}),
        ...(body.color ? { color: body.color } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        key: updated.name,
        name: updated.name,
        label: updated.label,
        permissions: updated.permissions || [],
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
