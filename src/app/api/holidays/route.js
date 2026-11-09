// src/app/api/holidays/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const dbDown = (err) =>
  new Response(JSON.stringify({ error: 'db_unavailable', details: err?.message }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  })

// GET: Ambil daftar hari libur (bisa difilter by year, country, type)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year')
    const country = searchParams.get('country') || 'ID'
    const type = searchParams.get('type')

    const where = {}
    if (country) where.country = country
    if (type && type !== 'all') where.type = type
    if (year) {
      where.date = {
        startsWith: String(year),
      }
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return Response.json({
      success: true,
      year: year ? Number(year) : null,
      country,
      count: holidays.length,
      data: holidays,
    })
  } catch (err) {
    console.error('Error GET /api/holidays:', err)
    return dbDown(err)
  }
}

// POST: Tambah hari libur baru
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, date, type = 'National', country = 'ID', recurring = false } = body

    if (!name || !date) {
      return Response.json({ error: 'Nama dan tanggal hari libur wajib diisi.' }, { status: 400 })
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: String(name).trim(),
        date: String(date).trim(),
        type: String(type).trim(),
        country: String(country).trim().toUpperCase(),
        recurring: Boolean(recurring),
      },
    })

    return Response.json({ success: true, data: holiday }, { status: 201 })
  } catch (err) {
    console.error('Error POST /api/holidays:', err)
    return dbDown(err)
  }
}

// PUT: Update hari libur yang ada
export async function PUT(req) {
  try {
    const body = await req.json()
    const { id, name, date, type, country, recurring } = body

    if (!id) {
      return Response.json({ error: 'ID hari libur diperlukan.' }, { status: 400 })
    }

    const updated = await prisma.holiday.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(date !== undefined ? { date: String(date).trim() } : {}),
        ...(type !== undefined ? { type: String(type).trim() } : {}),
        ...(country !== undefined ? { country: String(country).trim().toUpperCase() } : {}),
        ...(recurring !== undefined ? { recurring: Boolean(recurring) } : {}),
      },
    })

    return Response.json({ success: true, data: updated })
  } catch (err) {
    console.error('Error PUT /api/holidays:', err)
    return dbDown(err)
  }
}

// DELETE: Hapus satu atau banyak hari libur
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const idsParam = searchParams.get('ids')

    // Batch delete
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter(Boolean)
      if (ids.length > 0) {
        await prisma.holiday.deleteMany({
          where: { id: { in: ids } },
        })
        return Response.json({ success: true, message: `${ids.length} hari libur berhasil dihapus.` })
      }
    }

    if (!id) {
      return Response.json({ error: 'ID hari libur diperlukan.' }, { status: 400 })
    }

    await prisma.holiday.delete({
      where: { id: Number(id) },
    })

    return Response.json({ success: true, message: 'Hari libur berhasil dihapus.' })
  } catch (err) {
    console.error('Error DELETE /api/holidays:', err)
    return dbDown(err)
  }
}

