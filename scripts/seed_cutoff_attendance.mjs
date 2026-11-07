import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rentang tanggal presensi: 26 Oktober 2026 s/d 05 November 2026
const DATE_LIST = [
  '2026-10-26', // Senin
  '2026-10-27', // Selasa
  '2026-10-28', // Rabu
  '2026-10-29', // Kamis
  '2026-10-30', // Jumat
  '2026-10-31', // Sabtu (Libur HO, Kerja Gudang/Sales/Live)
  '2026-11-01', // Minggu (Libur Semua)
  '2026-11-02', // Senin
  '2026-11-03', // Selasa
  '2026-11-04', // Rabu
  '2026-11-05', // Kamis (Hari ini)
];

// Simple deterministic hash based on empId and date
function pseudoRandom(empId, dateStr) {
  let hash = 0;
  const str = `${empId}_${dateStr}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function main() {
  console.log('--- Mulai Pengisian Data Presensi Cut-off (26/10/2026 - 05/11/2026) ---');

  // 1. Ambil seluruh karyawan aktif
  const employees = await prisma.employee.findMany({
    where: { status: 'Active' },
    select: {
      id: true,
      name: true,
      workLocationCode: true,
      location: true,
    },
    orderBy: { id: 'asc' },
  });
  console.log(`Ditemukan ${employees.length} karyawan aktif.`);

  // 2. Ambil data presensi yang sudah ada di database pada rentang ini agar tidak ditimpa
  const existingRecords = await prisma.attendance.findMany({
    where: {
      date: { gte: '2026-10-26', lte: '2026-11-05' },
    },
    select: { empId: true, date: true },
  });
  const existingSet = new Set(existingRecords.map((r) => `${r.empId}_${r.date}`));
  console.log(`Ditemukan ${existingRecords.length} record presensi eksisting yang akan dipertahankan.`);

  const newAttendances = [];

  for (const date of DATE_LIST) {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0 = Minggu, 6 = Sabtu

    // Hari Minggu (01 Nov) selalu libur untuk semua lokasi
    if (dayOfWeek === 0) continue;

    for (const emp of employees) {
      const key = `${emp.id}_${date}`;
      // Jika sudah ada record di database, skip (pertahankan data eksisting)
      if (existingSet.has(key)) continue;

      const loc = (emp.workLocationCode || 'ho').toLowerCase();

      // Hari Sabtu: Libur untuk Head Office (HO)
      if (dayOfWeek === 6 && loc === 'ho') {
        continue;
      }

      // Tentukan status presensi berdasarkan pseudo-random (skala 0 - 99)
      const rand = pseudoRandom(emp.id, date) % 100;
      let record = null;

      if (loc === 'ho') {
        // --- JADWAL HO: 09:00 - 18:00 ---
        if (rand < 82) {
          // 82% Tepat waktu
          const inMin = 35 + (pseudoRandom(emp.id, date + '_m') % 23); // 08:35 - 08:58
          const outMin = 5 + (pseudoRandom(emp.id, date + '_o') % 25); // 18:05 - 18:30
          record = {
            empId: emp.id,
            date,
            checkIn: `08:${String(inMin).padStart(2, '0')}`,
            checkOut: `18:${String(outMin).padStart(2, '0')}`,
            status: 'Present',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: null,
          };
        } else if (rand < 88) {
          // 6% Telat 1-10 menit (Denda Rp 10.000)
          const late = 1 + (pseudoRandom(emp.id, date + '_l') % 10);
          record = {
            empId: emp.id,
            date,
            checkIn: `09:${String(late).padStart(2, '0')}`,
            checkOut: '18:15',
            status: 'Late',
            lateMinutes: late,
            penaltyAmount: 10000,
            note: `Terlambat ${late} menit`,
          };
        } else if (rand < 94) {
          // 6% Telat 11-20 menit (Denda Rp 20.000)
          const late = 11 + (pseudoRandom(emp.id, date + '_l') % 10);
          record = {
            empId: emp.id,
            date,
            checkIn: `09:${String(late).padStart(2, '0')}`,
            checkOut: '18:20',
            status: 'Late',
            lateMinutes: late,
            penaltyAmount: 20000,
            note: `Terlambat ${late} menit (Macet)`,
          };
        } else if (rand < 96) {
          // 2% Potong Setengah Hari (> 20 menit)
          const late = 25 + (pseudoRandom(emp.id, date + '_l') % 20);
          record = {
            empId: emp.id,
            date,
            checkIn: `09:${String(late).padStart(2, '0')}`,
            checkOut: '18:00',
            status: 'Late',
            lateMinutes: late,
            penaltyAmount: 0,
            note: 'Lebih dari 20 Menit tanpa pemberitahuan : Gaji Setengah Hari',
          };
        } else if (rand < 98) {
          // 2% Izin Sakit
          record = {
            empId: emp.id,
            date,
            checkIn: null,
            checkOut: null,
            status: 'Leave',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: 'Sakit (Surat Dokter)',
          };
        } else {
          // 2% Cuti Tahunan
          record = {
            empId: emp.id,
            date,
            checkIn: null,
            checkOut: null,
            status: 'Leave',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: 'Cuti Tahunan',
          };
        }
      } else if (loc === 'gudang') {
        // --- JADWAL GUDANG: 08:00 - 17:00 (Sabtu s/d 15:00) ---
        const endHour = dayOfWeek === 6 ? '15' : '17';
        if (rand < 84) {
          // Tepat waktu
          const inMin = 35 + (pseudoRandom(emp.id, date + '_m') % 23); // 07:35 - 07:58
          record = {
            empId: emp.id,
            date,
            checkIn: `07:${String(inMin).padStart(2, '0')}`,
            checkOut: `${endHour}:10`,
            status: 'Present',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: null,
          };
        } else if (rand < 92) {
          // Telat 1-30 menit (Denda Rp 10.000)
          const late = 5 + (pseudoRandom(emp.id, date + '_l') % 20);
          record = {
            empId: emp.id,
            date,
            checkIn: `08:${String(late).padStart(2, '0')}`,
            checkOut: `${endHour}:15`,
            status: 'Late',
            lateMinutes: late,
            penaltyAmount: 10000,
            note: `Terlambat ${late} menit`,
          };
        } else if (rand < 96) {
          // Telat 31-60 menit (Denda Rp 25.000)
          const late = 31 + (pseudoRandom(emp.id, date + '_l') % 20);
          record = {
            empId: emp.id,
            date,
            checkIn: `08:${String(late).padStart(2, '0')}`,
            checkOut: `${endHour}:20`,
            status: 'Late',
            lateMinutes: late,
            penaltyAmount: 25000,
            note: `Terlambat ${late} menit`,
          };
        } else {
          // Cuti / Izin
          record = {
            empId: emp.id,
            date,
            checkIn: null,
            checkOut: null,
            status: 'Leave',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: 'Izin Keperluan Keluarga',
          };
        }
      } else if (loc === 'sales') {
        // --- JADWAL SALES: 09:00 - 17:00 ---
        const endHour = dayOfWeek === 6 ? '15' : '17';
        if (rand < 85) {
          record = {
            empId: emp.id,
            date,
            checkIn: '08:45',
            checkOut: `${endHour}:05`,
            status: 'Present',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: null,
          };
        } else if (rand < 95) {
          // Telat (Denda Rp 10.000 / Rp 20.000)
          const late = 10 + (pseudoRandom(emp.id, date + '_l') % 10);
          record = {
            empId: emp.id,
            date,
            checkIn: `09:${String(late).padStart(2, '0')}`,
            checkOut: `${endHour}:15`,
            status: 'Late',
            lateMinutes: late,
            penaltyAmount: late > 10 ? 20000 : 10000,
            note: `Terlambat ${late} menit (Kunjungan Klien)`,
          };
        } else {
          record = {
            empId: emp.id,
            date,
            checkIn: null,
            checkOut: null,
            status: 'Leave',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: 'Sakit',
          };
        }
      } else {
        // --- JADWAL LIVESTREAM (Manhattan) ---
        if (rand < 88) {
          record = {
            empId: emp.id,
            date,
            checkIn: '09:00',
            checkOut: '13:00',
            status: 'Present',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: 'Sesi Live 4 Jam',
          };
        } else if (rand < 96) {
          // Telat (Denda Flat Rp 50.000)
          record = {
            empId: emp.id,
            date,
            checkIn: '09:20',
            checkOut: '13:20',
            status: 'Late',
            lateMinutes: 20,
            penaltyAmount: 50000,
            note: 'Terlambat Sesi Live',
          };
        } else {
          record = {
            empId: emp.id,
            date,
            checkIn: null,
            checkOut: null,
            status: 'Leave',
            lateMinutes: 0,
            penaltyAmount: 0,
            note: 'Izin Cuti',
          };
        }
      }

      if (record) {
        newAttendances.push(record);
      }
    }
  }

  console.log(`Menyiapkan ${newAttendances.length} baris data presensi baru untuk dimasukkan ke database...`);

  // Batch insert
  const batchSize = 250;
  let inserted = 0;
  for (let i = 0; i < newAttendances.length; i += batchSize) {
    const chunk = newAttendances.slice(i, i + batchSize);
    const res = await prisma.attendance.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += res.count;
    console.log(`Progres insert: ${inserted} / ${newAttendances.length}`);
  }

  console.log(`\n✅ SUKSES! Sebanyak ${inserted} record presensi berhasil disimpan.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

