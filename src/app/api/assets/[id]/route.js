// src/app/api/assets/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID Aset tidak valid' }, { status: 400 })
    }

    const asset = await prisma.companyAsset.findUnique({
      where: { id },
      include: {
        currentEmployee: {
          select: {
            id: true,
            nik: true,
            name: true,
            dept: true,
            position: true,
            email: true,
            location: true,
            phone: true,
          },
        },
        handoverLogs: {
          orderBy: { actionDate: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                nik: true,
                name: true,
                dept: true,
                position: true,
              },
            },
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Aset tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    console.error('[API Assets [id] GET Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat detail aset' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID Aset tidak valid' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      category,
      brand,
      model,
      serialNumber,
      plateNumber,
      specifications,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      condition,
      status,
      notes,
    } = body

    const updated = await prisma.companyAsset.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
        ...(brand !== undefined && { brand: brand?.trim() || null }),
        ...(model !== undefined && { model: model?.trim() || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber?.trim() || null }),
        ...(plateNumber !== undefined && { plateNumber: plateNumber?.trim()?.toUpperCase() || null }),
        ...(specifications !== undefined && { specifications: specifications?.trim() || null }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(purchaseCost !== undefined && { purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null }),
        ...(warrantyExpiry !== undefined && { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null }),
        ...(condition && { condition }),
        ...(status && { status }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        currentEmployee: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Aset ${updated.assetCode} berhasil diperbarui.`,
      data: updated,
    })
  } catch (error) {
    console.error('[API Assets [id] PUT Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui data aset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID Aset tidak valid' }, { status: 400 })
    }

    const existing = await prisma.companyAsset.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Aset tidak ditemukan' }, { status: 404 })
    }

    if (existing.status === 'IN_USE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Aset yang sedang dipinjam (In Use) tidak dapat dihapus. Silakan lakukan proses pengembalian terlebih dahulu.',
        },
        { status: 400 }
      )
    }

    await prisma.companyAsset.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: `Aset ${existing.assetCode} berhasil dihapus dari sistem.`,
    })
  } catch (error) {
    console.error('[API Assets [id] DELETE Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus data aset' },
      { status: 500 }
    )
  }
}
