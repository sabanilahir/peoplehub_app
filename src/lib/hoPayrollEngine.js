// src/lib/hoPayrollEngine.js

/**
 * HO Payroll Engine
 * Mengimplementasikan 6 aturan perhitungan payroll dan absensi Head Office (HO)
 * secara deterministik dan presisi sesuai standar Excel perusahaan:
 * 1. Lembur (Overtime) berbasis Gaji Pokok / Hari Kerja Cut-off / 8 Jam
 * 2. Potongan Setengah Hari (Half Day Leave) = (Total Gross / Hari Kerja Cut-off) / 2
 * 3. Potongan Cuti Sakit (Sick Leave) = HANYA memotong prorata Tunjangan Transport / Hari Kerja Cut-off
 * 4. Potongan Unpaid Leave (Mangkir) = Total Gross / Hari Kerja Cut-off
 * 5. Prorata Karyawan Join Tengah Bulan = (Total Gross / Hari Kerja Cut-off) * Hari Kerja Dijalani
 * 6. Prorata Karyawan Resign Tengah Bulan = (Total Gross / Hari Kerja Cut-off) * Hari Kerja Dijalani
 */

/**
 * Menghitung rate lembur per jam untuk karyawan HO
 * Formula: (Gaji Pokok / Hari Kerja Cut-off) / 8
 * @param {number} basicSalary - Gaji Pokok karyawan
 * @param {number} workingDays - Jumlah hari kerja efektif dalam periode cut-off (misal 22)
 * @returns {{ dailyRate: number, hourlyRate: number, exactDailyRate: number, exactHourlyRate: number }}
 */
export function calcHoOvertimeRate(basicSalary, workingDays) {
  if (!basicSalary || !workingDays || workingDays <= 0) {
    return { dailyRate: 0, hourlyRate: 0, exactDailyRate: 0, exactHourlyRate: 0 }
  }
  const exactDailyRate = basicSalary / workingDays
  const exactHourlyRate = exactDailyRate / 8
  const dailyRate = Math.round(exactDailyRate)
  const hourlyRate = Math.round(exactHourlyRate)

  return { dailyRate, hourlyRate, exactDailyRate, exactHourlyRate }
}

/**
 * Menghitung nominal fee lembur untuk suatu durasi lembur
 * @param {number} basicSalary
 * @param {number} workingDays
 * @param {number} hours - Durasi lembur dalam desimal jam (misal 5.333333 atau 2.5)
 * @returns {{ hours: number, hourlyRate: number, fee: number }}
 */
export function calcHoOvertimeFee(basicSalary, workingDays, hours) {
  const { hourlyRate, exactHourlyRate } = calcHoOvertimeRate(basicSalary, workingDays)
  // Perhitungan presisi menggunakan exactHourlyRate lalu dibulatkan ke rupiah
  const fee = Math.round(exactHourlyRate * hours)
  return { hours, hourlyRate, fee }
}

/**
 * Menghitung selisih jam antara jam mulai dan jam selesai (format HH:mm)
 * Mendukung perhitungan lintas malam (overnight) jika end < start
 * @param {string} startTime - "18:00"
 * @param {string} endTime - "23:20"
 * @returns {{ hours: number, formattedHours: string, minutes: number }}
 */
export function parseOvertimeDuration(startTime, endTime) {
  if (!startTime || !endTime) return { hours: 0, formattedHours: '0.00', minutes: 0 }

  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  let startMinutes = sh * 60 + sm
  let endMinutes = eh * 60 + em

  if (endMinutes < startMinutes) {
    // Menyeberang tengah malam
    endMinutes += 24 * 60
  }

  const diffMinutes = endMinutes - startMinutes
  const hours = diffMinutes / 60
  const formattedHours = (Math.round(hours * 100) / 100).toFixed(2)

  return { hours, formattedHours, minutes: diffMinutes }
}

/**
 * Menghitung rate dan fee lembur untuk Karyawan Gudang (Warehouse)
 * Berdasarkan Ketentuan Spesifikasi Excel Pengguna:
 * 1. Senin - Sabtu (Hari Kerja Gudang): Flat Rp 15.000 / Jam
 * 2. Minggu & Tanggal Merah (Hari Libur Gudang): Flat Rp 25.000 / Jam
 * @param {Object} params
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {number} params.hours - Durasi lembur dalam jam (misal 3.0)
 * @param {boolean} [params.isHoliday=false] - Apakah tanggal merah / libur nasional
 * @returns {{ hourlyRate: number, fee: number, dayType: string, label: string, isSpecialRate: boolean }}
 */
