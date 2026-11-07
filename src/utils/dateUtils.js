const MONTH_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export const formatDate = (ds) => {
  const d = new Date(ds)
  return `${String(d.getDate()).padStart(2,'0')} ${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`
}

export const daysBetween = (s, e) =>
  Math.round((new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24)) + 1

export const tenure = (joinDate) => {
  if (!joinDate) return ''
  const start = new Date(joinDate)
  const now   = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth()
  if (months < 1) return '< 1 mo'
  const years    = Math.floor(months / 12)
  const remMonths = months % 12
  if (years === 0)     return `${remMonths} mo`
  if (remMonths === 0) return `${years} yr`
  return `${years} yr ${remMonths} mo`
}

export const daysUntil = (dateStr) => {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr) - new Date()) / 86400000)
}

export const workingDays = (year, month, holidays, country = 'ID') => {
  const dim = new Date(year, month + 1, 0).getDate()
  let cnt = 0
  for (let d = 1; d <= dim; d++) {
    const dow = new Date(year, month, d).getDay()
    const ds  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const isH = holidays.some(h => h.date === ds && h.country === country)
    if (dow !== 0 && dow !== 6 && !isH) cnt++
  }
  return cnt
}