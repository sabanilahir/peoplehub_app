import { create }         from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'
import { generateSteps }  from '@/store/workflowStore'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

// Manual onboarding approval: the direct supervisor (atasan) approves the plan
// that HR prepared. (Auto-assigned onboarding needs no approval — see
// buildOnboardingFromRule.)
export const onboardingApprovalSteps = () => generateSteps([
  { type: 'supervisor' },
])

// ── Default agenda templates (matches Excel induction form) ───────────────────
const mkG = (no, module, tujuan, mentorName = '', mentorPosition = '') => ({
  id: uid(), no, date: '', module, tujuan,
  mentorName, mentorPosition, completed: false,
})

const mkT = (no, module, tujuan, category = 'all_level', mentorName = '', mentorPosition = '') => ({
  id: uid(), no, date: '', module, tujuan, category,
  mentorName, mentorPosition, completed: false,
})

export const DEFAULT_GENERAL_ITEMS = () => [
  mkG('-',  'Kelengkapan Administrasi dan Pengantar',
      'Melengkapi Administrasi'),
  mkG('1',  'Company Profile',
      'Mengenal Perusahaan: Visi, Misi, Sejarah Perusahaan, Product & Principal', 'Tito', 'HRD'),
  mkG('2',  'Peraturan Perusahaan & Kode Etik',
      'Mengenal Peraturan Perusahaan dan memahami kode etik', 'Regional/Tito', 'HRD'),
  mkG('3',  'Keunggulan Bersaing',
      'Mengetahui Keunggulan Bersaing dan Implementasinya', 'Self Learning', ''),
  mkG('4',  'Culture Perusahaan',
      'Memahami Budaya Perusahaan', 'Michael', 'HRD'),
  mkG('5',  'Pemahaman Good Documentation Practices (GDP) dan Data Integritas',
      'Memahami dan menerapkan Good Documentation Practices (GDP) dan Data Integrity untuk menjamin keakuratan, kesetiaan, dan keluluran data sesuai ketentuan regulasi',
      'Ferlino', 'SQM'),
  mkG('6',  'Overview Departemen dan Struktur',
      'Mengetahui Departemen yang ada: Peran, Fungsi, dan Struktur', 'Cishi', 'HRD'),
  mkG('7',  'Pemahaman CDOB dan CDAKB secara umum',
      'Memenuhi standar pendistribusian obat dan alkes yang baik sesuai persyaratan pemerintah',
      'Self Learning', ''),
  mkG('8',  'Pemahaman Terkait Sistem Jaminan Halal',
      'Memenuhi standar kebijakan halal sesuai persyaratan LPPOM MUI', 'Self Learning', ''),
  mkG('9',  'Pengelolaan NAPZA dan OOT di distribusi farmasi',
      'Memahami pengelolaan NAPZA dan Obat-obat tertentu di distribusi farmasi', 'Self Learning', ''),
  mkG('10', 'Pharmacovigilance',
      'Memahami peran yang perlu dilakukan terhadap isu keamanan produk yang didistribusikan',
      'Self Learning', ''),
  mkG('11', 'Pengenalan Industri Farmasi',
      'Mengenal Industri Farmasi & Distribusi', 'Self Learning', ''),
  mkG('12', 'Bisnis Proses Cabang',
      'Mengenal Bisnis: Order Kirim Tagih', 'Cishi', 'HRD'),
  mkG('13', 'Tes Induksi',
      'Memastikan Peserta sudah memahami Materi Induksi yang diberikan', 'Tito', 'HRD'),
]

