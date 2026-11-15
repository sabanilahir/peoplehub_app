// src/lib/fingerspotSync.js
import { prisma } from './prisma.js'
import { calculateAttendancePenalty } from './attendanceCalculator.js'

/**
 * Mengambil atau membuat pengaturan default Fingerspot
 */
export async function getFingerspotSettings() {
  let settings = await prisma.fingerspotSettings.findFirst()
  if (!settings) {
    settings = await prisma.fingerspotSettings.create({
      data: {
        apiUrl: 'https://developer.fingerspot.io/api',
        apiToken: '',
        cloudId: '',
        deviceSn: 'FSPOT-GUDANG-01',
        deviceName: 'Mesin Fingerspot Gudang',
        syncEnabled: true,
        autoSyncInterval: 30,
        cronSecret: 'san_fingerspot_cron_key_2026',
        lastSyncStatus: 'NO_DATA',
        lastSyncMessage: 'Belum pernah disinkronkan',
        lastSyncCount: 0,
      },
    })
  }
  return settings
}

/**
 * Memperbarui pengaturan Fingerspot
 */
export async function updateFingerspotSettings(data) {
  const current = await getFingerspotSettings()
  const updated = await prisma.fingerspotSettings.update({
    where: { id: current.id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })
  return updated
}

/**
 * Memanggil API Fingerspot.iO Cloud untuk mengambil log scan presensi
 */
export async function fetchFingerspotAttLog({ startDate, endDate, settings, forceMock = false }) {
  const cfg = settings || (await getFingerspotSettings())

  // Jika forceMock atau jika kredensial belum diisi, kita siapkan simulasi data scan karyawan gudang aktual
  if (forceMock || !cfg.apiToken || !cfg.cloudId) {
    if (!forceMock && (!cfg.apiToken || !cfg.cloudId)) {
      return {
        success: false,
        error: 'API Token atau Cloud ID Fingerspot.iO belum dikonfigurasi di pengaturan',
        data: [],
      }
    }

    // Generator simulasi scan karyawan gudang riil PeopleHub
    const targetDate = startDate || new Date().toISOString().split('T')[0]
    const gudangEmps = await prisma.employee.findMany({
      where: {
        OR: [
          { location: { contains: 'gudang', mode: 'insensitive' } },
          { dept: { contains: 'fullfilment', mode: 'insensitive' } },
          { dept: { contains: 'supplychain', mode: 'insensitive' } },
        ],
      },
      select: { id: true, nik: true, name: true },
      take: 20,
    })

    const mockLogs = []
    gudangEmps.forEach((emp, idx) => {
      // Variasi waktu kedatangan karyawan gudang: sebagian tepat waktu (07:50 - 08:00), sebagian telat tipis, sebagian telat >20 min
      let inH = 8
      let inM = (idx * 3) % 25 // 08:00 s/d 08:24
      if (idx === 3) {
        inH = 8
        inM = 45 // Late >20 min
      } else if (idx === 5) {
        inH = 7
        inM = 55 // On time
      }
      const inTimeStr = `${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}:15`
      const outTimeStr = '17:05:30'

      // Log Check-In
      mockLogs.push({
        pin: String(emp.id),
        scan_date: `${targetDate} ${inTimeStr}`,
        status_scan: 1,
        verify: 1,
        sn: cfg.deviceSn || 'FSPOT-GUDANG-01',
      })

      // Log Check-Out (jika sudah sore atau tanggal lampau)
      const now = new Date()
      const isPastOrEvening = targetDate < now.toISOString().split('T')[0] || now.getHours() >= 17
      if (isPastOrEvening) {
        mockLogs.push({
          pin: String(emp.id),
          scan_date: `${targetDate} ${outTimeStr}`,
          status_scan: 2,
          verify: 1,
          sn: cfg.deviceSn || 'FSPOT-GUDANG-01',
        })
      }
    })

    return {
      success: true,
      isMock: true,
      message: `Simulasi Fingerspot: ${mockLogs.length} scan log dihasilkan untuk ${gudangEmps.length} staf gudang`,
      data: mockLogs,
    }
  }

  // Panggilan Riil ke Fingerspot.iO Cloud API
  try {
    const endpoint = `${cfg.apiUrl.replace(/\/+$/, '')}/get_attlog`
    const payload = {
      cloud_id: cfg.cloudId,
      start_date: startDate,
      end_date: endDate || startDate,
    }
    if (cfg.deviceSn) {
      payload.device_sn = cfg.deviceSn
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      return {
        success: false,
        error: `Gagal memanggil API Fingerspot (HTTP ${res.status}): ${errText}`,
        data: [],
      }
    }

    const result = await res.json()
    const rawData = Array.isArray(result) ? result : result.data || []

    return {
      success: true,
      isMock: false,
      message: result.message || `Berhasil mengambil ${rawData.length} scan log dari Fingerspot.iO`,
      data: rawData,
    }
  } catch (err) {
    console.error('Error fetching Fingerspot attlog:', err)
    return {
      success: false,
      error: `Kesalahan jaringan saat memanggil Fingerspot.iO: ${err.message}`,
      data: [],
    }
  }
}

/**
 * Memproses dan mengagregasi log scan mentah menjadi presensi harian gudang,
 * melakukan pencocokan karyawan, menghitung denda/keterlambatan, dan menyimpan ke DB.
 */
export async function processFingerspotLogs(rawLogs = [], { sourceLabel = 'Mesin Fingerspot Gudang (API)' } = {}) {
  if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
    return {
      success: true,
      totalFetched: 0,
      processed: 0,
      saved: 0,
      errors: [],
      message: 'Tidak ada log scan untuk diproses',
    }
  }

  // 1. Ambil seluruh master karyawan untuk pencocokan cerdas
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      nik: true,
      name: true,
      location: true,
      dept: true,
      workLocationCode: true,
    },
  })

  const empById = new Map()
  const empByNik = new Map()
  const empByName = new Map()

  employees.forEach((emp) => {
    empById.set(String(emp.id), emp)
    if (emp.nik) empByNik.set(String(emp.nik).trim().toLowerCase(), emp)
    if (emp.name) empByName.set(String(emp.name).trim().toLowerCase(), emp)
  })

  // 2. Kelompokkan multi-scan per (PIN, Tanggal)
  // key: "PIN___YYYY-MM-DD" -> array of HH:MM
  const scanGroups = new Map()

  rawLogs.forEach((item) => {
    const rawPin = String(item.pin || item.PIN || item.scan_id || item.nik || '').trim()
    const rawDateStr = String(item.scan_date || item.scanDate || item.waktu || item.timestamp || '').trim()

    if (!rawPin || !rawDateStr) return

    // Ekstrak Tanggal dan Jam
    let datePart = ''
    let timePart = ''

    if (rawDateStr.includes('T')) {
      const parts = rawDateStr.split('T')
      datePart = parts[0]
      timePart = parts[1].slice(0, 5) // HH:MM
    } else if (rawDateStr.includes(' ')) {
      const parts = rawDateStr.split(' ')
      datePart = parts[0]
      timePart = parts[1].slice(0, 5) // HH:MM
    } else {
      datePart = rawDateStr.slice(0, 10)
    }

    // Normalisasi format tanggal DD/MM/YYYY ke YYYY-MM-DD jika diperlukan
    if (datePart.includes('/')) {
      const segs = datePart.split('/')
      if (segs[0].length === 2 && segs[2]?.length === 4) {
        datePart = `${segs[2]}-${segs[1]}-${segs[0]}`
      }
    }

    if (!datePart || !timePart) return

    const groupKey = `${rawPin}___${datePart}`
    if (!scanGroups.has(groupKey)) {
      scanGroups.set(groupKey, {
        pin: rawPin,
        date: datePart,
        times: [],
        deviceSn: item.sn || item.device_sn || null,
      })
    }
    scanGroups.get(groupKey).times.push(timePart)
  })

  let savedCount = 0
  let matchedCount = 0
  let skippedCount = 0
  const errors = []

  // 3. Proses tiap kelompok presensi harian
  for (const [key, group] of scanGroups.entries()) {
    const { pin, date, times, deviceSn } = group

    // Urutkan waktu scan harian
    times.sort()
    const checkInTime = times[0] // Scan paling awal = Masuk
    const checkOutTime = times.length > 1 && times[times.length - 1] !== checkInTime ? times[times.length - 1] : null

    // Pencocokan Employee
    const matchedEmp =
      empById.get(pin) ||
      empByNik.get(pin.toLowerCase()) ||
      empByName.get(pin.toLowerCase()) ||
      null

    if (!matchedEmp) {
      errors.push(`PIN/ID "${pin}" pada tanggal ${date} tidak ditemukan di master data Karyawan`)
      skippedCount++
      continue
    }

    matchedCount++

    // 4. Hitung keterlambatan & denda dengan aturan jam kerja Gudang
    const penaltyCalc = await calculateAttendancePenalty({
      clockInTime: checkInTime,
      date,
      locationCode: 'gudang',
      locationName: matchedEmp.location || 'Gudang',
      deptName: matchedEmp.dept || 'Fullfilment',
    })

    const finalStatus = penaltyCalc.status || 'Present'
    const finalLateMin = penaltyCalc.lateMinutes || 0
    const finalPenalty = penaltyCalc.penaltyAmount || 0
    let finalNote = penaltyCalc.penaltyLabel ? `${penaltyCalc.penaltyLabel} | Fingerspot` : 'Sync Otomatis Fingerspot.iO'
    if (deviceSn) finalNote += ` (${deviceSn})`

    // 5. Upsert ke database Attendance
    try {
      await prisma.attendance.upsert({
        where: {
          empId_date: {
            empId: matchedEmp.id,
            date,
          },
        },
        create: {
          empId: matchedEmp.id,
          date,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: finalStatus,
          lateMinutes: finalLateMin,
          penaltyAmount: finalPenalty,
          checkInLocation: sourceLabel,
          checkOutLocation: checkOutTime ? sourceLabel : null,
          isWithinRadius: true,
          note: finalNote,
        },
        update: {
          checkIn: checkInTime || undefined,
          checkOut: checkOutTime || undefined,
          status: finalStatus,
          lateMinutes: finalLateMin,
          penaltyAmount: finalPenalty,
          checkInLocation: sourceLabel,
          checkOutLocation: checkOutTime ? sourceLabel : undefined,
          note: finalNote,
        },
      })
      savedCount++
    } catch (err) {
      console.error(`Failed to upsert attendance for emp ${matchedEmp.id} on ${date}:`, err)
      errors.push(`Gagal menyimpan presensi ${matchedEmp.name} (${date}): ${err.message}`)
    }
  }

  return {
    success: true,
    totalFetched: rawLogs.length,
    groupedRecords: scanGroups.size,
    matchedCount,
    savedCount,
    skippedCount,
    errors,
    message: `Berhasil memproses ${savedCount} presensi karyawan gudang dari ${rawLogs.length} scan log Fingerspot.`,
  }
}
