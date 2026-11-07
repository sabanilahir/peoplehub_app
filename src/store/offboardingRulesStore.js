import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ── Offboarding auto-assign rules ─────────────────────────────────────────────
// A rule maps an employee-matching `criteria` set to the offboarding checklist
// `templateId` that should be distributed automatically when their resignation
// is approved. This removes the manual "pick a template & distribute" step while
// still giving each employee the template that fits their situation.
//
// rule: { id, name, active, criteria: { employmentTypes[], departmentIds[], positionIds[] }, templateId }
//
// Matching mirrors the onboarding auto-assign engine (onboardingAutoAssign.js):
// the first active rule (in list order = priority) whose criteria all match wins.
// When no rule matches, nothing is assigned — the employee's checklist stays
// empty and HR distributes a template manually. Empty criteria arrays mean "any".

let _nextId = 100

// Seed rules pair the two seeded templates (see offboardingTemplateStore):
//   1 = Standar Offboarding (karyawan tetap)
//   2 = Offboarding Ringkas (kontrak / masa percobaan / magang)
const SEED_RULES = [
  { id: 1, name: 'Karyawan Tetap → Standar Offboarding', active: true, templateId: 1,
    criteria: { employmentTypes: ['Permanent'], departmentIds: [], positionIds: [] } },
  { id: 2, name: 'Kontrak / Probation / Magang → Offboarding Ringkas', active: true, templateId: 2,
    criteria: { employmentTypes: ['Contract', 'Probation', 'Internship'], departmentIds: [], positionIds: [] } },
]

export const useOffboardingRulesStore = create(
  persist(
    (set) => ({
      rules: SEED_RULES.map(r => ({ ...r, criteria: { ...r.criteria } })),

      addRule: (data) =>
        set(s => ({ rules: [...s.rules, { active: true, criteria: {}, templateId: null, ...data, id: _nextId++ }] })),

      updateRule: (id, patch) =>
        set(s => ({ rules: s.rules.map(r => String(r.id) === String(id) ? { ...r, ...patch } : r) })),

      deleteRule: (id) =>
        set(s => ({ rules: s.rules.filter(r => String(r.id) !== String(id)) })),
    }),
    { name: 'hcm-offboarding-rules-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