export function calcWarehouseOvertime({ date, hours = 0, isHoliday = false }) {
  let isSunday = false
  if (date) {
    const d = new Date(date + 'T00:00:00')
    isSunday = d.getDay() === 0
  }

  const isSpecialRate = isSunday || isHoliday
  const hourlyRate = isSpecialRate ? 25000 : 15000
  const fee = Math.round(hourlyRate * hours)
  const dayType = isSpecialRate ? 'HOLIDAY_OR_SUNDAY' : 'REGULAR_WORKDAY'
  const label = isSpecialRate
    ? (isSunday ? 'Lembur Hari Minggu (Rp 25.000/jam)' : 'Lembur Tanggal Merah (Rp 25.000/jam)')
    : 'Lembur Hari Kerja Senin-Sabtu (Rp 15.000/jam)'

  return { hourlyRate, fee, dayType, label, isSpecialRate, hours }
}

/**
 * Resolver dinamis rate lembur berdasarkan Work Location Karyawan
 * @param {Object} params
 * @param {Object} params.employee - Record employee ({ workLocationCode, location, salary })
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {number} [params.workingDays=22] - Hari kerja cut-off (untuk HO)
 * @param {boolean} [params.isHoliday=false] - Apakah tanggal merah
 */
export function resolveEmployeeOvertimeRate({ employee, date, workingDays = 22, isHoliday = false }) {
  const loc = (employee?.workLocationCode || employee?.location || 'ho').toLowerCase()
  const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')

  if (isGudang) {
    const res = calcWarehouseOvertime({ date, hours: 1, isHoliday })
    return {
      locationType: 'gudang',
      hourlyRate: res.hourlyRate,
      label: res.label,
      isSpecialRate: res.isSpecialRate,
    }
  }

  // Default HO: Basic / WorkingDays / 8
  const basicSalary = Number(employee?.salary || 0) * 0.75
  const hoRate = calcHoOvertimeRate(basicSalary, workingDays)
  return {
    locationType: 'ho',
    hourlyRate: hoRate.hourlyRate,
    exactHourlyRate: hoRate.exactHourlyRate,
    dailyRate: hoRate.dailyRate,
    label: `Lembur HO (Rp ${hoRate.hourlyRate.toLocaleString('id-ID')}/jam)`,
    isSpecialRate: false,
  }
}

/**
 * Menghitung potongan gaji satu hari dan setengah hari
 * Formula: Gaji 1 Hari = Gross / Hari Kerja
 *          Gaji 1/2 Hari = Gaji 1 Hari / 2
 * Note: Seluruh komponen (Gross) terkena potongan
 * @param {number} grossSalary - Total Gross Salary
 * @param {number} workingDays - Hari Kerja Cut-off
 * @param {number} halfDayCount - Jumlah kejadian setengah hari (default 1)
 */
export function calcHoHalfDayDeduction(grossSalary, workingDays, halfDayCount = 1) {
  if (!grossSalary || !workingDays || workingDays <= 0 || halfDayCount <= 0) {
    return { fullDayRate: 0, halfDayRate: 0, totalDeduction: 0 }
  }
  const exactFullDay = grossSalary / workingDays
  const exactHalfDay = exactFullDay / 2

  const fullDayRate = Math.round(exactFullDay)
  const halfDayRate = Math.round(exactHalfDay)
  const totalDeduction = Math.round(exactHalfDay * halfDayCount)

  return { fullDayRate, halfDayRate, totalDeduction, count: halfDayCount }
}

/**
 * Menghitung potongan Cuti Sakit (Sick Leave)
 * Ketentuan:
 * 1. Gaji Pokok (75%) & Tunjangan Tidak Tetap (10%) TETAP DIBAYAR UTUH.
 * 2. HANYA Tunjangan Transportasi yang dipotong secara prorata harian.
 * @param {number} transportAllowance - Besaran Tunjangan Transport sebulan
 * @param {number} workingDays - Hari Kerja Cut-off
 * @param {number} sickDays - Jumlah hari sakit yang diajukan
 */
export function calcHoSickLeaveDeduction(transportAllowance, workingDays, sickDays = 1) {
  if (!transportAllowance || !workingDays || workingDays <= 0 || sickDays <= 0) {
    return { transportPerDay: 0, totalDeduction: 0, sickDays }
  }
  const exactTransportPerDay = transportAllowance / workingDays
  const transportPerDay = Math.round(exactTransportPerDay)
  const totalDeduction = Math.round(exactTransportPerDay * sickDays)

  return { transportPerDay, totalDeduction, sickDays }
}

/**
 * Menghitung potongan Unpaid Leave (Mangkir / Izin Potong Gaji)
 * Note: Seluruh komponen kena potongan (berbasis Gross)
 * @param {number} grossSalary - Total Gross Salary
 * @param {number} workingDays - Hari Kerja Cut-off
 * @param {number} unpaidDays - Jumlah hari unpaid leave
 */
