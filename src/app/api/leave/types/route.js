// src/app/api/leave/types/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const types = await prisma.leaveType.findMany({
      orderBy: { id: 'asc' },
    })
    return Response.json({ success: true, data: types })
  } catch (error) {
    console.error('[API /api/leave/types GET] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const { id, name, maxDays, requireDoc, levels, autoApprove, active, formFields } = body

    if (!id) {
      return Response.json({ success: false, error: 'ID jenis cuti wajib disertakan' }, { status: 400 })
    }

    const updated = await prisma.leaveType.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        maxDays: maxDays !== undefined ? Number(maxDays) : undefined,
        requireDoc: requireDoc !== undefined ? Boolean(requireDoc) : undefined,
        levels: levels !== undefined ? (typeof levels === 'string' ? levels : JSON.stringify(levels)) : undefined,
        autoApprove: autoApprove !== undefined ? Boolean(autoApprove) : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
        formFields: formFields !== undefined ? formFields : undefined,
      },
    })

    return Response.json({ success: true, data: updated })
  } catch (error) {
    console.error('[API /api/leave/types PUT] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, maxDays = 12, requireDoc = false, levels = ['supervisor'], autoApprove = false, formFields = [] } = body

    if (!name || !name.trim()) {
      return Response.json({ success: false, error: 'Nama jenis cuti wajib diisi' }, { status: 400 })
    }

    const created = await prisma.leaveType.create({
      data: {
        name: name.trim(),
        maxDays: Number(maxDays) || 12,
        requireDoc: Boolean(requireDoc),
        levels: typeof levels === 'string' ? levels : JSON.stringify(levels),
        autoApprove: Boolean(autoApprove),
        active: true,
        formFields: Array.isArray(formFields) ? formFields : [],
      },
    })

    return Response.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('[API /api/leave/types POST] Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

