import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Generic List-of-Values master data: categories of selectable items used
// across forms (starting with variable allowance names on the employee
// Salary tab). New categories can be added from the Master Lookup page
// without touching code.
const SEED_CATEGORIES = [
  {
    key: 'variable-allowance',
    label: 'Tunjangan Variable',
    description: 'Pilihan nama tunjangan variable di form gaji karyawan (tab Salary).',
    items: [
      { id: 1, label: 'Uang Makan',           active: true },
      { id: 2, label: 'Uang Transport',       active: true },
      { id: 3, label: 'Insentif',             active: true },
      { id: 4, label: 'Tunjangan Komunikasi', active: true },
      { id: 5, label: 'Lembur Tambahan',      active: true },
    ],
  },
]

let _catId  = SEED_CATEGORIES.length + 1
let _itemId = Math.max(...SEED_CATEGORIES.flatMap(c => c.items.map(i => i.id))) + 1

export const useMasterLookupStore = create(persist(
  (set, get) => ({
    categories: SEED_CATEGORIES.map(c => ({ ...c, items: c.items.map(i => ({ ...i })) })),

    getCategory: (key) => get().categories.find(c => c.key === key),
    getActiveItems: (key) => (get().categories.find(c => c.key === key)?.items || []).filter(i => i.active),

    addCategory: (label) => set((s) => ({
      categories: [...s.categories, {
        key: `custom-${_catId++}`, label, description: '', items: [],
      }],
    })),

    removeCategory: (key) => set((s) => ({ categories: s.categories.filter(c => c.key !== key) })),

    addItem: (key, label) => set((s) => ({
      categories: s.categories.map(c => c.key === key
        ? { ...c, items: [...c.items, { id: _itemId++, label, active: true }] }
        : c),
    })),

    updateItem: (key, itemId, patch) => set((s) => ({
      categories: s.categories.map(c => c.key === key
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
        : c),
    })),

    removeItem: (key, itemId) => set((s) => ({
      categories: s.categories.map(c => c.key === key
        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
        : c),
    })),
  }),
  { name: 'hcm-master-lookup-v1', storage: createJSONStorage(() => dbStorage) }
))
