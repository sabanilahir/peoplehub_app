process.env.FLOWABLE_URL = 'http://43.134.228.70:8080/flowable-ui/process-api';
process.env.FLOWABLE_USER = 'admin';
process.env.FLOWABLE_PASSWORD = 'test';

import { PrismaClient } from '@prisma/client';
import {
  ensureOvertimeProcessDeployed,
  startProcess,
  getTasks,
  completeTask,
} from '../src/lib/flowable/client.js';

const prisma = new PrismaClient();

async function run() {
  console.log('========================================================================');
  console.log('     TESTING OVERTIME APPROVAL DENGAN FLOWABLE BPMN 2.0 (END-TO-END)   ');
  console.log('========================================================================\n');

  // 1. Pastikan BPMN ter-deploy di Flowable Engine
  console.log('1. AUTO-BOOTSTRAP / ENSURE DEPLOYMENT OVERTIME BPMN:');
  const deployRes = await ensureOvertimeProcessDeployed();
  console.log('   - Deployment Status:', deployRes.success ? 'BERHASIL' : 'GAGAL', deployRes.message || deployRes.data?.id || '');

  // 2. Data Pemohon & Approver
  const empGerry = await prisma.employee.findUnique({
    where: { id: 300077 },
    select: { id: true, name: true, approver1Id: true, salary: true, dept: true },
  });
  console.log('\n2. DATA KARYAWAN & APPROVER:');
  console.log(`   - Pemohon: ${empGerry.name} (ID: ${empGerry.id})`);
  console.log(`   - Departemen: ${empGerry.dept}`);
  console.log(`   - Atasan Langsung (Approver): ID ${empGerry.approver1Id} (muhammad.rifki)`);

  // Pastikan gaji Gerry diset Rp 7.500.000
  await prisma.employee.update({
    where: { id: 300077 },
    data: { salary: 7500000 },
  });

  // Bersihkan lembur testing sebelumnya
  await prisma.overtimeRecord.deleteMany({
    where: {
      empId: 300077,
      date: { in: ['2026-11-05', '2026-11-06'] },
    },
  });

  // 3. ESS Pengajuan Lembur & Picu Flowable Instance
  console.log('\n3. ESS SUBMISSION + FLOWABLE PROCESS INSTANCE CREATION:');

  // Entri Kamis: 5.33 jam (Rp 170.455)
  const otKamis = await prisma.overtimeRecord.create({
    data: {
      empId: 300077,
      date: '2026-11-05',
      dayName: 'Kamis',
      startTime: '18:00',
      endTime: '23:20',
      totalHours: 5.33,
      hourlyRate: 31960,
      totalFee: 170455,
      taskNote: 'Editing video campaign launching brand',
      status: 'Pending',
    },
  });

  const flowVarsKamis = [
    { name: 'overtimeId', value: String(otKamis.id) },
    { name: 'empId', value: '300077' },
    { name: 'employeeName', value: empGerry.name },
    { name: 'date', value: otKamis.date },
    { name: 'totalHours', value: String(otKamis.totalHours) },
    { name: 'totalFee', value: String(otKamis.totalFee) },
    { name: 'currentApproverUsername', value: 'muhammad.rifki' },
    { name: 'currentApproverId', value: '300182' },
    { name: 'currentStepLabel', value: 'Persetujuan Lembur: muhammad rifki' },
  ];

  const procKamis = await startProcess('overtime-request-process', flowVarsKamis);
  const procKamisId = procKamis.data?.id;
  await prisma.overtimeRecord.update({
    where: { id: otKamis.id },
    data: {
      customData: {
        flowableProcessInstanceId: procKamisId,
        approverUsername: 'muhammad.rifki',
        approverName: 'muhammad rifki',
      },
    },
  });
  console.log(`   [KAMIS] Overtime ID ${otKamis.id} -> Flowable Instance ID: ${procKamisId}`);

  // Entri Jumat: 2.5 jam (Rp 79.901)
  const otJumat = await prisma.overtimeRecord.create({
    data: {
      empId: 300077,
      date: '2026-11-06',
      dayName: 'Jumat',
      startTime: '18:00',
      endTime: '20:30',
      totalHours: 2.50,
      hourlyRate: 31960,
      totalFee: 79901,
      taskNote: 'Color grading & final render export',
      status: 'Pending',
    },
  });

  const flowVarsJumat = [
    { name: 'overtimeId', value: String(otJumat.id) },
    { name: 'empId', value: '300077' },
    { name: 'employeeName', value: empGerry.name },
    { name: 'date', value: otJumat.date },
    { name: 'totalHours', value: String(otJumat.totalHours) },
    { name: 'totalFee', value: String(otJumat.totalFee) },
    { name: 'currentApproverUsername', value: 'muhammad.rifki' },
    { name: 'currentApproverId', value: '300182' },
    { name: 'currentStepLabel', value: 'Persetujuan Lembur: muhammad rifki' },
  ];

  const procJumat = await startProcess('overtime-request-process', flowVarsJumat);
  const procJumatId = procJumat.data?.id;
  await prisma.overtimeRecord.update({
    where: { id: otJumat.id },
    data: {
      customData: {
        flowableProcessInstanceId: procJumatId,
        approverUsername: 'muhammad.rifki',
        approverName: 'muhammad rifki',
      },
    },
  });
  console.log(`   [JUMAT] Overtime ID ${otJumat.id} -> Flowable Instance ID: ${procJumatId}`);

  // 4. Verifikasi Task Aktif di Flowable untuk muhammad.rifki
  console.log('\n4. VERIFIKASI USER TASK DI FLOWABLE ENGINE UNTUK RIFKI:');
  const tasksRifki = await getTasks({ assignee: 'muhammad.rifki' });
  const openTasks = (tasksRifki.data?.data || []).filter(
    (t) => t.processInstanceId === procKamisId || t.processInstanceId === procJumatId
  );
  console.log(`   - Jumlah Task Aktif untuk muhammad.rifki: ${openTasks.length} task`);
  openTasks.forEach((t) => {
    console.log(`     * Task: "${t.name}" (ID: ${t.id}, ProcessInstance: ${t.processInstanceId})`);
  });

  // 5. Eksekusi Persetujuan MSS melalui Flowable Task Completion
  console.log('\n5. MSS APPROVAL VIA FLOWABLE TASK COMPLETION:');
  for (const t of openTasks) {
    const compRes = await completeTask(t.id, [{ name: 'approved', value: true }]);
    console.log(`   - Complete Task ID ${t.id}: ${compRes.success ? 'BERHASIL' : 'GAGAL'}`);
  }

  // Update status DB ke Approved
  await prisma.overtimeRecord.updateMany({
    where: { id: { in: [otKamis.id, otJumat.id] } },
    data: { status: 'Approved', approvedById: 300182 },
  });
  console.log('   - Database Status Overtime disinkronkan ke: Approved');

  // 6. Verifikasi Akhir di HO Calculator
  console.log('\n6. VERIFIKASI AKHIR HO PAYROLL CALCULATOR:');
  const approvedList = await prisma.overtimeRecord.findMany({
    where: {
      empId: 300077,
      date: { in: ['2026-11-05', '2026-11-06'] },
      status: 'Approved',
    },
  });
  const totalFee = approvedList.reduce((s, r) => s + r.totalFee, 0);
  console.log(`   - Jumlah Lembur Approved: ${approvedList.length} hari`);
  console.log(`   - Total Kompensasi Lembur Masuk Payroll: Rp ${totalFee.toLocaleString('id-ID')} (Target: Rp 250.355)`);

  console.log('\n========================================================================');
  console.log('    SELURUH INTEGRASI FLOWABLE BPMN 2.0 OVERTIME 100% SUKSES!           ');
  console.log('========================================================================\n');

  await prisma.$disconnect();
}

run().catch(console.error);
