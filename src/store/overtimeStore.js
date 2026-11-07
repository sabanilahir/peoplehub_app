import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// An Eligibility Group bundles three things for one overtime policy:
//  1. Parameter — who it applies to (Company/Grade range/Department/Location/Type)
//  2. Flow — the process steps, with an approval step inserted per stage
//     unless that stage is set to auto-approve
//  3. Compensation — paid out as Overtime Allowance (via an Overtime Matrix
//     rate table) or as Compensatory Leave
const SEED_GROUPS = [
  {
    id: 1, name: 'Staff & Senior Staff — Semua PT', active: true,
    companyIds: [], departmentIds: [], gradeFromId: 40, gradeToId: 52, location: '', employmentType: '',
    autoApprovePlan: false, autoApproveRealization: false,
    compensationType: 'Overtime Allowance', matrixId: 1,
    notes: '',
  },
]

const SEED_MATRICES = [
  {
    id: 1, name: 'Matrix Standar — Hari Kerja', active: true,
    tiers: [
      { id: 1, hourFrom: 1, hourTo: 1, rate: 50000 },
      { id: 2, hourFrom: 2, hourTo: null, rate: 75000 },
    ],
    restMinutes: 30,
    roundingToleranceMinutes: 45,
    notes: 'Jam ke-1 dibayar 50.000/jam, jam ke-2 dan seterusnya 75.000/jam. Istirahat 30 menit dikurangi dari durasi lembur.',
  },
]

let _groupId  = SEED_GROUPS.length + 1
let _matrixId = SEED_MATRICES.length + 1
let _tierId   = SEED_MATRICES.reduce((m, x) => Math.max(m, ...x.tiers.map(t => t.id)), 0) + 1

export const useOvertimeStore = create(persist(
  (set) => ({
    eligibilityGroups: SEED_GROUPS.map(x => ({ ...x })),
    overtimeMatrices:  SEED_MATRICES.map(x => ({ ...x, tiers: x.tiers.map(t => ({ ...t })) })),

    addGroup:    (d)    => set(s => ({ eligibilityGroups: [...s.eligibilityGroups, { id: _groupId++, ...d }] })),
    updateGroup: (id,d) => set(s => ({ eligibilityGroups: s.eligibilityGroups.map(x => x.id === id ? { ...x, ...d } : x) })),
    deleteGroup: (id)   => set(s => ({ eligibilityGroups: s.eligibilityGroups.filter(x => x.id !== id) })),

    addMatrix:    (d)    => set(s => ({ overtimeMatrices: [...s.overtimeMatrices, { id: _matrixId++, ...d }] })),
    updateMatrix: (id,d) => set(s => ({ overtimeMatrices: s.overtimeMatrices.map(x => x.id === id ? { ...x, ...d } : x) })),
    deleteMatrix: (id)   => set(s => ({ overtimeMatrices: s.overtimeMatrices.filter(x => x.id !== id) })),
    nextTierId:   () => _tierId++,
  }),
  { name: 'hcm-overtime-policy-v1', storage: createJSONStorage(() => dbStorage) }
))
