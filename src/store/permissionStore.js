import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Group menu yang 100% sama dengan parent section di DynamicSidebar
export const PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'ess', label: 'ESS', icon: 'user' },
  { key: 'lms', label: 'Learning', icon: 'book' },
  { key: 'hr', label: 'HR', icon: 'users' },
  { key: 'mss', label: 'MSS', icon: 'briefcase' },
  { key: 'sysadmin', label: 'System', icon: 'settings' },
  { key: 'sysadmin-workflow', label: 'Workflow Engine', icon: 'gitbranch' },
  { key: 'user-workflow', label: 'Workflow', icon: 'gitbranch' },
]

export const DEFAULT_PERMISSIONS = [
  // ==================== 0. Dashboard ====================
  { id: 1, key: 'dashboard_view', label: 'Dashboard View', group: 'dashboard' },

  // ==================== 1. ESS ====================
  { id: 101, key: 'ess_profile', label: 'My Profile', group: 'ess' },
  { id: 102, key: 'ess_onboarding', label: 'My Onboarding', group: 'ess' },
  { id: 103, key: 'ess_clock', label: 'Clock In/Out', group: 'ess' },
  { id: 104, key: 'ess_calendar', label: 'My Calendar', group: 'ess' },
  { id: 105, key: 'ess_attendance', label: 'My Attendance', group: 'ess' },
  { id: 106, key: 'ess_leave_apply', label: 'Apply Leave', group: 'ess' },
  { id: 107, key: 'ess_leave_balance', label: 'Leave Balance', group: 'ess' },
  { id: 108, key: 'ess_payslip', label: 'Payslip', group: 'ess' },
  { id: 109, key: 'ess_livestream', label: 'Live Streaming Host', group: 'ess' },
  { id: 110, key: 'ess_overtime', label: 'Apply Overtime (Pengajuan Lembur)', group: 'ess' },

  // ==================== 2. Learning (LMS) ====================
  { id: 201, key: 'lms_dashboard', label: 'Dashboard', group: 'lms' },
  { id: 202, key: 'lms_catalog', label: 'Course Catalog', group: 'lms' },
  { id: 203, key: 'lms_courses', label: 'My Courses', group: 'lms' },
  { id: 204, key: 'lms_certificates', label: 'My Certificates', group: 'lms' },
  { id: 205, key: 'lms_leaderboard', label: 'Leaderboard', group: 'lms' },

  // ==================== 3. HR ====================
  { id: 301, key: 'hr_employee', label: 'Employee Data', group: 'hr' },
  { id: 311, key: 'hr_attendance', label: 'Attendance Management', group: 'hr' },
  { id: 302, key: 'hr_leave', label: 'Leave Management', group: 'hr' },
  { id: 313, key: 'hr_leave_report', label: 'Leave Report', group: 'hr' },
  { id: 314, key: 'hr_overtime', label: 'Overtime Management', group: 'hr' },
  { id: 303, key: 'hr_recruitment', label: 'Recruitment', group: 'hr' },
  { id: 304, key: 'hr_onboarding', label: 'Onboarding', group: 'hr' },
  { id: 305, key: 'hr_payroll', label: 'Payroll', group: 'hr' },
  { id: 3050, key: 'hr_payroll_ho_calculator', label: 'Kalkulator Payroll HO', group: 'hr' },
  { id: 3051, key: 'hr_payroll_odoo_sync', label: 'Integrasi Odoo Payroll', group: 'hr' },
  { id: 3052, key: 'hr_payroll_setup', label: 'Payroll Setup (Komponen Gaji)', group: 'hr' },
  { id: 306, key: 'hr_performance', label: 'Performance', group: 'hr' },
  { id: 307, key: 'hr_talent', label: 'Talent', group: 'hr' },
  { id: 308, key: 'hr_org_chart', label: 'Org Chart', group: 'hr' },
  { id: 309, key: 'hr_livestream_schedule', label: 'Livestream Schedule', group: 'hr' },
  { id: 310, key: 'hr_livestream_payroll', label: 'Livestream Payroll', group: 'hr' },
  { id: 315, key: 'hr_holiday_calendar', label: 'Kalender Hari Libur', group: 'hr' },

  // ==================== 4. MSS ====================
  { id: 401, key: 'mss_attendance', label: 'Team Attendance', group: 'mss' },
  { id: 402, key: 'mss_leave', label: 'Approve Leave', group: 'mss' },
  { id: 403, key: 'mss_performance', label: 'Performance', group: 'mss' },
  { id: 404, key: 'mss_talent', label: 'Talent Review', group: 'mss' },
  { id: 405, key: 'mss_approve_overtime', label: 'Approve Overtime (Persetujuan Lembur)', group: 'mss' },

  // ==================== 5. System ====================
  { id: 501, key: 'system_users', label: 'User Management', group: 'sysadmin' },
  { id: 508, key: 'system_odoo', label: 'Odoo API', group: 'sysadmin' },
  { id: 502, key: 'system_role', label: 'Role', group: 'sysadmin' },
  { id: 503, key: 'system_permission', label: 'Permission', group: 'sysadmin' },
  { id: 504, key: 'system_menus', label: 'Menu Management', group: 'sysadmin' },
  { id: 505, key: 'system_leave_workflow', label: 'Leave Settings', group: 'sysadmin' },
  { id: 506, key: 'system_settings', label: 'Settings', group: 'sysadmin' },
  { id: 507, key: 'system_branding', label: 'Branding', group: 'sysadmin' },
  { id: 509, key: 'system_workflow_entry', label: 'Workflow Engine', group: 'sysadmin' },
  { id: 516, key: 'system_work_location', label: 'Aturan Jam Kerja & Lokasi', group: 'sysadmin' },

  // ==================== 6. Workflow Engine ====================
  { id: 511, key: 'workflow_engine_main', label: 'Workflow Menu', group: 'sysadmin-workflow' },
  { id: 512, key: 'workflow_engine_designer', label: 'BPMN Designer', group: 'sysadmin-workflow' },
  { id: 513, key: 'workflow_engine_definitions', label: 'Definitions', group: 'sysadmin-workflow' },
  { id: 517, key: 'workflow_engine_userlists', label: 'Userlists (Grup Penyetuju)', group: 'sysadmin-workflow' },
  { id: 515, key: 'workflow_engine_analytics', label: 'Workflow Analytics', group: 'sysadmin-workflow' },
  { id: 514, key: 'workflow_engine_settings', label: 'Engine Settings', group: 'sysadmin-workflow' },

  // ==================== 7. Workflow ====================
  { id: 901, key: 'workflow_tasks', label: 'Task Inbox', group: 'user-workflow' },
  { id: 902, key: 'workflow_my_requests', label: 'My Requests', group: 'user-workflow' },
  { id: 903, key: 'workflow_history', label: 'History', group: 'user-workflow' },
  { id: 904, key: 'workflow_analytics', label: 'Analisa Workflow', group: 'user-workflow' },
]

