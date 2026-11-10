/**
 * Helper terpusat untuk menentukan Role User berdasarkan Departemen dan Level Jabatan Odoo (Job Position).
 * Matriks:
 * 1. Departemen HR/GA + Manager -> 'hr_manager'
 * 2. Departemen HR/GA + Supervisor/Staff -> 'hr_officer'
 * 3. Manager -> 'manager'
 * 4. Supervisor / Coordinator -> 'supervisor'
 * 5. Senior Staff -> 'senior_staff'
 * 6. Staff -> 'staff'
 */
export function resolveUserRole(emp) {
  if (!emp) return 'staff'

  const dept = String(emp.dept || '').toLowerCase()
  const jobPos = String(emp.jobPosition || '').trim().toLowerCase()
  const pos = String(emp.position || '').trim().toLowerCase()
  const jobTitle = String(emp.jobTitle || '').trim().toLowerCase()

  const isHR = dept.includes('hr') || dept.includes('human resource')
  const isManager =
    jobPos === 'manager' ||
    jobPos.includes('manager') ||
    pos.includes('manager') ||
    jobTitle.includes('manager') ||
    jobTitle.includes('head')

  const isSupervisor =
    jobPos.includes('supervisor') ||
    jobPos.includes('coordinator') ||
    pos.includes('supervisor') ||
    pos.includes('coordinator') ||
    jobTitle.includes('supervisor') ||
    jobTitle.includes('coordinator') ||
    jobTitle.includes('lead') ||
    jobTitle.includes('spv')

  const isSeniorStaff =
    jobPos === 'senior staff' ||
    jobPos.includes('senior') ||
    pos.includes('senior') ||
    jobTitle.includes('senior')

  // Rule 1: HR/GA Manager
  if (isHR && isManager) {
    return 'hr_manager'
  }

  // Rule 2: HR/GA Officer / Specialist / Staff
  if (isHR) {
    return 'hr_officer'
  }

  // Rule 3: Manager operasional non-HR
  if (isManager) {
    return 'manager'
  }

  // Rule 4: Supervisor / Coordinator operasional non-HR
  if (isSupervisor) {
    return 'supervisor'
  }

  // Rule 5: Senior Staff operasional
  if (isSeniorStaff) {
    return 'senior_staff'
  }

  // Rule 6: Staff umum
  return 'staff'
}
