import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const PERNYATAAN = [
  'Sebagai bagian dari Rencana Perbaikan Kinerja (PIP) ini, karyawan diharapkan untuk mencapai target kinerja yang telah ditetapkan dalam periode yang disepakati. Apabila karyawan tidak dapat memenuhi standar kinerja yang diharapkan, baik dalam hal pencapaian target, peningkatan kualitas, atau pengembangan keterampilan yang telah disepakati, maka perusahaan berhak untuk mengambil tindakan lebih lanjut sesuai dengan kebijakan perusahaan, yang dapat mencakup Pemutusan Hubungan Kerja (PHK).',
  'Atasan langsung akan melakukan evaluasi secara berkala untuk menilai kemajuan karyawan dalam mencapai tujuan yang telah ditetapkan dalam PIP. Jika, setelah periode evaluasi dan setelah diberikannya kesempatan untuk perbaikan, karyawan tetap tidak dapat memenuhi standar yang ditentukan, maka Pemutusan Hubungan Kerja (PHK) dapat diberlakukan sebagai langkah terakhir sesuai dengan peraturan dan ketentuan yang berlaku.',
  'Karyawan diharapkan memahami bahwa keputusan ini diambil dengan didasarkan pada evaluasi yang objektif, prinsip keadilan, dan kepentingan bersama untuk mendukung keberlangsungan operasional perusahaan.',
]

export { PERNYATAAN }

/* ── PIP duration helpers ─────────────────────────────────────────────────
   Duration is 1-12 months. End date is derived from start + duration, and the
   monthly KPI achievement columns + evaluation rows follow the duration. */
export const PIP_MIN_MONTHS = 1
export const PIP_MAX_MONTHS = 12
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
export const monthLabel = (i) => `Bulan ${ROMAN[i] ?? i + 1}`

