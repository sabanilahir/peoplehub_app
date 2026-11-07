import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _spId = 1

// ─── Succession Plan Form ─────────────────────────────────────────────────────
// Dokumen rencana suksesi untuk sebuah Projected Position (key position) dengan
// successor terpilih, promotion plan, dan action plan (preparation, development,
// career plan).

// Item Action Plan beserta pihak yang bertanggung jawab (sesuai form).
export const PREPARATION_ITEMS = [
  { key: 'entryPlan', label: 'Entry Plan', by: 'by Successor' },
  { key: 'exitPlan',  label: 'Exit Plan',  by: 'by Incumbent / Direct Superior of Incumbent' },
]
export const DEVELOPMENT_ITEMS = [
  { key: 'mentoring',       label: 'Mentoring',        by: 'by Incumbent / Direct Superior of Incumbent' },
  { key: 'education',       label: 'Education',        by: '' },
  { key: 'training',        label: 'Training',         by: '' },
  { key: 'project',         label: 'Project',          by: '' },
  { key: 'otherAssignment', label: 'Other Assignment', by: '' },
]

export const blankPlan = () => ({
  positionId: '',
  successorId: '',
  successorIndividualClass: '',
  plannedPromotionDate: '',
  reasonOfPromotion: '',
  status: 'Draft', approvedBy: '', approvedAt: '', cycle: null,
  // Action plan — tiap item { description, period }
  entryPlan:       { description: '', period: '' },
  exitPlan:        { description: '', period: '' },
  mentoring:       { description: '', period: '' },
  education:       { description: '', period: '' },
  training:        { description: '', period: '' },
  project:         { description: '', period: '' },
  otherAssignment: { description: '', period: '' },
  careerPlan:      { description: '', period: '' },
})

export const useSuccessionPlanStore = create(
  persist(
    (set) => ({
      plans: [],

      addPlan: (data) =>
        set(s => ({
          plans: [...s.plans, {
            ...blankPlan(), ...data,
            id: _spId++,
            createdAt: new Date().toISOString().split('T')[0],
          }],
        })),

      updatePlan: (id, patch) =>
        set(s => ({ plans: s.plans.map(p => p.id === id ? { ...p, ...patch } : p) })),

      removePlan: (id) =>
        set(s => ({ plans: s.plans.filter(p => p.id !== id) })),
    }),
    { name: 'hcm-succession-plan-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
