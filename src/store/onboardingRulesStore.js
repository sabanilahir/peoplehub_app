import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _nextId = 1

export const useOnboardingRulesStore = create(
  persist(
    (set) => ({
      rules: [],

      addRule: (data) =>
        set(s => ({ rules: [...s.rules, { ...data, id: _nextId++, createdAt: new Date().toISOString() }] })),

      updateRule: (id, patch) =>
        set(s => ({ rules: s.rules.map(r => r.id === id ? { ...r, ...patch } : r) })),

      deleteRule: (id) =>
        set(s => ({ rules: s.rules.filter(r => r.id !== id) })),
    }),
    { name: 'hcm-onboarding-rules-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
