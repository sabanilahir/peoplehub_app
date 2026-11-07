// ─── Shared offboarding domain helpers ───────────────────────────────────────
// Dates, reason taxonomy, Indonesian settlement estimate, and cross-store
// selectors that aggregate an employee's offboarding state.

export const todayStr = () => new Date().toISOString().split('T')[0]

export const addDays = (dateStr, n) => {
  if (!dateStr) return ''
  const d = new Date(dateStr); if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export const daysBetween = (a, b) => {
  if (!a || !b) return null
  const da = new Date(a), db = new Date(b)
  if (isNaN(da) || isNaN(db)) return null
  return Math.round((db - da) / 86400000)
}

export const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d); if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const yearsBetween = (a, b) => {
  const days = daysBetween(a, b)
  return days == null ? 0 : days / 365.25
}

// Standard statutory notice period (one month)
export const NOTICE_PERIOD_DAYS = 30

// ─── Termination types & structured reasons ──────────────────────────────────
export const TERMINATION_TYPES = [
  'Voluntary Resign', 'End of Contract', 'Retirement', 'Mutual Agreement',
  'Layoff / Redundancy', 'Dismissal',
]

export const REASON_CATEGORIES = {
  'Voluntary Resign':    ['Better Opportunity', 'Career Growth', 'Compensation & Benefit', 'Work-Life Balance', 'Relocation', 'Further Study', 'Health', 'Family Reason', 'Work Environment', 'Leadership / Management', 'Other'],
  'End of Contract':     ['Contract Not Extended', 'Project Ended', 'Business Need', 'Performance'],
  'Retirement':          ['Normal Retirement', 'Early Retirement'],
  'Mutual Agreement':    ['Mutual Separation', 'Restructuring', 'Health'],
  'Layoff / Redundancy': ['Efficiency', 'Company Restructuring', 'Business Closure', 'Force Majeure'],
  'Dismissal':           ['Disciplinary', 'Policy Violation', 'Performance (SP3)', 'Fraud / Misconduct'],
}

export const REHIRE_OPTIONS = ['Yes', 'Conditional', 'No']

// Involuntary types trigger a settlement estimate
export const INVOLUNTARY_TYPES = ['End of Contract', 'Retirement', 'Mutual Agreement', 'Layoff / Redundancy', 'Dismissal']

// ─── Indonesian severance estimate (simplified, PP 35/2021 basis) ─────────────
// Uang Pesangon (UP) — months of salary by tenure (years)
export const upMonths = (years) => {
  if (years < 1) return 1
  if (years < 2) return 2
  if (years < 3) return 3
  if (years < 4) return 4
  if (years < 5) return 5
  if (years < 6) return 6
  if (years < 7) return 7
  if (years < 8) return 8
  return 9
}
// Uang Penghargaan Masa Kerja (UPMK) — months of salary by tenure
export const upmkMonths = (years) => {
  if (years < 3) return 0
  if (years < 6) return 2
  if (years < 9) return 3
  if (years < 12) return 4
  if (years < 15) return 5
  if (years < 18) return 6
  if (years < 21) return 7
  if (years < 24) return 8
  return 10
}

// Multipliers applied to UP / UPMK per termination reason (simplified)
export const SETTLEMENT_FACTOR = {
  'Voluntary Resign':    { up: 0,    upmk: 0, sep: true,  note: 'Uang pisah sesuai Perjanjian Kerja / kebijakan.' },
  'End of Contract':     { up: 0,    upmk: 0, pkwt: true, note: 'Kompensasi PKWT: 1 bulan upah per 12 bulan masa kerja.' },
  'Retirement':          { up: 1.75, upmk: 1, note: 'Pensiun tanpa program pensiun (1,75× UP + 1× UPMK).' },
  'Mutual Agreement':    { up: 1,    upmk: 1, note: 'Kesepakatan bersama (1× UP + 1× UPMK).' },
  'Layoff / Redundancy': { up: 1,    upmk: 1, note: 'Efisiensi / restrukturisasi (1× UP + 1× UPMK).' },
  'Dismissal':           { up: 0,    upmk: 1, note: 'Pelanggaran: umumnya tanpa pesangon, UPMK + UPH sesuai putusan.' },
}

const rupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// monthlySalary, joinDate, lwd, terminationType, unusedLeaveDays
export function computeSettlement({ monthlySalary = 0, joinDate, lwd, terminationType, unusedLeaveDays = 0 }) {
  const years = yearsBetween(joinDate, lwd)
  const f = SETTLEMENT_FACTOR[terminationType] || SETTLEMENT_FACTOR['Voluntary Resign']
  const upBase = upMonths(years) * monthlySalary
  const upmkBase = upmkMonths(years) * monthlySalary
  const up = f.up * upBase
  const upmk = f.upmk * upmkBase

  // PKWT contract compensation
  const pkwt = f.pkwt ? (Math.min(years, 100) * monthlySalary) : 0 // 1mo/12mo ≈ years * monthly

  // THR prorate (months worked this calendar year / 12)
  const y = lwd ? new Date(lwd).getFullYear() : new Date().getFullYear()
  const yearStart = `${y}-01-01`
  const monthsThisYear = Math.max(0, Math.min(12, (daysBetween(joinDate > yearStart ? joinDate : yearStart, lwd) || 0) / 30))
  const thr = (monthsThisYear / 12) * monthlySalary

  // Unused leave payout (daily = monthly/21)
  const dailyRate = monthlySalary / 21
  const leavePayout = unusedLeaveDays * dailyRate

  // UPH (uang penggantian hak) = leave payout (+ other rights, simplified)
  const uph = leavePayout
  const gross = up + upmk + pkwt + thr + uph

  // Rough final PPh 21 estimate on severance (progressive brackets, simplified)
  const pph21 = estimatePph21(up + upmk + pkwt)
  const net = gross - pph21

  return {
    years: Math.round(years * 10) / 10,
    monthlySalary, unusedLeaveDays, dailyRate,
    upMonths: upMonths(years), upmkMonths: upmkMonths(years),
    up, upmk, pkwt, thr, leavePayout, uph, gross, pph21, net,
    note: f.note,
    fmt: { up: rupiah(up), upmk: rupiah(upmk), pkwt: rupiah(pkwt), thr: rupiah(thr), uph: rupiah(uph), gross: rupiah(gross), pph21: rupiah(pph21), net: rupiah(net), monthlySalary: rupiah(monthlySalary) },
  }
}

// ─── Cross-store selectors ───────────────────────────────────────────────────
// Latest Terminate PA for an employee (optionally filtered by status list).
export const getTerminatePA = (pas, employeeId, statuses = null) =>
  [...(pas || [])]
    .filter(p => p && p.action === 'Terminate' && String(p.employeeId) === String(employeeId) &&
      (!statuses || statuses.includes(p.status)))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null

// Last Working Day for a PA (new field, falling back to the legacy effectiveDate).
export const lwdOf = (pa) => pa?.lastWorkingDay || pa?.effectiveDate || ''

// Employees with an HR-approved (or applied) resignation.
export const approvedResignEmployees = (employees, pas) =>
  (employees || []).filter(e =>
    (pas || []).some(p => p && p.action === 'Terminate' &&
      String(p.employeeId) === String(e.id) && ['Approved', 'Applied'].includes(p.status)))

// Clearance progress from checklist items for one employee.
export const clearanceProgress = (items, employeeId) => {
  const list = (items || []).filter(i => String(i.employeeId) === String(employeeId))
  const total = list.length
  const complete = list.filter(i => i.status === 'Complete').length
  const overdue = list.filter(i => i.status !== 'Complete' && i.deadline && daysBetween(todayStr(), i.deadline) < 0).length
  return { total, complete, overdue, pct: total ? Math.round((complete / total) * 100) : 0, list }
}

// ─── Offboarding action items (notifications / to-do) ────────────────────────
// Single source of truth for the offboarding signals that must reach a user's
// notification bell AND the dashboard "Things To Do" list. Previously neither
// surface included offboarding at all, so resignation approvals and supervisor
// handover tasks silently went missing. Each item carries bilingual copy so the
// caller only needs to run it through its own translator.
//
// Roles:
//   HR-type      → hr, hr_officer, hr_manager, od_officer, od_manager, talent,
//                  superadmin, of_admin  (may approve resignations, notify depts)
//   Supervisor   → the employee's direct manager (managerId), plus of_manager /
//                  superadmin who oversee handover checklists.
const OF_HR_ROLES  = ['hr', 'hr_officer', 'hr_manager', 'od_officer', 'od_manager', 'talent', 'superadmin', 'of_admin']
const OF_SUP_ROLES = ['manager', 'of_manager', 'superadmin']

const OFFBOARDING_ROUTES = {
  approval: '/hr/employee/personnel-action/offboarding-approval',
  notify:   '/hr/employee/personnel-action/offboarding-notify',
  checklist:'/mss/offboarding-checklist',
  resign:   '/mss/offboarding',
}

// The four departments the notify flow must reach (mirrors OffboardingNotify).
const OF_NOTIFY_DEPTS = ['GA', 'IT', 'REM', 'FIN']

