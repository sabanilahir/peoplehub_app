// src/app/api/assets/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Fallback seed assets jika DB kosong
const INITIAL_ASSETS = [
  {
    assetCode: 'AST-IT-2026-001',
    name: 'MacBook Pro 14" M3',
    category: 'IT_EQUIPMENT',
    brand: 'Apple',
    model: 'MacBook Pro 14 M3 16GB/512GB Space Gray',
    serialNumber: 'C02G99XYMD6M',
    plateNumber: null,
    specifications: 'Apple M3 8-Core CPU, 10-Core GPU, 16GB Unified Memory, 512GB SSD',
    purchaseDate: new Date('2026-01-15'),
    purchaseCost: 28500000,
    warrantyExpiry: new Date('2028-01-15'),
    condition: 'Sangat Baik',
    status: 'IN_USE',
    notes: 'Dipinjamkan untuk lead developer front-end & mobile',
    currentEmployeeId: 1, // Budi Santoso
    assignedDate: new Date('2026-02-01'),
    expectedReturnDate: null,
  },
  {
    assetCode: 'AST-IT-2026-002',
    name: 'ThinkPad T14 Gen 4',
    category: 'IT_EQUIPMENT',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 4 Core i7 16GB/512GB',
    serialNumber: 'PF4X2981M',
    plateNumber: null,
    specifications: 'Intel Core i7-1365U vPro, 16GB DDR5, 512GB NVMe SSD, Windows 11 Pro',
    purchaseDate: new Date('2026-02-10'),
    purchaseCost: 21000000,
    warrantyExpiry: new Date('2029-02-10'),
    condition: 'Baik',
    status: 'IN_USE',
    notes: 'Fasilitas kerja manager HR/GA',
    currentEmployeeId: 2, // Dewi Rahayu
    assignedDate: new Date('2026-02-15'),
    expectedReturnDate: null,
  },
  {
    assetCode: 'AST-IT-2026-003',
    name: 'Dell UltraSharp 27" 4K Monitor',
    category: 'IT_EQUIPMENT',
    brand: 'Dell',
    model: 'U2723QE 4K USB-C Hub Monitor',
    serialNumber: 'CN-0M892K-74261',
    plateNumber: null,
    specifications: '27 inch 4K IPS Black, USB-C 90W Power Delivery, RJ45 Ethernet Hub',
    purchaseDate: new Date('2026-03-01'),
    purchaseCost: 9500000,
    warrantyExpiry: new Date('2029-03-01'),
    condition: 'Baru',
    status: 'AVAILABLE',
    notes: 'Tersedia di ruang inventaris GA lantai 2',
    currentEmployeeId: null,
    assignedDate: null,
    expectedReturnDate: null,
  },
  {
    assetCode: 'AST-VEH-2026-001',
    name: 'Toyota Avanza 1.5 G CVT',
    category: 'VEHICLE',
    brand: 'Toyota',
    model: 'Avanza 1.5 G CVT Silver Metallic',
    serialNumber: 'MHFM5BA3J890123',
    plateNumber: 'B 1842 SZP',
    specifications: 'Tahun 2024, Bensin, Transmisi Otomatis CVT, Audio Headunit 9", E-Toll Card',
    purchaseDate: new Date('2024-05-20'),
    purchaseCost: 265000000,
    warrantyExpiry: new Date('2027-05-20'),
    condition: 'Baik',
    status: 'AVAILABLE',
    notes: 'Kendaraan operasional dinas sales & kunjungan luar kota. STNK berlaku s/d Mei 2027.',
    currentEmployeeId: null,
    assignedDate: null,
    expectedReturnDate: null,
  },
  {
    assetCode: 'AST-FAC-2026-001',
    name: 'Kartu Akses Master & Kunci Server',
    category: 'FACILITY',
    brand: 'HID Global',
    model: 'iCLASS SE RFID Smart Card + Master Key',
    serialNumber: 'ACC-SRV-01',
    plateNumber: null,
    specifications: 'Akses 24 Jam Ruang Server IT & Lantai Eksekutif',
    purchaseDate: new Date('2025-01-01'),
    purchaseCost: 750000,
    warrantyExpiry: null,
    condition: 'Baik',
    status: 'IN_USE',
    notes: 'Diserahkan dengan pengawasan ketat tim IT',
    currentEmployeeId: 1, // Budi Santoso
    assignedDate: new Date('2026-01-10'),
    expectedReturnDate: null,
  },
  {
    assetCode: 'AST-TOOL-2026-001',
    name: 'Zebra TC21 Mobile Barcode Scanner',
    category: 'TOOLS',
    brand: 'Zebra',
    model: 'TC21 Touch Computer 2D Imager',
    serialNumber: '212455230981',
    plateNumber: null,
    specifications: 'Android Enterprise, 2D Barcode Scanner SE4710, WiFi/Bluetooth, Rugged IP67',
    purchaseDate: new Date('2025-11-12'),
    purchaseCost: 8200000,
    warrantyExpiry: new Date('2026-11-12'),
    condition: 'Baik',
    status: 'AVAILABLE',
    notes: 'Scanner operasional gudang penerimaan barang',
    currentEmployeeId: null,
    assignedDate: null,
    expectedReturnDate: null,
  },
]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const employeeId = searchParams.get('employeeId')

    // Cek apakah database kosong, jika kosong auto-seed initial data
    const count = await prisma.companyAsset.count()
    if (count === 0) {
      for (const item of INITIAL_ASSETS) {
        try {
          const created = await prisma.companyAsset.create({
            data: item,
          })
          if (item.currentEmployeeId) {
            await prisma.assetHandoverLog.create({
              data: {
                assetId: created.id,
                employeeId: item.currentEmployeeId,
                type: 'HANDOVER',
                bastNumber: `BAST/AST/2026/02/${item.assetCode.split('-').pop()}`,
                condition: item.condition,
                accessories: 'Charger Original, Box & Kartu Garansi',
                picName: 'HR / GA Department',
                notes: 'Penyerahan fasilitas kerja awal tahun 2026',
              },
            })
          }
        } catch (e) {
          console.error('[Asset Seed Error]:', e)
        }
      }
    }

    // Build filter query
    const where = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (employeeId) {
      where.currentEmployeeId = parseInt(employeeId)
    }

    if (search) {
      const q = search.trim()
      where.OR = [
        { assetCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { plateNumber: { contains: q, mode: 'insensitive' } },
        { currentEmployee: { name: { contains: q, mode: 'insensitive' } } },
        { currentEmployee: { nik: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const assets = await prisma.companyAsset.findMany({
      where,
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
          },
        },
        handoverLogs: {
          orderBy: { actionDate: 'desc' },
          take: 5,
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: assets,
      total: assets.length,
    })
  } catch (error) {
    console.error('[API Assets GET Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat data aset' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      assetCode,
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
      condition = 'Baik',
      status = 'AVAILABLE',
      notes,
    } = body

    if (!assetCode || !name || !category) {
      return NextResponse.json(
        { success: false, error: 'Kode Aset, Nama Aset, dan Kategori wajib diisi.' },
        { status: 400 }
      )
    }

    // Cek duplikasi kode aset
    const existing = await prisma.companyAsset.findUnique({
      where: { assetCode: assetCode.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Kode Aset '${assetCode}' sudah terdaftar dalam sistem.` },
        { status: 400 }
      )
    }

    const newAsset = await prisma.companyAsset.create({
      data: {
        assetCode: assetCode.trim().toUpperCase(),
        name: name.trim(),
        category,
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        plateNumber: plateNumber?.trim()?.toUpperCase() || null,
        specifications: specifications?.trim() || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        condition,
        status,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Aset ${newAsset.assetCode} berhasil didaftarkan.`,
      data: newAsset,
    })
  } catch (error) {
    console.error('[API Assets POST Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan data aset baru' },
      { status: 500 }
    )
  }
}
