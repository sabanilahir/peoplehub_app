// scripts/test_2_tier_approval.mjs
async function runTests() {
  console.log('=== TEST 1: Karyawan Staf Biasa (Melyta Hasty - ID 300098) ===')
  
  // 1. Submit leave request for Melyta
  const res1 = await fetch('http://localhost:3000/api/leave/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 300098, // Melyta Hasty
      typeId: 1, // Cuti Tahunan
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      note: 'Keperluan keluarga di luar kota',
      customData: {
        f_handover: 'Sudah handover ke Vidya Shevina',
        f_emergency: '08123456789',
      },
    }),
  })
  const json1 = await res1.json()
  console.log('Create Leave Status:', res1.status)
  if (!json1.success) {
    console.error('Error creating leave:', json1.error)
    return
  }

  const leave1 = json1.data
  console.log(`Leave ID ${leave1.id} Created! Status: ${leave1.status}`)
  console.log('Generated Steps:')
  leave1.steps.forEach((s) => {
    console.log(`  - [Step ${s.level}] ${s.label} -> Approver ID: ${s.approverId} (${s.approverName}) | Status: ${s.status}`)
  })

  // 2. Step 1 Approval by Moh. Raul Amarullah (ID 300090)
  console.log('\n--> Moh. Raul Amarullah (Approval 1) performs Approve...')
  const approveRes1 = await fetch(`http://localhost:3000/api/leave/requests/${leave1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      approverId: 300090,
      approverName: 'MOH. RAUL AMARULLAH',
      note: 'Pekerjaan FAT sudah didelegasikan, disetujui.',
    }),
  })
  const approveJson1 = await approveRes1.json()
  console.log('After Step 1 Approve -> Overall Status:', approveJson1.data.status)
  approveJson1.data.steps.forEach((s) => {
    console.log(`  - [Step ${s.level}] ${s.label} | Status: ${s.status} | ActedBy: ${s.approverName || '-'} | Note: ${s.note || '-'}`)
  })

  // 3. Step 2 Approval by Devita Lesmana (ID 300060)
  console.log('\n--> Devita Lesmana (Approval 2) performs Final Approve...')
  const approveRes2 = await fetch(`http://localhost:3000/api/leave/requests/${leave1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      approverId: 300060,
      approverName: 'Devita Lesmana Teng',
      note: 'Disetujui. Selamat berlibur.',
    }),
  })
  const approveJson2 = await approveRes2.json()
  console.log('After Step 2 Approve -> Final Overall Status:', approveJson2.data.status)
  approveJson2.data.steps.forEach((s) => {
    console.log(`  - [Step ${s.level}] ${s.label} | Status: ${s.status} | ActedBy: ${s.approverName || '-'}`)
  })

  console.log('\n======================================================')
  console.log('=== TEST 2: Koordinator Pemohon (MOH. RAUL AMARULLAH - ID 300090) ===')
  console.log('Expectation: Step 1 Auto-Bypassed because Applicant == Approval 1')

  const res2 = await fetch('http://localhost:3000/api/leave/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 300090, // Moh. Raul (Koordinator)
      typeId: 1, // Cuti Tahunan
      startDate: '2026-11-15',
      endDate: '2026-11-16',
      note: 'Cuti tahunan koordinator',
      customData: {
        f_handover: 'Handover ke Melyta',
        f_emergency: '081299998888',
      },
    }),
  })
  const json2 = await res2.json()
  console.log('Create Leave Status:', res2.status)
  if (!json2.success) {
    console.error('Error creating leave:', json2.error)
    return
  }

  const leave2 = json2.data
  console.log(`Leave ID ${leave2.id} Created! Status: ${leave2.status}`)
  console.log('Generated Steps with Smart Auto-Bypass:')
  leave2.steps.forEach((s) => {
    console.log(`  - [Step ${s.level}] ${s.label} -> Approver ID: ${s.approverId} (${s.approverName}) | Status: ${s.status} | Note: ${s.note || '-'}`)
  })

  // Final approve by Devita Lesmana directly
  console.log('\n--> Devita Lesmana approves directly at Step 2...')
  const approveResKoordinator = await fetch(`http://localhost:3000/api/leave/requests/${leave2.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      approverId: 300060,
      approverName: 'Devita Lesmana Teng',
      note: 'Disetujui untuk Koordinator Finance.',
    }),
  })
  const approveJsonKoordinator = await approveResKoordinator.json()
  console.log('Final Status after Devita Approve:', approveJsonKoordinator.data.status)
  approveJsonKoordinator.data.steps.forEach((s) => {
    console.log(`  - [Step ${s.level}] ${s.label} | Status: ${s.status} | Note: ${s.note || '-'}`)
  })
}

runTests().catch(console.error)