const addMonths = (isoDate, n) => {
  const d = new Date(isoDate + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return d
}
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// End date = start + duration months, inclusive (minus one day).
export const pipEndDate = (start, months) => {
  if (!start || !months) return ''
  const d = addMonths(start, Number(months)); d.setDate(d.getDate() - 1)
  return toISO(d)
}
// Milestone (review) date for month index i (0-based) = end of that month segment.
export const pipMilestone = (start, i) => pipEndDate(start, i + 1)

// Build N evaluation rows (employee fills content during the ongoing PIP).
export const makeEvaluasiRows = (months, start = '') =>
  Array.from({ length: Number(months) || 0 }, (_, i) => ({
    bulan: monthLabel(i), tanggal: start ? pipMilestone(start, i) : '', sudah: '', belum: '', rencana: '',
  }))

// Resize a KPI row's per-month achievement array to N, preserving existing values.
export const resizeBulan = (arr = [], months) => {
  const n = Number(months) || 0
  const out = arr.slice(0, n)
  while (out.length < n) out.push('')
  return out
}

const SEED = []

// Status flow (ideal HR process):
// Pending HR Review → (HR approve) Pending Acknowledgement →
//   (Employee acknowledge) Active
//   (Employee dispute) Disputed → (HR resolve) Active
// Active → (Manager proposes) Pending HR Outcome → (HR sign-off) Passed / Failed
// Failed → may be forwarded to offboarding/terminate (forwardedToOffboarding).
// HR can also reject at review → Rejected by HR (manager revises & resubmits).
export const PIP_STATUS = {
  HR_REVIEW:   'Pending HR Review',
  HR_REJECTED: 'Rejected by HR',
  ACK:         'Pending Acknowledgement',
  DISPUTED:    'Disputed',
  ACTIVE:      'Active',
  HR_OUTCOME:  'Pending HR Outcome',
  PASSED:      'Passed',
  FAILED:      'Failed',
}

export const usePipStore = create(
  persist(
    (set, get) => ({
      sessions: SEED,

      submitPip: (data) => {
        const newSession = {
          id: Date.now(),
          status: PIP_STATUS.HR_REVIEW,
          submittedAt: new Date().toISOString(),
          hrReviewedAt: null,
          hrReviewerName: null,
          hrRejectNote: '',
          acknowledgedAt: null,
          employeeNote: '',
          // Employee dispute / HR mediation
          disputeNote: '',
          disputedAt: null,
          disputeResolvedAt: null,
          disputeResolvedBy: '',
          disputeResolution: '',
          // Outcome governance
          outcome: null,
          outcomeNote: '',
          outcomeProposedBy: '',
          outcomeProposedAt: null,
          outcomeConfirmedBy: '',
          closedAt: null,
          forwardedToOffboarding: false,
          appealNote: '',
          appealedAt: null,
          // Manager approval of the employee-filled monthly results.
          resultsApprovedAt: null,
          resultsApprovedBy: '',
          resultsReturnNote: '',
          // Final tripartite agreement ("Disepakati Oleh"): employee, manager, HRBP.
          signoffs: { employee: null, manager: null, hrbp: null },
          ...data,
        }
        set(s => ({ sessions: [newSession, ...s.sessions] }))
        return newSession.id
      },

      // Manager approves the employee-filled monthly results (gate before outcome).
      approveResults: (id, mgr) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, resultsApprovedAt: new Date().toISOString(), resultsApprovedBy: mgr?.name ?? 'Manager', resultsReturnNote: '' }
            : p),
        })),

      // Manager returns the results to the employee for revision.
      returnResults: (id, mgr, note) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, resultsApprovedAt: null, resultsApprovedBy: '', resultsReturnNote: note || '' }
            : p),
        })),

      // A party signs the final agreement. person = { name, position }.
      signPip: (id, party, person) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, signoffs: { ...(p.signoffs ?? { employee: null, manager: null, hrbp: null }), [party]: { name: person?.name || '', position: person?.position || '', at: new Date().toISOString() } } }
            : p),
        })),

      updatePip: (id, data) => {
        set(s => ({
          sessions: s.sessions.map(p => p.id === id ? { ...p, ...data } : p),
        }))
      },

      // Manager revises a rejected PIP and sends it back to HR.
      resubmitPip: (id) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.HR_REVIEW, submittedAt: new Date().toISOString(), hrRejectNote: '', hrReviewedAt: null, hrReviewerName: null }
            : p),
        })),

      // HR gate — must approve before the employee sees it.
      hrApprovePip: (id, hr) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.ACK, hrReviewedAt: new Date().toISOString(), hrReviewerName: hr?.name ?? 'HR', hrRejectNote: '' }
            : p),
        })),

      hrRejectPip: (id, hr, note) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.HR_REJECTED, hrReviewedAt: new Date().toISOString(), hrReviewerName: hr?.name ?? 'HR', hrRejectNote: note || '' }
            : p),
        })),

      // Employee acknowledges receipt (not necessarily agreement) → PIP active.
      acknowledgePip: (id, note) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.ACTIVE, acknowledgedAt: new Date().toISOString(), employeeNote: note || '' }
            : p),
        })),

      // Employee disputes the PIP instead of acknowledging → HR mediation.
      disputePip: (id, note) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.DISPUTED, disputedAt: new Date().toISOString(), disputeNote: note || '' }
            : p),
        })),

      // HR mediates a dispute; resolution either activates the PIP or returns it.
      resolveDispute: (id, hr, resolution, toManager = false) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? {
                ...p,
                status: toManager ? PIP_STATUS.HR_REJECTED : PIP_STATUS.ACTIVE,
                disputeResolvedAt: new Date().toISOString(),
                disputeResolvedBy: hr?.name ?? 'HR',
                disputeResolution: resolution || '',
                ...(toManager ? { hrRejectNote: resolution || '' } : { acknowledgedAt: new Date().toISOString() }),
              }
            : p),
        })),

      // Employee records their own side of a monthly evaluation row.
      addEmployeeEval: (id, rowIdx, empNote) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, evaluasiRows: (p.evaluasiRows ?? []).map((r, i) => i === rowIdx ? { ...r, employeeNote: empNote } : r) }
            : p),
        })),

      // Manager PROPOSES the final outcome — no longer terminal; HR must sign off.
      proposePipOutcome: (id, outcome, note, mgr) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.HR_OUTCOME, outcome, outcomeNote: note || '', outcomeProposedBy: mgr?.name ?? 'Manager', outcomeProposedAt: new Date().toISOString() }
            : p),
        })),

      // HR signs off on the proposed outcome (terminal). Failed may be forwarded.
      confirmPipOutcome: (id, hr, forwardToOffboarding = false) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? {
                ...p,
                status: p.outcome === 'Passed' ? PIP_STATUS.PASSED : PIP_STATUS.FAILED,
                outcomeConfirmedBy: hr?.name ?? 'HR',
                closedAt: new Date().toISOString(),
                forwardedToOffboarding: p.outcome === 'Failed' ? forwardToOffboarding : false,
              }
            : p),
        })),

      // HR rejects the proposed outcome and sends it back to Active for more evidence.
      revertPipOutcome: (id, hr, note) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, status: PIP_STATUS.ACTIVE, outcome: null, outcomeNote: '', outcomeProposedBy: '', outcomeProposedAt: null, hrRejectNote: note || '', hrReviewerName: hr?.name ?? 'HR' }
            : p),
        })),

      // Employee appeals a Failed outcome.
      appealPip: (id, note) =>
        set(s => ({
          sessions: s.sessions.map(p => p.id === id
            ? { ...p, appealNote: note || '', appealedAt: new Date().toISOString() }
            : p),
        })),

      getByEmployee: (employeeId) =>
        get().sessions.filter(p => p.employeeId === employeeId),

      getByManager: (managerId) =>
        get().sessions.filter(p => p.managerId === managerId),
    }),
    {
      name: 'pip-store-v8',
      storage: createJSONStorage(() => dbStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.sessions = []
      },
    }
  )
)
