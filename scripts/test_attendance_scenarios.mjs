// scripts/test_attendance_scenarios.mjs
import { calculateAttendancePenalty } from '../src/lib/attendanceCalculator.js'

const testCases = [
  // --- Skenario 1: Head Office (HO) ---
  {
    id: 'TC-HO-01',
    location: 'ho',
    desc: 'HO - Tepat Waktu (08:55)',
    input: { clockInTime: '08:55', date: '2026-11-02', locationCode: 'ho' },
    expected: { status: 'Present', lateMinutes: 0, penaltyAmount: 0 },
  },
  {
    id: 'TC-HO-02',
    location: 'ho',
    desc: 'HO - Telat 7 Menit (Tier 1: 1-10 Menit)',
    input: { clockInTime: '09:07', date: '2026-11-02', locationCode: 'ho' },
    expected: { status: 'Late', lateMinutes: 7, penaltyAmount: 10000 },
  },
  {
    id: 'TC-HO-03',
    location: 'ho',
    desc: 'HO - Telat 18 Menit (Tier 2: 11-20 Menit)',
    input: { clockInTime: '09:18', date: '2026-11-02', locationCode: 'ho' },
    expected: { status: 'Late', lateMinutes: 18, penaltyAmount: 20000 },
  },
  {
    id: 'TC-HO-04',
    location: 'ho',
    desc: 'HO - Telat 35 Menit (Tier 3: >20 Menit Half Day Salary)',
    input: { clockInTime: '09:35', date: '2026-11-02', locationCode: 'ho', basicSalary: 5000000 },
    expected: { status: 'Late', lateMinutes: 35, isHalfDayCut: true, penaltyAmount: 100000 },
  },
  {
    id: 'TC-HO-05',
    location: 'ho',
    desc: 'HO - Hari Sabtu (Libur / Off Day)',
    input: { clockInTime: '09:30', date: '2026-11-07', locationCode: 'ho' },
    expected: { status: 'Present', lateMinutes: 0, penaltyAmount: 0, isOffDay: true },
  },

  // --- Skenario 2: Gudang (Warehouse) ---
  {
    id: 'TC-GD-01',
    location: 'gudang',
    desc: 'Gudang - Tepat Waktu (07:55)',
    input: { clockInTime: '07:55', date: '2026-11-02', locationCode: 'gudang' },
    expected: { status: 'Present', lateMinutes: 0, penaltyAmount: 0 },
  },
  {
    id: 'TC-GD-02',
    location: 'gudang',
    desc: 'Gudang - Telat 15 Menit (Tier 1: 1-30 Menit)',
    input: { clockInTime: '08:15', date: '2026-11-02', locationCode: 'gudang' },
    expected: { status: 'Late', lateMinutes: 15, penaltyAmount: 10000 },
  },
  {
    id: 'TC-GD-03',
    location: 'gudang',
    desc: 'Gudang - Telat 45 Menit (Tier 2: 31-60 Menit)',
    input: { clockInTime: '08:45', date: '2026-11-02', locationCode: 'gudang' },
    expected: { status: 'Late', lateMinutes: 45, penaltyAmount: 25000 },
  },
  {
    id: 'TC-GD-04',
    location: 'gudang',
    desc: 'Gudang - Telat 80 Menit (Tier 3: 61-90 Menit)',
    input: { clockInTime: '09:20', date: '2026-11-02', locationCode: 'gudang' },
    expected: { status: 'Late', lateMinutes: 80, penaltyAmount: 50000 },
  },
  {
    id: 'TC-GD-05',
    location: 'gudang',
    desc: 'Gudang - Telat 120 Menit (Tier 4: >90 Menit)',
    input: { clockInTime: '10:00', date: '2026-11-02', locationCode: 'gudang' },
    expected: { status: 'Late', lateMinutes: 120, penaltyAmount: 80000 },
  },
  {
    id: 'TC-GD-06',
    location: 'gudang',
    desc: 'Gudang - Hari Sabtu Masuk (Telat 10 Menit)',
    input: { clockInTime: '08:10', date: '2026-11-07', locationCode: 'gudang' },
    expected: { status: 'Late', lateMinutes: 10, penaltyAmount: 10000 },
  },

  // --- Skenario 3: Area Sales (Others) ---
  {
    id: 'TC-SL-01',
    location: 'sales',
    desc: 'Sales - Tepat Waktu (08:50)',
    input: { clockInTime: '08:50', date: '2026-11-02', locationCode: 'sales' },
    expected: { status: 'Present', lateMinutes: 0, penaltyAmount: 0 },
  },
  {
    id: 'TC-SL-02',
    location: 'sales',
    desc: 'Sales - Telat 15 Menit (Tier 2: 11-20 Menit)',
    input: { clockInTime: '09:15', date: '2026-11-02', locationCode: 'sales' },
    expected: { status: 'Late', lateMinutes: 15, penaltyAmount: 20000 },
  },
  {
    id: 'TC-SL-03',
    location: 'sales',
    desc: 'Sales - Hari Sabtu Masuk (Telat 5 Menit)',
    input: { clockInTime: '09:05', date: '2026-11-07', locationCode: 'sales' },
    expected: { status: 'Late', lateMinutes: 5, penaltyAmount: 10000 },
  },

  // --- Skenario 4: Manhattan (Livestream) ---
  {
    id: 'TC-LS-01',
    location: 'livestream',
    desc: 'Livestream - Sesi Siaran Tepat Waktu',
    input: { clockInTime: '00:00', date: '2026-11-02', locationCode: 'livestream' },
    expected: { status: 'Present', lateMinutes: 0, penaltyAmount: 0 },
  },
  {
    id: 'TC-LS-02',
    location: 'livestream',
    desc: 'Livestream - Sesi Terlambat Dimulai (15 Menit)',
    input: { clockInTime: '00:15', date: '2026-11-02', locationCode: 'livestream' },
    expected: { status: 'Late', lateMinutes: 15, penaltyAmount: 50000 },
  },
]

