export const ATTENDANCE_STATUS_STYLE = {
  Present: 'bg-green-100 text-green-700',
  Late:    'bg-yellow-100 text-yellow-700',
  Absent:  'bg-red-100 text-red-700',
  Leave:   'bg-blue-100 text-blue-700',
}

export function workHoursDisplay(startTime, endTime, breakMinutes, t) {
  if (!startTime || !endTime) return '—'
  const [sh, sm] = startTime.split(':').map(Number)
  let   [eh, em] = endTime.split(':').map(Number)
  if (eh < sh) eh += 24
  const mins = (eh * 60 + em) - (sh * 60 + sm) - (+breakMinutes || 0)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return t ? `${h}${t('j','h')} ${m}${t('m','m')}` : `${h}h ${m}m`
}
