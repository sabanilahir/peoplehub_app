// Default Roles
export const DEFAULT_ROLES = [
  { key: 'superadmin', label: 'Superadmin', color: '#dc2626' },
  { key: 'hr_manager', label: 'HR Manager', color: '#2563eb' },
  { key: 'hr', label: 'HR Staff', color: '#7c3aed' },
  { key: 'hr_officer', label: 'HR Officer', color: '#0891b2' },
  { key: 'manager', label: 'Manager', color: '#059669' },
  { key: 'employee', label: 'Employee', color: '#d97706' },
]

// Default Permissions
export const DEFAULT_PERMISSIONS = [
  { key: 'ess_profile_view', label: 'Lihat Profil', group: 'ess' },
  { key: 'ess_attendance_view', label: 'Lihat Absensi', group: 'ess' },
  { key: 'ess_clock_in', label: 'Clock In/Out', group: 'ess' },
  { key: 'ess_leave_apply', label: 'Ajukan Cuti', group: 'ess' },
  { key: 'ess_leave_view', label: 'Lihat Cuti', group: 'ess' },
  { key: 'ess_payslip_view', label: 'Lihat Payslip', group: 'ess' },
  { key: 'hr_employee_view', label: 'Lihat Data Karyawan', group: 'hr' },
  { key: 'hr_employee_add', label: 'Tambah Karyawan', group: 'hr' },
  { key: 'hr_employee_edit', label: 'Edit Karyawan', group: 'hr' },
  { key: 'hr_leave_approve', label: 'Approve Cuti', group: 'hr' },
  { key: 'hr_recruitment_view', label: 'Lihat Rekrutmen', group: 'hr' },
  { key: 'hr_payroll_view', label: 'Lihat Payroll', group: 'hr' },
  { key: 'hr_org_view', label: 'Lihat Org Chart', group: 'hr' },
  { key: 'mss_team_view', label: 'Lihat Tim', group: 'mss' },
  { key: 'mss_leave_approve', label: 'Approve Cuti Tim', group: 'mss' },
  { key: 'mss_performance_view', label: 'Lihat Performance', group: 'mss' },
  { key: 'lms_course_view', label: 'Lihat Kursus', group: 'lms' },
  { key: 'lms_course_enroll', label: 'Enroll Kursus', group: 'lms' },
  { key: 'system_user_view', label: 'Lihat User', group: 'system' },
  { key: 'system_user_manage', label: 'Kelola User', group: 'system' },
  { key: 'system_role_manage', label: 'Kelola Role', group: 'system' },
  { key: 'system_permission_manage', label: 'Kelola Permission', group: 'system' },
  { key: 'system_menu_manage', label: 'Kelola Menu', group: 'system' },
]

// Default Menu Items
export const DEFAULT_MENUS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', href: '/dashboard', roles: '["*"]', order: 1, active: true },
]