import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Kategori Template
export const TEMPLATE_CATEGORIES = [
  { id: 'all',        label: 'Semua Template', icon: '📁' },
  { id: 'contract',   label: 'Kontrak & PKWT',  icon: '📅' },
  { id: 'approval',   label: 'Approval Izin & Lembur', icon: '⏳' },
  { id: 'offboarding',label: 'Offboarding & Resign', icon: '🚪' },
  { id: 'personnel',  label: 'Personnel Action', icon: '📋' },
  { id: 'onboarding', label: 'Onboarding & Rekrutmen', icon: '🌟' },
]

// Definisi 12 Template Standar Sistem PeopleHub
export const DEFAULT_TEMPLATES = {
  // ── 1. KONTRAK & PKWT ──────────────────────────────────────────────────────────
  contract_expiring_hr: {
    key: 'contract_expiring_hr',
    category: 'contract',
    title: 'Peringatan Kontrak Mau Habis (Ke HR & Manager)',
    description: 'Terkirim otomatis via cron pada H-60, H-30, H-14, H-7 sebelum masa kontrak karyawan berakhir.',
    active: true,
    accentColor: '#d97706', // Amber warning
    subject: '[Peringatan Kontrak] Masa Kerja {{employee_name}} Akan Berakhir pada {{contract_end_date}}',
    body: `Halo Tim HR & Atasan,\n\nKami menginformasikan bahwa kontrak kerja (PKWT) untuk karyawan berikut akan segera berakhir dalam **{{days_remaining}} hari**:\n\n- **Nama Karyawan:** {{employee_name}}\n- **NIK:** {{employee_id}}\n- **Departemen:** {{department}}\n- **Jabatan:** {{position}}\n- **Tanggal Akhir Kontrak:** {{contract_end_date}}\n- **Atasan Langsung:** {{manager_name}}\n\nSilakan segera lakukan koordinasi dan evaluasi untuk menentukan apakah kontrak akan diperpanjang atau diselesaikan melalui modul Personnel Action.`,
    ctaText: 'Tinjau di Personnel Action',
    ctaUrl: '/hr/employee/personnel-action',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Ahmad Fauzi' },
      { key: 'employee_id', label: 'NIK Karyawan', sample: 'EMP-2024-0018' },
      { key: 'department', label: 'Departemen', sample: 'Information Technology' },
      { key: 'position', label: 'Jabatan', sample: 'Fullstack Developer' },
      { key: 'contract_end_date', label: 'Tgl Akhir Kontrak', sample: '2026-12-31' },
      { key: 'days_remaining', label: 'Sisa Hari', sample: '30' },
      { key: 'manager_name', label: 'Nama Atasan', sample: 'Budi Santoso' },
      { key: 'company_name', label: 'Nama Perusahaan', sample: 'PT Manusistem Integrasi' },
    ],
  },

  contract_expiring_employee: {
    key: 'contract_expiring_employee',
    category: 'contract',
    title: 'Pemberitahuan Masa Kontrak Berakhir (Ke Karyawan)',
    description: 'Terkirim ke karyawan pada H-14 sebelum tanggal berakhirnya kontrak.',
    active: true,
    accentColor: '#3b82f6', // Blue info
    subject: 'Pemberitahuan Berakhirnya Masa Kontrak Kerja — {{company_name}}',
    body: `Halo {{employee_name}},\n\nKami ingin memberitahukan bahwa masa perjanjian kerja waktu tertentu (PKWT) Anda di {{company_name}} akan berakhir pada tanggal **{{contract_end_date}}** (sekitar {{days_remaining}} hari lagi).\n\nTim HR dan atasan langsung Anda sedang meninjau proses evaluasi kinerja. Jika ada proses administrasi lanjutan atau perpanjangan, Anda akan segera dihubungi oleh tim People/HR kami.\n\nTerima kasih atas dedikasi dan kerja sama Anda selama ini.`,
    ctaText: 'Buka Portal PeopleHub',
    ctaUrl: '/dashboard',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Ahmad Fauzi' },
      { key: 'contract_end_date', label: 'Tgl Akhir Kontrak', sample: '2026-12-31' },
      { key: 'days_remaining', label: 'Sisa Hari', sample: '14' },
      { key: 'company_name', label: 'Nama Perusahaan', sample: 'PT Manusistem Integrasi' },
    ],
  },

  contract_extended: {
    key: 'contract_extended',
    category: 'contract',
    title: 'Konfirmasi Perpanjangan Kontrak (Extend Contract Approved)',
    description: 'Terkirim saat aksi perpanjangan kontrak disetujui di Personnel Action.',
    active: true,
    accentColor: '#059669', // Emerald success
    subject: 'Selamat! Perpanjangan Kontrak Kerja Anda Telah Disetujui — {{company_name}}',
    body: `Halo {{employee_name}},\n\nKabar baik! Manajemen telah menyetujui perpanjangan kontrak kerja Anda di **{{company_name}}** dengan rincian sebagai berikut:\n\n- **Jabatan:** {{position}}\n- **Departemen:** {{department}}\n- **Periode Baru:** {{new_start_date}} s.d. {{new_end_date}}\n- **Durasi Perpanjangan:** {{duration_months}} Bulan\n\nSurat Perjanjian Kerja (Adendum / Kontrak Baru) dapat Anda lihat dan tandatangani melalui menu dokumen di PeopleHub.`,
    ctaText: 'Lihat Detail Kontrak',
    ctaUrl: '/ess/profile',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Ahmad Fauzi' },
      { key: 'position', label: 'Jabatan', sample: 'Fullstack Developer' },
      { key: 'department', label: 'Departemen', sample: 'Information Technology' },
      { key: 'new_start_date', label: 'Tgl Mulai Baru', sample: '2027-01-01' },
      { key: 'new_end_date', label: 'Tgl Selesai Baru', sample: '2027-12-31' },
      { key: 'duration_months', label: 'Durasi (Bulan)', sample: '12' },
      { key: 'company_name', label: 'Nama Perusahaan', sample: 'PT Manusistem Integrasi' },
    ],
  },

  // ── 2. APPROVAL & PERIZINAN ────────────────────────────────────────────────────
  leave_requested: {
    key: 'leave_requested',
    category: 'approval',
    title: 'Pengajuan Cuti Menunggu Persetujuan (Ke Approver)',
    description: 'Terkirim ke Atasan / Approver saat karyawan mengajukan cuti di ESS.',
    active: true,
    accentColor: '#2563eb', // Blue
    subject: '[Approval Cuti] Permohonan Cuti dari {{employee_name}} ({{leave_type}})',
    body: `Halo Bapak/Ibu {{approver_name}},\n\nTerdapat permohonan cuti baru dari tim Anda yang memerlukan persetujuan:\n\n- **Nama Pemohon:** {{employee_name}}\n- **Jenis Cuti:** {{leave_type}}\n- **Tanggal Mulai:** {{start_date}}\n- **Tanggal Selesai:** {{end_date}}\n- **Total Durasi:** {{total_days}} Hari Kerja\n- **Alasan:** {{reason}}\n\nSilakan klik tombol di bawah untuk melihat detail pengajuan dan memberikan persetujuan.`,
    ctaText: 'Tinjau & Setujui Cuti',
    ctaUrl: '/mss/approve-leave',
    variables: [
      { key: 'approver_name', label: 'Nama Approver', sample: 'Budi Santoso' },
      { key: 'employee_name', label: 'Nama Pemohon', sample: 'Dewi Rahayu' },
      { key: 'leave_type', label: 'Jenis Cuti', sample: 'Cuti Tahunan' },
      { key: 'start_date', label: 'Tgl Mulai', sample: '2026-12-20' },
      { key: 'end_date', label: 'Tgl Selesai', sample: '2026-12-22' },
      { key: 'total_days', label: 'Jumlah Hari', sample: '3' },
      { key: 'reason', label: 'Alasan Cuti', sample: 'Keperluan keluarga di luar kota' },
    ],
  },

  leave_status_update: {
    key: 'leave_status_update',
    category: 'approval',
    title: 'Status Pengajuan Cuti (Ke Karyawan)',
    description: 'Terkirim ke karyawan saat permohonan cuti disetujui atau ditolak.',
    active: true,
    accentColor: '#059669', // Success/Alert
    subject: 'Pengajuan Cuti Anda Telah {{approval_status}} — {{leave_type}}',
    body: `Halo {{employee_name}},\n\nPengajuan cuti Anda untuk periode **{{start_date}} s.d. {{end_date}}** ({{total_days}} hari) telah **{{approval_status}}** oleh {{approver_name}}.\n\n- **Jenis Cuti:** {{leave_type}}\n- **Catatan Approver:** {{notes}}\n- **Sisa Kuota Cuti Tahunan:** {{remaining_balance}} Hari\n\nUntuk melihat riwayat lengkap saldo cuti Anda, silakan kunjungi menu Leave Management di PeopleHub.`,
    ctaText: 'Lihat Riwayat Cuti',
    ctaUrl: '/ess/leave-balance',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Dewi Rahayu' },
      { key: 'approval_status', label: 'Status (Disetujui/Ditolak)', sample: 'DISETUJUI' },
      { key: 'approver_name', label: 'Nama Penyetuju', sample: 'Budi Santoso' },
      { key: 'leave_type', label: 'Jenis Cuti', sample: 'Cuti Tahunan' },
      { key: 'start_date', label: 'Tgl Mulai', sample: '2026-12-20' },
      { key: 'end_date', label: 'Tgl Selesai', sample: '2026-12-22' },
      { key: 'total_days', label: 'Jumlah Hari', sample: '3' },
      { key: 'notes', label: 'Catatan Approver', sample: 'Disetujui, pekerjaan didelegasikan ke tim.' },
      { key: 'remaining_balance', label: 'Sisa Kuota Cuti', sample: '9' },
    ],
  },

  overtime_requested: {
    key: 'overtime_requested',
    category: 'approval',
    title: 'Pengajuan Lembur Menunggu Persetujuan (Ke Approver)',
    description: 'Terkirim ke atasan saat karyawan submit form permohonan lembur.',
    active: true,
    accentColor: '#7c3aed', // Purple
    subject: '[Approval Lembur] Permohonan Lembur {{employee_name}} — {{overtime_date}}',
    body: `Halo Bapak/Ibu {{approver_name}},\n\nAnggota tim Anda mengajukan permohonan kerja lembur:\n\n- **Nama Karyawan:** {{employee_name}}\n- **Tanggal Lembur:** {{overtime_date}}\n- **Jam Kerja:** {{start_time}} - {{end_time}} (Est. {{total_hours}} Jam)\n- **Uraian Tugas Lembur:** {{task_note}}\n\nSilakan tinjau dan berikan konfirmasi persetujuan di portal MSS PeopleHub.`,
    ctaText: 'Tinjau Pengajuan Lembur',
    ctaUrl: '/mss/approve-overtime',
    variables: [
      { key: 'approver_name', label: 'Nama Approver', sample: 'Budi Santoso' },
      { key: 'employee_name', label: 'Nama Pemohon', sample: 'Rina Marlina' },
      { key: 'overtime_date', label: 'Tgl Lembur', sample: '2026-11-20' },
      { key: 'start_time', label: 'Jam Mulai', sample: '18:00' },
      { key: 'end_time', label: 'Jam Selesai', sample: '22:00' },
      { key: 'total_hours', label: 'Total Jam', sample: '4' },
      { key: 'task_note', label: 'Uraian Tugas', sample: 'Penyelesaian deployment sistem akhir tahun' },
    ],
  },

  overtime_status_update: {
    key: 'overtime_status_update',
    category: 'approval',
    title: 'Status Pengajuan Lembur (Ke Karyawan)',
    description: 'Terkirim ke karyawan saat pengajuan lembur disetujui atau ditolak.',
    active: true,
    accentColor: '#059669',
    subject: 'Pengajuan Lembur Anda Telah {{approval_status}} — {{overtime_date}}',
    body: `Halo {{employee_name}},\n\nPengajuan lembur Anda pada tanggal **{{overtime_date}}** telah **{{approval_status}}** oleh {{approver_name}}.\n\n- **Durasi Lembur:** {{total_hours}} Jam\n- **Catatan:** {{notes}}\n\nUpah lembur akan dihitung secara otomatis ke dalam rekapitulasi gaji periode berjalan.`,
    ctaText: 'Buka Portal ESS',
    ctaUrl: '/ess/overtime',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Rina Marlina' },
      { key: 'approval_status', label: 'Status (Disetujui/Ditolak)', sample: 'DISETUJUI' },
      { key: 'approver_name', label: 'Nama Penyetuju', sample: 'Budi Santoso' },
      { key: 'overtime_date', label: 'Tgl Lembur', sample: '2026-11-20' },
      { key: 'total_hours', label: 'Total Jam', sample: '4' },
      { key: 'notes', label: 'Catatan', sample: 'Lembur disetujui sesuai target penugasan.' },
    ],
  },

  // ── 3. OFFBOARDING & RESIGN ────────────────────────────────────────────────────
  resignation_submitted: {
    key: 'resignation_submitted',
    category: 'offboarding',
    title: 'Pengajuan Resign Masuk (Ke HR & Atasan)',
    description: 'Terkirim saat pengajuan pengunduran diri diinput via ESS atau dicatat oleh HR.',
    active: true,
    accentColor: '#dc2626', // Red
    subject: '[Offboarding] Pengajuan Pengunduran Diri: {{employee_name}}',
    body: `Halo Tim HR & Atasan Langsung,\n\nTerdapat pengajuan pengunduran diri (resignation) baru:\n\n- **Nama Karyawan:** {{employee_name}}\n- **Departemen:** {{department}}\n- **Jabatan:** {{position}}\n- **Tanggal Pemberitahuan:** {{notice_date}}\n- **Usulan Last Working Day (LWD):** {{proposed_lwd}}\n- **Alasan Pengunduran Diri:** {{reason}}\n\nSilakan buka menu Offboarding untuk memverifikasi masa notice 30 hari dan menetapkan jadwal LWD resmi.`,
    ctaText: 'Tinjau Pengajuan Resign',
    ctaUrl: '/hr/employee/personnel-action/offboarding-overview?tab=approval',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Robi Anaweda' },
      { key: 'department', label: 'Departemen', sample: 'Product Development' },
      { key: 'position', label: 'Jabatan', sample: 'UI/UX Designer' },
      { key: 'notice_date', label: 'Tgl Pemberitahuan', sample: '2026-11-15' },
      { key: 'proposed_lwd', label: 'Usulan LWD', sample: '2026-12-15' },
      { key: 'reason', label: 'Alasan Resign', sample: 'Melanjutkan pendidikan master' },
    ],
  },

  resignation_approved: {
    key: 'resignation_approved',
    category: 'offboarding',
    title: 'Persetujuan Resign & Penetapan LWD (Ke Karyawan)',
    description: 'Terkirim ke karyawan saat pengajuan resign disetujui secara resmi oleh HR.',
    active: true,
    accentColor: '#475569', // Slate
    subject: 'Persetujuan Pengunduran Diri & Informasi Hari Kerja Terakhir (LWD)',
    body: `Halo {{employee_name}},\n\nPengajuan pengunduran diri Anda telah disetujui oleh manajemen **{{company_name}}**.\n\nBerikut adalah jadwal hari kerja terakhir resmi Anda:\n- **Official Last Working Day (LWD):** {{official_lwd}}\n\n**Panduan Exit Clearance:**\nSebelum hari kerja terakhir Anda, mohon selesaikan pengembalian aset kantor (Laptop, ID Card, Akses) serta serah terima pekerjaan (Handover) kepada rekan tim Anda. Tim HR akan memandu proses penerbitan Surat Pengalaman Kerja (Paklaring) setelah clearance selesai 100%.\n\nTerima kasih atas kontribusi terbaik Anda untuk perusahaan.`,
    ctaText: 'Lihat Status Clearance Saya',
    ctaUrl: '/dashboard',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Robi Anaweda' },
      { key: 'official_lwd', label: 'Tanggal Resmi LWD', sample: '2026-12-15' },
      { key: 'company_name', label: 'Nama Perusahaan', sample: 'PT Manusistem Integrasi' },
    ],
  },

  clearance_task_assigned: {
    key: 'clearance_task_assigned',
    category: 'offboarding',
    title: 'Tugas Exit Clearance Departemen (Ke IT/GA/Finance/HR)',
    description: 'Terkirim ke PIC departemen saat checklist serah terima aset didistribusikan.',
    active: true,
    accentColor: '#e11d48', // Rose
    subject: '[Tugas Exit Clearance] Serah Terima & Penarikan Aset: {{employee_name}}',
    body: `Halo Tim {{assigned_dept}},\n\nProses offboarding untuk karyawan berikut telah dimulai:\n\n- **Nama Karyawan:** {{employee_name}}\n- **Departemen:** {{department}}\n- **Official LWD:** {{official_lwd}}\n\nMohon lakukan verifikasi dan penarikan aset/akses terkait departemen Anda (misal: Laptop, Email, Token Finansial, Seragam) sebelum tanggal LWD yang ditentukan.\n\nSilakan tandai butir checklist yang telah selesai di modul Offboarding Monitor.`,
    ctaText: 'Buka Checklist Clearance',
    ctaUrl: '/hr/employee/personnel-action/offboarding-overview?tab=monitor',
    variables: [
      { key: 'assigned_dept', label: 'Departemen PIC', sample: 'Information Technology (IT)' },
      { key: 'employee_name', label: 'Nama Karyawan Keluar', sample: 'Robi Anaweda' },
      { key: 'department', label: 'Departemen Asal', sample: 'Product Development' },
      { key: 'official_lwd', label: 'Tgl LWD', sample: '2026-12-15' },
    ],
  },

  // ── 4. PERSONNEL ACTION & MUTASI ───────────────────────────────────────────────
  personnel_action_notice: {
    key: 'personnel_action_notice',
    category: 'personnel',
    title: 'Pemberitahuan Keputusan Personnel Action (Ke Karyawan)',
    description: 'Terkirim saat SK mutasi, promosi, atau demosi diterbitkan resmi.',
    active: true,
    accentColor: '#6366f1', // Indigo
    subject: 'Pemberitahuan Surat Keputusan {{action_type}} — {{company_name}}',
    body: `Halo {{employee_name}},\n\nKami menginformasikan penerbitan Surat Keputusan (SK) **{{action_type}}** dari manajemen {{company_name}}:\n\n- **Jenis Tindakan:** {{action_type}}\n- **Jabatan Baru:** {{new_position}}\n- **Departemen Baru:** {{new_department}}\n- **Tanggal Efektif:** {{effective_date}}\n\nSelamat atas langkah baru Anda. Semoga dapat terus memberikan kontribusi terbaik bagi kemajuan bersama.`,
    ctaText: 'Lihat Profil Kepegawaian',
    ctaUrl: '/ess/profile',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Dewi Rahayu' },
      { key: 'action_type', label: 'Jenis Aksi (Promote/Transfer)', sample: 'Promosi Jabatan' },
      { key: 'new_position', label: 'Jabatan Baru', sample: 'Senior System Analyst' },
      { key: 'new_department', label: 'Departemen Baru', sample: 'Technology & Core System' },
      { key: 'effective_date', label: 'Tgl Efektif', sample: '2027-01-01' },
      { key: 'company_name', label: 'Nama Perusahaan', sample: 'PT Manusistem Integrasi' },
    ],
  },

  // ── 5. ONBOARDING & REKRUTMEN ─────────────────────────────────────────────────
  onboarding_welcome: {
    key: 'onboarding_welcome',
    category: 'onboarding',
    title: 'Selamat Datang Karyawan Baru (Welcome Onboarding)',
    description: 'Terkirim ke karyawan baru saat akun dibuat di Onboarding Tracker.',
    active: true,
    accentColor: '#0ea5e9', // Sky blue
    subject: 'Selamat Datang di {{company_name}}! Panduan Hari Pertama Anda',
    body: `Halo {{employee_name}},\n\nSelamat bergabung di keluarga besar **{{company_name}}**! Kami sangat senang menyambut Anda sebagai bagian dari tim **{{department}}** dalam posisi **{{position}}**.\n\nHari pertama kerja Anda dijadwalkan pada **{{join_date}}**.\n\n**Akses Akun PeopleHub:**\nAnda dapat masuk ke portal HCM PeopleHub dengan menggunakan email: **{{user_email}}**.\n\nSilakan lengkapi profil biodata serta ikuti panduan checklist induksi hari pertama melalui link di bawah ini.`,
    ctaText: 'Buka Onboarding Portal',
    ctaUrl: '/ess/onboarding',
    variables: [
      { key: 'employee_name', label: 'Nama Karyawan', sample: 'Budi Santoso' },
      { key: 'company_name', label: 'Nama Perusahaan', sample: 'PT Manusistem Integrasi' },
      { key: 'department', label: 'Departemen', sample: 'Human Resources' },
      { key: 'position', label: 'Jabatan', sample: 'HR Specialist' },
      { key: 'join_date', label: 'Tgl Mulai Bekerja', sample: '2026-12-01' },
      { key: 'user_email', label: 'Email Akun', sample: 'budi.santoso@perusahaan.com' },
    ],
  },

  candidate_applied: {
    key: 'candidate_applied',
    category: 'onboarding',
    title: 'Konfirmasi Lamaran Kandidat (Career Site Apply)',
    description: 'Terkirim otomatis saat pelamar klik tombol "Kirim Lamaran" di Career Site.',
    active: true,
    accentColor: '#14b8a6', // Teal
    subject: 'Lamaran Anda Diterima — {{positionTitle}}',
    body: `Halo {{candidateName}},\n\nTerima kasih telah melamar untuk posisi {{positionTitle}} di {{companyName}}. Lamaran Anda sudah kami terima pada {{appliedDate}} dan akan segera ditinjau oleh tim rekrutmen kami.\n\nKami akan menghubungi Anda kembali melalui email ini jika profil Anda sesuai dengan kebutuhan posisi tersebut.\n\nSalam,\nTim Rekrutmen {{companyName}}`,
    ctaText: 'Lihat Lowongan Lainnya',
    ctaUrl: '/careers',
    variables: [
      { key: 'candidateName', label: 'Nama Kandidat', sample: 'Budi Santoso' },
      { key: 'email', label: 'Email Kandidat', sample: 'budi.santoso@email.com' },
      { key: 'positionTitle', label: 'Posisi yang Dilamar', sample: 'Software Engineer' },
      { key: 'companyName', label: 'Perusahaan', sample: 'PT Manusistem Integrasi' },
      { key: 'appliedDate', label: 'Tanggal Melamar', sample: '2026-11-15' },
    ],
  },
}

