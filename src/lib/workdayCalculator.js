// src/lib/workdayCalculator.js
import { prisma } from './prisma.js'

/**
 * Menghitung rincian dan jumlah hari kerja dalam suatu periode kalender / cut-off
 * secara parameter-driven berdasarkan aturan hari kerja per lokasi.
 *
 * @param {Object} params
 * @param {string} params.startDate - Tanggal awal 'YYYY-MM-DD'
 * @param {string} params.endDate - Tanggal akhir 'YYYY-MM-DD'
 * @param {string} [params.workLocationCode='ho'] - 'ho' (5 hari kerja) | 'gudang' | 'sales' | 'livestream' (6 hari kerja)
 * @param {Array} [params.holidays=[]] - Array record holiday [{ date: 'YYYY-MM-DD', name: '...', type: '...' }]
 * @returns {Object} Rincian hari kalender, weekend, libur nasional, hari kerja efektif, dan list per tanggal
 */
export function calculateWorkingDays({
  startDate,
  endDate,
  workLocationCode = 'ho',
  holidays = [],
}) {
  if (!startDate || !endDate) {
    throw new Error('startDate dan endDate wajib diisi (format YYYY-MM-DD).')
  }

  // Buat mapping hari libur per tanggal
  const holidayMap = new Map()
  if (Array.isArray(holidays)) {
    holidays.forEach((h) => {
      if (h && h.date) {
        holidayMap.set(String(h.date).trim(), h)
      }
    })
  }

  const loc = String(workLocationCode || 'ho').trim().toLowerCase()
  // HO menggunakan skema 5 hari kerja (Senin - Jumat, Sabtu & Minggu Libur)
  // Lokasi Operasional (Gudang, Sales, Livestream) menggunakan 6 hari kerja (Senin - Sabtu, Hanya Minggu Libur)
  const isFiveDayWorkWeek = loc === 'ho' || loc.includes('office') || loc.includes('pusat')

  const cur = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  let totalCalendarDays = 0
  let totalWeekendDays = 0
  let totalHolidayDays = 0
  let workingDays = 0
  const datesList = []

  const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  while (cur <= end) {
    totalCalendarDays++
    const year = cur.getFullYear()
    const month = String(cur.getMonth() + 1).padStart(2, '0')
    const day = String(cur.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    const dayOfWeek = cur.getDay() // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    const dayName = DAY_NAMES_ID[dayOfWeek]

    const isSunday = dayOfWeek === 0
    const isSaturday = dayOfWeek === 6
    const isWeekend = isSunday || (isSaturday && isFiveDayWorkWeek)

    const holidayInfo = holidayMap.get(dateStr)

    let status = 'WORK_DAY'
    let reason = 'Hari Kerja Normal'

    if (isWeekend) {
      status = 'WEEKEND_OFF'
      reason = isSunday ? 'Libur Reguler (Minggu)' : 'Libur Reguler (Sabtu HO)'
      totalWeekendDays++
    } else if (holidayInfo) {
      // Libur Nasional atau Cuti Bersama yang jatuh pada HARI KERJA
      status = 'HOLIDAY'
      reason = `${holidayInfo.name} (${holidayInfo.type || 'Nasional'})`
      totalHolidayDays++
    } else {
      workingDays++
    }

    datesList.push({
      date: dateStr,
      dayOfWeek,
      dayName,
      isWeekend,
      isHoliday: !!holidayInfo,
      status,
      reason,
      holidayName: holidayInfo?.name || null,
      holidayType: holidayInfo?.type || null,
    })

    cur.setDate(cur.getDate() + 1)
  }

  return {
    startDate,
    endDate,
    workLocationCode: loc,
    isFiveDayWorkWeek,
    totalCalendarDays,
    totalWeekendDays,
    totalHolidayDays,
    workingDays,
    datesList,
  }
}

/**
 * Server-side helper: Otomatis mengambil data libur dari tabel PostgreSQL `Holiday`
 * lalu menghitung hari kerja untuk periode dan lokasi kerja yang diminta.
 */
export async function getWorkingDaysFromDb({
  startDate,
  endDate,
  workLocationCode = 'ho',
  country = 'ID',
}) {
  try {
    const startYear = startDate.substring(0, 4)
    const endYear = endDate.substring(0, 4)

    const years = Array.from(new Set([startYear, endYear]))
    const dateFilters = years.map((y) => ({ date: { startsWith: y } }))

    const holidays = await prisma.holiday.findMany({
      where: {
        country: country.toUpperCase(),
        OR: dateFilters,
      },
      orderBy: { date: 'asc' },
    })

    return calculateWorkingDays({
      startDate,
      endDate,
      workLocationCode,
      holidays,
    })
  } catch (err) {
    console.error('Error in getWorkingDaysFromDb:', err)
    // Fallback tanpa data libur jika DB bermasalah
    return calculateWorkingDays({
      startDate,
      endDate,
      workLocationCode,
      holidays: [],
    })
  }
}
