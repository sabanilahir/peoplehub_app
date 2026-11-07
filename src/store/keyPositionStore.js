import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ─── Key Position Assessment ──────────────────────────────────────────────────
// Framework penetapan Key Position. Setiap posisi di sistem dinilai dengan 3
// pertanyaan Yes/No. Apabila SEMUA jawaban "Yes" → posisi di-flag Key Position.
export const KEY_POSITION_QUESTIONS = [
  'Apakah posisi memiliki dampak dan kontribusi besar terhadap bisnis dan operasional perusahaan?',
  'Apakah posisi tersebut merupakan posisi kepemimpinan yang memiliki tugas mengelola Sumber Daya Manusia (SDM) secara struktural?',
  'Apakah kekosongan pada posisi tersebut akan berdampak pada resiko tinggi secara strategis dan/atau operasional bagi perusahaan?',
]

// Sebuah posisi menjadi Key Position hanya jika ketiga jawaban bernilai "Yes".
export const isKeyPosition = (a) => !!(a && a.q1 && a.q2 && a.q3)

// ── Seed default: beberapa posisi kepemimpinan otomatis jadi Key Position ──────
// positionId mengikuti seed structureStore (4=Engineering Manager, 7=Finance
// Manager, 9=GM Engineering, 11=GM HR, 12=GM Finance, 18=CTO, 19=CFO,
// 20=CHRO, 21=President Director/CEO).
const _seed = (assessedBy = 'Corporate Organization Development', assessedAt = '2026-01-10') =>
  ({ q1: true, q2: true, q3: true, assessedBy, assessedAt })

export const SEED_KEY_POSITIONS = {
  4:  _seed(),
  7:  _seed(),
  9:  _seed(),
  11: _seed(),
  12: _seed(),
  18: _seed('HR PT'),
  19: _seed(),
  20: _seed(),
  21: _seed(),
}

export const useKeyPositionStore = create(
  persist(
    (set, get) => ({
      // Map: { [positionId]: { q1, q2, q3, assessedBy, assessedAt } }
      assessments: { ...SEED_KEY_POSITIONS },

      // Simpan / perbarui hasil assessment untuk satu posisi.
      saveAssessment: (positionId, { q1, q2, q3, assessedBy }) =>
        set(s => ({
          assessments: {
            ...s.assessments,
            [positionId]: {
              q1: !!q1, q2: !!q2, q3: !!q3,
              assessedBy: assessedBy || 'HR',
              assessedAt: new Date().toISOString().split('T')[0],
            },
          },
        })),

      // Hapus hasil assessment (kembali ke status "Belum Dinilai").
      clearAssessment: (positionId) =>
        set(s => {
          const next = { ...s.assessments }
          delete next[positionId]
          return { assessments: next }
        }),

      getAssessment: (positionId) => get().assessments[positionId] || null,
    }),
    {
      name: 'hcm-key-position-v1',
      storage: createJSONStorage(() => dbStorage),
      version: 2,
      // Sisipkan seed ke state lama (yang mungkin kosong), tanpa menimpa data user.
      migrate: (state, from) => ({
        ...state,
        assessments: { ...SEED_KEY_POSITIONS, ...(state?.assessments || {}) },
      }),
    }
  )
)
