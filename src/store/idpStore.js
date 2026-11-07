import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _cid = 1
const cid = () => `c${_cid++}`

// ─── Individual Development Plan (IDP) ─────────────────────────────────────────
// IDP disusun per-kompetensi. Tiap kompetensi membutuhkan rencana pengembangan
// pada 5 metode: Mentoring, Education, Training, Project, Other Assignment.
// Alur: karyawan submit → atasan approve / return (+ edit).

export const IDP_METHODS = ['Mentoring', 'Education', 'Training', 'Project', 'Other Assignment']
export const LMS_METHODS = ['Training', 'Education']
export const ITEM_STATUS = ['Planned', 'In Progress', 'Done']

// Pilihan IDP (metode pengembangan) yang bisa dipilih karyawan per kompetensi.
export const IDP_OPTIONS = [
  { value: 'CTD Catalog Course', label: 'CTD Catalog Course', icon: 'book' },
  { value: 'Project',           label: 'Project',            icon: 'briefcase' },
  { value: 'Training',          label: 'Training',           icon: 'graduation' },
  { value: 'Assignment',        label: 'Assignment',         icon: 'clipboard' },
  { value: 'Mentoring',         label: 'Mentoring',          icon: 'handshake' },
  { value: 'Coaching',          label: 'Coaching',           icon: 'target' },
]

export const idpOption = (value) => IDP_OPTIONS.find(o => o.value === value)

// Jenis pelaksanaan training.
export const TRAINING_DELIVERY = ['Online', 'Offline', 'Hybrid']

// Katalog course CTD (dummy) untuk tipe IDP "CTD Catalog Course".
export const CTD_COURSES = [
  { id: 'ctd1', name: 'Effective Communication',        category: 'Communication',        description: 'Meningkatkan kemampuan komunikasi yang efektif di tempat kerja.', openPeriod: '15 Jul – 30 Jul 2026', execDate: '15 Aug – 16 Aug 2026', duration: '16 Hours' },
  { id: 'ctd2', name: 'Problem Solving & Decision Making', category: 'Leadership',         description: 'Mengasah kemampuan analisis dan pengambilan keputusan yang tepat.',  openPeriod: '20 Jul – 05 Aug 2026', execDate: '19 Aug – 20 Aug 2026', duration: '16 Hours' },
  { id: 'ctd3', name: 'Time Management',                 category: 'Personal Effectiveness', description: 'Mengelola waktu secara efektif untuk meningkatkan produktivitas.', openPeriod: '01 Aug – 15 Aug 2026', execDate: '28 Aug 2026',          duration: '8 Hours'  },
]

export const IDP_STATUS = ['Draft', 'Submitted', 'Approved', 'Returned']
export const IDP_STATUS_TONE = { Draft:'neutral', Submitted:'warning', Approved:'success', Returned:'danger' }

// Kesenjangan (gap) kompetensi dari sudut pandang self-assessment:
// actual − required. Negatif = di bawah target (perlu pengembangan).
export const idpGap = (required, actual) => (Number(actual) || 0) - (Number(required) || 0)

// Label status dari nilai gap.
export const IDP_COMPETENCY_STATUS = {
  need:    { label: 'Needs Development',  tone: 'danger'  },
  meet:    { label: 'Meets Expectation',  tone: 'success' },
  exceed:  { label: 'Exceeds Expectation', tone: 'success' },
}
export const idpCompetencyStatus = (gap) =>
  gap < 0 ? IDP_COMPETENCY_STATUS.need : gap > 0 ? IDP_COMPETENCY_STATUS.exceed : IDP_COMPETENCY_STATUS.meet

export const blankItem = () => ({ description: '', timeline: '', status: 'Planned' })

export const blankCompetency = () => ({
  id: cid(),
  name: '', current: '', expected: '',
  category: '', description: '', idp: '', detail: {},
  items: IDP_METHODS.reduce((o, m) => { o[m] = blankItem(); return o }, {}),
})

export const competencyGap = (c) => {
  const cur = Number(c.current), exp = Number(c.expected)
  if (!cur && !exp) return null
  return (exp || 0) - (cur || 0)
}

export const blankIdp = () => ({
  cycle: null,
  status: 'Draft',
  employeeName: '', position: '', department: '',
  competencies: [],
  learningAspiration: '',   // Aspirasi Belajar
  careerAspiration: '',     // Aspirasi Karir
  submittedBy: '', submittedAt: '',
  approvedBy: '', approvedAt: '',
  managerNote: '',
})

export const useIdpStore = create(
  persist(
    (set) => ({
      // Map: { [employeeId]: IdpRecord }
      records: {},

      saveRecord: (employeeId, data) =>
        set(s => ({
          records: {
            ...s.records,
            [employeeId]: {
              ...(s.records[employeeId] || blankIdp()),
              ...data,
              updatedAt: new Date().toISOString().split('T')[0],
            },
          },
        })),

      removeRecord: (employeeId) =>
        set(s => {
          const next = { ...s.records }
          delete next[employeeId]
          return { records: next }
        }),
    }),
    { name: 'hcm-idp-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
