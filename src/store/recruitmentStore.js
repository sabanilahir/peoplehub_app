import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Recruitment / ATS: Job Requisition -> Candidate (attached to a requisition,
// moves through STAGES) -> Interview (attached to a candidate). Candidate
// Database is just the full candidate list with no requisition filter, so it
// has no store surface of its own.

// 'Posted External' is what actually publishes a requisition to the public
// Career Site (/careers) — being merely 'Open' keeps it internal-only.
export const REQ_STATUSES = ['Open', 'Posted External', 'On Hold', 'Closed']
export const REQ_PRIORITIES = ['Low', 'Medium', 'High']
export const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Internship']

// Ordered — pipeline columns and "next stage" both walk this array in order.
export const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Pending Employee', 'Rejected']
// Rejected is reachable from anywhere but never a "next" stage to walk into.
export const ACTIVE_STAGES = STAGES.filter(s => s !== 'Rejected')

export const CANDIDATE_SOURCES = ['Job Portal', 'LinkedIn', 'Referral', 'Career Site', 'Walk-in', 'Agency']

export const INTERVIEW_TYPES = ['Phone', 'Video', 'Onsite']
export const INTERVIEW_RESULTS = ['Scheduled', 'Passed', 'Failed', 'No Show']

const SEED_REQUISITIONS = [
  { id: 1, positionTitle: 'Software Engineer', departmentId: 1, companyId: 1, employmentType: 'Permanent',
    headcount: 3, status: 'Posted External', priority: 'High',
    requestedBy: 2, requestedByName: 'Dewi Rahayu', requestedDate: '2026-06-01', targetDate: '2026-09-30',
    publishStartDate: '2026-06-05', publishEndDate: '2026-09-30',
    notes: 'Ekspansi tim backend untuk proyek Q3.' },
  { id: 2, positionTitle: 'IT Support', departmentId: 3, companyId: 1, employmentType: 'Contract',
    headcount: 1, status: 'Open', priority: 'Medium',
    requestedBy: 4, requestedByName: 'Ahmad Fauzi', requestedDate: '2026-07-01', targetDate: '2026-08-15',
    publishStartDate: '', publishEndDate: '',
    notes: '' },
  { id: 3, positionTitle: 'Finance Analyst', departmentId: 4, companyId: 1, employmentType: 'Permanent',
    headcount: 1, status: 'On Hold', priority: 'Low',
    requestedBy: 4, requestedByName: 'Ahmad Fauzi', requestedDate: '2026-05-10', targetDate: '2026-10-01',
    publishStartDate: '', publishEndDate: '',
    notes: 'Menunggu persetujuan budget.' },
  { id: 4, positionTitle: 'HR Officer', departmentId: 5, companyId: 1, employmentType: 'Permanent',
    headcount: 1, status: 'Closed', priority: 'Medium',
    requestedBy: 3, requestedByName: 'Rina Marlina', requestedDate: '2026-03-01', targetDate: '2026-04-30',
    publishStartDate: '', publishEndDate: '',
    notes: 'Posisi terisi.' },
]

const SEED_CANDIDATES = [
  { id: 1, name: 'Putri Ayu Lestari', email: 'putri.ayu@testing.com', phone: '0812-3456-7801',
    requisitionId: 1, source: 'LinkedIn', appliedDate: '2026-07-10', stage: 'Interview', rating: 4, notes: 'Portfolio kuat di React.' },
  { id: 2, name: 'Bimo Aditya', email: 'bimo.aditya@testing.com', phone: '0812-3456-7802',
    requisitionId: 1, source: 'Job Portal', appliedDate: '2026-07-12', stage: 'Screening', rating: 3, notes: '' },
  { id: 3, name: 'Citra Wulandari', email: 'citra.w@testing.com', phone: '0812-3456-7803',
    requisitionId: 1, source: 'Referral', appliedDate: '2026-07-15', stage: 'Applied', rating: 0, notes: 'Referensi dari Reza Firmansyah.' },
  { id: 4, name: 'Doni Firmansyah', email: 'doni.f@testing.com', phone: '0812-3456-7804',
    requisitionId: 1, source: 'Job Portal', appliedDate: '2026-06-20', stage: 'Offer', rating: 5, notes: 'Kandidat terkuat, negosiasi gaji.' },
  { id: 5, name: 'Eka Prasetyo', email: 'eka.p@testing.com', phone: '0812-3456-7805',
    requisitionId: 2, source: 'Walk-in', appliedDate: '2026-07-05', stage: 'Interview', rating: 3, notes: '' },
  { id: 6, name: 'Fitri Handayani', email: 'fitri.h@testing.com', phone: '0812-3456-7806',
    requisitionId: 3, source: 'Job Portal', appliedDate: '2026-05-20', stage: 'Rejected', rating: 2, notes: 'Pengalaman kurang sesuai.' },
  { id: 7, name: 'Galih Nugroho', email: 'galih.n@testing.com', phone: '0812-3456-7807',
    requisitionId: 4, source: 'Career Site', appliedDate: '2026-03-15', stage: 'Pending Employee', rating: 5, notes: 'Onboarding 1 Mei 2026.' },
]

const SEED_INTERVIEWS = [
  { id: 1, candidateId: 1, requisitionId: 1, date: '2026-08-05', time: '10:00', type: 'Video',
    interviewerNames: 'Dewi Rahayu, Rizky Pratama', location: 'meet.google.com/abc-defg', result: 'Scheduled', notes: '' },
  { id: 2, candidateId: 4, requisitionId: 1, date: '2026-07-28', time: '14:00', type: 'Onsite',
    interviewerNames: 'Dewi Rahayu', location: 'Kantor Pusat - Lt 5', result: 'Passed', notes: 'Sangat komunikatif, siap masuk 2 minggu.' },
  { id: 3, candidateId: 5, requisitionId: 2, date: '2026-08-01', time: '09:30', type: 'Phone',
    interviewerNames: 'Ahmad Fauzi', location: '-', result: 'Scheduled', notes: '' },
]

const todayStr = () => new Date().toISOString().slice(0, 10)

// Live on the public Career Site right now: status is 'Posted External' AND
// today falls inside the publish window (an empty bound means open-ended).
export function isPublished(req, on = todayStr()) {
  if (req.status !== 'Posted External') return false
  if (req.publishStartDate && req.publishStartDate > on) return false
  if (req.publishEndDate && req.publishEndDate < on) return false
  return true
}

// For the admin list: distinguishes "not yet" and "expired" from "live",
// same idea as Announcement's status — a requisition marked Posted External
// that isn't actually showing should say why.
export function publishStatus(req, on = todayStr()) {
  if (req.status !== 'Posted External') return null
  if (req.publishStartDate && req.publishStartDate > on) return 'Terjadwal'
  if (req.publishEndDate && req.publishEndDate < on) return 'Kedaluwarsa'
  return 'Live'
}

let _reqId = SEED_REQUISITIONS.length + 1
let _candId = SEED_CANDIDATES.length + 1
let _ivId = SEED_INTERVIEWS.length + 1

export const useRecruitmentStore = create(persist(
  (set, get) => ({
    requisitions: SEED_REQUISITIONS.map(r => ({ ...r })),
    candidates: SEED_CANDIDATES.map(c => ({ ...c })),
    interviews: SEED_INTERVIEWS.map(i => ({ ...i })),

    addRequisition: (r) => set(s => ({ requisitions: [...s.requisitions, { id: _reqId++, ...r }] })),
    updateRequisition: (id, patch) => set(s => ({
      requisitions: s.requisitions.map(r => (r.id === id ? { ...r, ...patch } : r)),
    })),
    deleteRequisition: (id) => set(s => ({ requisitions: s.requisitions.filter(r => r.id !== id) })),

    addCandidate: (c) => {
      const id = _candId++
      set(s => ({
        candidates: [...s.candidates, { id, stage: 'Applied', rating: 0, notes: '', ...c }],
      }))
      return id
    },
    updateCandidate: (id, patch) => set(s => ({
      candidates: s.candidates.map(c => (c.id === id ? { ...c, ...patch } : c)),
    })),
    deleteCandidate: (id) => set(s => ({ candidates: s.candidates.filter(c => c.id !== id) })),

    addInterview: (i) => set(s => ({
      interviews: [...s.interviews, { id: _ivId++, result: 'Scheduled', notes: '', ...i }],
    })),
    updateInterview: (id, patch) => set(s => ({
      interviews: s.interviews.map(i => (i.id === id ? { ...i, ...patch } : i)),
    })),
    deleteInterview: (id) => set(s => ({ interviews: s.interviews.filter(i => i.id !== id) })),
  }),
  { name: 'hcm-recruitment-v1', storage: createJSONStorage(() => dbStorage) },
))

// ─── One-time migration: 'Hired' → 'Pending Employee' ─────────────────────
// The stage was renamed after candidates.json was already persisted to the
// DB for existing installs — hydration would otherwise keep serving the old
// string forever, silently dropping those candidates from every pipeline
// column (STAGES no longer contains 'Hired').
if (typeof window !== 'undefined') {
  const migrateHiredStage = () => {
    const s = useRecruitmentStore.getState()
    if (s.candidates.some(c => c.stage === 'Hired')) {
      useRecruitmentStore.setState({
        candidates: s.candidates.map(c => (c.stage === 'Hired' ? { ...c, stage: 'Pending Employee' } : c)),
      })
    }
  }
  if (useRecruitmentStore.persist.hasHydrated()) migrateHiredStage()
  else useRecruitmentStore.persist.onFinishHydration(migrateHiredStage)

  // _reqId/_candId/_ivId are plain module-level counters with no awareness
  // of already-persisted data — left alone they restart at the seed's own
  // length on every fresh page load, so two independent sessions can both
  // mint id 5 for a brand-new requisition. Both then coexist in the shared
  // DB array under the same id, which breaks React's list key uniqueness
  // (duplicate/omitted rows) and silently drops requisitions off the public
  // Career Site. Bootstrap each counter past the real max once hydrated.
  const bumpIdCounters = () => {
    const s = useRecruitmentStore.getState()
    const maxReqId = s.requisitions.reduce((m, r) => Math.max(m, r.id), 0)
    if (maxReqId >= _reqId) _reqId = maxReqId + 1
    const maxCandId = s.candidates.reduce((m, c) => Math.max(m, c.id), 0)
    if (maxCandId >= _candId) _candId = maxCandId + 1
    const maxIvId = s.interviews.reduce((m, i) => Math.max(m, i.id), 0)
    if (maxIvId >= _ivId) _ivId = maxIvId + 1
  }
  if (useRecruitmentStore.persist.hasHydrated()) bumpIdCounters()
  else useRecruitmentStore.persist.onFinishHydration(bumpIdCounters)
}
