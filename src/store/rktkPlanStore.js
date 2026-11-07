import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Saved RKTK New Hire plans, keyed `${year}:${companyId||'all'}:${viewBy}`.
// Each plan is a map `${leafId}-${monthIndex}` → New Hire count (number).
export const useRktkPlanStore = create(
  persist(
    (set) => ({
      plans: {},
      savePlan: (key, plan) => set(s => ({ plans: { ...s.plans, [key]: plan } })),
    }),
    { name: 'kpb-rktk-plans', storage: createJSONStorage(() => dbStorage) }
  )
)
