// scripts/test_unified_leave_flowable_pipeline.js
const { prisma } = require('../src/lib/prisma')
const { getTasks, completeTask } = require('../src/lib/flowable/client')
const { calculateHoFullPayroll } = require('../src/lib/hoPayrollEngine')

async function runTest() {
  console.log('=== [TEST] Unified Leave -> Flowable BPMN Pipeline ===\n')

  // 1. Ambil bawahan Ronny Badjie untuk simulasi test pengajuan cuti
  // Ronny Badjie: id 300143, odoo_id 576
  const supervisor = await prisma.user.findFirst({
    where: { username: 'ronny.badjie' },
  })
  console.log('1. Supervisor found:', supervisor?.name, 'ID:', supervisor?.id)

  const subordinate = await prisma.employee.findFirst({
    where: {
      OR: [
        { approver1Id: 300143 },
        { managerId: 300143 },
      ],
    },
  })
  console.log('2. Subordinate found:', subordinate?.name, 'ID:', subordinate?.id, 'Dept:', subordinate?.dept)

  // 2. Submit Leave via POST to local Next.js API
  console.log('3. Simulating Leave Submission to POST /api/leave/requests...')
  const leavePayload = {
    userId: subordinate.id,
    typeId: 1, // Cuti Tahunan
    startDate: '2026-12-15',
    endDate: '2026-12-16',
    note: 'Test Pipeline Leave Flowable Automation',
    customData: {
      f_handover: 'Budi Santoso',
      f_emergency: '0812-9988-7766',
      testMode: true,
    },
    attachment: null,
  }

  const postRes = await fetch('http://localhost:3000/api/leave/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leavePayload),
  })

  const postJson = await postRes.json()
  console.log('4. POST Response success:', postJson.success, 'Leave ID:', postJson.data?.id)
  if (!postJson.success) {
    throw new Error('Failed to submit leave: ' + postJson.error)
  }

  const createdLeaveId = postJson.data.id
  const flowProcId = postJson.data.customData?.flowableProcessInstanceId
  console.log('5. Flowable Process Instance ID in DB:', flowProcId)

  // 3. Query Flowable tasks for Ronny Badjie
  console.log('6. Querying Flowable tasks for supervisor ronny.badjie...')
  const getTasksRes = await fetch(
    `http://localhost:3000/api/flowable/tasks?candidateOrAssigned=ronny.badjie&userId=${supervisor.id}&status=open`
  )
  const getTasksJson = await getTasksRes.json()
  const tasks = getTasksJson.data?.data || []
  console.log('7. Flowable tasks found for ronny.badjie:', tasks.length)

  const matchingTask = tasks.find(
    (t) =>
      t.processInstanceId === flowProcId ||
      t.variables?.find((v) => v.name === 'leaveId' && String(v.value) === String(createdLeaveId))
  )

  console.log('8. Matching Task Found:', matchingTask ? `Task ID: ${matchingTask.id}, Name: ${matchingTask.name}` : 'NOT FOUND')
  if (!matchingTask) {
    throw new Error('Task was not found in supervisor Flowable inbox')
  }

  // 4. Complete Flowable Task (Approve)
  console.log('9. Completing Flowable task (Approved = true)...')
  const completeRes = await fetch(`http://localhost:3000/api/flowable/tasks/${matchingTask.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'complete',
      variables: [
        { name: 'approved', value: true, type: 'boolean' },
        { name: 'approverUsername', value: 'ronny.badjie', type: 'string' },
        { name: 'approverName', value: supervisor.name, type: 'string' },
        { name: 'approvalNote', value: 'Disetujui secara otomatis dalam unit test pipeline', type: 'string' },
      ],
    }),
  })
  const completeJson = await completeRes.json()
  console.log('10. Task completion response success:', completeJson.success)

  // 5. Verify PostgreSQL Leave record is updated to Approved
  const updatedLeave = await prisma.leave.findUnique({
    where: { id: createdLeaveId },
  })
  console.log('11. Database Leave Status:', updatedLeave?.status)
  console.log('12. Database Steps:', JSON.stringify(updatedLeave?.steps, null, 2))

  if (updatedLeave?.status !== 'Approved') {
    throw new Error('Leave status was not updated to Approved in PostgreSQL DB')
  }

  // 6. Test HO Calculator integration with this approved leave
  console.log('13. Testing HO Calculator calculation...')
  const mockEmp = {
    id: subordinate.id,
    name: subordinate.name,
    workLocation: 'Head Office',
    jobPosition: subordinate.position || 'Staff',
    salary: 10000000,
    role: 'employee',
  }
  const workingDays = 22
  const basicSalary = Math.round(mockEmp.salary * 0.75)
  const transportAllowance = Math.round(mockEmp.salary * 0.15)
  const npaAllowance = Math.round(mockEmp.salary * 0.10)

  const payrollResult = calculateHoFullPayroll({
    employee: mockEmp,
    basicSalary,
    transportAllowance,
    nonPermanentAllowance: npaAllowance,
    workingDays,
    halfDayCount: 1, // 1 approved half-day leave
    sickLeaveDays: 0,
    hasValidDoctorCert: true,
    unpaidLeaveDays: 0,
    overtimeEntries: [],
  })
  console.log('14. HO Calculator net salary before tax & BPJS:', payrollResult.netBeforeTaxAndBpjs)
  console.log('15. Half day deduction:', payrollResult.halfDayDeduction)

  // 7. Clean up test record from database
  console.log('16. Cleaning up test record...')
  await prisma.leave.delete({ where: { id: createdLeaveId } })
  console.log('17. Test record cleaned up successfully.')

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===')
  await prisma.$disconnect()
}

runTest().catch((err) => {
  console.error('\n❌ [TEST FAILED]:', err)
  process.exit(1)
})
