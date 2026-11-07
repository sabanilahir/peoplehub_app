import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ─── Vacancy Risk Assessment ──────────────────────────────────────────────────
// Menilai risiko kekosongan (vacancy) dari incumbent sebuah Key Position.
//
// 1. Vacancy Risk (main variable) → dasar Flag "Readiness Successor"
//    - Retirement Risk (Incumbent Age / masa pensiun)
// 2. Vacancy Mitigation (complementary variables) → gambaran mitigasi yang
//    sudah dilakukan terhadap persiapan suksesor
//    - Contract Period (masa berakhir kontrak)
//    - Mobility Risk   (Career/Promotion Plan)
//    - Health Risk     (hasil MCU)

// Rentang waktu (term) untuk variabel berbasis waktu.
export const TERM_OPTIONS = [
  { value: 'Short',  label: 'Short Term',  band: '0 – 1 tahun' },
  { value: 'Medium', label: 'Medium Term', band: '>1 – 3 tahun' },
  { value: 'Long',   label: 'Long Term',   band: '>3 – 5 tahun' },
]

export const HEALTH_OPTIONS = [
  { value: 'Sakit',    label: 'Sakit' },
  { value: 'Catatan',  label: 'Sehat dengan catatan' },
  { value: 'Sehat',    label: 'Sehat' },
]

export const RETIREMENT_HINT = {
  Short:  '0 – 1 tahun menuju masa pensiun',
  Medium: '>1 – 3 tahun menuju masa pensiun',
  Long:   '>3 – 5 tahun menuju masa pensiun',
}
export const CONTRACT_HINT = {
  Short:  '0 – 1 tahun menuju akhir kontrak',
  Medium: '>1 – 3 tahun menuju akhir kontrak',
  Long:   '>3 – 5 tahun menuju akhir kontrak',
}
export const MOBILITY_HINT = {
  Short:  '0 – 1 tahun menuju promotion plan',
  Medium: '>1 – 3 tahun menuju promotion plan',
  Long:   '>3 – 5 tahun menuju promotion plan',
}

// Flag "Readiness Successor" mengikuti term Retirement Risk (main variable).
export const readinessTerm = (a) => a?.retirement || null

// Level risiko keseluruhan: retirement (main) diperkuat variabel komplementer.
export const riskLevelOf = (a) => {
  if (!a || !a.retirement) return null
  const base = a.retirement === 'Short' ? 3 : a.retirement === 'Medium' ? 2 : 1
  let bump = 0
  if (a.contract === 'Short') bump++
  if (a.mobility === 'Short') bump++
  if (a.health === 'Sakit')   bump++
  const score = base + bump
  if (score >= 4 || a.retirement === 'Short') return 'High'
  if (score >= 2) return 'Medium'
  return 'Low'
}

// ── Seed default vacancy risk untuk Key Position (positionId → assessment) ─────
const _va = (retirement, contract, mobility, health, notes = '') =>
  ({ retirement, contract, mobility, health, notes, assessedBy: 'Corporate Organization Development', assessedAt: '2026-01-12' })

export const SEED_VACANCY_RISK = {
  21: _va('Short',  'Short',  'Medium', 'Sehat',   'CEO mendekati masa pensiun — perlu percepatan suksesi.'),
  18: _va('Medium', 'Long',   'Long',   'Sehat'),
  19: _va('Long',   'Long',   'Medium', 'Sehat'),
  12: _va('Short',  'Medium', 'Long',   'Catatan', 'MCU dengan catatan ringan.'),
  11: _va('Medium', 'Medium', 'Medium', 'Sehat'),
  20: _va('Long',   'Long',   'Long',   'Sehat'),
  9:  _va('Short',  'Short',  'Short',  'Sakit',   'Incumbent berencana pindah & kondisi kesehatan perlu perhatian.'),
  7:  _va('Medium', 'Medium', 'Long',   'Sehat'),
}

export const useVacancyRiskStore = create(
  persist(
    (set, get) => ({
      // Map: { [positionId]: { retirement, contract, mobility, health, notes, assessedBy, assessedAt } }
      assessments: { ...SEED_VACANCY_RISK },

      saveAssessment: (positionId, data) =>
        set(s => ({
          assessments: {
            ...s.assessments,
            [positionId]: {
              retirement: data.retirement || '',
              contract:   data.contract   || '',
              mobility:   data.mobility   || '',
              health:     data.health     || '',
              notes:      data.notes      || '',
              assessedBy: data.assessedBy || 'HR',
              assessedAt: new Date().toISOString().split('T')[0],
            },
          },
        })),

      clearAssessment: (positionId) =>
        set(s => {
          const next = { ...s.assessments }
          delete next[positionId]
          return { assessments: next }
        }),
    }),
    {
      name: 'hcm-vacancy-risk-v1',
      storage: createJSONStorage(() => dbStorage),
      version: 2,
      migrate: (state) => ({ ...state, assessments: { ...SEED_VACANCY_RISK, ...(state?.assessments || {}) } }),
    }
  )
)
