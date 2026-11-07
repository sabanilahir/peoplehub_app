// src/app/api/odoo/work-locations/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 4 Lokasi Resmi yang ditentukan
const TARGET_LOCATION_NAMES = ['Gudang', 'Head Office', 'Manhattan', 'Others']

const DEFAULT_MAPPINGS = {
  'Gudang': 'gudang',
  'Head Office': 'ho',
  'Manhattan': 'livestream',
  'Others': 'sales',
}

// GET: Sync 4 Work Locations dari Odoo & ambil status mapping
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    let odooUrl = searchParams.get('odooUrl')
    let odooDb = searchParams.get('odooDb')
    let odooUser = searchParams.get('odooUser')
    let odooApiKey = searchParams.get('odooApiKey')

    // Fallback baca konfigurasi dari database jika tidak ada di query param
    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      const dbSettings = await prisma.odooSettings.findFirst({
        where: { url: { not: '' } },
        orderBy: { updatedAt: 'desc' },
      })
      if (dbSettings) {
        odooUrl = dbSettings.url
        odooDb = dbSettings.db
        odooUser = dbSettings.user
        odooApiKey = dbSettings.apiKey
      }
    }

    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      // Jika kredensial belum ada, tetap kembalikan data yang sudah ada di lokal
      const localLocations = await prisma.odooWorkLocation.findMany({
        orderBy: { id: 'asc' },
      })
      const targetConfigs = await prisma.workLocationConfig.findMany({
        where: { active: true },
        orderBy: { id: 'asc' },
      })
      return NextResponse.json({
        success: true,
        source: 'local_only',
        locations: localLocations,
        targetConfigs,
        message: 'Kredensial Odoo belum disetting, menampilkan cache lokal.',
      })
    }

    const baseUrl = odooUrl.replace(/\/$/, '').replace(/\/odoo$/, '')
    const jsonRpcUrl = `${baseUrl}/jsonrpc`

    // 1. Authenticate ke Odoo
    const authResponse = await fetch(jsonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service: 'common', method: 'authenticate', args: [odooDb, odooUser, odooApiKey, {}] },
        id: 1,
      }),
    })

    if (!authResponse.ok) {
      return NextResponse.json({ success: false, error: `Auth HTTP ${authResponse.status}` }, { status: 502 })
    }

    const authData = await authResponse.json()
    if (!authData.result) {
      return NextResponse.json({ success: false, error: 'Authentication ke Odoo gagal' }, { status: 401 })
    }

    const uid = authData.result

    // 2. Fetch master hr.work.location dari Odoo (Filter hanya 4 lokasi resmi)
    const locResponse = await fetch(jsonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            odooDb,
            uid,
            odooApiKey,
            'hr.work.location',
            'search_read',
            [[['name', 'in', TARGET_LOCATION_NAMES]]],
            { fields: ['id', 'name', 'location_type', 'active'] },
          ],
        },
        id: 2,
      }),
    })

    if (!locResponse.ok) {
      return NextResponse.json({ success: false, error: `Location fetch HTTP ${locResponse.status}` }, { status: 502 })
    }

    const locData = await locResponse.json()
    const odooLocations = locData.result || []

    // 3. Upsert ke tabel OdooWorkLocation
    for (const loc of odooLocations) {
      const existing = await prisma.odooWorkLocation.findUnique({
        where: { odoo_id: String(loc.id) },
      })

      const defaultMapped = DEFAULT_MAPPINGS[loc.name] || 'ho'

      if (existing) {
        await prisma.odooWorkLocation.update({
          where: { id: existing.id },
          data: {
            name: loc.name,
            locationType: loc.location_type || 'office',
            active: loc.active !== false,
            // Jika belum punya mapping, pasang default
            mappedLocationCode: existing.mappedLocationCode || defaultMapped,
            last_sync_at: new Date(),
          },
        })
      } else {
        await prisma.odooWorkLocation.create({
          data: {
            odoo_id: String(loc.id),
            name: loc.name,
            locationType: loc.location_type || 'office',
            mappedLocationCode: defaultMapped,
            active: loc.active !== false,
            last_sync_at: new Date(),
          },
        })
      }
    }

    // 4. Ambil daftar 4 lokasi dari DB dengan count karyawan & target configuration
    const locations = await prisma.odooWorkLocation.findMany({
      where: {
        name: { in: TARGET_LOCATION_NAMES },
      },
      orderBy: { id: 'asc' },
    })

    // Hitung jumlah karyawan di masing-masing lokasi
    const enrichedLocations = await Promise.all(
      locations.map(async (loc) => {
        const empCount = await prisma.employee.count({
          where: {
            OR: [
              { odooWorkLocationId: loc.odoo_id },
              { location: { equals: loc.name, mode: 'insensitive' } },
              ...(loc.name === 'Others' ? [{ location: { contains: 'Others', mode: 'insensitive' } }] : []),
              ...(loc.name === 'Manhattan' ? [{ location: { contains: 'Manhattan', mode: 'insensitive' } }] : []),
            ],
          },
        })
        return {
          ...loc,
          employeeCount: empCount,
        }
      })
    )

    // Ambil daftar aturan aktif dari WorkLocationConfig
    const targetConfigs = await prisma.workLocationConfig.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil menarik ${odooLocations.length} work location resmi dari Odoo.`,
      locations: enrichedLocations,
      targetConfigs,
    })
  } catch (error) {
    console.error('Error in /api/odoo/work-locations GET:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Simpan update pemetaan & terapkan ke seluruh data karyawan
export async function POST(request) {
  try {
    const body = await request.json()
    const { mappings = [], applyToEmployees = true } = body

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json({ success: false, error: 'Data pemetaan tidak boleh kosong' }, { status: 400 })
    }

    let updatedEmployeesTotal = 0

    for (const m of mappings) {
      const odooId = String(m.odoo_id)
      const mappedCode = m.mappedLocationCode

      // 1. Update tabel OdooWorkLocation
      const loc = await prisma.odooWorkLocation.findUnique({
        where: { odoo_id: odooId },
      })

      if (loc) {
        await prisma.odooWorkLocation.update({
          where: { odoo_id: odooId },
          data: {
            mappedLocationCode: mappedCode,
            updatedAt: new Date(),
          },
        })

        // 2. Jika applyToEmployees aktif, sinkronkan seluruh karyawan terkait
        if (applyToEmployees && mappedCode) {
          const res = await prisma.employee.updateMany({
            where: {
              OR: [
                { odooWorkLocationId: odooId },
                { location: { equals: loc.name, mode: 'insensitive' } },
                ...(loc.name === 'Others' ? [{ location: { contains: 'Others', mode: 'insensitive' } }] : []),
                ...(loc.name === 'Manhattan' ? [{ location: { contains: 'Manhattan', mode: 'insensitive' } }] : []),
              ],
            },
            data: {
              odooWorkLocationId: odooId,
              workLocationCode: mappedCode,
            },
          })
          updatedEmployeesTotal += res.count
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pemetaan berhasil disimpan. ${updatedEmployeesTotal} data karyawan berhasil disinkronkan.`,
      updatedEmployeesTotal,
    })
  } catch (error) {
    console.error('Error in /api/odoo/work-locations POST:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

