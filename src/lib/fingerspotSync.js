// src/lib/fingerspotSync.js
import { prisma } from './prisma.js'
import { calculateAttendancePenalty } from './attendanceCalculator.js'

/**
 * Mengambil atau membuat pengaturan default global Fingerspot
 */
export async function getFingerspotSettings() {
  let settings = await prisma.fingerspotSettings.findFirst()
  if (!settings) {
    settings = await prisma.fingerspotSettings.create({
      data: {
        apiUrl: 'https://developer.fingerspot.io/api',
        apiToken: 'VI0IOGL703ZGROFY',
        cloudId: 'C263889803072930',
        deviceSn: 'FSPOT-GUDANG-01',
        deviceName: 'Mesin Fingerspot Gudang',
        syncEnabled: true,
        simulationMode: true,
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
 * Memperbarui pengaturan global Fingerspot
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
 * Mengambil daftar seluruh perangkat Fingerspot
 * Jika belum ada data, otomatis inisialisasi device pertama dari kredensial default
 */
export async function getFingerspotDevices() {
  let devices = await prisma.fingerspotDevice.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  // Auto-seed device pertama jika tabel masih kosong
  if (devices.length === 0) {
    const defaultDevice = await prisma.fingerspotDevice.create({
      data: {
        deviceName: 'Mesin Fingerspot Gudang',
        deviceSn: 'FSPOT-GUDANG-01',
        cloudId: 'C263889803072930',
        apiToken: 'VI0IOGL703ZGROFY',
        apiUrl: 'https://developer.fingerspot.io/api',
        locationLabel: 'Gudang',
        isActive: true,
        sortOrder: 1,
        lastSyncStatus: 'STANDBY',
        lastSyncMsg: 'Perangkat siap digunakan',
      },
    })
    devices = [defaultDevice]
  }

  return devices
}

/**
 * Mengambil perangkat berdasarkan ID
 */
export async function getFingerspotDeviceById(id) {
  return prisma.fingerspotDevice.findUnique({
    where: { id },
  })
}

/**
 * Membuat perangkat Fingerspot baru
 */
export async function createFingerspotDevice(data) {
  return prisma.fingerspotDevice.create({
    data: {
      deviceName: data.deviceName?.trim() || 'Mesin Fingerspot',
      deviceSn: data.deviceSn?.trim() || '',
      cloudId: data.cloudId?.trim() || '',
      apiToken: data.apiToken?.trim() || '',
      apiUrl: data.apiUrl?.trim() || 'https://developer.fingerspot.io/api',
      locationLabel: data.locationLabel?.trim() || '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      sortOrder: Number(data.sortOrder) || 0,
      lastSyncStatus: 'STANDBY',
      lastSyncMsg: 'Baru ditambahkan',
    },
  })
}

/**
 * Memperbarui data perangkat Fingerspot
 */
export async function updateFingerspotDevice(id, data) {
  return prisma.fingerspotDevice.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })
}

/**
 * Menghapus perangkat Fingerspot
 */
export async function deleteFingerspotDevice(id) {
  return prisma.fingerspotDevice.delete({
    where: { id },
  })
}

/**
 * Memanggil API Fingerspot.iO Cloud untuk mengambil log scan presensi dari 1 perangkat spesifik
 */
export async function fetchFingerspotAttLog({
  startDate,
  endDate,
  device = null,
  settings = null,
  forceMock = false,
}) {
  const cfg = settings || (await getFingerspotSettings())
  const isSimulation = Boolean(forceMock || cfg.simulationMode)

  const activeApiUrl = (device?.apiUrl || cfg.apiUrl || 'https://developer.fingerspot.io/api').replace(/\/+$/, '')
  const activeApiToken = (device?.apiToken || cfg.apiToken || '').trim()
  const activeCloudId = (device?.cloudId || cfg.cloudId || '').trim()
  const activeDeviceSn = (device?.deviceSn || cfg.deviceSn || '').trim()
  const activeDeviceName = (device?.deviceName || cfg.deviceName || 'Mesin Fingerspot').trim()
  const activeLocation = (device?.locationLabel || 'Gudang').trim()

  // 1. Jika belum ada kredensial dan simulasi tidak aktif -> Mode Standby (Siaga)
  if (!activeApiToken || !activeCloudId) {
    if (!isSimulation) {
      return {
        success: true,
        isStandby: true,
        deviceId: device?.id || null,
        deviceName: activeDeviceName,
        message: `Perangkat "${activeDeviceName}" dalam mode siaga: Cloud ID atau API Token belum diisi.`,
        data: [],
      }
    }
  }

  // 2. Jika mode simulasi aktif (atau dipaksa via parameter)
  if (isSimulation) {
    const targetDate = startDate || new Date().toISOString().split('T')[0]
    const emps = await prisma.employee.findMany({
      where: {
        OR: [
          { location: { contains: activeLocation || 'gudang', mode: 'insensitive' } },
          { dept: { contains: 'fullfilment', mode: 'insensitive' } },
          { dept: { contains: 'supplychain', mode: 'insensitive' } },
        ],
      },
      select: { id: true, nik: true, name: true, location: true, dept: true },
      take: 20,
    })

    const mockLogs = []
    emps.forEach((emp, idx) => {
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
        sn: activeDeviceSn || 'FSPOT-01',
        deviceName: activeDeviceName,
        deviceId: device?.id || null,
        locationLabel: activeLocation,
      })

      // Log Check-Out (jika sore / tanggal lampau)
      const now = new Date()
      const isPastOrEvening = targetDate < now.toISOString().split('T')[0] || now.getHours() >= 17
      if (isPastOrEvening) {
        mockLogs.push({
          pin: String(emp.id),
          scan_date: `${targetDate} ${outTimeStr}`,
          status_scan: 2,
          verify: 1,
          sn: activeDeviceSn || 'FSPOT-01',
          deviceName: activeDeviceName,
          deviceId: device?.id || null,
          locationLabel: activeLocation,
        })
      }
    })

    return {
      success: true,
      isMock: true,
      deviceId: device?.id || null,
      deviceName: activeDeviceName,
      message: `[Simulasi ${activeDeviceName}] ${mockLogs.length} scan log dihasilkan untuk ${emps.length} karyawan`,
      data: mockLogs,
    }
  }

  // 3. Panggilan Riil ke Fingerspot.iO Cloud API
  try {
    const endpoint = `${activeApiUrl}/get_attlog`
    const payload = {
      cloud_id: activeCloudId,
      start_date: startDate,
      end_date: endDate || startDate,
    }
    if (activeDeviceSn) {
      payload.device_sn = activeDeviceSn
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      return {
        success: false,
        deviceId: device?.id || null,
        deviceName: activeDeviceName,
        error: `Gagal memanggil API Fingerspot ${activeDeviceName} (HTTP ${res.status}): ${errText}`,
        data: [],
      }
    }

    const result = await res.json()
    const rawData = Array.isArray(result) ? result : result.data || []

    // Pasang metadata perangkat ke setiap log
    const enrichedLogs = rawData.map((item) => ({
      ...item,
      sn: item.sn || item.device_sn || activeDeviceSn,
      deviceName: activeDeviceName,
      deviceId: device?.id || null,
      locationLabel: activeLocation,
    }))

    return {
      success: true,
      isMock: false,
      deviceId: device?.id || null,
      deviceName: activeDeviceName,
      message: result.message || `Berhasil mengambil ${enrichedLogs.length} scan log dari ${activeDeviceName}`,
      data: enrichedLogs,
    }
  } catch (err) {
    console.error(`Error fetching Fingerspot attlog for ${activeDeviceName}:`, err)
    return {
      success: false,
      deviceId: device?.id || null,
      deviceName: activeDeviceName,
      error: `Kesalahan jaringan saat memanggil ${activeDeviceName}: ${err.message}`,
      data: [],
    }
  }
}

/**
 * Menjalankan penarikan log dari SEMUA perangkat aktif secara paralel/sekuensial
 * dan memperbarui status sinkronisasi masing-masing perangkat.
 */
export async function fetchAllDeviceAttLogs({ startDate, endDate, forceMock = false }) {
  const settings = await getFingerspotSettings()
  const devices = await getFingerspotDevices()
  const activeDevices = devices.filter((d) => d.isActive)

  if (activeDevices.length === 0) {
    return {
      success: true,
      isStandby: true,
      message: 'Tidak ada perangkat Fingerspot aktif untuk disinkronkan.',
      allLogs: [],
      deviceResults: [],
      totalFetched: 0,
    }
  }

  const allLogs = []
  const deviceResults = []

  for (const device of activeDevices) {
    const fetchRes = await fetchFingerspotAttLog({
      startDate,
      endDate,
      device,
      settings,
      forceMock,
    })

    const syncStatus = fetchRes.isStandby
      ? 'STANDBY'
      : fetchRes.success
      ? (fetchRes.data?.length > 0 ? 'SUCCESS' : 'NO_DATA')
      : 'ERROR'

    const syncCount = fetchRes.data?.length || 0
    const syncMsg = fetchRes.error || fetchRes.message || 'Selesai'

    // Update status di tabel FingerspotDevice
    try {
      await updateFingerspotDevice(device.id, {
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        lastSyncCount: syncCount,
        lastSyncMsg: syncMsg,
      })
    } catch (dbErr) {
      console.error(`Failed to update device status for ${device.deviceName}:`, dbErr)
    }

    deviceResults.push({
      deviceId: device.id,
      deviceName: device.deviceName,
      cloudId: device.cloudId,
      status: syncStatus,
      count: syncCount,
      message: syncMsg,
      isMock: Boolean(fetchRes.isMock),
      error: fetchRes.error || null,
    })

    if (fetchRes.success && Array.isArray(fetchRes.data)) {
      allLogs.push(...fetchRes.data)
    }
  }

  return {
    success: true,
    isMock: Boolean(forceMock || settings.simulationMode),
    allLogs,
    deviceResults,
    totalFetched: allLogs.length,
    message: `Selesai menarik data dari ${activeDevices.length} perangkat. Total ${allLogs.length} scan log terkumpul.`,
  }
}

/**
 * Memproses dan mengagregasi log scan mentah menjadi presensi harian karyawan,
 * melakukan resolusi konflik antar multi-device (check-in terpagi, check-out terlambat),
 * menghitung denda/keterlambatan, dan menyimpan ke DB Attendance.
 */
export async function processFingerspotLogs(rawLogs = [], { sourceLabel = 'Mesin Fingerspot (API)' } = {}) {
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
      fingerspotPin: true,
      location: true,
      dept: true,
      workLocationCode: true,
    },
  })

  const empByFingerspotPin = new Map()
  const empById = new Map()
  const empByNik = new Map()
  const empByName = new Map()

  employees.forEach((emp) => {
    if (emp.fingerspotPin && String(emp.fingerspotPin).trim()) {
      empByFingerspotPin.set(String(emp.fingerspotPin).trim(), emp)
    }
    empById.set(String(emp.id), emp)
    if (emp.nik) empByNik.set(String(emp.nik).trim().toLowerCase(), emp)
    if (emp.name) empByName.set(String(emp.name).trim().toLowerCase(), emp)
  })

  // 2. Kelompokkan multi-scan per (PIN, Tanggal)
  // Menyimpan array item: { time, deviceName, deviceSn, locationLabel }
  const scanGroups = new Map()

  rawLogs.forEach((item) => {
    const rawPin = String(item.pin || item.PIN || item.scan_id || item.nik || '').trim()
    const rawDateStr = String(item.scan_date || item.scanDate || item.waktu || item.timestamp || '').trim()

    if (!rawPin || !rawDateStr) return

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
        scans: [],
      })
    }

    scanGroups.get(groupKey).scans.push({
      time: timePart,
      deviceName: item.deviceName || 'Fingerspot',
      deviceSn: item.sn || item.device_sn || '',
      locationLabel: item.locationLabel || item.location || '',
    })
  })

  let savedCount = 0
  let matchedCount = 0
  let skippedCount = 0
  const errors = []

  // 3. Proses tiap kelompok presensi harian
  for (const [key, group] of scanGroups.entries()) {
    const { pin, date, scans } = group

    // Urutkan waktu scan harian dari yang paling pagi ke paling malam
    scans.sort((a, b) => a.time.localeCompare(b.time))

    const earliestScan = scans[0] // Check-in = scan paling awal
    const latestScan = scans.length > 1 && scans[scans.length - 1].time !== earliestScan.time
      ? scans[scans.length - 1]
      : null

    const checkInTime = earliestScan.time
    const checkOutTime = latestScan ? latestScan.time : null

    // Pencocokan Employee (4-Tier Matching: fingerspotPin -> ID -> NIK -> Name)
    const matchedEmp =
      empByFingerspotPin.get(pin) ||
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

    // 4. Hitung keterlambatan & denda
    const penaltyCalc = await calculateAttendancePenalty({
      clockInTime: checkInTime,
      date,
      locationCode: matchedEmp.workLocationCode || 'gudang',
      locationName: matchedEmp.location || 'Gudang',
      deptName: matchedEmp.dept || 'Fullfilment',
    })

    const finalStatus = penaltyCalc.status || 'Present'
    const finalLateMin = penaltyCalc.lateMinutes || 0
    const finalPenalty = penaltyCalc.penaltyAmount || 0

    // Keterangan lokasi check-in & check-out berdasarkan perangkat
    const inLocLabel = earliestScan.deviceName
      ? `${earliestScan.deviceName}${earliestScan.locationLabel ? ` (${earliestScan.locationLabel})` : ''}`
      : sourceLabel

    const outLocLabel = latestScan?.deviceName
      ? `${latestScan.deviceName}${latestScan.locationLabel ? ` (${latestScan.locationLabel})` : ''}`
      : checkOutTime ? inLocLabel : null

    // Catatan rinci (termasuk conflict resolution antar mesin)
    let finalNote = penaltyCalc.penaltyLabel
      ? `${penaltyCalc.penaltyLabel} | Fingerspot`
      : 'Sync Otomatis Fingerspot'

    if (earliestScan.deviceName) {
      finalNote += ` [Masuk: ${earliestScan.deviceName} (${checkInTime})]`
    }
    if (latestScan && latestScan.deviceName) {
      finalNote += ` [Pulang: ${latestScan.deviceName} (${checkOutTime})]`
    }

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
          checkInLocation: inLocLabel,
          checkOutLocation: outLocLabel,
          isWithinRadius: true,
          note: finalNote,
        },
        update: {
          checkIn: checkInTime || undefined,
          checkOut: checkOutTime || undefined,
          status: finalStatus,
          lateMinutes: finalLateMin,
          penaltyAmount: finalPenalty,
          checkInLocation: inLocLabel,
          checkOutLocation: outLocLabel || undefined,
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
    message: `Berhasil memproses ${savedCount} presensi karyawan dari ${rawLogs.length} scan log Fingerspot (${scanGroups.size} entri harian).`,
  }
}

export { normalizeFingerspotRows } from './fingerspotExcelParser.js'
