// src/app/api/holidays/copy/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      sourceYear,
      targetYear,
      country = 'ID',
      selectedIds = [],
      recurringOnly = false,
    } = body

    if (!sourceYear || !targetYear) {
      return Response.json(
        { error: 'sourceYear dan targetYear wajib disertakan.' },
        { status: 400 }
      )
    }

    if (Number(sourceYear) === Number(targetYear)) {
      return Response.json(
        { error: 'Tahun sumber dan tahun tujuan tidak boleh sama.' },
        { status: 400 }
      )
    }

    const where = {
      country: String(country).toUpperCase(),
    }

    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      where.id = { in: selectedIds.map(Number) }
    } else {
      where.date = { startsWith: String(sourceYear) }
      if (recurringOnly) {
        where.recurring = true
      }
    }

    const sourceHolidays = await prisma.holiday.findMany({ where, orderBy: { date: 'asc' } })

    if (sourceHolidays.length === 0) {
      return Response.json(
        { error: `Tidak ada hari libur yang ditemukan pada tahun ${sourceYear} untuk disalin.` },
        { status: 404 }
      )
    }

    let copiedCount = 0
    let updatedCount = 0

    for (const item of sourceHolidays) {
      // Ambil bagian bulan-tanggal (e.g. "-05-01")
      const monthDay = item.date.slice(4)
      let newDate = `${targetYear}${monthDay}`

      // Handle kabisat jika Feb 29 di tahun non-kabisat
      if (monthDay === '-02-29') {
        const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0
        if (!isLeap) {
          newDate = `${targetYear}-02-28`
        }
      }

      // Ganti nama tahun jika ada (misal: "Tahun Baru 2026 Masehi" -> "Tahun Baru 2027 Masehi")
      let newName = item.name.replace(new RegExp(String(sourceYear), 'g'), String(targetYear))

      // Cek apakah sudah ada hari libur di tanggal yang sama di tahun tujuan
      const existing = await prisma.holiday.findFirst({
        where: {
          date: newDate,
          country: item.country,
        },
      })

      if (existing) {
        await prisma.holiday.update({
          where: { id: existing.id },
          data: {
            name: newName,
            type: item.type,
            recurring: item.recurring,
          },
        })
        updatedCount++
      } else {
        await prisma.holiday.create({
          data: {
            name: newName,
            date: newDate,
            type: item.type,
            country: item.country,
            recurring: item.recurring,
          },
        })
        copiedCount++
      }
    }

    return Response.json({
      success: true,
      sourceYear: Number(sourceYear),
      targetYear: Number(targetYear),
      totalProcessed: sourceHolidays.length,
      copiedCount,
      updatedCount,
      message: `Berhasil menyalin ${copiedCount} hari libur ke tahun ${targetYear}${updatedCount > 0 ? ` (${updatedCount} diperbarui)` : ''}.`,
    })
  } catch (err) {
    console.error('Error in POST /api/holidays/copy:', err)
    return Response.json(
      { error: 'Gagal menyalin hari libur: ' + err.message },
      { status: 500 }
    )
  }
}
