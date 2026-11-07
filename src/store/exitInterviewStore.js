import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ── HR interviewers & rooms (demo master data) ────────────────────────────────
export const HR_INTERVIEWERS = [
  'Larasati Putri (HRBP)',
  'Bagus Wirawan (HR Manager)',
  'Dewi Anjani (HRBP)',
  'Rina Marlina (HR Specialist)',
]
export const INTERVIEW_ROOMS = [
  'Meeting Room Melati - Lt. 3',
  'Ruang HR - Lt. 2',
  'Ruang Meeting Anggrek - Lt. 1',
  'Ruang Meeting Mawar - Lt. 4',
]

// ── Exit Interview Digital Form definition ────────────────────────────────────
// Section I — rating aspects (1 = sangat tidak baik … 4 = sangat baik)
export const RATING_SCALE = [
  { v: 1, l: 'Sangat Tidak Baik' },
  { v: 2, l: 'Tidak Baik' },
  { v: 3, l: 'Baik' },
  { v: 4, l: 'Sangat Baik' },
]
export const RATING_SECTIONS = [
  { code: 'A', title: 'PERUSAHAAN', items: [
    'Perusahaan memiliki citra (image) yang baik',
    'Budaya Perusahaan diimplementasikan dengan baik',
    'SOP dan sistem kerja berjalan dengan baik dan sesuai',
    'Suasana kerja mendukung Karyawan untuk produktif',
  ]},
  { code: 'B', title: 'LINGKUNGAN KERJA', items: [
    'Saya memperoleh umpan balik secara rutin dari Atasan',
    'Komunikasi saya dengan Atasan berjalan dengan baik',
    '(Bila memiliki bawahan) Komunikasi saya dengan Bawahan berjalan dengan baik',
    'Komunikasi saya dengan Rekan kerja berjalan dengan baik',
    'Komunikasi saya dengan Departemen/Unit lain berjalan dengan baik',
  ]},
  { code: 'C', title: 'PENGEMBANGAN', items: [
    'Pengembangan karyawan telah diberikan dengan cukup untuk memahami Perusahaan dan pekerjaan',
    'Pengembangan karyawan dilakukan secara berkala untuk mempersiapkan tugas dengan baik',
  ]},
  { code: 'D', title: 'KOMPENSASI & BENEFIT', items: [
    'Sistem penggajian bersaing dibandingkan Perusahaan lain yang sejenis',
    'Benefit yang diberikan Perusahaan bagus',
    'Fasilitas kerja sudah memadai',
  ]},
  { code: 'E', title: 'LAINNYA', items: [
    'Perusahaan ini merupakan tempat yang baik dan layak untuk bekerja',
    'Secara umum saya merasa puas bekerja di Perusahaan ini',
  ]},
]
// Flattened list of scored aspects, in order — ratings arrays align to this.
export const RATING_ITEMS = RATING_SECTIONS.flatMap(s => s.items.map(label => ({ section: s.code, label })))

// Section A — pengunduran diri
export const RESIGN_REASON_OPTIONS = [
  'Sistem dan koordinasi pembagian tugas / pekerjaan',
  'Lingkungan kerja',
  'Atasan',
  'Rekan kerja',
  'Planning & controlling serta implementasi rencana kerja',
  'Penilaian kerja',
  'Kekecewaan / ketidakpuasan',
  'Lain-lain',
]
export const AFTER_PLAN_OPTIONS = [
  'Pindah ke Perusahaan lain',
  'Membuka usaha sendiri',
  'Mengurus anak / orang tua / keluarga',
  'Melanjutkan pendidikan',
  'Belum ada kegiatan khusus',
  'Lain-lain',
]
// Section B & C — open questions
export const WORK_QUESTIONS = [
  'Apa hal yang paling memuaskan dari pekerjaan dan tanggung jawab Anda?',
  'Apa hal yang paling tidak memuaskan dari pekerjaan dan tanggung jawab Anda?',
  'Apakah pekerjaan sesuai dengan harapan Anda?',
  'Apa hal yang paling Anda sukai dari Perusahaan?',
  'Apa hal yang paling tidak Anda sukai dari Perusahaan?',
]
export const SUGGESTION_QUESTIONS = [
  'Saran & masukan agar Perusahaan dapat memperbaiki pekerjaan / situasi / lingkungan kerja',
  'Saran agar Perusahaan menjadi tempat bekerja / berkarir yang lebih baik',
  'Hal lain yang ingin disampaikan',
  'Alamat dan nomor kontak yang bisa dihubungi bila diperlukan',
]

