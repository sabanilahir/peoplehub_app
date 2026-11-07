import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const SEED = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Budi Santoso',
    managerId: 2,
    managerName: 'Ahmad Fauzi',
    name: 'OKR Q2 2025',
    date: '2025-06-10',
    submittedAt: '2025-06-10T09:00:00+07:00',
    status: 'Active',
    managerApprovedAt: '2025-06-11T09:00:00+07:00',
    managerApprovedBy: 'Ahmad Fauzi',
    finalScore: null,
    ratingNote: '',
    ratedAt: null,
    topics: [
      {
        id: 1,
        title: 'Penyelesaian Modul Laporan Keuangan Q2',
        description: 'Menyelesaikan pengembangan modul laporan keuangan termasuk integrasi dengan sistem ERP perusahaan.',
        goalPlan: 'Goal Plan for Self-Input Goal 2025',
        weight: 60,
        status: 'In Progress',
        checkInNotes: 'Progress 80%, tinggal testing dan UAT yang dijadwalkan minggu depan.',
      },
      {
        id: 2,
        title: 'Peningkatan Skill Leadership',
        description: 'Mengikuti program Leadership Fundamentals L1 dan menerapkannya dalam koordinasi tim sehari-hari.',
        goalPlan: 'Goal Plan for Self-Input Goal 2025',
        weight: 40,
        status: 'In Progress',
        checkInNotes: 'Sudah menyelesaikan modul 1 dan 2. Lanjut modul 3 bulan depan.',
      },
    ],
  },
]

// Goal lifecycle (manager & employee only — NO HR gate):
// Employee OR manager drafts goals → Pending Manager (manager approves goals &
// weights, or returns) → Active (period runs). At period end the employee
// self-assesses → In Review, the manager rates (weighted) → Pending Employee Ack
// → the employee acknowledges (or objects) → Closed. Goals may be Cancelled.
export const VIP_STATUS = {
  PENDING:     'Pending Manager',
  RETURNED:    'Returned',
  ACTIVE:      'Active',
  IN_REVIEW:   'In Review',
  PENDING_ACK: 'Pending Employee Ack',
  CLOSED:      'Closed',
  CANCELLED:   'Cancelled',
}

// Compute a weighted final score from per-topic scores (0-100) and weights.
export const computeWeightedScore = (topics = []) => {
  const totalW = topics.reduce((s, tp) => s + (Number(tp.weight) || 0), 0)
  if (!totalW) return null
  const sum = topics.reduce((s, tp) => s + (Number(tp.weight) || 0) * (Number(tp.score) || 0), 0)
  return Math.round((sum / totalW) * 10) / 10
}

export const useVipStore = create(
  persist(
    (set, get) => ({
      sessions: SEED,

      submitVip: (data) => {
        const newSession = {
          id: Date.now(),
          submittedAt: new Date().toISOString(),
          status: VIP_STATUS.PENDING,
          createdBy: 'employee',
          managerApprovedAt: null,
          managerApprovedBy: null,
          hrValidatedAt: null,
          hrValidatedBy: null,
          selfScore: null,
          selfNote: '',
          selfAssessedAt: null,
          finalScore: null,
          ratingNote: '',
          ratedAt: null,
          ratedBy: null,
          ackAt: null,
          ackNote: '',
          objected: false,
          cancelledAt: null,
          cancelReason: '',
          ...data,
        }
        set(s => ({ sessions: [newSession, ...s.sessions] }))
        return newSession.id
      },

      // Manager cascades top-down goals to an employee (author = manager, so the
      // period runs immediately — no separate approval needed).
      submitVipByManager: (data) => {
        const newSession = {
          id: Date.now(),
          submittedAt: new Date().toISOString(),
          status: VIP_STATUS.ACTIVE,
          createdBy: 'manager',
          managerApprovedAt: new Date().toISOString(),
          managerApprovedBy: data.managerName ?? 'Manager',
          selfScore: null,
          selfNote: '',
          selfAssessedAt: null,
          finalScore: null,
          ratingNote: '',
          ratedAt: null,
          ratedBy: null,
          ackAt: null,
          ackNote: '',
          objected: false,
          cancelledAt: null,
          cancelReason: '',
          ...data,
        }
        set(s => ({ sessions: [newSession, ...s.sessions] }))
        return newSession.id
      },

      // Manager approves the goals & weights → period runs immediately.
      approveVip: (id, mgr) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, status: VIP_STATUS.ACTIVE, managerApprovedAt: new Date().toISOString(), managerApprovedBy: mgr?.name ?? 'Manager' }
            : v),
        })),

      // Employee updates progress / check-in notes on a topic while Active.
      updateTopicProgress: (id, topicId, patch) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, topics: (v.topics ?? []).map(tp => tp.id === topicId ? { ...tp, ...patch } : tp) }
            : v),
        })),

      // Employee self-assessment at period end → In Review (manager rates next).
      submitSelfAssessment: (id, selfScore, selfNote) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, status: VIP_STATUS.IN_REVIEW, selfScore, selfNote: selfNote || '', selfAssessedAt: new Date().toISOString() }
            : v),
        })),

      // Employee acknowledges (or objects to) the final rating → Closed.
      acknowledgeRating: (id, note, objected = false) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, status: VIP_STATUS.CLOSED, ackAt: new Date().toISOString(), ackNote: note || '', objected }
            : v),
        })),

      // Cancel a goal mid-period (e.g. business change).
      cancelVip: (id, reason) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, status: VIP_STATUS.CANCELLED, cancelledAt: new Date().toISOString(), cancelReason: reason || '' }
            : v),
        })),

      // Manager returns the goals to the employee for revision.
      returnVip: (id, mgr, note) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, status: VIP_STATUS.RETURNED, returnNote: note || '', returnedBy: mgr?.name ?? 'Manager', returnedAt: new Date().toISOString() }
            : v),
        })),

      // Employee revises the goals and sends them back to the manager.
      resubmitVip: (id, patch) =>
        set(s => ({
          sessions: s.sessions.map(v => v.id === id
            ? { ...v, ...patch, status: VIP_STATUS.PENDING, submittedAt: new Date().toISOString(), returnNote: '', returnedBy: null, returnedAt: null }
            : v),
        })),

      // Manager rates achievement at period end → awaits employee acknowledgement.
      // `topicScores` maps topicId → score (0-100); finalScore is weighted.
      rateVip: (id, topicScores, note, mgr) =>
        set(s => ({
          sessions: s.sessions.map(v => {
            if (v.id !== id) return v
            const topics = (v.topics ?? []).map(tp => ({ ...tp, score: Number(topicScores?.[tp.id] ?? tp.score ?? 0) }))
            return {
              ...v,
              topics,
              status: VIP_STATUS.PENDING_ACK,
              finalScore: computeWeightedScore(topics),
              ratingNote: note || '',
              ratedAt: new Date().toISOString(),
              ratedBy: mgr?.name ?? 'Manager',
            }
          }),
        })),

      getByEmployee: (employeeId) =>
        get().sessions.filter(s => s.employeeId === employeeId),

      getByManager: (managerId) =>
        get().sessions.filter(s => s.managerId === managerId),
    }),
    { name: 'vip-store-v5', storage: createJSONStorage(() => dbStorage) }
  )
)
