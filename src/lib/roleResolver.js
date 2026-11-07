/**
 * Helper terpusat untuk menentukan Role User berdasarkan Departemen dan Level Jabatan Odoo.
 * Matriks:
 * 1. Departemen HR/GA + Manager -> 'hr_manager'
 * 2. Departemen HR/GA + Supervisor/Staff -> 'hr_officer'
 * 3. Non-HR + Manager -> 'manager'
 * 4. Non-HR + Supervisor / Coordinator -> 'manager'
 * 5. Non-HR + Senior Staff / Staff -> 'employee'
 */
export function resolveUserRole(emp) {
  if (!emp) return 'employee'

  const dept = String(emp.dept || '').toLowerCase()
  const jobPos = String(emp.jobPosition || '').toLowerCase()
  const pos = String(emp.position || '').toLowerCase()
  const jobTitle = String(emp.jobTitle || '').toLowerCase()

  const isHR = dept.includes('hr') || dept.includes('human resource')
  const isManager = jobPos.includes('manager') || pos.includes('manager') || jobTitle.includes('manager') || jobTitle.includes('head')
  const isSupervisor = jobPos.includes('supervisor') || jobPos.includes('coordinator') || pos.includes('supervisor') || jobTitle.includes('supervisor') || jobTitle.includes('lead') || jobTitle.includes('spv')

  // Rule 1: HR/GA Manager
  if (isHR && isManager) {
    return 'hr_manager'
  }

  // Rule 2: HR/GA Officer / Specialist / Staff
  if (isHR) {
    return 'hr_officer'
  }

  // Rule 3 & 4: Manager & Supervisor / Lead operasional non-HR
  if (isManager || isSupervisor) {
    return 'manager'
  }

  // Rule 5: Staff / Senior Staff operasional
  return 'employee'
}

