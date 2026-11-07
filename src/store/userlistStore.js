import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const SEED = [
  {
    id: 1, name: 'Direct Managers',   type: 'role',
    roles: ['manager'], positionIds: [], employeeIds: [], sql: '',
  },
  {
    id: 2, name: 'HR Team',           type: 'role',
    roles: ['hr'], positionIds: [], employeeIds: [], sql: '',
  },
  {
    id: 3, name: 'Finance Approvers', type: 'position',
    roles: [], positionIds: [], employeeIds: [], sql: '',
  },
]

let _id = SEED.length + 1

export const useUserlistStore = create(
  persist(
    (set, get) => ({
      userlists: SEED.map(x => ({ ...x })),

      addUserlist:    (d)    => set(s => ({ userlists: [...s.userlists, { id: _id++, ...d }] })),
      updateUserlist: (id, d) => set(s => ({ userlists: s.userlists.map(u => u.id === id ? { ...u, ...d } : u) })),
      deleteUserlist: (id)   => set(s => ({ userlists: s.userlists.filter(u => u.id !== id) })),
    }),
    { name: 'hcm-userlists', storage: createJSONStorage(() => dbStorage) }
  )
)
