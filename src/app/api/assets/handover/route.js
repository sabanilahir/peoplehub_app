// src/app/api/assets/handover/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      assetId,
      employeeId,
      actionDate = new Date(),
      expectedReturnDate = null,
      condition = 'Baik',
      accessories = '',
      picUserId = null,
      picName = 'HR / GA Department',
      notes = '',
    } = body

    if (!assetId || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID dan Karyawan Penerima wajib ditentukan.' },
        { status: 400 }
      )
    }

    const asset = await prisma.companyAsset.findUnique({
      where: { id: parseInt(assetId) },
    })

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Aset tidak ditemukan dalam sistem.' },
        { status: 404 }
      )
    }

    if (asset.status === 'IN_USE') {
      return NextResponse.json(
        {
          success: false,
          error: `Aset ${asset.assetCode} saat ini masih berstatus dipinjam. Silakan lakukan proses pengembalian terlebih dahulu.`,
        },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
    })

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Data karyawan tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Format Nomor BAST: BAST/AST/YYYY/MM/ID
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const bastNumber = `BAST/AST/${year}/${month}/${String(asset.id).padStart(4, '0')}`

    // Transaksi Prisma
    const [updatedAsset, handoverLog] = await prisma.$transaction([
      prisma.companyAsset.update({
        where: { id: asset.id },
        data: {
          status: 'IN_USE',
          currentEmployeeId: employee.id,
          assignedDate: new Date(actionDate),
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          condition: condition || asset.condition,
        },
        include: {
          currentEmployee: true,
        },
      }),
      prisma.assetHandoverLog.create({
        data: {
          assetId: asset.id,
          employeeId: employee.id,
          type: 'HANDOVER',
          bastNumber,
          actionDate: new Date(actionDate),
          condition: condition || asset.condition,
          accessories: accessories?.trim() || null,
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
      message: `Aset ${asset.assetCode} berhasil diserahkan kepada ${employee.name}.`,
      data: {
        asset: updatedAsset,
        handoverLog,
        bastNumber,
      },
    })
  } catch (error) {
    console.error('[API Assets Handover Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses penyerahan aset' },
      { status: 500 }
    )
  }
}
