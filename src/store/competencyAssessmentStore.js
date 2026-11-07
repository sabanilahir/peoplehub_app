import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Competency assessment per employee per cycle — self + manager ratings (1-5).
export const CURRENT_PERIOD = '2026-H1'
export const ASSESSMENT_PERIODS = ['2026-H1', '2025-H2', '2025-H1']

const todayStr = () => new Date().toISOString().split('T')[0]
const key = (e, p) => `${e}:${p}`

// Derive a status label from an assessment record.
export const assessmentStatus = (a) => {
  if (!a) return 'Not Started'
  if (a.managerSubmittedAt) return 'Completed'
  if (a.selfSubmittedAt) return 'Awaiting Manager'
  if (a.selfRatings && Object.keys(a.selfRatings).length) return 'Self Draft'
  return 'Not Started'
}

const SEED = {
  ['93:2026-H1']: {
    selfRatings: { 8: 3, 6: 2, 4: 3, 5: 2 },
    selfNote: 'Saya merasa cukup kuat di software engineering, tapi problem solving masih perlu diasah.',
    selfSubmittedAt: '2026-06-20',
    managerRatings: {}, managerNote: '', managerSubmittedAt: '', managerBy: '',
  },
  // Demo employee (Budi Santoso) — final score (manager) sudah dikalibrasi.
  ['1:2026-H1']: {
    selfRatings: { 8: 4, 6: 2, 4: 3, 5: 3 },
    selfNote: 'Saya rasa komunikasi dan kolaborasi sudah cukup baik.',
    selfSubmittedAt: '2026-06-18',
    managerRatings: { 8: 3, 6: 2, 4: 3, 5: 2 },
    managerNote: 'Kompetensi teknis solid; problem solving perlu diperkuat.',
    managerSubmittedAt: '2026-06-28', managerBy: 'Dewi Rahayu',
  },
}

export const useCompetencyAssessmentStore = create(
  persist(
    (set, get) => ({
      assessments: { ...SEED },

      getAssessment: (employeeId, period = CURRENT_PERIOD) =>
        get().assessments[key(employeeId, period)] || null,

      saveSelf: (employeeId, period, { ratings, note, submit }) =>
        set(s => {
          const k = key(employeeId, period)
          const cur = s.assessments[k] || {}
          return { assessments: { ...s.assessments, [k]: {
            ...cur, selfRatings: ratings ?? cur.selfRatings ?? {}, selfNote: note ?? cur.selfNote ?? '',
            selfSubmittedAt: submit ? todayStr() : (cur.selfSubmittedAt || ''),
          } } }
        }),

      saveManager: (employeeId, period, { ratings, note, submit, by }) =>
        set(s => {
          const k = key(employeeId, period)
          const cur = s.assessments[k] || {}
          return { assessments: { ...s.assessments, [k]: {
            ...cur, managerRatings: ratings ?? cur.managerRatings ?? {}, managerNote: note ?? cur.managerNote ?? '',
            managerBy: by ?? cur.managerBy ?? '',
            managerSubmittedAt: submit ? todayStr() : (cur.managerSubmittedAt || ''),
          } } }
        }),
    }),
    { name: 'hcm-competency-assessment-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
