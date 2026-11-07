import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Saved Adjustment Planning worksheets, keyed `${year}:${companyId||'all'}`.
// Each plan is a map `${employeeId}-${monthIndex}` → { adjust, pc, ic }.
export const useAdjustmentPlanStore = create(
  persist(
    (set) => ({
      plans: {},
      savePlan: (key, plan) => set(s => ({ plans: { ...s.plans, [key]: plan } })),
    }),
    { name: 'kpb-adjustment-plans', storage: createJSONStorage(() => dbStorage) }
  )
)
