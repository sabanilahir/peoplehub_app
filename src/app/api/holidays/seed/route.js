// src/app/api/holidays/seed/route.js
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Dataset Resmi Hari Libur Nasional & Cuti Bersama Republik Indonesia
 * Sumber acuan: SKB 3 Menteri (Menteri Agama, Menteri Ketenagakerjaan, Menteri PANRB)
 */
const OFFICIAL_INDONESIAN_HOLIDAYS = {
  2027: [
    { name: 'Tahun Baru 2027 Masehi', date: '2027-01-01', type: 'National', recurring: true },
    { name: 'Isra Miraj Nabi Muhammad SAW', date: '2027-01-05', type: 'National', recurring: false },
    { name: 'Tahun Baru Imlek 2578 Kongzili', date: '2027-02-06', type: 'National', recurring: false },
    { name: 'Cuti Bersama Tahun Baru Imlek', date: '2027-02-08', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Suci Nyepi Tahun Baru Saka 1949', date: '2027-03-09', type: 'National', recurring: false },
    { name: 'Cuti Bersama Hari Suci Nyepi', date: '2027-03-08', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Raya Idul Fitri 1448 H (Hari 1)', date: '2027-03-10', type: 'National', recurring: false },
    { name: 'Hari Raya Idul Fitri 1448 H (Hari 2)', date: '2027-03-11', type: 'National', recurring: false },
    { name: 'Cuti Bersama Hari Raya Idul Fitri', date: '2027-03-12', type: 'Cuti Bersama', recurring: false },
    { name: 'Cuti Bersama Hari Raya Idul Fitri', date: '2027-03-15', type: 'Cuti Bersama', recurring: false },
    { name: 'Wafat Yesus Kristus (Jumat Agung)', date: '2027-03-26', type: 'National', recurring: false },
    { name: 'Hari Buruh Internasional', date: '2027-05-01', type: 'National', recurring: true },
    { name: 'Kenaikan Yesus Kristus', date: '2027-05-06', type: 'National', recurring: false },
    { name: 'Hari Raya Idul Adha 1448 H', date: '2027-05-16', type: 'National', recurring: false },
    { name: 'Cuti Bersama Hari Raya Idul Adha', date: '2027-05-17', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Raya Waisak 2571 BE', date: '2027-05-20', type: 'National', recurring: false },
    { name: 'Hari Lahir Pancasila', date: '2027-06-01', type: 'National', recurring: true },
    { name: 'Tahun Baru Islam 1449 Hijriyah', date: '2027-06-06', type: 'National', recurring: false },
    { name: 'Maulid Nabi Muhammad SAW', date: '2027-08-15', type: 'National', recurring: false },
    { name: 'Hari Kemerdekaan RI ke-82', date: '2027-08-17', type: 'National', recurring: true },
    { name: 'Cuti Bersama Hari Raya Natal', date: '2027-12-24', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Raya Natal', date: '2027-12-25', type: 'National', recurring: true },
  ],
  2026: [
    { name: 'Tahun Baru 2026 Masehi', date: '2026-01-01', type: 'National', recurring: true },
    { name: 'Isra Miraj Nabi Muhammad SAW', date: '2026-01-16', type: 'National', recurring: false },
    { name: 'Tahun Baru Imlek 2577 Kongzili', date: '2026-02-17', type: 'National', recurring: false },
    { name: 'Cuti Bersama Tahun Baru Imlek', date: '2026-02-16', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Suci Nyepi Tahun Baru Saka 1948', date: '2026-03-19', type: 'National', recurring: false },
    { name: 'Cuti Bersama Hari Suci Nyepi', date: '2026-03-20', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Raya Idul Fitri 1447 H (Hari 1)', date: '2026-03-21', type: 'National', recurring: false },
    { name: 'Hari Raya Idul Fitri 1447 H (Hari 2)', date: '2026-03-22', type: 'National', recurring: false },
    { name: 'Cuti Bersama Hari Raya Idul Fitri', date: '2026-03-23', type: 'Cuti Bersama', recurring: false },
    { name: 'Cuti Bersama Hari Raya Idul Fitri', date: '2026-03-24', type: 'Cuti Bersama', recurring: false },
    { name: 'Wafat Yesus Kristus (Jumat Agung)', date: '2026-04-03', type: 'National', recurring: false },
    { name: 'Hari Buruh Internasional', date: '2026-05-01', type: 'National', recurring: true },
    { name: 'Kenaikan Yesus Kristus', date: '2026-05-14', type: 'National', recurring: false },
    { name: 'Hari Raya Idul Adha 1447 H', date: '2026-05-27', type: 'National', recurring: false },
    { name: 'Cuti Bersama Hari Raya Idul Adha', date: '2026-05-28', type: 'Cuti Bersama', recurring: false },
    { name: 'Hari Raya Waisak 2570 BE', date: '2026-05-31', type: 'National', recurring: false },
    { name: 'Hari Lahir Pancasila', date: '2026-06-01', type: 'National', recurring: true },
    { name: 'Tahun Baru Islam 1448 Hijriyah', date: '2026-06-16', type: 'National', recurring: false },
    { name: 'Hari Kemerdekaan RI ke-81', date: '2026-08-17', type: 'National', recurring: true },
    { name: 'Maulid Nabi Muhammad SAW', date: '2026-08-25', type: 'National', recurring: false },
    { name: 'Hari Raya Natal', date: '2026-12-25', type: 'National', recurring: true },
    { name: 'Cuti Bersama Hari Raya Natal', date: '2026-12-24', type: 'Cuti Bersama', recurring: false },
  ],
  2025: [
    { name: 'Tahun Baru 2025 Masehi', date: '2025-01-01', type: 'National', recurring: true },
    { name: 'Isra Miraj Nabi Muhammad SAW', date: '2025-01-27', type: 'National', recurring: false },
    { name: 'Tahun Baru Imlek 2576 Kongzili', date: '2025-01-29', type: 'National', recurring: false },
    { name: 'Hari Suci Nyepi Saka 1947', date: '2025-03-29', type: 'National', recurring: false },
    { name: 'Hari Raya Idul Fitri 1446 H (1)', date: '2025-03-31', type: 'National', recurring: false },
    { name: 'Hari Raya Idul Fitri 1446 H (2)', date: '2025-04-01', type: 'National', recurring: false },
    { name: 'Wafat Yesus Kristus', date: '2025-04-18', type: 'National', recurring: false },
    { name: 'Hari Buruh Internasional', date: '2025-05-01', type: 'National', recurring: true },
    { name: 'Hari Raya Waisak 2569 BE', date: '2025-05-12', type: 'National', recurring: false },
    { name: 'Kenaikan Yesus Kristus', date: '2025-05-29', type: 'National', recurring: false },
    { name: 'Hari Lahir Pancasila', date: '2025-06-01', type: 'National', recurring: true },
    { name: 'Hari Raya Idul Adha 1446 H', date: '2025-06-06', type: 'National', recurring: false },
    { name: 'Tahun Baru Islam 1447 H', date: '2025-06-27', type: 'National', recurring: false },
    { name: 'Hari Kemerdekaan RI ke-80', date: '2025-08-17', type: 'National', recurring: true },
    { name: 'Maulid Nabi Muhammad SAW', date: '2025-09-05', type: 'National', recurring: false },
    { name: 'Hari Raya Natal', date: '2025-12-25', type: 'National', recurring: true },
    { name: 'Cuti Bersama Hari Raya Natal', date: '2025-12-26', type: 'Cuti Bersama', recurring: false },
  ],
}

// POST: Generate / Seed data hari libur nasional untuk tahun tertentu
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const targetYear = Number(body.year) || 2026
    const country = String(body.country || 'ID').toUpperCase()

    let dataset = OFFICIAL_INDONESIAN_HOLIDAYS[targetYear]
    let isRecurringFallback = false

    if (!dataset || dataset.length === 0) {
      if (country === 'ID') {
        isRecurringFallback = true
        dataset = [
          { name: `Tahun Baru ${targetYear} Masehi`, date: `${targetYear}-01-01`, type: 'National', recurring: true },
          { name: 'Hari Buruh Internasional', date: `${targetYear}-05-01`, type: 'National', recurring: true },
          { name: 'Hari Lahir Pancasila', date: `${targetYear}-06-01`, type: 'National', recurring: true },
          { name: `Hari Kemerdekaan RI ke-${targetYear - 1945}`, date: `${targetYear}-08-17`, type: 'National', recurring: true },
          { name: 'Hari Raya Natal', date: `${targetYear}-12-25`, type: 'National', recurring: true },
        ]
      } else {
        return Response.json(
          {
            error: `Dataset resmi belum tersedia untuk ${country} ${targetYear}. Silakan tambahkan libur secara manual.`,
          },
          { status: 404 }
        )
      }
    }

    let addedCount = 0
    let updatedCount = 0

    for (const item of dataset) {
      const existing = await prisma.holiday.findFirst({
        where: {
          date: item.date,
          country,
        },
      })

      if (existing) {
        await prisma.holiday.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            type: item.type,
            recurring: item.recurring,
          },
        })
        updatedCount++
      } else {
        await prisma.holiday.create({
          data: {
            name: item.name,
            date: item.date,
            type: item.type,
            country,
            recurring: item.recurring,
          },
        })
        addedCount++
      }
    }

    const allHolidays = await prisma.holiday.findMany({
      where: {
        country,
        date: { startsWith: String(targetYear) },
      },
      orderBy: { date: 'asc' },
    })

    return Response.json({
      success: true,
      year: targetYear,
      country,
      message: isRecurringFallback
        ? `Berhasil memuat 5 Hari Libur Nasional Tetap tahun ${targetYear}. (${addedCount} baru ditambahkan). Hari libur keagamaan dapat ditambahkan sesuai SKB 3 Menteri resmi.`
        : `Berhasil memuat Libur Nasional & Cuti Bersama SKB 3 Menteri RI tahun ${targetYear}. (${addedCount} baru ditambahkan, ${updatedCount} diperbarui).`,
      addedCount,
      updatedCount,
      totalCount: allHolidays.length,
      data: allHolidays,
    })
  } catch (err) {
    console.error('Error in POST /api/holidays/seed:', err)
    return Response.json({ error: 'Gagal melakukan seed hari libur: ' + err.message }, { status: 500 })
  }
}

