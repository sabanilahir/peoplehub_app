// ── Periodic Review cadence ───────────────────────────────────────────────────
// Shared definitions for how often a Periodic Review recurs. Used by the master
// template builder, the onboarding tracker, and the auto-assign engine so the
// label and the interval-in-days stay consistent everywhere.

export const REVIEW_FREQUENCIES = [
  { value: 'once',      label: 'Sekali',      labelEN: 'One-time',  days: 0   },
  { value: 'weekly',    label: 'Mingguan',    labelEN: 'Weekly',    days: 7   },
  { value: 'biweekly',  label: 'Dua Mingguan', labelEN: 'Biweekly', days: 14  },
  { value: 'monthly',   label: 'Bulanan',     labelEN: 'Monthly',   days: 30  },
  { value: 'quarterly', label: 'Kuartalan',   labelEN: 'Quarterly', days: 90  },
  { value: 'custom',    label: 'Custom (hari)', labelEN: 'Custom (days)', days: null },
]

export const DEFAULT_FREQUENCY = 'once'

// Resolve the interval in days for a review item, honouring custom intervals.
export function frequencyDays(item) {
  const freq = item?.frequency ?? DEFAULT_FREQUENCY
  if (freq === 'custom') {
    const n = Number(item?.intervalDays)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  return REVIEW_FREQUENCIES.find(f => f.value === freq)?.days ?? 0
}

// Human-readable label for a review item's cadence (id/en aware).
export function frequencyLabel(item, en = false) {
  const freq = item?.frequency ?? DEFAULT_FREQUENCY
  const def  = REVIEW_FREQUENCIES.find(f => f.value === freq)
  if (freq === 'custom') {
    const n = Number(item?.intervalDays)
    const every = Number.isFinite(n) && n > 0 ? n : '—'
    return en ? `Every ${every} days` : `Setiap ${every} hari`
  }
  return def ? (en ? def.labelEN : def.label) : (en ? 'One-time' : 'Sekali')
}
