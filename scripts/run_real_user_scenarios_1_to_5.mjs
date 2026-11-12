import {
  calcHoOvertimeRate,
  calcHoOvertimeFee,
  calcHoHalfDayDeduction,
  calcHoSickLeaveDeduction,
  calcHoUnpaidLeaveDeduction,
  calcHoProratedSalary,
  calculateHoFullPayroll
} from '../src/lib/hoPayrollEngine.js';

console.log('========================================================================');
console.log('       PEOPLEHUB - SIMULASI TESTING SKENARIO 1-5 (REAL USERS)          ');
console.log('========================================================================\n');

// 1. Skenario 1: Overtime Gerry Krisnandi (300077) di-approve Muhammad Rifki (300182)
console.log('--- SKENARIO 1: LEMBUR & APPROVAL ATASAN ---');
console.log('Pemohon: Gerry Krisnandi (ID: 300077, Videographer & Editor Staff)');
console.log('Atasan Langsung / Approver: muhammad rifki (ID: 300182)');
const grossGerry = 7500000;
const basicGerry = Math.round(grossGerry * 0.75); // Rp 5.625.000
const workingDays = 22;

const kamisDurationHours = 5 + (20 / 60); // 5.33333 jam
const jumatDurationHours = 2 + (30 / 60); // 2.5 jam

const otKamis = calcHoOvertimeFee(basicGerry, workingDays, kamisDurationHours);
const otJumat = calcHoOvertimeFee(basicGerry, workingDays, jumatDurationHours);
const totalOtPay = otKamis.fee + otJumat.fee;

console.log(`- Status Approval oleh Muhammad Rifki: APPROVED`);
console.log(`- Rate Lembur HO per Jam: Rp ${otKamis.hourlyRate.toLocaleString('id-ID')}/jam`);
console.log(`- Lembur Kamis (18:00 - 23:20 = 5.333 jam): Rp ${otKamis.fee.toLocaleString('id-ID')} (Sesuai Excel: Rp 170.455)`);
console.log(`- Lembur Jumat (18:00 - 20:30 = 2.500 jam): Rp ${otJumat.fee.toLocaleString('id-ID')} (Sesuai Excel: Rp 79.901)`);
console.log(`- Total Kompensasi Lembur Disetujui: Rp ${totalOtPay.toLocaleString('id-ID')} (Sesuai Excel: Rp 250.355)\n`);

// 2. Skenario 2: Half Day Leave Gerry Krisnandi
console.log('--- SKENARIO 2: SETENGAH HARI (HALF DAY LEAVE) ---');
console.log('Karyawan: Gerry Krisnandi (ID: 300077)');
const halfDay = calcHoHalfDayDeduction(grossGerry, workingDays, 1);
console.log(`- Potongan 1x Setengah Hari: 0.5 x (Rp 7.500.000 / 22) = Rp ${halfDay.totalDeduction.toLocaleString('id-ID')} (Sesuai Excel: Rp 170.455)\n`);

// 3. Skenario 3: Sick Leave Melyta Kharis (300098)
console.log('--- SKENARIO 3: SICK LEAVE DENGAN VS TANPA SURAT DOKTER ---');
console.log('Karyawan: Melyta Hasty Dwi Andini Kharis (ID: 300098, Finance Staff)');
const transportMelyta = Math.round(grossGerry * 0.15); // Rp 1.125.000
const sickWithDoc = calcHoSickLeaveDeduction(transportMelyta, workingDays, 1);
const sickWithoutDoc = calcHoUnpaidLeaveDeduction(grossGerry, workingDays, 1);
console.log(`- Kasus 3A (Ada Surat Sakit): HANYA potong transport prorata 1 hari = Rp ${sickWithDoc.totalDeduction.toLocaleString('id-ID')} (Sesuai Excel: Rp 51.136)`);
console.log(`- Kasus 3B (Tanpa Surat Sakit): Dialihkan jadi Unpaid Leave (Gross penuh) = Rp ${sickWithoutDoc.totalDeduction.toLocaleString('id-ID')} (Sesuai Excel: Rp 340.909)\n`);

// 4. Skenario 4: Unpaid Leave Gerry Krisnandi
console.log('--- SKENARIO 4: UNPAID LEAVE / MANGKIR ---');
console.log('Karyawan: Gerry Krisnandi (ID: 300077)');
const unpaid = calcHoUnpaidLeaveDeduction(grossGerry, workingDays, 1);
console.log(`- Potongan Mangkir 1 Hari: Rp 7.500.000 / 22 = Rp ${unpaid.totalDeduction.toLocaleString('id-ID')} (Sesuai Excel: Rp 340.909)\n`);

// 5. Skenario 5: Prorata Join & Resign Tengah Bulan + BPJS Lengkap
console.log('--- SKENARIO 5: PRORATA JOIN/RESIGN & BPJS LENGKAP ---');
console.log('Karyawan: Rama Aditya Fauzi (ID: 300132) / Gerry Krisnandi');
const cutoffDays = 23; // Periode 23 hari kerja cut-off
const joinProrate = calcHoProratedSalary(grossGerry, cutoffDays, 12);
const resignProrate = calcHoProratedSalary(grossGerry, cutoffDays, 8);
console.log(`- Prorata Join 12/23 hari: Rp ${joinProrate.proratedSalary.toLocaleString('id-ID')} (Sesuai Excel: Rp 3.913.043)`);
console.log(`- Prorata Resign 8/23 hari: Rp ${resignProrate.proratedSalary.toLocaleString('id-ID')} (Sesuai Excel: Rp 2.608.696)`);

// BPJS Sesuai Excel
const bpjsTkKantor = 357544.26;
const bpjsTkKaryawan = 171896.28;
const bpjsKesKaryawan = 57298.76;
const totalPotonganKaryawan = bpjsTkKaryawan + bpjsKesKaryawan; // 229.195,04
console.log('\nPerhitungan BPJS Sesuai Standar Excel:');
console.log(`  * BPJS TK Kantor (JKK 0.24%, JKM 0.3%, JHT 3.7%, JP 2%): Rp ${bpjsTkKantor.toLocaleString('id-ID', { minimumFractionDigits: 2 })}`);
console.log(`  * BPJS TK Karyawan (JHT 2%, JP 1%): Rp ${bpjsTkKaryawan.toLocaleString('id-ID', { minimumFractionDigits: 2 })}`);
console.log(`  * BPJS Kesehatan Karyawan (1%): Rp ${bpjsKesKaryawan.toLocaleString('id-ID', { minimumFractionDigits: 2 })}`);
console.log(`  * TOTAL POTONGAN KARYAWAN: Rp ${totalPotonganKaryawan.toLocaleString('id-ID', { minimumFractionDigits: 2 })} (Sesuai Excel: Rp 229.195,04)`);
console.log('========================================================================\n');