// Kompatibilitas dengan kode lama
export const CANDIDATE_APPLY_VARIABLES = DEFAULT_TEMPLATES.candidate_applied.variables

export function resolveTemplate(text, values) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? String(values[key] ?? '') : match))
}

const DEFAULT_SMTP = {
  host: 'mail.example.com',
  port: 465,
  secure: true,
  user: 'notification@example.com',
  pass: '',
  fromName: 'PeopleHub HRMS',
  fromEmail: 'notification@example.com',
  replyTo: 'hr@example.com',
  active: true,
}

const DEFAULT_CONTRACT_SETTINGS = {
  alertIntervals: [60, 30, 14, 7, 1],
  hrEmails: 'hr@example.com',
  notifyManager: true,
  notifyEmployee: true,
}

export const useNotificationSettingsStore = create(
  persist(
    (set, get) => ({
      // Konfigurasi SMTP
      smtp: { ...DEFAULT_SMTP },

      // Pengaturan Otomasi Kontrak
      contractSettings: { ...DEFAULT_CONTRACT_SETTINGS },

      // Daftar Template Notifikasi
      templates: { ...DEFAULT_TEMPLATES },

      // Riwayat Email Terkirim
      logs: [],

      // Backward compatibility untuk candidateApply
      get candidateApply() {
        return get().templates.candidate_applied || DEFAULT_TEMPLATES.candidate_applied
      },

      // Action: SMTP
      setSmtp: (patch) => set((s) => ({ smtp: { ...s.smtp, ...patch } })),

      // Action: Contract Settings
      setContractSettings: (patch) =>
        set((s) => ({ contractSettings: { ...s.contractSettings, ...patch } })),

      // Action: Template
      setTemplate: (key, patch) =>
        set((s) => ({
          templates: {
            ...s.templates,
            [key]: {
              ...(s.templates[key] || DEFAULT_TEMPLATES[key]),
              ...patch,
            },
          },
        })),

      resetTemplateToDefault: (key) =>
        set((s) => ({
          templates: {
            ...s.templates,
            [key]: { ...DEFAULT_TEMPLATES[key] },
          },
        })),

      resetAllTemplates: () => set({ templates: { ...DEFAULT_TEMPLATES } }),

      // Legacy compatibility actions
      setSubject: (v) => get().setTemplate('candidate_applied', { subject: v }),
      setBody: (v) => get().setTemplate('candidate_applied', { body: v }),
      setActive: (v) => get().setTemplate('candidate_applied', { active: v }),

      // Action: Logs
      addLog: (entry) =>
        set((s) => ({
          logs: [
            {
              id: Date.now() + Math.floor(Math.random() * 1000),
              sentAt: new Date().toISOString(),
              ...entry,
            },
            ...s.logs,
          ].slice(0, 200),
        })),

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'hcm-notification-settings-v1',
      storage: createJSONStorage(() => dbStorage),
    }
  )
)