export function offboardingActionItems({ currentUser, employees = [], pas = [], checklistItems = [], notifySends = {} } = {}) {
  if (!currentUser) return []
  const uid  = currentUser.id
  const role = currentUser.role
  const isHR  = OF_HR_ROLES.includes(role)
  const isSup = OF_SUP_ROLES.includes(role)
  const items = []

  const empName = (id) => employees.find(e => String(e.id) === String(id))?.name || '—'
  const terminatePAs = (pas || []).filter(p => p && p.action === 'Terminate')

  // 1) HR — resignation (PA Terminate) awaiting approval.
  if (isHR) {
    terminatePAs.filter(p => p.status === 'Submitted').forEach(p => {
      const name = empName(p.employeeId)
      items.push({
        id: `of-approval-${p.id}`, kind: 'hr-approval', icon: '🚪',
        employeeId: p.employeeId, at: p.createdAt, href: OFFBOARDING_ROUTES.approval,
        id_text: `Pengajuan resign ${name} menunggu persetujuan Anda.`,
        en_text: `Resignation request for ${name} is awaiting your approval.`,
        id_sub: `PA ${p.paNumber} · LWD ${fmtDate(lwdOf(p))}`,
        en_sub: `PA ${p.paNumber} · LWD ${fmtDate(lwdOf(p))}`,
      })
    })
  }

  // 2) Supervisor — direct report whose resignation is approved and still has
  //    incomplete "Atasan Langsung" handover activities. (The missing signal in
  //    the reported Michael Ramos case.)
  if (isSup) {
    const scopedResign = (employees || []).filter(e => {
      const approved = terminatePAs.some(p =>
        String(p.employeeId) === String(e.id) && ['Approved', 'Applied'].includes(p.status))
      if (!approved) return false
      return role === 'superadmin' || String(e.managerId) === String(uid)
    })
    scopedResign.forEach(e => {
      const mine = (checklistItems || []).filter(i =>
        String(i.employeeId) === String(e.id) && i.category === 'Atasan Langsung')
      const open = mine.filter(i => i.status !== 'Complete')
      if (open.length === 0) return
      const pa  = getTerminatePA(pas, e.id, ['Approved', 'Applied'])
      const lwd = lwdOf(pa)
      const overdue = open.some(i => i.deadline && daysBetween(todayStr(), i.deadline) < 0)
      items.push({
        id: `of-checklist-${e.id}`, kind: 'atasan-checklist', icon: overdue ? '⚠️' : '📤',
        employeeId: e.id, at: pa?.approvedAt || pa?.createdAt, href: OFFBOARDING_ROUTES.checklist,
        id_text: `Task offboarding ${e.name} menunggu tindakan Anda (${open.length} belum selesai).`,
        en_text: `Offboarding tasks for ${e.name} need your action (${open.length} open).`,
        id_sub: `Handover Atasan · LWD ${fmtDate(lwd)}${overdue ? ' · ada yang lewat tenggat' : ''}`,
        en_sub: `Supervisor handover · LWD ${fmtDate(lwd)}${overdue ? ' · some overdue' : ''}`,
      })
    })
  }

  // 3) HR — approved resignation whose department notifications (GA/IT/REM/FIN)
  //    have not all been sent yet.
  if (isHR) {
    approvedResignEmployees(employees, pas).forEach(e => {
      const sentCount = OF_NOTIFY_DEPTS.filter(d => (notifySends || {})[`${e.id}:${d}`]?.status === 'Sent').length
      if (sentCount >= OF_NOTIFY_DEPTS.length) return
      const pa  = getTerminatePA(pas, e.id, ['Approved', 'Applied'])
      items.push({
        id: `of-notify-${e.id}`, kind: 'hr-notify', icon: '📨',
        employeeId: e.id, at: pa?.approvedAt || pa?.createdAt, href: OFFBOARDING_ROUTES.notify,
        id_text: `Notifikasi departemen offboarding ${e.name} belum lengkap (${sentCount}/${OF_NOTIFY_DEPTS.length}).`,
        en_text: `Department notifications for ${e.name}'s offboarding are incomplete (${sentCount}/${OF_NOTIFY_DEPTS.length}).`,
        id_sub: `GA · IT · Remuneration · Finance`,
        en_sub: `GA · IT · Remuneration · Finance`,
      })
    })
  }

  // 4) Submitter (manager/HR) — FYI when a resignation they filed is decided.
  terminatePAs
    .filter(p => String(p.submittedBy) === String(uid) && ['Approved', 'Applied', 'Rejected'].includes(p.status))
    .forEach(p => {
      const name = empName(p.employeeId)
      const rejected = p.status === 'Rejected'
      items.push({
        id: `of-result-${p.id}-${p.status}`, kind: 'result', icon: rejected ? '❌' : '✅',
        employeeId: p.employeeId, at: p.approvedAt || p.appliedAt || p.createdAt, href: OFFBOARDING_ROUTES.resign,
        id_text: rejected
          ? `Pengajuan resign ${name} ditolak HR.`
          : `Pengajuan resign ${name} telah disetujui HR.`,
        en_text: rejected
          ? `Resignation request for ${name} was rejected by HR.`
          : `Resignation request for ${name} has been approved by HR.`,
        id_sub: `PA ${p.paNumber}`, en_sub: `PA ${p.paNumber}`,
      })
    })

  return items
}

// Final severance PPh 21 (PP 68/2009) — simplified progressive brackets
function estimatePph21(base) {
  let tax = 0, b = base
  const brackets = [[50e6, 0], [50e6, 0.05], [400e6, 0.15], [Infinity, 0.25]]
  for (const [cap, rate] of brackets) {
    if (b <= 0) break
    const slice = Math.min(b, cap)
    tax += slice * rate
    b -= slice
  }
  return tax
}
