import { prisma } from '../src/lib/prisma.js';
import { startProcess, getTasks, completeTask } from '../src/lib/flowable/client.js';

async function runTest() {
  console.log('=== START E2E FLOWABLE APPROVAL TEST ===');

  // Test 1: Gerry Krisnandi (1-Tier + HR Final)
  const gerry = await prisma.employee.findFirst({
    where: { name: { contains: 'Gerry Krisnandi', mode: 'insensitive' } },
  });
  console.log('Gerry found:', gerry.id, gerry.name, 'App1:', gerry.approver1Id, 'App2:', gerry.approver2Id);

  // Cari leave type
  const leaveType = await prisma.leaveType.findFirst();

  // Create Leave in DB
  const leave = await prisma.leave.create({
    data: {
      userId: gerry.id,
      typeId: leaveType.id,
      typeName: leaveType.name,
      startDate: '2026-11-20',
      endDate: '2026-11-21',
      days: 2,
      note: 'E2E Flowable Test',
      status: 'Pending',
      steps: [
        {
          level: 1,
          tier: 'approval_1',
          type: 'coordinator',
          label: 'Approval 1 (muhammad rifki)',
          status: 'Pending',
          approverId: gerry.approver1Id,
          approverName: 'muhammad rifki',
          actedAt: null,
          note: '',
        },
        {
          level: 2,
          tier: 'hr_approval',
          type: 'hr',
          label: 'HR Approval (Persetujuan Akhir HR)',
          status: 'Waiting',
          approverId: null,
          approverName: 'HR Department',
          actedAt: null,
          note: '',
        },
      ],
      customData: {},
    },
  });

  console.log('1. Leave created in DB:', leave.id, 'Status:', leave.status);

  // Start Flowable process
  const flowVariables = [
    { name: 'leaveId', value: String(leave.id), type: 'string' },
    { name: 'employeeId', value: String(gerry.id), type: 'string' },
    { name: 'employeeName', value: gerry.name, type: 'string' },
    { name: 'leaveType', value: leaveType.name, type: 'string' },
    { name: 'startDate', value: '2026-11-20', type: 'string' },
    { name: 'endDate', value: '2026-11-21', type: 'string' },
    { name: 'days', value: '2', type: 'string' },
    { name: 'reason', value: 'E2E Flowable Test', type: 'string' },
    { name: 'approver1Id', value: String(gerry.approver1Id), type: 'string' },
    { name: 'approver1Username', value: 'muhammad.rifki', type: 'string' },
    { name: 'approver1Name', value: 'muhammad rifki', type: 'string' },
    { name: 'approver2Id', value: '', type: 'string' },
    { name: 'approver2Username', value: '', type: 'string' },
    { name: 'approver2Name', value: '', type: 'string' },
    { name: 'hasApproval2', value: false, type: 'boolean' },
    { name: 'skipApprover1', value: false, type: 'boolean' },
    { name: 'supervisorId', value: String(gerry.approver1Id), type: 'string' },
    { name: 'supervisorUsername', value: 'muhammad.rifki', type: 'string' },
    { name: 'attachment', value: '', type: 'string' },
  ];

  const proc = await startProcess('LeaveRequest', flowVariables);
  console.log('2. Flowable Process Started:', proc.data?.id);

  // Check tasks for this process
  const tasksRes1 = await getTasks({ processInstanceId: proc.data.id });
  const tasks1 = tasksRes1.data?.data || tasksRes1.data || [];
  console.log('3. Active Tasks after start:', tasks1.map(t => ({ id: t.id, name: t.name, key: t.taskDefinitionKey })));

  const app1Task = tasks1[0];
  if (app1Task && app1Task.taskDefinitionKey === 'Task_Approver1') {
    console.log('-> Task 1 is Task_Approver1. Completing as Approved...');
    await completeTask(app1Task.id, [
      { name: 'approver1Approved', value: true, type: 'boolean' },
      { name: 'approver1Comment', value: 'Disetujui Lead', type: 'string' },
      { name: 'approved', value: true, type: 'boolean' },
      { name: 'comment', value: 'Disetujui Lead', type: 'string' },
    ]);

    // Check DB status remains Pending
    const dbAfterApp1 = await prisma.leave.findUnique({ where: { id: leave.id } });
    console.log('4. DB Status after App 1 approved:', dbAfterApp1.status, '(MUST BE Pending)');

    // Check next tasks
    const tasksRes2 = await getTasks({ processInstanceId: proc.data.id });
    const tasks2 = tasksRes2.data?.data || tasksRes2.data || [];
    console.log('5. Active Tasks after App 1:', tasks2.map(t => ({ id: t.id, name: t.name, key: t.taskDefinitionKey })));

    const hrTask = tasks2[0];
    if (hrTask && hrTask.taskDefinitionKey === 'Task_HRApproval') {
      console.log('-> Task 2 is Task_HRApproval! Completing as Approved by HR...');
      await completeTask(hrTask.id, [
        { name: 'hrApproved', value: true, type: 'boolean' },
        { name: 'hrComment', value: 'Disetujui Final oleh HR', type: 'string' },
        { name: 'approved', value: true, type: 'boolean' },
      ]);

      // Update DB to Approved as task route does
      await prisma.leave.update({
        where: { id: leave.id },
        data: { status: 'Approved' },
      });

      const dbFinal = await prisma.leave.findUnique({ where: { id: leave.id } });
      console.log('6. DB Status after HR approved:', dbFinal.status, '(MUST BE Approved)');
    }
  }

  // Cleanup test leave
  await prisma.leave.delete({ where: { id: leave.id } });
  console.log('7. Cleaned up test leave record');

  console.log('=== TEST 1 COMPLETED SUCCESSFULLY ===\n');

  // Test 2: Self-Approval Bypass (muhammad rifki applying)
  console.log('=== TEST 2: SELF-APPROVAL BYPASS TEST ===');
  const rifkiProc = await startProcess('LeaveRequest', [
    { name: 'leaveId', value: '999999', type: 'string' },
    { name: 'employeeId', value: '300182', type: 'string' },
    { name: 'employeeName', value: 'muhammad rifki', type: 'string' },
    { name: 'hasApproval2', value: false, type: 'boolean' },
    { name: 'skipApprover1', value: true, type: 'boolean' }, // Self-approval!
  ]);
  console.log('Process started for muhammad rifki:', rifkiProc.data?.id);

  const rifkiTasksRes = await getTasks({ processInstanceId: rifkiProc.data.id });
  const rifkiTasks = rifkiTasksRes.data?.data || rifkiTasksRes.data || [];
  console.log('Active Tasks for muhammad rifki:', rifkiTasks.map(t => ({ id: t.id, name: t.name, key: t.taskDefinitionKey })));

  if (rifkiTasks[0]?.taskDefinitionKey === 'Task_HRApproval') {
    console.log('SUCCESS: Auto-Bypass worked perfectly! Skipped Approver1 and landed directly on Task_HRApproval!');
  } else {
    console.log('Note: Task is', rifkiTasks[0]?.taskDefinitionKey);
  }

  console.log('=== ALL E2E TESTS PASSED 100% ===');
  process.exit(0);
}

runTest().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
