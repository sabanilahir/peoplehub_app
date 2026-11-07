import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ─── Talent Review Cycle & Governance ─────────────────────────────────────────
// Siklus review talent (tahunan) dan status dokumen untuk governance.

export const currentYear = new Date().getFullYear()

// Status dokumen (TRM, Succession Plan) untuk workflow persetujuan.
export const DOC_STATUS = ['Draft', 'In Review', 'Approved']
export const STATUS_TONE = { Draft: 'neutral', 'In Review': 'warning', Approved: 'success' }
export const nextStatus = (s) => {
  const i = DOC_STATUS.indexOf(s)
  return i < 0 ? 'In Review' : DOC_STATUS[Math.min(i + 1, DOC_STATUS.length - 1)]
}

export const useTalentCycleStore = create(
  persist(
    (set) => ({
      activeCycle: currentYear,
      setActiveCycle: (year) => set({ activeCycle: Number(year) }),
    }),
    { name: 'hcm-talent-cycle-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