export const DEFAULT_TECHNICAL_ITEMS = () => [
  mkT('1', 'Jobdesc: Sudah membaca dan memahami',
      'Mendapat gambaran terkait job yang dilakukan, sistem penilaian dan karir', 'all_level'),
  mkT('2', 'Pengukuran Produktivitas',
      'Mendapat gambaran pengukuran produktivitas dalam organisasi', 'all_level'),
  mkT('3', 'Incentive',
      'Mendapat pengetahuan tentang perhitungan insentif', 'all_level'),
  mkT('4', 'Technical Knowledge [Sesuai Posisi]',
      'Mengetahui technical knowledge yang terkait dengan kegiatan operational', 'all_level'),
  mkT('5', 'SOP/WI terkait pekerjaan',
      'Memahami prosedur kerja menjadi tanggung jawab dan tim', 'all_level'),
  mkT('6', 'Inbound, Storage, Outbound',
      'Mengetahui gambaran umum proses inbound, storage, outbound', 'all_level'),
  mkT('7', 'Materi & Online Test (IWT)',
      'Mengetahui teknis pelaksanaan In Warehouse Training dan membaca SOP/WI di dalamnya',
      'all_level'),
  mkT('-', 'Coaching & Counseling',
      'Memahami peran leader di dalam memberikan coaching & counseling', 'manager_level'),
  mkT('-', 'Balanced Scorecard',
      'Memahami konsep dan fungsi dari Balanced Scorecard', 'manager_level'),
  mkT('-', 'Review atasan',
      'Mengevaluasi proses pembelajaran selama induksi, termasuk on-the-job training dan arahan kerja',
      'review'),
]