export function calcHoUnpaidLeaveDeduction(grossSalary, workingDays, unpaidDays = 1) {
  if (!grossSalary || !workingDays || workingDays <= 0 || unpaidDays <= 0) {
    return { dailyGrossRate: 0, totalDeduction: 0, unpaidDays }
  }
  const exactDailyRate = grossSalary / workingDays
  const dailyGrossRate = Math.round(exactDailyRate)
  const totalDeduction = Math.round(exactDailyRate * unpaidDays)

  return { dailyGrossRate, totalDeduction, unpaidDays }
}

/**
 * Menghitung gaji prorata untuk karyawan Join atau Resign di pertengahan bulan
 * Formula: (Total Gross / Hari Kerja Cut-off) * Hari Kerja Aktif
 * @param {number} grossSalary - Total Gross Salary
 * @param {number} workingDays - Hari Kerja Cut-off
 * @param {number} activeWorkingDays - Jumlah hari kerja aktif yang dijalani
 */
export function calcHoProratedSalary(grossSalary, workingDays, activeWorkingDays) {
  if (!grossSalary || !workingDays || workingDays <= 0 || activeWorkingDays <= 0) {
    return { proratedSalary: 0, dailyRate: 0, activeWorkingDays, workingDays }
  }
  const exactDailyRate = grossSalary / workingDays
  const dailyRate = Math.round(exactDailyRate)
  const proratedSalary = Math.round(exactDailyRate * activeWorkingDays)

  return { proratedSalary, dailyRate, activeWorkingDays, workingDays }
}

/**
 * Rekapitulasi Menyeluruh Gaji Karyawan HO untuk Suatu Cut-off
 * Menggabungkan seluruh 6 aturan ke dalam satu kalkulasi terpadu
 */
