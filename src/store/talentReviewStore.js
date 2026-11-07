import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'
import { PLACEMENTS } from '@/store/talentSeed'

// ─── Talent Review (9-Box Calibration) ────────────────────────────────────────
// Grid: baris = Performance (High=3 … Low=1), kolom = Potential (Low=1 … High=3).
// Tiap sel punya "box score" 1–9. Box 1–3 = talent teratas → otomatis masuk
// successor pool (opsi successor pada Successor Readiness Assessment).

// Penomoran box mengikuti matriks talent resmi (baris=Performance, kolom=Potential):
//            Kinerja Rendah  Sedang  Tinggi
//  Pot Tinggi      6           3        1
//  Pot Sedang      8           5        2
//  Pot Rendah      9           7        4
export const BOX_META = {
  '3-3': { score: 1, label: 'Star',              cell: 'bg-emerald-500 text-white' },
  '3-2': { score: 2, label: 'High Performer',    cell: 'bg-green-500 text-white'   },
  '2-3': { score: 3, label: 'High Potential',    cell: 'bg-teal-500 text-white'    },
  '3-1': { score: 4, label: 'Trusted Expert',    cell: 'bg-sky-400 text-white'     },
  '2-2': { score: 5, label: 'Core Player',       cell: 'bg-amber-400 text-gray-900'},
  '1-3': { score: 6, label: 'Raw Potential',     cell: 'bg-lime-400 text-gray-900' },
  '2-1': { score: 7, label: 'Effective',         cell: 'bg-orange-400 text-white'  },
  '1-2': { score: 8, label: 'Inconsistent',      cell: 'bg-red-400 text-white'     },
  '1-1': { score: 9, label: 'Underperformer',    cell: 'bg-red-600 text-white'     },
}

export const boxKey    = (row, col) => `${row}-${col}`
export const boxScore  = (row, col) => BOX_META[boxKey(row, col)]?.score ?? null
export const boxLabel  = (row, col) => BOX_META[boxKey(row, col)]?.label ?? '—'
// Box 1–3 masuk successor pool.
export const isSuccessorBox = (row, col) => (boxScore(row, col) ?? 99) <= 3
// Talent Box untuk PRP/TRM = TB 1, 2, 3, 5.
export const TALENT_BOXES = [1, 2, 3, 5]
export const isTalentScore = (score) => TALENT_BOXES.includes(score)

export const useTalentReviewStore = create(
  persist(
    (set) => ({
      // Map: { [employeeId]: { boxRow, boxCol, notes, updatedAt } }
      placements: { ...PLACEMENTS },

      // Tempatkan / pindahkan karyawan ke sebuah box.
      setBox: (employeeId, boxRow, boxCol, extra = {}) =>
        set(s => ({
          placements: {
            ...s.placements,
            [employeeId]: {
              ...(s.placements[employeeId] || {}),
              boxRow, boxCol,
              ...extra,
              updatedAt: new Date().toISOString().split('T')[0],
            },
          },
        })),

      updateNotes: (employeeId, notes) =>
        set(s => s.placements[employeeId]
          ? { placements: { ...s.placements, [employeeId]: { ...s.placements[employeeId], notes } } }
          : s),

      removeFromReview: (employeeId) =>
        set(s => {
          const next = { ...s.placements }
          delete next[employeeId]
          return { placements: next }
        }),
    }),
    { name: 'hcm-talent-review-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