// Legacy key aliases mapping
const PERM_ALIASES = {
  ess_profile_view: 'ess_profile',
  ess_attendance_view: 'ess_attendance',
  ess_attendance_clock: 'ess_clock',
  ess_leave_view: 'ess_leave_balance',
  ess_leave: 'ess_leave_apply',
  ess_payslip_view: 'ess_payslip',
  ess_overtime_apply: 'ess_overtime',
  mss_overtime_approve: 'mss_approve_overtime',
  mss_overtime: 'mss_approve_overtime',
  hr_employee_view: 'hr_employee',
  hr_employee_add: 'hr_employee',
  hr_employee_edit: 'hr_employee',
  hr_attendance_view: 'hr_attendance',
  hr_attendance_manage: 'hr_attendance',
  hr_leave_approve: 'hr_leave',
  hr_recruitment_view: 'hr_recruitment',
  hr_payroll_view: 'hr_payroll',
  hr_payroll_ho_calculator: 'hr_payroll',
  hr_payroll_odoo_sync: 'hr_payroll',
  hr_payroll_setup: 'hr_payroll',
  hr_org_view: 'hr_org_chart',
  mss_team_view: 'mss_attendance',
  mss_leave_approve: 'mss_leave',
  mss_performance_view: 'mss_performance',
  lms_course_view: 'lms_courses',
  lms_course_enroll: 'lms_catalog',
  system_user_view: 'system_users',
  system_user_manage: 'system_users',
  system_role_manage: 'system_role',
  system_permission_manage: 'system_permission',
  system_menu_manage: 'system_menus',
  system_workflow: 'system_workflow_entry',
  sysadmin_users: 'system_users',
  sysadmin_odoo: 'system_odoo',
  sysadmin_role: 'system_role',
  sysadmin_permission: 'system_permission',
  sysadmin_menus: 'system_menus',
  sysadmin_leave_workflow: 'system_leave_workflow',
  sysadmin_settings: 'system_settings',
  sysadmin_branding: 'system_branding',
  sysadmin_workflow_entry: 'system_workflow_entry',
  sysadmin_work_location: 'system_work_location',
  sysadmin_workflow_main: 'workflow_engine_main',
  sysadmin_workflow_designer: 'workflow_engine_designer',
  sysadmin_workflow_definitions: 'workflow_engine_definitions',
  sysadmin_workflow_analytics: 'workflow_engine_analytics',
  sysadmin_workflow_settings: 'workflow_engine_settings',
  sysadmin_workflow_userlists: 'workflow_engine_userlists',
  workflow_userlists: 'workflow_engine_userlists',
  user_workflow_tasks: 'workflow_tasks',
  user_workflow_my: 'workflow_my_requests',
  user_workflow_history: 'workflow_history',
  user_workflow_analytics: 'workflow_analytics',
}