export function calculateHoFullPayroll({
  employee,
  grossSalary,
  basicSalary,
  transportAllowance,
  nonPermanentAllowance,
  kpiAllowance,
  workingDays,
  overtimeEntries = [],
  halfDayCount = 0,
  sickLeaveDays = 0,
  hasValidDoctorCert = true,
  unpaidDays = 0,
  isMidMonthJoin = false,
  joinActiveDays = null,
  isMidMonthResign = false,
  resignActiveDays = null,
}) {
  const empGross = Number(grossSalary || employee?.salary || 0)
  const empBasic = Number(basicSalary || Math.round(empGross * 0.75))
  const empTransport = Number(transportAllowance || Math.round(empGross * 0.15))
  const empNonPermanent = Number(nonPermanentAllowance ?? kpiAllowance ?? Math.round(empGross * 0.10))
  const empKpi = empNonPermanent
  const totalDays = Number(workingDays || 22)

  // 1. Lembur
  const loc = (employee?.workLocationCode || employee?.location || '').toLowerCase()
  const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')

  let overtimeRate = { dailyRate: 0, hourlyRate: 0, exactDailyRate: 0, exactHourlyRate: 0 }
  let totalOvertimeHours = 0
  let totalOvertimeFee = 0
  let processedOvertimes = []

  if (isGudang) {
    processedOvertimes = overtimeEntries.map((ot) => {
      const duration = (ot.startTime && ot.endTime)
        ? parseOvertimeDuration(ot.startTime, ot.endTime)
        : { hours: Number(ot.totalHours) || 0 }
      const hours = duration.hours
      totalOvertimeHours += hours
      let fee = 0
      let hourlyRate = 0
      if (ot.totalFee && ot.totalFee > 0) {
        fee = ot.totalFee
        hourlyRate = ot.hourlyRate || Math.round(fee / (hours || 1))
      } else {
        const calc = calcWarehouseOvertime({ date: ot.date, hours })
        fee = calc.fee
        hourlyRate = calc.hourlyRate
      }
      totalOvertimeFee += fee
      return {
        ...ot,
        totalHours: Math.round(hours * 100) / 100,
        formattedHours: (Math.round(hours * 100) / 100).toFixed(2),
        hourlyRate,
        fee,
      }
    })
    overtimeRate = {
      dailyRate: 0,
      hourlyRate: totalOvertimeHours > 0 ? Math.round(totalOvertimeFee / totalOvertimeHours) : 15000,
      exactDailyRate: 0,
      exactHourlyRate: totalOvertimeHours > 0 ? totalOvertimeFee / totalOvertimeHours : 15000,
    }
  } else {
    overtimeRate = calcHoOvertimeRate(empBasic, totalDays)
    processedOvertimes = overtimeEntries.map((ot) => {
      // Utamakan hitung dari startTime & endTime agar durasi menit (misal 20 menit = 1/3 jam) presisi
      const duration = (ot.startTime && ot.endTime)
        ? parseOvertimeDuration(ot.startTime, ot.endTime)
        : { hours: Number(ot.totalHours) || 0 }
      const hours = duration.hours
      const fee = Math.round(overtimeRate.exactHourlyRate * hours)
      totalOvertimeHours += hours
      return {
        ...ot,
        totalHours: Math.round(hours * 100) / 100,
        formattedHours: (Math.round(hours * 100) / 100).toFixed(2),
        hourlyRate: overtimeRate.hourlyRate,
        fee,
      }
    })
    // Total lembur dihitung dari total akumulasi jam presisi agar sesuai pembulatan Excel
    totalOvertimeFee = Math.round(overtimeRate.exactHourlyRate * totalOvertimeHours)
  }

  // 2. Setengah Hari
  const halfDay = calcHoHalfDayDeduction(empGross, totalDays, halfDayCount)

  // 3. Cuti Sakit vs Unpaid Leave
  // Jika tidak memiliki surat dokter yang sah dari HaloDoc/Puskesmas/RS, dialihkan jadi Unpaid Leave
  let actualSickDays = sickLeaveDays
  let extraUnpaidFromSick = 0
  if (!hasValidDoctorCert && sickLeaveDays > 0) {
    actualSickDays = 0
    extraUnpaidFromSick = sickLeaveDays
  }

  const sick = calcHoSickLeaveDeduction(empTransport, totalDays, actualSickDays)

  // 4. Unpaid Leave
  const totalUnpaidDays = unpaidDays + extraUnpaidFromSick
  const unpaid = calcHoUnpaidLeaveDeduction(empGross, totalDays, totalUnpaidDays)

  // 5 & 6. Prorata Join / Resign
  let isProrated = false
  let prorateReason = null
  let activeDays = totalDays
  let proratedBaseGross = empGross

  if (isMidMonthJoin && typeof joinActiveDays === 'number' && joinActiveDays < totalDays) {
    isProrated = true
    prorateReason = 'New Joiner (Join Tengah Bulan)'
    activeDays = joinActiveDays
    const p = calcHoProratedSalary(empGross, totalDays, activeDays)
    proratedBaseGross = p.proratedSalary
  } else if (isMidMonthResign && typeof resignActiveDays === 'number' && resignActiveDays < totalDays) {
    isProrated = true
    prorateReason = 'Resignation (Resign Tengah Bulan)'
    activeDays = resignActiveDays
    const p = calcHoProratedSalary(empGross, totalDays, activeDays)
    proratedBaseGross = p.proratedSalary
  }

  // Hitung Subtotal Sebelum Potongan dan Bersih
  // Base Gross disesuaikan bila terjadi prorata join/resign
  const adjustedBasic = isProrated ? Math.round(empBasic * (activeDays / totalDays)) : empBasic
  const adjustedTransport = isProrated ? Math.round(empTransport * (activeDays / totalDays)) : empTransport
  const adjustedNonPermanent = isProrated ? Math.round(empNonPermanent * (activeDays / totalDays)) : empNonPermanent
  const adjustedKpi = adjustedNonPermanent

  const totalDeductions = halfDay.totalDeduction + sick.totalDeduction + unpaid.totalDeduction
  const grossPay = proratedBaseGross + totalOvertimeFee
  const netBeforeTaxAndBpjs = grossPay - totalDeductions

  return {
    grossSalary: empGross,
    basicSalary: empBasic,
    transportAllowance: empTransport,
    nonPermanentAllowance: empNonPermanent,
    kpiAllowance: empKpi, // alias
    workingDays: totalDays,
    // Prorate info
    isProrated,
    prorateReason,
    activeDays,
    proratedBaseGross,
    adjustedBasic,
    adjustedTransport,
    adjustedNonPermanent,
    adjustedKpi,
    // Overtime
    overtimeRate: overtimeRate.hourlyRate,
    overtimeRatePerDay: overtimeRate.dailyRate,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalOvertimeFee,
    overtimeEntries: processedOvertimes,
    // Deductions
    halfDayCount,
    halfDayDeduction: halfDay.totalDeduction,
    halfDayRate: halfDay.halfDayRate,
    sickDays: actualSickDays,
    sickLeaveDeduction: sick.totalDeduction,
    transportPerDay: sick.transportPerDay,
    hasValidDoctorCert,
    unpaidDays: totalUnpaidDays,
    unpaidLeaveDeduction: unpaid.totalDeduction,
    dailyGrossRate: unpaid.dailyGrossRate,
    convertedFromSick: extraUnpaidFromSick > 0,
    // Totals
    totalDeductions,
    grossPay,
    netBeforeTaxAndBpjs,
  }
}