// ── Seed helpers — pre-filled items for demo ─────────────────────────────────
const mkGFilled = (no, module, tujuan, date, mentorName, mentorPosition, completed = false) => ({
  id: uid(), no, date, module, tujuan, mentorName, mentorPosition, completed,
})
const mkTFilled = (no, module, tujuan, category, date, mentorName, mentorPosition, completed = false) => ({
  id: uid(), no, date, module, tujuan, category, mentorName, mentorPosition, completed,
})

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED = [
  // Record 1 — Draft (blank template, ready to fill)
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Budi Santoso',
    department: 'Frontend',
    supervisorName: 'Dewi Rahayu',
    supervisorPosition: 'Engineering Manager',
    employmentStatus: 'New Hire',
    probationPeriod: '3',
    generalItems: DEFAULT_GENERAL_ITEMS(),
    technicalItems: DEFAULT_TECHNICAL_ITEMS(),
    hasilInductionChecked: false,
    workflowStatus: 'Draft',
    steps: [],
    submittedAt: null,
    submittedBy: null,
    submittedByName: null,
    createdAt: '2026-04-01T08:00:00+07:00',
  },
  // Record 2 — Pending (submitted, awaiting approval, with data filled in per Excel)
  {
    id: 2,
    employeeId: 3,
    employeeName: 'Rina Marlina',
    department: 'IT Development',
    supervisorName: 'Dewi Rahayu',
    supervisorPosition: 'Engineering Manager',
    employmentStatus: 'New Hire',
    probationPeriod: '3',
    generalItems: [
      mkGFilled('-',  'Kelengkapan Administrasi dan Pengantar', 'Melengkapi Administrasi',            '',           '',             '',           true),
      mkGFilled('1',  'Company Profile', 'Mengenal Perusahaan: Visi, Misi, Sejarah Perusahaan, Product & Principal', '13-Apr-26', 'Tito',    'HRD',        true),
      mkGFilled('2',  'Peraturan Perusahaan & Kode Etik', 'Mengenal Peraturan Perusahaan dan memahami kode etik',     '13-Apr-26', 'Regional/Tito', 'HRD', true),
      mkGFilled('3',  'Keunggulan Bersaing', 'Mengetahui Keunggulan Bersaing dan Implementasinya',   '',           'Self Learning','',           false),
      mkGFilled('4',  'Culture Perusahaan', 'Memahami Budaya Perusahaan',                           '',           'Michael',      'HRD',        false),
      mkGFilled('5',  'Pemahaman Good Documentation Practices (GDP) dan Data Integritas',
          'Memahami dan menerapkan Good Documentation Practices (GDP) dan Data Integrity untuk menjamin keakuratan, kesetiaan, dan keluluran data sesuai ketentuan regulasi',
                                                                                                     '',           'Ferlino',      'SQM',        false),
      mkGFilled('6',  'Overview Departemen dan Struktur', 'Mengetahui Departemen yang ada: Peran, Fungsi, dan Struktur', '13-Apr-26', 'Cishi', 'HRD', true),
      mkGFilled('7',  'Pemahaman CDOB dan CDAKB secara umum', 'Memenuhi standar pendistribusian obat dan alkes yang baik sesuai persyaratan pemerintah', '', 'Self Learning', '', false),
      mkGFilled('8',  'Pemahaman Terkait Sistem Jaminan Halal', 'Memenuhi standar kebijakan halal sesuai persyaratan LPPOM MUI', '', 'Self Learning', '', false),
      mkGFilled('9',  'Pengelolaan NAPZA dan OOT di distribusi farmasi', 'Memahami pengelolaan NAPZA dan Obat-obat tertentu di distribusi farmasi', '', 'Self Learning', '', false),
      mkGFilled('10', 'Pharmacovigilance', 'Memahami peran yang perlu dilakukan terhadap isu keamanan produk yang didistribusikan', '', 'Self Learning', '', false),
      mkGFilled('11', 'Pengenalan Industri Farmasi', 'Mengenal Industri Farmasi & Distribusi', '', 'Self Learning', '', false),
      mkGFilled('12', 'Bisnis Proses Cabang', 'Mengenal Bisnis: Order Kirim Tagih',                 '13-Apr-26', 'Cishi',    'HRD',        true),
      mkGFilled('13', 'Tes Induksi', 'Memastikan Peserta sudah memahami Materi Induksi yang diberikan', '13-Apr-26', 'Tito', 'HRD', true),
    ],
    technicalItems: [
      mkTFilled('1', 'Jobdesc: Sudah membaca dan memahami', 'Mendapat gambaran terkait job yang dilakukan, sistem penilaian dan karir', 'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', true),
      mkTFilled('2', 'Pengukuran Produktivitas', 'Mendapat gambaran pengukuran produktivitas dalam organisasi',          'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', true),
      mkTFilled('3', 'Incentive', 'Mendapat pengetahuan tentang perhitungan insentif',                                   'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', true),
      mkTFilled('4', 'Technical Knowledge [Sesuai Posisi]', 'Mengetahui technical knowledge yang terkait dengan kegiatan operational', 'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', true),
      mkTFilled('5', 'SOP/WI terkait pekerjaan', 'Memahami prosedur kerja menjadi tanggung jawab dan tim',               'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', true),
      mkTFilled('6', 'Inbound, Storage, Outbound', 'Mengetahui gambaran umum proses inbound, storage, outbound',         'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', true),
      mkTFilled('7', 'Materi & Online Test (IWT)', 'Mengetahui teknis pelaksanaan In Warehouse Training dan membaca SOP/WI di dalamnya', 'all_level', '10 Maret 2026', 'Suyatno', 'NDC Manager', false),
      mkTFilled('-', 'Coaching & Counseling', 'Memahami peran leader di dalam memberikan coaching & counseling',         'manager_level', '', '', '', false),
      mkTFilled('-', 'Balanced Scorecard', 'Memahami konsep dan fungsi dari Balanced Scorecard',                         'manager_level', '', '', '', false),
      mkTFilled('-', 'Review atasan', 'Mengevaluasi proses pembelajaran selama induksi, termasuk on-the-job training dan arahan kerja', 'review', '', '', '', false),
    ],
    hasilInductionChecked: false,
    workflowStatus: 'Pending',
    steps: [
      {
        level: 1, type: 'supervisor', label: 'Direct Supervisor',
        approverId: null, approverName: null,
        status: 'Pending', actedAt: null, note: '',
        roles: [],
      },
    ],
    submittedAt: '2026-04-13T08:30:00+07:00',
    submittedBy: 3,
    submittedByName: 'Rina Marlina',
    createdAt: '2026-04-10T09:00:00+07:00',
  },
  // Onboarding-module demo — created by Onboarding Admin (91) for employee 93,
  // awaiting approval from Onboarding Manager (92); after approval employee 93
  // fills it in. Powers the ob_admin / ob_manager / ob_employee demo accounts.
  {
    id: 93001,
    employeeId: 93,
    employeeName: 'Onboarding Employee',
    department: 'Frontend',
    supervisorName: 'Onboarding Manager',
    supervisorPosition: 'Manager',
    employmentStatus: 'New Hire',
    probationPeriod: '3',
    mainSections: [
      { id: 'ms_gen_93', type: 'Onboarding General',
        sections: [{ id: 'sec_gen_93', label: 'Materi Umum', colorIdx: 0 }],
        items: [
          { id: 'ob93_1', module: 'Company Profile', type: 'Video', link: '', date: '', completed: false, assignedTo: 'self', mandatory: true, category: 'sec_gen_93' },
          { id: 'ob93_2', module: 'Peraturan Perusahaan & Kode Etik', type: 'Document (Attachment)', link: '', date: '', completed: false, assignedTo: 'self', mandatory: true, category: 'sec_gen_93' },
        ],
      },
    ],
    reviewItems: null,
    hasilInductionChecked: true,
    workflowStatus: 'Pending',
    steps: [
      { level: 1, type: 'supervisor', label: 'Direct Supervisor', approverId: null, approverName: null, status: 'Pending', actedAt: null, note: '', roles: [] },
    ],
    submittedAt: '2026-04-15T08:00:00+07:00',
    submittedBy: 91,
    submittedByName: 'Onboarding Admin',
    createdVia: 'manual',
    createdAt: '2026-04-15T08:00:00+07:00',
  },
  // Record 4 — Active (approved & running), ~78% complete → drives the laporan.
  {
    id: 4,
    employeeId: 30,
    employeeName: 'Reza Firmansyah',
    department: 'Engineering',
    supervisorName: 'Dewi Rahayu',
    supervisorPosition: 'Engineering Manager',
    employmentStatus: 'New Hire',
    probationPeriod: '3',
    generalItems: [
      mkGFilled('1', 'Company Profile', 'Mengenal Perusahaan: Visi, Misi, Sejarah', '02-Jun-26', 'Tito',   'HRD', true),
      mkGFilled('2', 'Peraturan Perusahaan & Kode Etik', 'Memahami peraturan & kode etik', '02-Jun-26', 'Tito', 'HRD', true),
      mkGFilled('3', 'Budaya Perusahaan', 'Memahami budaya perusahaan', '03-Jun-26', 'Michael', 'HRD', true),
      mkGFilled('4', 'Good Documentation Practices (GDP)', 'Menerapkan GDP & Data Integrity', '05-Jun-26', 'Ferlino', 'SQM', true),
      mkGFilled('5', 'Overview Departemen & Struktur', 'Mengetahui peran & struktur departemen', '05-Jun-26', 'Cishi', 'HRD', true),
      mkGFilled('6', 'Bisnis Proses', 'Mengenal proses bisnis Order-Kirim-Tagih', '06-Jun-26', 'Cishi', 'HRD', true),
      mkGFilled('7', 'Pengenalan Industri Farmasi', 'Mengenal industri farmasi & distribusi', '', 'Self Learning', '', false),
      mkGFilled('8', 'Tes Induksi', 'Memastikan pemahaman materi induksi', '', 'Tito', 'HRD', false),
    ],
    technicalItems: [
      mkTFilled('1', 'Job Description', 'Memahami job desc, penilaian & karir', 'all_level', '08-Jun-26', 'Wawan Setiawan', 'Engineering Manager', true),
      mkTFilled('2', 'SOP/WI Terkait Pekerjaan', 'Memahami prosedur kerja tim', 'all_level', '09-Jun-26', 'Wawan Setiawan', 'Engineering Manager', true),
      mkTFilled('3', 'Technical Knowledge [Sesuai Posisi]', 'Menguasai technical knowledge operasional', 'all_level', '10-Jun-26', 'Wawan Setiawan', 'Engineering Manager', true),
      mkTFilled('4', 'Setup Environment & Tooling', 'Menyiapkan environment kerja', 'all_level', '10-Jun-26', 'Reza', 'Senior Engineer', true),
      mkTFilled('5', 'Code Review & Git Flow', 'Memahami alur review & git', 'all_level', '', 'Reza', 'Senior Engineer', false),
      mkTFilled('-', 'Review Atasan', 'Evaluasi proses pembelajaran induksi', 'review', '', '', '', false),
    ],
    hasilInductionChecked: true,
    workflowStatus: 'Active',
    steps: [
      { level: 1, type: 'supervisor', label: 'Direct Supervisor', approverId: 2, approverName: 'Dewi Rahayu', status: 'Approved', actedAt: '2026-05-30T10:00:00+07:00', note: 'Disetujui', roles: [] },
    ],
    submittedAt: '2026-05-28T08:30:00+07:00',
    submittedBy: 3,
    submittedByName: 'Rina Marlina',
    activatedAt: '2026-05-30T11:00:00+07:00',
    createdAt: '2026-05-25T09:00:00+07:00',
  },
  // Record 5 — Completed this month → drives "Selesai Bulan Ini".
  {
    id: 5,
    employeeId: 5,
    employeeName: 'Sari Indah',
    department: 'Engineering',
    supervisorName: 'Dewi Rahayu',
    supervisorPosition: 'Engineering Manager',
    employmentStatus: 'New Hire',
    probationPeriod: '3',
    generalItems: [
      mkGFilled('1', 'Company Profile', 'Mengenal Perusahaan: Visi, Misi, Sejarah', '05-May-26', 'Tito', 'HRD', true),
      mkGFilled('2', 'Peraturan Perusahaan & Kode Etik', 'Memahami peraturan & kode etik', '05-May-26', 'Tito', 'HRD', true),
      mkGFilled('3', 'Budaya Perusahaan', 'Memahami budaya perusahaan', '06-May-26', 'Michael', 'HRD', true),
      mkGFilled('4', 'Overview Departemen & Struktur', 'Mengetahui peran & struktur departemen', '07-May-26', 'Cishi', 'HRD', true),
      mkGFilled('5', 'Tes Induksi', 'Memastikan pemahaman materi induksi', '08-May-26', 'Tito', 'HRD', true),
    ],
    technicalItems: [
      mkTFilled('1', 'Job Description', 'Memahami job desc & penilaian', 'all_level', '12-May-26', 'Wawan Setiawan', 'Engineering Manager', true),
      mkTFilled('2', 'SOP/WI Terkait Pekerjaan', 'Memahami prosedur kerja tim', 'all_level', '13-May-26', 'Wawan Setiawan', 'Engineering Manager', true),
      mkTFilled('3', 'Technical Knowledge [Sesuai Posisi]', 'Menguasai technical knowledge', 'all_level', '14-May-26', 'Wawan Setiawan', 'Engineering Manager', true),
      mkTFilled('4', 'Review Atasan', 'Evaluasi proses pembelajaran induksi', 'review', '30-Jun-26', 'Wawan Setiawan', 'Engineering Manager', true),
    ],
    hasilInductionChecked: true,
    workflowStatus: 'Completed',
    steps: [
      { level: 1, type: 'supervisor', label: 'Direct Supervisor', approverId: 2, approverName: 'Dewi Rahayu', status: 'Approved', actedAt: '2026-05-04T10:00:00+07:00', note: 'Disetujui', roles: [] },
    ],
    submittedAt: '2026-05-02T08:30:00+07:00',
    submittedBy: 3,
    submittedByName: 'Rina Marlina',
    activatedAt: '2026-05-04T11:00:00+07:00',
    completedAt: '2026-07-05T16:00:00+07:00',
    createdAt: '2026-04-28T09:00:00+07:00',
  },
]

