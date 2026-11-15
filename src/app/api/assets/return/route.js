// src/app/api/assets/return/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      assetId,
      actionDate = new Date(),
      condition = 'Baik',
      nextStatus = 'AVAILABLE', // 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'DISPOSED'
      accessories = '',
      picUserId = null,
      picName = 'HR / GA Department',
      notes = '',
    } = body

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID wajib ditentukan.' },
        { status: 400 }
      )
    }

    const asset = await prisma.companyAsset.findUnique({
      where: { id: parseInt(assetId) },
      include: { currentEmployee: true },
    })

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Aset tidak ditemukan dalam sistem.' },
        { status: 404 }
      )
    }

    if (!asset.currentEmployeeId && asset.status !== 'IN_USE') {
      return NextResponse.json(
        {
          success: false,
          error: `Aset ${asset.assetCode} tidak sedang dipinjam oleh karyawan mana pun.`,
        },
        { status: 400 }
      )
    }

    const returnedEmployeeId = asset.currentEmployeeId
    const returnedEmployee = asset.currentEmployee

    // Format Nomor BAST Pengembalian: BAST/RET/YYYY/MM/ID
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const bastNumber = `BAST/RET/${year}/${month}/${String(asset.id).padStart(4, '0')}`

    const finalStatus =
      nextStatus === 'UNDER_MAINTENANCE'
        ? 'UNDER_MAINTENANCE'
        : nextStatus === 'DISPOSED'
        ? 'DISPOSED'
        : 'AVAILABLE'

    const [updatedAsset, returnLog] = await prisma.$transaction([
      prisma.companyAsset.update({
        where: { id: asset.id },
        data: {
          status: finalStatus,
          currentEmployeeId: null,
          assignedDate: null,
          expectedReturnDate: null,
          condition: condition || asset.condition,
        },
      }),
      prisma.assetHandoverLog.create({
        data: {
          assetId: asset.id,
          employeeId: returnedEmployeeId || 1,
          type: 'RETURN',
          bastNumber,
          actionDate: new Date(actionDate),
          condition: condition || asset.condition,
          accessories: accessories?.trim() || 'Lengkap',
          picUserId: picUserId ? parseInt(picUserId) : null,
          picName: picName?.trim() || 'HR / GA Department',
          notes: notes?.trim() || null,
        },
        include: {
          employee: true,
          asset: true,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Aset ${asset.assetCode} telah berhasil dikembalikan ke inventaris perusahaan.`,
      data: {
        asset: updatedAsset,
        returnLog,
        returnedEmployee,
        bastNumber,
      },
    })
  } catch (error) {
    console.error('[API Assets Return Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses pengembalian aset' },
      { status: 500 }
    )
  }
}
