import { calculateAttendancePenalty } from '../src/lib/attendanceCalculator.js';
import { prisma } from '../src/lib/prisma.js';

async function test() {
  console.log('--- Testing Attendance Penalty Calculations ---');

  // Test HO on weekday: Clock in 09:05 (5m late) -> 10k
  const r1 = await calculateAttendancePenalty({
    locationCode: 'ho',
    locationName: 'Head Office',
    clockInTime: '2026-10-28T09:05:00.000Z',
    dayName: 'Wednesday'
  });
  console.log('HO 09:05 (expect 10000):', r1.penaltyAmount, r1.penaltyLabel);

  // Test HO on weekday: Clock in 09:15 (15m late) -> 20k
  const r2 = await calculateAttendancePenalty({
    locationCode: 'ho',
    locationName: 'Head Office',
    clockInTime: '2026-10-28T09:15:00.000Z',
    dayName: 'Wednesday'
  });
  console.log('HO 09:15 (expect 20000):', r2.penaltyAmount, r2.penaltyLabel);

  // Test HO on weekday: Clock in 09:25 (25m late) -> half_day_salary
  const r3 = await calculateAttendancePenalty({
    locationCode: 'ho',
    locationName: 'Head Office',
    clockInTime: '2026-10-28T09:25:00.000Z',
    dayName: 'Wednesday'
  });
  console.log('HO 09:25 (expect half_day_salary):', r3.penaltyAmount, r3.deductionType, r3.penaltyLabel);

  // Test HO on Saturday: scheduled isOff: true -> 0 penalty, scheduled: Off
  const r3b = await calculateAttendancePenalty({
    locationCode: 'ho',
    locationName: 'Head Office',
    clockInTime: '2026-10-24T09:25:00.000Z',
    dayName: 'Saturday'
  });
  console.log('HO Saturday (expect Off / 0 penalty):', r3b.penaltyAmount, r3b.notes);

  // Test Others (Area Sales) on Saturday: scheduled 09:00 - 15:00. Clock in 09:12 -> 20k
  const r4 = await calculateAttendancePenalty({
    locationName: 'Others',
    clockInTime: '2026-10-24T09:12:00.000Z',
    dayName: 'Saturday'
  });
  console.log('Others (Area Sales) Sat 09:12 (expect 20000):', r4.penaltyAmount, r4.penaltyLabel);

  // Test Gudang: Clock in 08:35 (35m late) -> 25k, 09:35 (95m late) -> 80k
  const r5 = await calculateAttendancePenalty({
    locationName: 'Gudang',
    clockInTime: '2026-10-28T08:35:00.000Z',
    dayName: 'Wednesday'
  });
  console.log('Gudang 08:35 (expect 25000):', r5.penaltyAmount, r5.penaltyLabel);

  const r6 = await calculateAttendancePenalty({
    locationName: 'Gudang',
    clockInTime: '2026-10-28T09:35:00.000Z',
    dayName: 'Wednesday'
  });
  console.log('Gudang 09:35 (expect 80000):', r6.penaltyAmount, r6.penaltyLabel);

  // Test Manhattan (Livestream): late 2 min -> 50k
  const r7 = await calculateAttendancePenalty({
    locationName: 'Manhattan',
    clockInTime: '2026-10-28T00:02:00.000Z',
    dayName: 'Wednesday'
  });
  console.log('Manhattan (Livestream) late (expect 50000):', r7.penaltyAmount, r7.penaltyLabel);

  await prisma.$disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});