let _nextId = 6

// ── Consolidated lifecycle stage (single source of truth for display) ─────────
// The store carries several internal statuses for historical reasons
// (Draft, Preparation, Pending, Approved, Active, Completed, Rejected). For the
// UI we collapse them into four user-facing stages so every persona — employee,
// manager, HR — sees the same small, consistent vocabulary. Internal transitions
// are unchanged; this only governs how a status is labelled and coloured.
export const ONBOARDING_STAGES = {
  prepared:  { id: 'Disiapkan',            en: 'Being Prepared',   cls: 'bg-indigo-100 text-indigo-700' },
  pending:   { id: 'Menunggu Persetujuan', en: 'Pending Approval', cls: 'bg-yellow-100 text-yellow-700' },
  running:   { id: 'Berjalan',             en: 'In Progress',      cls: 'bg-blue-100 text-blue-700' },
  completed: { id: 'Selesai',              en: 'Completed',        cls: 'bg-green-100 text-green-700' },
  rejected:  { id: 'Ditolak',              en: 'Rejected',         cls: 'bg-red-100 text-red-700' },
}
export function onboardingStage(status) {
  switch (status) {
    case 'Draft':
    case 'Preparation': return ONBOARDING_STAGES.prepared
    case 'Pending':     return ONBOARDING_STAGES.pending
    case 'Approved':
    case 'Active':      return ONBOARDING_STAGES.running
    case 'Completed':   return ONBOARDING_STAGES.completed
    case 'Rejected':    return ONBOARDING_STAGES.rejected
    default:            return ONBOARDING_STAGES.prepared
  }
}