export const avgOf = (ratings) => {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0
  const nums = ratings.filter(n => typeof n === 'number' && n > 0)
  if (!nums.length) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

// ── Seed schedules (match the reference design) ───────────────────────────────
const SEED = [
  {
    id: 1, employeeId: null, employeeName: 'Rangga Wibowo', position: 'Product Designer', dept: 'Product',
    hrName: 'Larasati Putri (HRBP)', date: '2026-06-29', time: '10:00',
    mode: 'Offline', room: 'Meeting Room Melati - Lt. 3', link: '',
    formAccess: true, status: 'In Progress', result: null,
  },
  {
    id: 2, employeeId: null, employeeName: 'Maria Anastasya', position: 'Marketing Executive', dept: 'Marketing',
    hrName: 'Larasati Putri (HRBP)', date: '2026-06-29', time: '14:00',
    mode: 'Online', room: '', link: 'https://meet.google.com/xyz-abcd-efg',
    formAccess: true, status: 'Completed',
    result: {
      submittedAt: '2026-06-28 16:15',
      resignReasons: ['Lain-lain'],
      resignReason: 'Mendapatkan kesempatan karir yang lebih menantang di bidang yang saya minati.',
      trigger: 'Tawaran posisi yang lebih senior di perusahaan lain.',
      afterPlans: ['Pindah ke Perusahaan lain'],
      ratings: [4,4,4,4, 4,4,3,3,3, 3,3, 3,3,3, 3,3],
      work: ['Kolaborasi tim yang solid.', 'Beban kerja kadang tidak merata.', 'Sesuai harapan.', 'Budaya kerja terbuka.', 'Proses approval yang panjang.'],
      suggestions: ['Perjelas pembagian beban kerja.', 'Tingkatkan jenjang karir yang transparan.', 'Terima kasih atas kesempatannya.', 'maria.a@testing.com · 0812-xxxx-xxxx'],
    },
  },
  {
    id: 3, employeeId: null, employeeName: 'Nadia Kusuma', position: 'HR Generalist', dept: 'HR',
    hrName: 'Bagus Wirawan (HR Manager)', date: '2026-06-03', time: '09:30',
    mode: 'Offline', room: 'Ruang HR - Lt. 2', link: '',
    formAccess: true, status: 'Completed',
    result: {
      submittedAt: '2026-06-02 18:40',
      resignReasons: ['Lain-lain'],
      resignReason: 'Pindah domisili mengikuti keluarga ke luar kota.',
      trigger: 'Relokasi keluarga.',
      afterPlans: ['Mengurus anak / orang tua / keluarga'],
      ratings: [4,4,4,4, 4,4,4,4, 4,4, 4,4, 3,3,3,3],
      work: ['Lingkungan kerja suportif.', 'Tidak ada.', 'Sesuai.', 'Rekan kerja yang ramah.', '-'],
      suggestions: ['Pertahankan budaya kerja yang positif.', 'Tambah program pengembangan.', '-', 'nadia.k@testing.com · 0813-xxxx-xxxx'],
    },
  },
  // Demo: exit interview for the urgent case (employee 93, already completed).
  {
    id: 4, employeeId: 93, employeeName: 'Onboarding Employee', position: 'Software Engineer', dept: 'Frontend',
    hrName: 'Larasati Putri (HRBP)', date: '2026-07-15', time: '13:30',
    mode: 'Offline', room: 'Ruang HR - Lt. 2', link: '',
    formAccess: true, status: 'Completed',
    result: {
      submittedAt: '2026-07-15 14:20',
      resignReasons: ['Melanjutkan pendidikan'],
      resignReason: 'Melanjutkan studi S2 di luar kota.',
      trigger: 'Diterima program beasiswa.',
      afterPlans: ['Melanjutkan pendidikan'],
      ratings: [4,4,3,4, 4,4,4,4, 3,3, 3,3, 4,4,4,4],
      work: ['Tim yang kolaboratif.', 'Beban kerja terkadang tinggi.', 'Sesuai ekspektasi.', 'Mentor yang suportif.', '-'],
      suggestions: ['Pertahankan program mentoring.', 'Perjelas jenjang karier.', '-', 'ob.employee@testing.com'],
    },
  },
  // Demo: exit interview scheduled for employee 96 (Offboarding Employee) so
  // the offboarding monitor shows a scheduled exit stage instead of "Belum".
  {
    id: 5, employeeId: 96, employeeName: 'Offboarding Employee', position: 'Software Engineer', dept: 'Frontend',
    hrName: 'Larasati Putri (HRBP)', date: '2026-08-20', time: '10:00',
    mode: 'Offline', room: 'Ruang HR - Lt. 2', link: '',
    formAccess: true, status: 'Scheduled', result: null,
  },
]

const nextId = (list) => list.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) + 1

export const useExitInterviewStore = create(
  persist(
    (set) => ({
      schedules: SEED,

      addSchedule: (data) => {
        let created
        set(s => {
          created = {
            employeeId: null, employeeName: '', position: '', dept: '',
            hrName: HR_INTERVIEWERS[0], date: '', time: '',
            mode: 'Offline', room: INTERVIEW_ROOMS[0], link: '',
            formAccess: false, status: 'Scheduled', result: null,
            ...data,
            id: nextId(s.schedules),
          }
          return { schedules: [...s.schedules, created] }
        })
        return created.id
      },

      updateSchedule: (id, patch) =>
        set(s => ({ schedules: s.schedules.map(x => x.id === id ? { ...x, ...patch } : x) })),

      deleteSchedule: (id) =>
        set(s => ({ schedules: s.schedules.filter(x => x.id !== id) })),

      toggleAccess: (id) =>
        set(s => ({ schedules: s.schedules.map(x => x.id === id ? { ...x, formAccess: !x.formAccess } : x) })),
    }),
    { name: 'hcm-exit-interview-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