const ALL_KEYS = DEFAULT_PERMISSIONS.map(p => p.key)
const ESS_KEYS = DEFAULT_PERMISSIONS.filter(p => p.group === 'ess').map(p => p.key)
const LMS_KEYS = DEFAULT_PERMISSIONS.filter(p => p.group === 'lms').map(p => p.key)
const HR_KEYS = DEFAULT_PERMISSIONS.filter(p => p.group === 'hr').map(p => p.key)
const MSS_KEYS = DEFAULT_PERMISSIONS.filter(p => p.group === 'mss').map(p => p.key)
const WORKFLOW_KEYS = DEFAULT_PERMISSIONS.filter(p => p.group === 'user-workflow').map(p => p.key)

export const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: ALL_KEYS,
  hr_manager: [
    'dashboard_view',
    ...ESS_KEYS,
    ...LMS_KEYS,
    ...HR_KEYS,
    ...MSS_KEYS,
    ...WORKFLOW_KEYS,
    'system_work_location',
    'system_leave_workflow',
    'workflow_engine_userlists',
  ],
  hr: [
    'dashboard_view',
    ...ESS_KEYS,
    ...LMS_KEYS,
    'hr_employee',
    'hr_attendance',
    'hr_leave',
    'hr_leave_report',
    'hr_overtime',
    'hr_recruitment',
    'hr_onboarding',
    'hr_org_chart',
    'hr_livestream_schedule',
    ...WORKFLOW_KEYS,
    'workflow_engine_userlists',
  ],
  hr_officer: [
    'dashboard_view',
    ...ESS_KEYS,
    'lms_dashboard',
    'lms_catalog',
    'lms_courses',
    'hr_employee',
    'hr_attendance',
    'hr_leave',
    'hr_leave_report',
    'hr_overtime',
    'hr_org_chart',
    'hr_livestream_schedule',
    'workflow_tasks',
    'workflow_my_requests',
    'workflow_engine_userlists',
  ],
  manager: [
    'dashboard_view',
    ...ESS_KEYS,
    ...LMS_KEYS,
    ...MSS_KEYS,
    ...WORKFLOW_KEYS,
  ],
  supervisor: [
    'dashboard_view',
    ...ESS_KEYS,
    ...LMS_KEYS,
    ...MSS_KEYS,
    ...WORKFLOW_KEYS,
  ],
  senior_staff: [
    'dashboard_view',
    ...ESS_KEYS,
    ...LMS_KEYS,
    'workflow_tasks',
    'workflow_my_requests',
  ],
  staff: [
    'dashboard_view',
    ...ESS_KEYS,
    'workflow_tasks',
    'workflow_my_requests',
  ],
  employee: [
    'dashboard_view',
    ...ESS_KEYS,
    'workflow_tasks',
    'workflow_my_requests',
  ],
}

