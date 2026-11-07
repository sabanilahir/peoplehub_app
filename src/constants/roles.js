// ─── Central role definitions ────────────────────────────────────────────────
// role key (stored on user) → human-readable label
export const ROLE_LABELS = {
  employee:    'Employee',
  manager:     'Manager',
  hr:          'HR',
  hr_officer:  'HR Officer',
  hr_manager:  'HR Manager',
  od_officer:  'Organization Development Officer',
  od_manager:  'Organization Development Manager',
  talent:      'Talent Management',
  superadmin:  'Superadmin',
  learning:    'Learning Management',
  ob_admin:    'Onboarding Admin',
  ob_manager:  'Onboarding Manager',
  ob_employee: 'Onboarding Employee',
  of_admin:    'HR Offboarding',
  of_manager:  'Atasan Offboarding',
  of_employee: 'Karyawan Offboarding',
}

// All assignable roles (order shown in dropdowns)
export const ROLES = Object.keys(ROLE_LABELS)

// Roles allowed to see the HR Administration menu / area
export const HR_ROLES = ['hr', 'hr_officer', 'hr_manager', 'od_officer', 'od_manager', 'talent', 'superadmin']

// Roles restricted to Talent Management module only
export const TALENT_ONLY_ROLES = ['talent']

export const roleLabel = (r) => ROLE_LABELS[r] || r
