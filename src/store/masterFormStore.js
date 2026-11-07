import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _nextId = 10

export const useMasterFormStore = create(
  persist(
    (set) => ({
      forms: [],

      addForm: (data) =>
        set(s => ({
          forms: [...s.forms, {
            active: true,
            createdAt: new Date().toISOString(),
            ...data,
            id: _nextId++,
          }],
        })),

      updateForm: (id, patch) =>
        set(s => ({
          forms: s.forms.map(f => f.id === id ? { ...f, ...patch } : f),
        })),

      deleteForm: (id) =>
        set(s => ({ forms: s.forms.filter(f => f.id !== id) })),
    }),
    { name: 'hcm-master-forms-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
