// Resolves an employee's working hours for a date, and grades how far a clock
// in/out sits from them. Used by Clock In/Out and the My Time Card widget.
//
// The schedule chain already exists in shiftStore:
//   assignment (userId) → schedule → pattern → entry for that weekday → shift

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Grace before a late-in / early-out counts as a serious deviation.
export const GRACE_MINUTES = 15

export const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export const toHHMM = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// A calendar date as 'YYYY-MM-DD' from LOCAL components — never via
// toISOString(), which converts to UTC first. For any positive UTC offset
// (WIB is UTC+7) that silently rolls local midnight back to the previous
// day for roughly the first 7 hours of every day, and rolls every date built
// as local midnight (e.g. `new Date(year, month, day)`, as a calendar grid
// does) back a full day, always.
export const localDateStr = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const dayNameOf = (date) => DAY_NAMES[new Date(date).getDay()]

/**
 * The shift an employee is scheduled to work on `date`, or null when they have
 * no assignment or the day is not in their pattern (a day off).
 */
export function shiftFor(userId, date, { assignments = [], schedules = [], patterns = [], shifts = [] }) {
  const ds = typeof date === 'string' ? date : localDateStr(date)

  // Most recent assignment that had already started by this date.
  const assignment = assignments
    .filter(a => a.userId === userId && (!a.startDate || a.startDate <= ds))
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0]
  if (!assignment) return null

  const schedule = schedules.find(s => s.id === assignment.scheduleId)
  if (!schedule) return null

  const pattern = patterns.find(p => p.id === schedule.patternId)
  const entry = pattern?.entries?.find(e => e.day === dayNameOf(ds))
  if (!entry) return null                    // day off

  const shift = shifts.find(s => s.id === entry.shiftId)
  if (!shift) return null

  return { shift, schedule, scheduleName: schedule.name }
}

/**
 * Grade a clock time against its scheduled time.
 *   kind 'in'  → positive deviation means late
 *   kind 'out' → positive deviation means leaving early
 * Returns { deviation, tone } where tone is 'ok' | 'warn' | 'bad'.
 */
export function gradeTime(actual, scheduled, kind) {
  const a = toMinutes(actual)
  let s = toMinutes(scheduled)
  if (a == null || s == null) return { deviation: 0, tone: 'none' }

  // A shift ending past midnight (e.g. 22:00 → 07:00) puts the scheduled end
  // on the next day, so compare against it there rather than 15 hours early.
  if (kind === 'out' && s < toMinutes('12:00') && a > s + 720) s += 1440

  const deviation = kind === 'in' ? a - s : s - a
  if (deviation <= 0) return { deviation: 0, tone: 'ok' }
  return { deviation, tone: deviation < GRACE_MINUTES ? 'warn' : 'bad' }
}

// Tailwind classes for a graded time value.
export const TONE_CLASS = {
  ok:   'text-emerald-600',
  warn: 'text-amber-600',
  bad:  'text-red-600',
  none: 'text-gray-400',
}

export const toneLabel = (tone, kind, deviation, t) => {
  if (tone === 'ok') return t('Tepat waktu', 'On time')
  const mins = t(`${deviation} menit`, `${deviation} min`)
  return kind === 'in'
    ? t(`Terlambat ${mins}`, `${mins} late`)
    : t(`Pulang cepat ${mins}`, `${mins} early`)
}
