// test_ho_payroll_rules.js
const {
  calcHoOvertimeRate,
  calcHoOvertimeFee,
  calcWarehouseOvertime,
  resolveEmployeeOvertimeRate,
  parseOvertimeDuration,
  calcHoHalfDayDeduction,
  calcHoSickLeaveDeduction,
  calcHoUnpaidLeaveDeduction,
  calcHoProratedSalary,
  calculateHoFullPayroll,
} = require('./src/lib/hoPayrollEngine.js')

console.log('=== RUNNING HO PAYROLL ENGINE VERIFICATION TEST ===\n')

let allPassed = true
function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${testName}: actual=${actual}, expected=${expected}`)
  } else {
    console.error(`❌ [FAIL] ${testName}: actual=${actual}, expected=${expected}`)
    allPassed = false
  }
}

// 1. OVERTIME TEST (Rama)
// Basic: 5,625,000, Working Days: 22
// Day Rate: 255,682, Hour Rate: 31,960
const otRate = calcHoOvertimeRate(5625000, 22)
assertEqual('Lembur Daily Rate (22 hari)', otRate.dailyRate, 255682)
assertEqual('Lembur Hourly Rate (8 jam)', otRate.hourlyRate, 31960)

// Kamis 27/08 18:00 - 23:20 = 5 jam 20 menit = 16/3 jam (~5.3333h)
const dur1 = parseOvertimeDuration('18:00', '23:20')
const fee1 = calcHoOvertimeFee(5625000, 22, dur1.hours)
assertEqual('Lembur Kamis Fee (18:00 - 23:20)', fee1.fee, 170455)

// Jumat 28/08 06:30 - 09:00 = 2 jam 30 menit = 2.5 jam
const dur2 = parseOvertimeDuration('06:30', '09:00')
const fee2 = calcHoOvertimeFee(5625000, 22, dur2.hours)
assertEqual('Lembur Jumat Fee (06:30 - 09:00)', fee2.fee, 79901)

// Di Excel, formula Total Lembur Sebulan (cell D17 & cell H11) mengalikan total jam kumulatif (7.8333 jam) x rate:
// 7.833333 * 31960.22727 = 250,355.11 -> dibulatkan Rp 250,355!
const totalHours = dur1.hours + dur2.hours
const monthlyOtFee = calcHoOvertimeFee(5625000, 22, totalHours).fee
assertEqual('Total Lembur Sebulan (7.83 jam)', monthlyOtFee, 250355)

// 2. SETENGAH HARI TEST (Rama)
// Gross: 7,500,000, 22 hari
const halfDay = calcHoHalfDayDeduction(7500000, 22, 1)
assertEqual('Gaji 1 Hari (Gross/22)', halfDay.fullDayRate, 340909)
assertEqual('Gaji Setengah Hari (Gross/22/2)', halfDay.halfDayRate, 170455)

// 3. SICK LEAVE TEST (Rama)
// Transport: 1,125,000, 22 hari
const sick = calcHoSickLeaveDeduction(1125000, 22, 1)
assertEqual('Prorata Tunjangan Transport / Hari', sick.transportPerDay, 51136)
assertEqual('Potongan Sakit 1 Hari', sick.totalDeduction, 51136)

// 4. UNPAID LEAVE TEST (Rama)
// Gross: 7,500,000, 22 hari
const unpaid = calcHoUnpaidLeaveDeduction(7500000, 22, 1)
assertEqual('Potongan Unpaid Leave 1 Hari', unpaid.dailyGrossRate, 340909)

// 5. PRORATA JOIN TEST (Rama)
// Gross: 7,500,000, 23 hari cut-off, join 12 hari aktif
const joinProrate = calcHoProratedSalary(7500000, 23, 12)
assertEqual('Prorata Join 12 Hari dari 23 Hari', joinProrate.proratedSalary, 3913043)

// 6. PRORATA RESIGN TEST (Rama)
// Gross: 7,500,000, 23 hari cut-off, resign 8 hari aktif
const resignProrate = calcHoProratedSalary(7500000, 23, 8)
assertEqual('Prorata Resign 8 Hari dari 23 Hari', resignProrate.proratedSalary, 2608696)

// 7. LEMBUR GUDANG TEST (Dede - Packer, Gross 3,000,000)
// Senin - Sabtu: 15.000 / Jam
const weekdayGudang = calcWarehouseOvertime({ date: '2026-08-27', hours: 3 }) // Kamis
assertEqual('Lembur Gudang Hari Kerja (Senin-Sabtu) Rate', weekdayGudang.hourlyRate, 15000)
assertEqual('Lembur Gudang Hari Kerja (3 jam x 15.000) Fee', weekdayGudang.fee, 45000)

// Minggu: 25.000 / Jam
const sundayGudang = calcWarehouseOvertime({ date: '2026-08-30', hours: 4 }) // Minggu
assertEqual('Lembur Gudang Hari Minggu Rate', sundayGudang.hourlyRate, 25000)
assertEqual('Lembur Gudang Hari Minggu (4 jam x 25.000) Fee', sundayGudang.fee, 100000)

// Tanggal Merah / Libur Nasional: 25.000 / Jam
const holidayGudang = calcWarehouseOvertime({ date: '2026-08-17', hours: 5, isHoliday: true }) // 17 Agustus
assertEqual('Lembur Gudang Tanggal Merah Rate', holidayGudang.hourlyRate, 25000)
assertEqual('Lembur Gudang Tanggal Merah (5 jam x 25.000) Fee', holidayGudang.fee, 125000)

// 8. FULL PAYROLL CALCULATION FOR DEDE - PACKER (Gudang Overtime Integration)
const dedePayroll = calculateHoFullPayroll({
  employee: { name: 'Dede - Packer', location: 'Gudang', workLocationCode: 'gudang', salary: 3000000 },
  grossSalary: 3000000,
  workingDays: 23,
  overtimeEntries: [
    { date: '2026-08-27', totalHours: 3, totalFee: 45000, hourlyRate: 15000 },
    { date: '2026-08-30', totalHours: 4, totalFee: 100000, hourlyRate: 25000 },
  ],
})
assertEqual('Dede Total Overtime Hours (3 + 4 jam)', dedePayroll.totalOvertimeHours, 7)
assertEqual('Dede Total Overtime Fee (45.000 + 100.000)', dedePayroll.totalOvertimeFee, 145000)
assertEqual('Dede Gross Pay (Gross 3.000.000 + Lembur 145.000)', dedePayroll.grossPay, 3145000)

console.log('\n----------------------------------------')
if (allPassed) {
  console.log('🎉 ALL 6 HO PAYROLL RULES MATCH EXCEL 100% TO THE RUPIAH!')
} else {
  console.log('❌ SOME TESTS FAILED. PLEASE REVIEW.')
  process.exit(1)
}