function deriveStatus(steps) {
  if (!steps || steps.length === 0) return 'Draft'
  if (steps.some(s => s.status === 'Rejected'))  return 'Rejected'
  if (steps.every(s => s.status === 'Approved')) return 'Approved'
  return 'Pending'
}

export const useOnboardingStore = create(
  persist(
    (set) => ({
      onboardings: SEED,

      addOnboarding: (data) => {
        const id = _nextId++
        const hasNewFormat = data.mainSections && data.mainSections.length > 0
        set(s => ({
          onboardings: [...s.onboardings, {
            ...(hasNewFormat ? {} : { generalItems: DEFAULT_GENERAL_ITEMS(), technicalItems: DEFAULT_TECHNICAL_ITEMS() }),
            hasilInductionChecked: false,
            workflowStatus: 'Draft',
            steps: [],
            submittedAt: null,
            submittedBy: null,
            submittedByName: null,
            createdAt: new Date().toISOString(),
            ...data,
            id,
          }],
        }))
        return id
      },

      updateOnboarding: (id, patch) =>
        set(s => ({
          onboardings: s.onboardings.map(o => o.id === id ? { ...o, ...patch } : o),
        })),

      deleteOnboarding: (id) =>
        set(s => ({ onboardings: s.onboardings.filter(o => o.id !== id) })),

      // ── Activate: move from Preparation → Active (tasks visible to employee) ──
      activateOnboarding: (id, activatedById, activatedByName) =>
        set(s => ({
          onboardings: s.onboardings.map(o =>
            o.id !== id ? o : {
              ...o,
              workflowStatus: 'Active',
              activatedAt: new Date().toISOString(),
              activatedById,
              activatedByName,
            }
          ),
        })),

      submitOnboarding: (id, submitter, pageLevels) =>
        set(s => ({
          onboardings: s.onboardings.map(o => {
            if (o.id !== id) return o
            // Manual onboarding is always approved by the direct supervisor.
            const steps = onboardingApprovalSteps()
            return {
              ...o,
              workflowStatus: 'Pending',
              steps,
              submittedAt: new Date().toISOString(),
              submittedBy: submitter.id,
              submittedByName: submitter.name,
            }
          }),
        })),

      approveStep: (id, level, approverId, approverName, note = '') =>
        set(s => ({
          onboardings: s.onboardings.map(o => {
            if (o.id !== id) return o
            let steps = o.steps.map(step =>
              step.level === level
                ? { ...step, status: 'Approved', approverId, approverName, actedAt: new Date().toISOString(), note }
                : step
            )
            // Activate next Waiting step
            steps = steps.map((step, i) =>
              step.status === 'Waiting' && steps.slice(0, i).every(s => s.status === 'Approved')
                ? { ...step, status: 'Pending' }
                : step
            )
            const newStatus = deriveStatus(steps)
            // When fully approved, stamp the employee record with onboardingCompletedAt
            if (newStatus === 'Approved' && o.employeeId) {
              try {
                // Lazy import to avoid circular dependency (employeeStore → onboardingAutoAssign → onboardingStore)
                const { useEmployeeStore } = require('@/store/employeeStore')
                useEmployeeStore.getState().updateEmployee(Number(o.employeeId), {
                  onboardingStatus:      'Completed',
                  onboardingCompletedAt: new Date().toISOString(),
                })
              } catch (e) {
                console.error('Failed to update employee onboarding status:', e)
              }
            }
            return { ...o, steps, workflowStatus: newStatus }
          }),
        })),

      rejectStep: (id, level, approverId, approverName, note = '') =>
        set(s => ({
          onboardings: s.onboardings.map(o => {
            if (o.id !== id) return o
            const steps = o.steps.map(step =>
              step.level === level
                ? { ...step, status: 'Rejected', approverId, approverName, actedAt: new Date().toISOString(), note }
                : step
            )
            return { ...o, steps, workflowStatus: 'Rejected' }
          }),
        })),
    }),
    { name: 'hcm-onboarding-v3', storage: createJSONStorage(() => dbStorage) }
  )
)
