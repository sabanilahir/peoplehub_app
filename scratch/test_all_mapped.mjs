import { calculateAttendancePenalty } from '../src/lib/attendanceCalculator.js';
import { prisma } from '../src/lib/prisma.js';

async function testAll() {
  console.log('--- Testing Attendance Penalty with WorkLocationCode ---');
  
  // 1. Employee with location 'Others' / workLocationCode 'sales'
  const rSales = await calculateAttendancePenalty({
    clockInTime: '09:08',
    locationCode: 'sales',
    locationName: 'Others'
  });
  console.log('Others / Sales 09:08 (expect 10000):', rSales.penaltyAmount, rSales.penaltyLabel);

  // 2. Employee with location 'Manhattan' / workLocationCode 'livestream'
  const rLive = await calculateAttendancePenalty({
    clockInTime: '00:03',
    locationCode: 'livestream',
    locationName: 'Manhattan'
  });
  console.log('Manhattan / Livestream 00:03 (expect 50000):', rLive.penaltyAmount, rLive.penaltyLabel);

  // 3. Employee with location 'Head Office' / workLocationCode 'ho'
  const rHO = await calculateAttendancePenalty({
    clockInTime: '09:12',
    locationCode: 'ho',
    locationName: 'Head Office'
  });
  console.log('Head Office / HO 09:12 (expect 20000):', rHO.penaltyAmount, rHO.penaltyLabel);

  // 4. Employee with location 'Gudang' / workLocationCode 'gudang'
  const rGudang = await calculateAttendancePenalty({
    clockInTime: '08:40',
    locationCode: 'gudang',
    locationName: 'Gudang'
  });
  console.log('Gudang 08:40 (expect 25000):', rGudang.penaltyAmount, rGudang.penaltyLabel);

  // 5. Test clock-in via API endpoint POST /api/attendance for an employee in Others
  const empOthers = await prisma.employee.findFirst({
    where: { workLocationCode: 'sales' },
    select: { id: true, name: true, location: true, workLocationCode: true }
  });
  console.log('\nSample employee with sales mapping:', empOthers);

  await prisma.$disconnect();
}

testAll().catch(console.error);