export const usePermissionStore = create(
  persist(
    (set, get) => ({
      permissions: DEFAULT_PERMISSIONS,
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,

      getByGroup: (group) => get().permissions.filter(p => p.group === group),
      getRolePermissions: (role) => {
        const custom = get().rolePermissions[role]
        if (Array.isArray(custom) && custom.length > 0) return custom
        if (DEFAULT_ROLE_PERMISSIONS[role]) return DEFAULT_ROLE_PERMISSIONS[role]
        const rLower = String(role || '').toLowerCase()
        if (rLower.includes('supervisor') || rLower.includes('coordinator') || rLower.includes('manager') || rLower.includes('lead')) {
          return DEFAULT_ROLE_PERMISSIONS.supervisor
        }
        if (rLower.includes('hr')) return DEFAULT_ROLE_PERMISSIONS.hr_officer
        return DEFAULT_ROLE_PERMISSIONS.staff
      },

      hasPermission: (role, key) => {
        if (!role) return false
        if (role === 'superadmin') return true

        let perms = get().rolePermissions[role]
        // Jika data perms untuk role ini kosong di local state, gunakan default atau template cerdas
        if (!perms || !Array.isArray(perms) || perms.length === 0) {
          if (DEFAULT_ROLE_PERMISSIONS[role]) {
            perms = DEFAULT_ROLE_PERMISSIONS[role]
          } else {
            const rLower = String(role).toLowerCase()
            if (rLower.includes('supervisor') || rLower.includes('coordinator') || rLower.includes('manager') || rLower.includes('lead')) {
              perms = DEFAULT_ROLE_PERMISSIONS.supervisor
            } else if (rLower.includes('hr')) {
              perms = DEFAULT_ROLE_PERMISSIONS.hr_officer
            } else {
              perms = DEFAULT_ROLE_PERMISSIONS.staff
            }
          }
        }

        if (perms.includes('*') || perms.includes(key)) return true

        // 1. Cek alias searah (lama -> baru)
        if (PERM_ALIASES[key] && perms.includes(PERM_ALIASES[key])) return true

        // 2. Cek reverse alias (baru -> apakah perms memiliki kunci lama)
        const oldKeys = Object.keys(PERM_ALIASES).filter(k => PERM_ALIASES[k] === key)
        if (oldKeys.some(k => perms.includes(k))) return true

        // 3. Cek konversi kebab-case vs snake_case
        const snakeKey = key.replace(/-/g, '_')
        if (perms.includes(snakeKey)) return true
        if (PERM_ALIASES[snakeKey] && perms.includes(PERM_ALIASES[snakeKey])) return true
        const oldSnakeKeys = Object.keys(PERM_ALIASES).filter(k => PERM_ALIASES[k] === snakeKey)
        if (oldSnakeKeys.some(k => perms.includes(k))) return true

        const kebabKey = key.replace(/_/g, '-')
        if (perms.includes(kebabKey)) return true

        return false
      },

      togglePermission: (role, key) => {
        const current = get().rolePermissions[role] || []
        const exists = current.includes(key)
        const updated = exists ? current.filter(k => k !== key) : [...current, key]
        set(s => ({
          rolePermissions: {
            ...s.rolePermissions,
            [role]: updated
          }
        }))
      },

      setRolePermissions: (role, keys) => {
        set(s => ({
          rolePermissions: {
            ...s.rolePermissions,
            [role]: keys
          }
        }))
      },

      addPermission: (permission) => {
        const newId = Math.max(0, ...get().permissions.map(p => p.id || 0)) + 1
        set(s => ({ permissions: [...s.permissions, { ...permission, id: newId }] }))
      },

      deletePermission: (id) => {
        const perm = get().permissions.find(p => p.id === id)
        if (!perm) return
        set(s => {
          const newRolePerms = {}
          Object.keys(s.rolePermissions).forEach(role => {
            newRolePerms[role] = s.rolePermissions[role].filter(k => k !== perm.key)
          })
          return { permissions: s.permissions.filter(p => p.id !== id), rolePermissions: newRolePerms }
        })
      },

      reset: () => set({ permissions: DEFAULT_PERMISSIONS, rolePermissions: DEFAULT_ROLE_PERMISSIONS }),

      syncDefaults: () => {
        const current = get().permissions || []
        const currentKeys = new Set(current.map(p => p.key))
        const missing = DEFAULT_PERMISSIONS.filter(p => !currentKeys.has(p.key))
        if (missing.length > 0) {
          const updated = [...current, ...missing]
          set(s => ({
            permissions: updated,
            rolePermissions: {
              ...s.rolePermissions,
              superadmin: updated.map(p => p.key),
            }
          }))
        }
      },

      syncToDatabase: async () => {
        try {
          const perms = get().permissions
          await fetch('/api/sync/permission', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(perms),
          })
        } catch (e) {}
      }
    }),
    {
      name: 'hcm-permissions-v2',
      storage: createJSONStorage(() => dbStorage),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState
        }

        const persistedPerms = Array.isArray(persistedState.permissions)
          ? [...persistedState.permissions]
          : []
        const existingKeys = new Set(persistedPerms.map(p => p.key))

        // Auto-merge any missing permissions from DEFAULT_PERMISSIONS
        DEFAULT_PERMISSIONS.forEach(defPerm => {
          if (!existingKeys.has(defPerm.key)) {
            persistedPerms.push(defPerm)
            existingKeys.add(defPerm.key)
          }
        })

        // Auto-merge role permissions
        const mergedRolePerms = {
          ...DEFAULT_ROLE_PERMISSIONS,
          ...(persistedState.rolePermissions || {})
        }

        const allKeys = persistedPerms.map(p => p.key)
        // Superadmin always has access to all permissions
        mergedRolePerms.superadmin = allKeys

        // Ensure roles have appropriate overtime permissions
        const overtimeRoles = {
          mss_approve_overtime: ['manager', 'supervisor', 'hr_manager', 'superadmin'],
          ess_overtime: ['staff', 'employee', 'senior_staff', 'supervisor', 'manager', 'hr', 'hr_officer', 'hr_manager', 'superadmin'],
          hr_overtime: ['hr', 'hr_officer', 'hr_manager', 'superadmin'],
        }

        Object.entries(overtimeRoles).forEach(([permKey, roles]) => {
          roles.forEach(role => {
            if (mergedRolePerms[role] && !mergedRolePerms[role].includes(permKey)) {
              mergedRolePerms[role] = [...mergedRolePerms[role], permKey]
            }
          })
        })

        return {
          ...currentState,
          ...persistedState,
          permissions: persistedPerms,
          rolePermissions: mergedRolePerms,
        }
      }
    }
  )
)
