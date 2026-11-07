import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// A candidate's assignment/attempt at a psychotest, reached via a public
// token link (/psychotest/<token>, outside (protected) — no login needed,
// same pattern as the /careers job board). One attempt per assignment;
// once Completed it can't be retaken.

let _id = 1

const genToken = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

export const usePsychotestAttemptStore = create(persist(
  (set, get) => ({
    // { id, token, candidateId, candidateName, testId, testName,
    //   status: 'Assigned' | 'In Progress' | 'Completed',
    //   assignedAt, assignedBy, assignedByName, startedAt, completedAt,
    //   answers: { [questionId]: optionId (Pilihan Ganda) | 1-5 (Skala Likert) },
    //   score, maxScore }
    attempts: [],

    assign: (a) => {
      const id = _id++
      const token = genToken()
      set(s => ({
        attempts: [{ id, token, status: 'Assigned', answers: {}, score: 0, maxScore: 0, ...a }, ...s.attempts],
      }))
      return { id, token }
    },
    updateAttempt: (id, patch) => set(s => ({
      attempts: s.attempts.map(a => a.id === id ? { ...a, ...patch } : a),
    })),
    deleteAttempt: (id) => set(s => ({ attempts: s.attempts.filter(a => a.id !== id) })),
  }),
  {
    name: 'hcm-psychotest-attempts-v1',
    storage: createJSONStorage(() => dbStorage),
    onRehydrateStorage: () => (state) => {
      if (state?.attempts?.length) _id = Math.max(0, ...state.attempts.map(a => a.id)) + 1
    },
  },
))
