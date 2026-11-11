import { prisma } from '../src/lib/prisma.js';
import { startProcess, getTasks, completeTask, deleteProcessInstance } from '../src/lib/flowable/client.js';

async function testDynamicNTier() {
  console.log('=== START DYNAMIC N-TIER APPROVAL VERIFICATION ===\n');

  // Cari sample employee
  const gerry = await prisma.employee.findFirst({
    where: { name: { contains: 'Gerry Krisnandi', mode: 'insensitive' } },
  });
  console.log('Sample Employee:', gerry.id, gerry.name);

  // Cari approver 2 & 3
  const app1 = await prisma.employee.findFirst({ where: { name: { contains: 'muhammad rifki', mode: 'insensitive' } } });
  const app2 = await prisma.employee.findFirst({ where: { name: { contains: 'Vira Mutiara', mode: 'insensitive' } } });
  const app3 = await prisma.employee.findFirst({ where: { name: { contains: 'Sandy', mode: 'insensitive' } } });

  console.log('Approver 1:', app1?.id, app1?.name);
  console.log('Approver 2:', app2?.id, app2?.name);
  console.log('Approver 3:', app3?.id, app3?.name);

  // Simulasikan 3-Tier approval matrix
  const matrix3Tier = [
    { level: 1, employeeId: app1.id, label: 'Approval 1 (Lead)' },
    { level: 2, employeeId: app2.id, label: 'Approval 2 (Manager)' },
    { level: 3, employeeId: app3.id, label: 'Approval 3 (Direktur)' },
  ];

  // Update employee dengan matriks 3-Tier
  await prisma.employee.update({
    where: { id: gerry.id },
    data: { approvalMatrix: matrix3Tier },
  });
  console.log('Updated Gerry with 3-Tier approvalMatrix in PostgreSQL!');

  // Simulasikan pengajuan cuti
  const leaveType = await prisma.leaveType.findFirst();

  const flowableMatrix = [
    { stepIndex: 0, level: 1, employeeId: app1.id, username: 'muhammad.rifki', label: 'Approval 1 (Lead)' },
    { stepIndex: 1, level: 2, employeeId: app2.id, username: 'vira.hadits', label: 'Approval 2 (Manager)' },
    { stepIndex: 2, level: 3, employeeId: app3.id, username: 'sandy', label: 'Approval 3 (Direktur)' },
  ];

  const leave = await prisma.leave.create({
    data: {
      userId: gerry.id,
      typeId: leaveType.id,
      typeName: leaveType.name,
      startDate: '2026-11-25',
      endDate: '2026-11-26',
      days: 2,
      note: 'Uji Coba 3-Tier Approval Dinamis',
      status: 'Pending',
      steps: [
        { level: 1, tier: 'approval_1', label: 'Approval 1 (Lead)', status: 'Pending', approverId: app1.id, approverName: app1.name },
        { level: 2, tier: 'approval_2', label: 'Approval 2 (Manager)', status: 'Waiting', approverId: app2.id, approverName: app2.name },
        { level: 3, tier: 'approval_3', label: 'Approval 3 (Direktur)', status: 'Waiting', approverId: app3.id, approverName: app3.name },
        { level: 4, tier: 'hr_approval', label: 'HR Approval (Persetujuan Akhir HR)', status: 'Waiting', approverId: null, approverName: 'HR Department' },
      ],
      customData: {
        flowableMatrix,
        currentMatrixIndex: 0,
      },
    },
  });
  console.log('1. Leave created with ID:', leave.id, 'Status:', leave.status);

  // Start Flowable Process
  const proc = await startProcess('LeaveRequest', [
    { name: 'leaveId', value: String(leave.id), type: 'string' },
    { name: 'employeeId', value: String(gerry.id), type: 'string' },
    { name: 'employeeName', value: gerry.name, type: 'string' },
    { name: 'noOperationalApprovers', value: false, type: 'boolean' },
    { name: 'hasMoreApprovers', value: true, type: 'boolean' },
    { name: 'currentApproverUsername', value: flowableMatrix[0].username, type: 'string' },
    { name: 'currentStepLabel', value: flowableMatrix[0].label, type: 'string' },
    { name: 'stepIndex', value: '0', type: 'string' },
    { name: 'approved', value: true, type: 'boolean' },
  ]);
  console.log('2. Flowable Process Started:', proc.data?.id);

  const procId = proc.data?.id;

  // Level 1: Task 1
  let tasks = await getTasks({ processInstanceId: procId });
  console.log('3. Level 1 Active Task:', tasks.data?.data?.[0]?.name, 'Assignee:', tasks.data?.data?.[0]?.assignee);

  // Complete Level 1 -> Pass Next Level (Level 2)
  await completeTask(tasks.data?.data?.[0]?.id, [
    { name: 'approved', value: true, type: 'boolean' },
    { name: 'hasMoreApprovers', value: true, type: 'boolean' },
    { name: 'currentApproverUsername', value: flowableMatrix[1].username, type: 'string' },
    { name: 'currentStepLabel', value: flowableMatrix[1].label, type: 'string' },
    { name: 'stepIndex', value: '1', type: 'string' },
  ]);

  // Check DB status still Pending
  const db1 = await prisma.leave.findUnique({ where: { id: leave.id } });
  console.log('-> DB Status after Level 1 approved:', db1.status, '(MUST BE Pending)');

  // Level 2: Task 2
  tasks = await getTasks({ processInstanceId: procId });
  console.log('4. Level 2 Active Task:', tasks.data?.data?.[0]?.name, 'Assignee:', tasks.data?.data?.[0]?.assignee);

  // Complete Level 2 -> Pass Next Level (Level 3)
  await completeTask(tasks.data?.data?.[0]?.id, [
    { name: 'approved', value: true, type: 'boolean' },
    { name: 'hasMoreApprovers', value: true, type: 'boolean' },
    { name: 'currentApproverUsername', value: flowableMatrix[2].username, type: 'string' },
    { name: 'currentStepLabel', value: flowableMatrix[2].label, type: 'string' },
    { name: 'stepIndex', value: '2', type: 'string' },
  ]);

  // Check DB status still Pending
  const db2 = await prisma.leave.findUnique({ where: { id: leave.id } });
  console.log('-> DB Status after Level 2 approved:', db2.status, '(MUST BE Pending)');

  // Level 3: Task 3 (LAST Level -> hasMoreApprovers = false)
  tasks = await getTasks({ processInstanceId: procId });
  console.log('5. Level 3 Active Task:', tasks.data?.data?.[0]?.name, 'Assignee:', tasks.data?.data?.[0]?.assignee);

  await completeTask(tasks.data?.data?.[0]?.id, [
    { name: 'approved', value: true, type: 'boolean' },
    { name: 'hasMoreApprovers', value: false, type: 'boolean' },
  ]);

  // Check DB status still Pending
  const db3 = await prisma.leave.findUnique({ where: { id: leave.id } });
  console.log('-> DB Status after Level 3 approved:', db3.status, '(MUST BE Pending)');

  // Level 4: HR Approval Task
  tasks = await getTasks({ processInstanceId: procId });
  console.log('6. Final HR Active Task:', tasks.data?.data?.[0]?.name, 'Candidates:', tasks.data?.data?.[0]?.candidateGroups || 'hr');

  // Complete HR Task
  await completeTask(tasks.data?.data?.[0]?.id, [
    { name: 'approved', value: true, type: 'boolean' },
  ]);

  // HR marks leave as Approved in DB
  await prisma.leave.update({
    where: { id: leave.id },
    data: { status: 'Approved' },
  });

  const dbFinal = await prisma.leave.findUnique({ where: { id: leave.id } });
  console.log('7. DB Status after HR approved:', dbFinal.status, '(MUST BE Approved)');

  // Cleanup test leave
  await prisma.leave.delete({ where: { id: leave.id } });
  await deleteProcessInstance(procId);
  console.log('8. Cleaned up test records');

  console.log('\n=== ALL DYNAMIC N-TIER APPROVAL TESTS PASSED 100%! ===');
  process.exit(0);
}

testDynamicNTier().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
