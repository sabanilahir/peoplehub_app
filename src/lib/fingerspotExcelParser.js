// src/lib/fingerspotExcelParser.js
import * as XLSX from 'xlsx'

/**
 * Helper membersihkan tanggal ke format YYYY-MM-DD
 */
export function cleanDateStr(raw) {
  if (!raw) return ''
  let str = String(raw).trim()
  if (str.includes('T')) str = str.split('T')[0]
  if (str.includes(' ')) str = str.split(' ')[0]

  if (str.includes('/') || str.includes('-')) {
    const parts = str.split(/[\/\-]/)
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
      }
    }
  }
  return str.slice(0, 10)
}

/**
 * Helper membersihkan jam ke format HH:mm:ss
 */
export function cleanTimeStr(raw) {
  if (!raw) return ''
  let str = String(raw).trim()
  if (str.includes('T')) str = str.split('T')[1]
  if (str.includes(' ')) str = str.split(' ')[1]

  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':')
    return `${h.padStart(2, '0')}:${m}:00`
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
    const [h, m, s] = str.split(':')
    return `${h.padStart(2, '0')}:${m}:${s}`
  }
  return str.slice(0, 8)
}

/**
 * Menormalisasi baris data mentah dari Excel / CSV export Fingerspot
 * Mendukung:
 * 1. Format Log Scan Mentah (PIN, DateTime/Waktu Scan, Status)
 * 2. Format Rekap Harian (PIN, Tanggal, Jam Masuk, Jam Pulang)
 */
export function normalizeFingerspotRows(rawRows = []) {
  if (!Array.isArray(rawRows)) return []

  const normalizedLogs = []

  for (const row of rawRows) {
    if (!row || typeof row !== 'object') continue

    // Cari value berdasarkan variasi nama kolom (case-insensitive)
    const findVal = (patterns) => {
      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/[\s_\.]+/g, ' ')
        for (const p of patterns) {
          if (cleanKey === p || cleanKey.includes(p)) {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim()
            }
          }
        }
      }
      return ''
    }

    // 1. PIN / ID / NIK
    const pin =
      findVal(['pin', 'user id', 'userid', 'no id', 'scan id', 'nik', 'id karyawan', 'badge', 'no']) ||
      String(row.pin || row.PIN || row.id || row.nik || '').trim()

    // 2. Nama Karyawan (opsional)
    const name = findVal(['nama karyawan', 'nama', 'name', 'employee name'])

    // 3. Serial Number Mesin (opsional)
    const sn = findVal(['device sn', 'serial number', 'sn', 'mesin']) || 'FSPOT-GUDANG-01'

    // 4. Deteksi apakah Format Rekap Harian (memiliki kolom jam masuk & jam pulang)
    const checkInTime = findVal(['jam masuk', 'scan masuk', 'masuk', 'check in', 'clock in', 'in'])
    const checkOutTime = findVal(['jam pulang', 'scan pulang', 'pulang', 'keluar', 'check out', 'clock out', 'out'])
    const separateDate = findVal(['tanggal', 'date', 'tgl'])

    if (separateDate && (checkInTime || checkOutTime)) {
      const datePart = cleanDateStr(separateDate)
      if (datePart && pin) {
        if (checkInTime) {
          const timePart = cleanTimeStr(checkInTime)
          if (timePart) {
            normalizedLogs.push({
              pin,
              name,
              scan_date: `${datePart} ${timePart}`,
              sn,
              status_scan: 1,
            })
          }
        }
        if (checkOutTime) {
          const timePart = cleanTimeStr(checkOutTime)
          if (timePart) {
            normalizedLogs.push({
              pin,
              name,
              scan_date: `${datePart} ${timePart}`,
              sn,
              status_scan: 2,
            })
          }
        }
        continue
      }
    }

    // 5. Deteksi Format Log Scan Tunggal (Single Timestamp Column)
    const singleDateTime = findVal([
      'waktu scan',
      'scan date',
      'scandate',
      'tanggal jam',
      'datetime',
      'date time',
      'timestamp',
      'waktu',
      'tanggal',
      'date',
    ])

    const separateTime = findVal(['jam', 'time'])

    let finalDateTime = ''
    if (separateDate && separateTime) {
      finalDateTime = `${cleanDateStr(separateDate)} ${cleanTimeStr(separateTime)}`
    } else if (singleDateTime) {
      if (singleDateTime.includes(' ') || singleDateTime.includes('T')) {
        const d = cleanDateStr(singleDateTime)
        const t = cleanTimeStr(singleDateTime)
        if (d && t) finalDateTime = `${d} ${t}`
      } else {
        finalDateTime = singleDateTime
      }
    }

    if (pin && finalDateTime) {
      normalizedLogs.push({
        pin,
        name,
        scan_date: finalDateTime,
        sn,
        status_scan: 1,
      })
    }
  }

  return normalizedLogs
}

/**
 * Generate dan unduh Template Excel untuk Fingerspot
 * @param {'raw_log' | 'daily_summary'} type
 */
export function generateFingerspotTemplate(type = 'raw_log') {
  const today = new Date().toISOString().split('T')[0]

  if (type === 'raw_log') {
    const data = [
      {
        'PIN': '300032',
        'Nama Karyawan': 'Achmad Rizali',
        'Waktu Scan': `${today} 07:55:12`,
        'Status Scan': 'Masuk',
        'SN Mesin': 'FSPOT-GUDANG-01',
      },
      {
        'PIN': '300032',
        'Nama Karyawan': 'Achmad Rizali',
        'Waktu Scan': `${today} 17:05:40`,
        'Status Scan': 'Pulang',
        'SN Mesin': 'FSPOT-GUDANG-01',
      },
      {
        'PIN': '300034',
        'Nama Karyawan': 'Agung Hakiki',
        'Waktu Scan': `${today} 08:14:20`,
        'Status Scan': 'Masuk',
        'SN Mesin': 'FSPOT-GUDANG-01',
      },
      {
        'PIN': '300034',
        'Nama Karyawan': 'Agung Hakiki',
        'Waktu Scan': `${today} 17:02:15`,
        'Status Scan': 'Pulang',
        'SN Mesin': 'FSPOT-GUDANG-01',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Log Scan Fingerspot')
    XLSX.writeFile(wb, 'Template_Fingerspot_Log_Scan_Mentah.xlsx')
  } else {
    const data = [
      {
        'PIN': '300032',
        'Nama Karyawan': 'Achmad Rizali',
        'Tanggal': today,
        'Jam Masuk': '07:55',
        'Jam Pulang': '17:05',
        'SN Mesin': 'FSPOT-GUDANG-01',
      },
      {
        'PIN': '300034',
        'Nama Karyawan': 'Agung Hakiki',
        'Tanggal': today,
        'Jam Masuk': '08:14',
        'Jam Pulang': '17:02',
        'SN Mesin': 'FSPOT-GUDANG-01',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi Harian')
    XLSX.writeFile(wb, 'Template_Fingerspot_Rekap_Harian.xlsx')
  }
}
