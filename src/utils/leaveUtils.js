import { daysBetween } from './dateUtils'

// ── Shared leave status badge CSS ─────────────────────────────────────────────
export const LEAVE_STATUS_BADGE = {
  Approved:  'bg-green-100 text-green-700',
  Pending:   'bg-yellow-100 text-yellow-700',
  Rejected:  'bg-red-100 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-500',
}

// ── Shared balance calculation ─────────────────────────────────────────────────
// Counts approved days and optionally pending (reserved) days separately.
export function calcLeaveUsed(leaves, userId, typeName) {
  const mine = leaves.filter(l => l.userId === userId && l.type === typeName)
  const approved = mine
    .filter(l => l.status === 'Approved')
    .reduce((sum, l) => sum + daysBetween(l.start, l.end), 0)
  const pending = mine
    .filter(l => l.status === 'Pending')
    .reduce((sum, l) => sum + daysBetween(l.start, l.end), 0)
  return { approved, pending, total: approved + pending }
}

// ── Supervisor chain helpers ──────────────────────────────────────────────────
export function getDirectSupervisorId(userId, employees) {
  return employees.find(e => e.id === userId)?.managerId ?? null
}
export function getIndirectSupervisorId(userId, employees) {
  const directId = getDirectSupervisorId(userId, employees)
  return directId ? getDirectSupervisorId(directId, employees) : null
}

// ── Permission check for a single workflow step ──────────────────────────────
export function canActOnStep(step, leave, currentUser, employees) {
  if (step.status !== 'Pending') return false
  const uid  = currentUser?.id
  const role = currentUser?.role
  if (step.delegatedTo && step.delegatedTo === uid) return true
  const rId = leave.userId
  switch (step.type) {
    case 'supervisor':        return getDirectSupervisorId(rId, employees)   === uid
    case 'indirect_sup':      return getIndirectSupervisorId(rId, employees) === uid
    case 'supervisor_pc53':
    case 'indirect_sup_pc53': return role === 'manager' || role === 'superadmin'
    case 'role':
    case 'userlist':
    case 'employee':          return role === 'hr'       || role === 'superadmin'
    default:                  return role === 'superadmin'
  }
}

// ── Form validation (returns error string or null) ────────────────────────────
export function validateLeaveForm({ empId, type, start, end }, leaves, leaveTypes, t, requireEmp = false) {
  if (requireEmp && !empId)
    return t('Karyawan, jenis cuti, dan tanggal wajib diisi.', 'Employee, leave type, and dates are required.')
  if (!type || !start || !end)
    return t('Jenis cuti, tanggal mulai dan selesai wajib diisi.', 'Leave type, start and end date are required.')
  if (end < start)
    return t('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'End date cannot be before start date.')
  const lt  = leaveTypes.find(lt => lt.name === type)
  const uid = +empId || null
  if (lt && uid !== null) {
    const { total } = calcLeaveUsed(leaves, uid, type)
    const req = daysBetween(start, end)
    if (total + req > lt.maxDays)
      return t(
        `Saldo ${type} tidak cukup! Sisa: ${lt.maxDays - total} hari.`,
        `Insufficient ${type} balance! Remaining: ${lt.maxDays - total} days.`
      )
  }
  return null
}
