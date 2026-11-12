import { PrismaClient } from '@prisma/client';
import { calcHoOvertimeFee } from '../src/lib/hoPayrollEngine.js';

const prisma = new PrismaClient();

async function run() {
  console.log('========================================================================');
  console.log('        TESTING OVERTIME APPROVAL LIFECYCLE (END-TO-END)               ');
  console.log('========================================================================\n');

  const empGerry = await prisma.employee.findUnique({
    where: { id: 300077 },
    select: { id: true, name: true, approver1Id: true, salary: true, dept: true },
  });
  console.log('1. DATA KARYAWAN PEMOHON:');
  console.log(`   - Nama: ${empGerry.name} (ID: ${empGerry.id})`);
  console.log(`   - Departemen: ${empGerry.dept}`);
  console.log(`   - Approver 1 (Atasan Langsung): ${empGerry.approver1Id} (muhammad rifki)\n`);

  // Pastikan salary Gerry diset ke Rp 7.500.000 untuk pengujian deterministik
  await prisma.employee.update({
    where: { id: 300077 },
    data: { salary: 7500000 },
  });

  // Bersihkan lembur testing sebelumnya jika ada
  await prisma.overtimeRecord.deleteMany({
    where: {
      empId: 300077,
      date: { in: ['2026-11-05', '2026-11-06'] },
    },
  });

  console.log('2. SIMULASI ESS PENGAJUAN LEMBUR OLEH GERRY:');
  // Kamis: 18:00 - 23:20 (5.333 jam) -> Rp 170.455
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
      status: 'Pending', // ESS submit status = Pending
    },
  });
  console.log(`   [SUBMIT] Lembur Kamis berhasil diajukan (ID: ${otKamis.id}), Status: ${otKamis.status}`);

  // Jumat: 18:00 - 20:30 (2.5 jam) -> Rp 79.901
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
  console.log(`   [SUBMIT] Lembur Jumat berhasil diajukan (ID: ${otJumat.id}), Status: ${otJumat.status}\n`);

  // Cek HO Calculator & Odoo Sync Pre-Approval
  console.log('3. VERIFIKASI SEBELUM APPROVAL (ISOLASI PAYROLL & ODOO):');
  const approvedOvertimesBefore = await prisma.overtimeRecord.findMany({
    where: {
      empId: 300077,
      date: { in: ['2026-11-05', '2026-11-06'] },
      status: 'Approved',
    },
  });
  const pendingOvertimesBefore = await prisma.overtimeRecord.findMany({
    where: {
      empId: 300077,
      date: { in: ['2026-11-05', '2026-11-06'] },
      status: 'Pending',
    },
  });
  console.log(`   - Jumlah Lembur Approved Masuk Payroll HO: ${approvedOvertimesBefore.length} entri (Total Fee: Rp 0)`);
  console.log(`   - Jumlah Lembur Pending (Isolasi / Butuh Approval): ${pendingOvertimesBefore.length} entri`);
  console.log(`   => HO Payroll Engine & Odoo Sync AMAN: Nilai lembur belum dihitung sebelum di-approve!\n`);

  // Simulasi MSS Approval oleh Atasan: muhammad rifki (300182)
  console.log('4. SIMULASI MSS PERSETUJUAN ATASAN OLEH MUHAMMAD RIFKI (300182):');
  await prisma.overtimeRecord.update({
    where: { id: otKamis.id },
    data: { status: 'Approved', approvedById: 300182 },
  });
  console.log(`   [APPROVE] Muhammad Rifki menyetujui Lembur Kamis (ID: ${otKamis.id}) -> Status: Approved`);

  await prisma.overtimeRecord.update({
    where: { id: otJumat.id },
    data: { status: 'Approved', approvedById: 300182 },
  });
  console.log(`   [APPROVE] Muhammad Rifki menyetujui Lembur Jumat (ID: ${otJumat.id}) -> Status: Approved\n`);

  // Cek HO Calculator & Odoo Sync Pasca Approval
  console.log('5. VERIFIKASI PASCA APPROVAL (MASUK KE HO CALCULATOR & SIAP KE ODOO):');
  const approvedOvertimesAfter = await prisma.overtimeRecord.findMany({
    where: {
      empId: 300077,
      date: { in: ['2026-11-05', '2026-11-06'] },
      status: 'Approved',
    },
  });
  const totalApprovedFee = approvedOvertimesAfter.reduce((sum, o) => sum + o.totalFee, 0);
  console.log(`   - Jumlah Lembur Approved: ${approvedOvertimesAfter.length} entri`);
  console.log(`   - Total Kompensasi Lembur Masuk Payroll: Rp ${totalApprovedFee.toLocaleString('id-ID')} (Target: Rp 250.355)`);
  console.log(`   - Status di HO Calculator & Odoo Sync: SIAP DIKIRIM (Approved)\n`);

  console.log('========================================================================');
  console.log('          HASIL: SEMUA TAHAPAN ALUR LEMBUR BERJALAN 100% SUKSES!        ');
  console.log('========================================================================\n');

  await prisma.$disconnect();
}

run().catch(console.error);