async function runAttendanceTests() {
  console.log('='.repeat(92))
  console.log('  TEST RUNNER PENILAIAN & PENGHITUNGAN PRESENSI (PARAMETER-DRIVEN DB)')
  console.log('='.repeat(92))

  let passedCount = 0
  let failedCount = 0

  for (const tc of testCases) {
    const res = await calculateAttendancePenalty(tc.input)

    let matchStatus = res.status === tc.expected.status
    let matchLate = res.lateMinutes === tc.expected.lateMinutes
    let matchPenalty = res.penaltyAmount === tc.expected.penaltyAmount
    let matchHalfDay = tc.expected.isHalfDayCut !== undefined ? res.isHalfDayCut === tc.expected.isHalfDayCut : true
    let matchOffDay = tc.expected.isOffDay !== undefined ? res.isOffDay === tc.expected.isOffDay : true

    const isSuccess = matchStatus && matchLate && matchPenalty && matchHalfDay && matchOffDay

    if (isSuccess) {
      passedCount++
      console.log(`[PASS] ${tc.id.padEnd(10)} | ${tc.desc.padEnd(46)} | Res: ${res.status.padEnd(7)} (${res.lateMinutes}m) -> Rp ${String(res.penaltyAmount).padStart(6)}`)
    } else {
      failedCount++
      console.error(`[FAIL] ${tc.id.padEnd(10)} | ${tc.desc.padEnd(46)}`)
      console.error(`       Expected: status=${tc.expected.status}, late=${tc.expected.lateMinutes}m, penalty=${tc.expected.penaltyAmount}`)
      console.error(`       Actual  : status=${res.status}, late=${res.lateMinutes}m, penalty=${res.penaltyAmount}`)
    }
  }

  console.log('='.repeat(92))
  console.log(`RINGKASAN HASIL TEST: TOTAL: ${testCases.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`)
  if (failedCount === 0) {
    console.log('STATUS: SEMUA SKENARIO PENGHITUNGAN ABSENSI LOLOS VERIFIKASI DENGAN SEMPURNA! (100% OK)')
  } else {
    console.log('STATUS: ADA TEST CASE YANG GAGAL. PERIKSA DETAIL DI ATAS.')
  }
  console.log('='.repeat(92))

  process.exit(failedCount === 0 ? 0 : 1)
}

runAttendanceTests().catch(err => {
  console.error('Fatal Test Runner Error:', err)
  process.exit(1)
})

