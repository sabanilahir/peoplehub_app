// ─── Unified talent selectors ─────────────────────────────────────────────────
// Satu sumber logika untuk merekonsiliasi konsep key position, incumbent,
// vacancy urgency, successor, readiness, talent pool, dan gap suksesi.
// Fungsi murni — komponen mengoper data store sebagai argumen.

import { isKeyPosition } from '@/store/keyPositionStore'
import { readinessFromFit } from '@/store/successorReadinessStore'
import { boxScore, isSuccessorBox } from '@/store/talentReviewStore'

export const TERM_RANK = { Short: 1, Medium: 2, Long: 3 }
export const TERM_LABEL = { Short: 'Short Term', Medium: 'Medium Term', Long: 'Long Term' }

export const GAP_TONE = {
  Ready:        'success',
  Low:          'success',
  Medium:       'warning',
  High:         'danger',
  Critical:     'danger',
  'No Successor':'danger',
  Unassessed:   'neutral',
}

export const listKeyPositions = (positions, keyAssessments) =>
  positions.filter(p => isKeyPosition(keyAssessments[p.id]))

export const incumbentOf = (employees, positionId) =>
  employees.find(e => e.positionId === positionId && e.status === 'Active') || null

// Vacancy urgency (kapan posisi berpotensi kosong) dari Retirement Risk (main).
export const vacancyUrgency = (vacancyAssessments, positionId) =>
  vacancyAssessments[positionId]?.retirement || null

export const successorsOf = (successorsMap, positionId) =>
  successorsMap[positionId] || []

export const successorReadiness = (s) => readinessFromFit(s.competencyFit, s.assessed)

// Readiness terbaik (paling siap) di antara successor sebuah posisi.
export const bestReadiness = (successors) => {
  let best = null
  successors.forEach(s => {
    const r = successorReadiness(s)
    if (!best || TERM_RANK[r] < TERM_RANK[best]) best = r
  })
  return best
}

export const hasEmergency = (successors) => successors.some(s => s.emergency)

const downgrade = (level) =>
  level === 'Critical' ? 'High' : level === 'High' ? 'Medium' : level === 'Medium' ? 'Low' : level

// Inti succession gap: pertemukan kapan posisi kosong × kapan successor siap.
export const computeGap = ({ urgency, successors }) => {
  const count = successors.length
  if (count === 0) return { level: urgency === 'Long' ? 'High' : 'No Successor', best: null }
  if (!urgency)    return { level: 'Unassessed', best: bestReadiness(successors) }

  const best = bestReadiness(successors)
  const gap = TERM_RANK[best] - TERM_RANK[urgency]   // >0 = successor siap lebih lambat dari kebutuhan
  let level = gap >= 2 ? 'Critical' : gap === 1 ? 'High' : gap === 0 ? 'Medium' : 'Ready'
  if (hasEmergency(successors) && level !== 'Ready') level = downgrade(level)
  return { level, best }
}

// Competency fitness seorang karyawan (sumber tunggal dari Successor Readiness).
// Ambil nilai fit tertinggi yang sudah dinilai lintas posisi.
export const competencyFitOf = (successorsMap, employeeId) => {
  let best = null
  Object.values(successorsMap || {}).forEach(list =>
    list.forEach(s => {
      if (s.employeeId === employeeId && s.assessed && s.competencyFit !== '') {
        const n = Number(s.competencyFit)
        if (best == null || n > best) best = n
      }
    })
  )
  return best
}

// Talent pool (kandidat successor) dari kalibrasi 9-Box: box 1–3.
export const nineBoxPoolIds = (placements) =>
  Object.entries(placements)
    .filter(([, p]) => isSuccessorBox(p.boxRow, p.boxCol))
    .map(([id]) => +id)

// Ringkasan 9-Box: jumlah per skor 1–9.
export const nineBoxDistribution = (placements) => {
  const dist = {}
  Object.values(placements).forEach(p => {
    const s = boxScore(p.boxRow, p.boxCol)
    dist[s] = (dist[s] || 0) + 1
  })
  return dist
}
