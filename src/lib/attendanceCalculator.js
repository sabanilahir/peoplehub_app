// src/lib/attendanceCalculator.js
import { prisma } from './prisma.js'

const toMinutes = (timeVal) => {
  if (!timeVal) return 0
  if (timeVal instanceof Date) {
    return timeVal.getHours() * 60 + timeVal.getMinutes()
  }
  const str = String(timeVal).trim()
  if (str.includes('T')) {
    const timePart = str.split('T')[1]
    const [h, m] = timePart.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  if (str.includes(' ')) {
    const parts = str.split(' ')
    const timePart = parts[parts.length - 1]
    if (timePart.includes(':')) {
      const [h, m] = timePart.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
  }
  const parts = str.split(':')
  if (parts.length >= 2) {
    const [h, m] = parts.map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  return 0
}

/**
 * Resolves location string or department into canonical locationCode
 * Others = Area Sales (sales)
 * Manhattan = Livestream (livestream)
 * Head Office = HO (ho)
 * Gudang = Gudang (gudang)
 */
export function resolveLocationCode(locationName, deptName) {
  const loc = String(locationName || '').trim().toLowerCase()
  const dept = String(deptName || '').trim().toLowerCase()

  // 1. Direct location aliases
  if (loc === 'others' || loc.includes('sales')) return 'sales'
  if (loc === 'manhattan' || loc.includes('live')) return 'livestream'
  if (loc.includes('gudang') || loc.includes('warehouse')) return 'gudang'
  if (loc.includes('head office') || loc === 'ho' || loc.includes('office')) return 'ho'

  // 2. Fallback based on department
  if (dept.includes('sales')) return 'sales'
  if (dept.includes('live')) return 'livestream'
  if (dept.includes('fullfilment') || dept.includes('gudang') || dept.includes('warehouse') || dept.includes('supplychain')) return 'gudang'

  return 'ho'
}

/**
 * Menghitung status presensi, menit keterlambatan, dan denda
 * secara 100% parameter-driven dari WorkLocationConfig di database.
 */
export async function calculateAttendancePenalty({ clockInTime, date, dayName, locationCode, locationName, deptName, basicSalary }) {
  if (!clockInTime) {
    return { status: 'Absent', lateMinutes: 0, penaltyAmount: 0 }
  }

  try {
    let targetCode = locationCode

    // 1. Jika locationCode belum tersedia, cari di tabel pemetaan OdooWorkLocation
    if (!targetCode && locationName) {
      try {
        const odooLoc = await prisma.odooWorkLocation.findFirst({
          where: { name: { equals: String(locationName).trim(), mode: 'insensitive' } },
        })
        if (odooLoc?.mappedLocationCode) {
          targetCode = odooLoc.mappedLocationCode
        }
      } catch (err) {
        // Abaikan jika query DB gagal
      }
    }

    // 2. Fallback ke alias resolver statis jika tetap belum ketemu
    if (!targetCode) {
      targetCode = resolveLocationCode(locationName, deptName)
    }

    // 3. Ambil konfigurasi lokasi kerja terparameterisasi dari DB
    let config = await prisma.workLocationConfig.findFirst({
      where: {
        locationCode: targetCode,
        active: true,
      },
    })

    // Fallback ke HO jika belum ada
    if (!config) {
      config = await prisma.workLocationConfig.findFirst({
        where: { locationCode: 'ho', active: true },
      })
    }

    // Fallback darurat jika DB kosong sama sekali
    if (!config) {
      const defaultStart = '09:00'
      const startMin = toMinutes(defaultStart)
      const inMin = toMinutes(clockInTime)
      if (inMin <= startMin) {
        return { status: 'Present', lateMinutes: 0, penaltyAmount: 0, scheduledStart: defaultStart }
      }
      const lateM = inMin - startMin
      return { status: 'Late', lateMinutes: lateM, penaltyAmount: 10000, scheduledStart: defaultStart }
    }

    // 2. Evaluasi hari kerja (0=Minggu, 1=Senin, ..., 6=Sabtu)
    let dayOfWeek = 1
    if (dayName) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const idx = days.indexOf(String(dayName).toLowerCase())
      if (idx !== -1) dayOfWeek = idx
    } else if (date && String(date).includes('-')) {
      const [y, m, d] = String(date).split('-').map(Number)
      dayOfWeek = new Date(y, m - 1, d).getDay()
    } else {
      dayOfWeek = new Date().getDay()
    }

    const isSaturday = dayOfWeek === 6
    const schedules = Array.isArray(config.schedules) ? config.schedules : []

    // Cari jadwal yang cocok untuk hari ini
    let activeSchedule = schedules.find((s) => {
      if (isSaturday) {
        return s.dayType === 'saturday' || s.day?.includes('Sabtu') || s.dayLabel?.includes('Sabtu')
      }
      return s.dayType === 'weekday' || s.day?.includes('Senin') || s.dayLabel?.includes('Senin')
    })

    if (!activeSchedule && schedules.length > 0) {
      activeSchedule = schedules[0]
    }

    // Jika jadwal menyatakan hari libur (isOff: true, misal Sabtu pada HO)
    if (activeSchedule?.isOff) {
      return {
        status: 'Present',
        lateMinutes: 0,
        penaltyAmount: 0,
        isOffDay: true,
        scheduledStart: '-',
        locationName: config.locationName,
      }
    }

    // Periksa apakah schedule bertipe flexible duration (misal Livestream: 4 Jam dalam 24 Jam)
    const isFlexible = activeSchedule?.scheduleType === 'flexible_duration'
    const startTime = activeSchedule?.startTime || '09:00'
    const clockInMinutes = toMinutes(clockInTime)
    const startMinutes = toMinutes(startTime)
    const gracePeriod = Number(config.gracePeriodMinutes) || 0

    // 3. Evaluasi keterlambatan
    let lateMinutes = 0
    if (!isFlexible) {
      if (clockInMinutes <= startMinutes + gracePeriod) {
        return {
          status: 'Present',
          lateMinutes: 0,
          penaltyAmount: 0,
          scheduledStart: startTime,
          locationName: config.locationName,
        }
      }
      lateMinutes = Math.max(0, clockInMinutes - startMinutes)
    } else {
      // Pada Livestream flexible, jika ada jam masuk yang ditentukan atau keterlambatan sesi
      // Sesuai parameter: Terlambat >= 1 menit kena denda Rp 50.000
      lateMinutes = clockInMinutes > startMinutes ? (clockInMinutes - startMinutes) : 0
    }

    if (lateMinutes === 0) {
      return {
        status: 'Present',
        lateMinutes: 0,
        penaltyAmount: 0,
        scheduledStart: startTime,
        locationName: config.locationName,
      }
    }

    const penalties = Array.isArray(config.latePenalties) ? config.latePenalties : []

    // 4. Cari tier denda yang sesuai secara dinamis
    let penaltyAmount = 0
    let deductionType = 'fixed'
    let salaryFraction = 0
    let penaltyLabel = ''
    let isHalfDayCut = false

    for (const tier of penalties) {
      const min = Number(tier.min) || 0
      const max = Number(tier.max) || 9999
      if (lateMinutes >= min && lateMinutes <= max) {
        deductionType = tier.deductionType || 'fixed'
        penaltyLabel = tier.label || ''

        if (deductionType === 'half_day_salary') {
          isHalfDayCut = true
          salaryFraction = Number(tier.salaryFraction) || 0.5
          // Hitung estimasi nominal jika basicSalary tersedia, atau biarkan dihitung di payroll
          if (basicSalary && Number(basicSalary) > 0) {
            penaltyAmount = Math.round((Number(basicSalary) / 25) * salaryFraction)
          } else {
            penaltyAmount = 0 // Dihitung presisi saat payroll bulanan
          }
        } else {
          penaltyAmount = Number(tier.amount) || 0
        }
        break
      }
    }

    // Fallback jika melebihi batas tier tertinggi
    if (penaltyAmount === 0 && !isHalfDayCut && penalties.length > 0) {
      const lastTier = penalties[penalties.length - 1]
      deductionType = lastTier.deductionType || 'fixed'
      penaltyLabel = lastTier.label || ''
      if (deductionType === 'half_day_salary') {
        isHalfDayCut = true
        salaryFraction = Number(lastTier.salaryFraction) || 0.5
        if (basicSalary && Number(basicSalary) > 0) {
          penaltyAmount = Math.round((Number(basicSalary) / 25) * salaryFraction)
        }
      } else {
        penaltyAmount = Number(lastTier.amount) || 0
      }
    }

    return {
      status: 'Late',
      lateMinutes,
      penaltyAmount,
      deductionType,
      salaryFraction,
      isHalfDayCut,
      penaltyLabel,
      scheduledStart: startTime,
      locationName: config.locationName,
      locationCode: config.locationCode,
    }
  } catch (err) {
    console.error('Error in calculateAttendancePenalty:', err)
    return { status: 'Present', lateMinutes: 0, penaltyAmount: 0 }
  }
}
