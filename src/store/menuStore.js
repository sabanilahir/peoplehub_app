import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  Home,
  User,
  Users,
  Users2,
  UsersRound,
  Settings,
  BookOpen,
  BookMarked,
  GraduationCap,
  Briefcase,
  Clock,
  Clock4,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarCheck,
  Coins,
  Tv,
  Radio,
  DollarSign,
  Wallet,
  CreditCard,
  Receipt,
  Shield,
  Key,
  Lock,
  Unlock,
  Clipboard,
  FileText,
  FileCheck,
  Folder,
  FolderOpen,
  Archive,
  Inbox,
  TrendingUp,
  Activity,
  Star,
  Award,
  Trophy,
  Target,
  PieChart,
  BarChart3,
  LineChart,
  Heart,
  AlertCircle,
  CheckCircle,
  UserCheck,
  UserPlus,
  UserMinus,
  UserX,
  Building2,
  Building,
  Landmark,
  Bell,
  MessageSquare,
  Send,
  Mail,
  Phone,
  MapPin,
  Globe,
  Link as LinkIcon,
  Share2,
  Copy,
  Download,
  Upload,
  Edit,
  Eye,
  EyeOff,
  Trash,
  Database,
  Server,
  Monitor,
  Smartphone,
  Printer,
  Package,
  Box,
  Image,
  Video,
  Music,
  Mic,
  Camera,
  FolderKanban,
  Kanban,
  PlusCircle,
  MinusCircle,
  GitBranch,
  Play,
  CheckSquare,
  ListChecks,
  Palette,
  Calculator,
} from "lucide-react"

const rawIconMap = {
  home: Home,
  user: User,
  users: Users,
  users2: Users2,
  usersRound: UsersRound,
  settings: Settings,
  book: BookOpen,
  bookMarked: BookMarked,
  graduation: GraduationCap,
  briefcase: Briefcase,
  clock: Clock,
  clock4: Clock4,
  calendar: Calendar,
  calendarClock: CalendarClock,
  calendarDays: CalendarDays,
  calendarCheck: CalendarCheck,
  dollar: DollarSign,
  money: DollarSign,
  calculator: Calculator,
  wallet: Wallet,
  creditCard: CreditCard,
  receipt: Receipt,
  shield: Shield,
  key: Key,
  lock: Lock,
  unlock: Unlock,
  menu: Clipboard,
  clipboard: Clipboard,
  file: FileText,
  fileText: FileText,
  fileCheck: FileCheck,
  folder: Folder,
  folderOpen: FolderOpen,
  archive: Archive,
  inbox: Inbox,
  trending: TrendingUp,
  activity: Activity,
  star: Star,
  award: Award,
  trophy: Trophy,
  target: Target,
  pieChart: PieChart,
  barChart: BarChart3,
  barChart3: BarChart3,
  lineChart: LineChart,
  heart: Heart,
  alert: AlertCircle,
  check: CheckCircle,
  checkCircle: CheckCircle,
  userCheck: UserCheck,
  userPlus: UserPlus,
  userMinus: UserMinus,
  userX: UserX,
  building: Building2,
  buildingIcon: Building,
  landmark: Landmark,
  bell: Bell,
  message: MessageSquare,
  send: Send,
  mail: Mail,
  phone: Phone,
  mapPin: MapPin,
  globe: Globe,
  link: LinkIcon,
  share: Share2,
  copy: Copy,
  download: Download,
  upload: Upload,
  edit: Edit,
  eye: Eye,
  eyeOff: EyeOff,
  trash: Trash,
  database: Database,
  server: Server,
  monitor: Monitor,
  smartphone: Smartphone,
  printer: Printer,
  package: Package,
  box: Box,
  image: Image,
  video: Video,
  music: Music,
  mic: Mic,
  camera: Camera,
  folderKanban: FolderKanban,
  kanban: Kanban,
  plusCircle: PlusCircle,
  minusCircle: MinusCircle,
  // Livestream icons
  tv: Tv,
  radio: Radio,
  coins: Coins,
  calendarcheck: CalendarCheck,
  // Workflow icons
  gitbranch: GitBranch,
  workflow: GitBranch,
  play: Play,
  tasks: ListChecks,
  checklist: CheckSquare,
  chart: TrendingUp,
  analytics: TrendingUp,
  palette: Palette,
}

export function getMenuIcon(name) {
  if (!name || typeof name !== 'string') return Clipboard
  if (rawIconMap[name]) return rawIconMap[name]
  const lower = name.toLowerCase()
  if (rawIconMap[lower]) return rawIconMap[lower]
  const clean = lower.replace(/[-_\s]/g, '')
  if (rawIconMap[clean]) return rawIconMap[clean]
  for (const k of Object.keys(rawIconMap)) {
    if (k.toLowerCase() === lower || k.toLowerCase() === clean) {
      return rawIconMap[k]
    }
  }
  return Clipboard
}

export const ICON_MAP = new Proxy(rawIconMap, {
  get(target, prop) {
    if (typeof prop !== 'string') return target[prop]
    if (prop in target) return target[prop]
    return getMenuIcon(prop)
  }
})

export const DEFAULT_MENUS = [
  { id: 1, key: "dashboard", permissionKey: "dashboard_view", label: "Dashboard", icon: "home", href: "/dashboard", roles: '["*"]', departments: '["*"]', order: 0, active: true },
  { id: 10, key: "ess", label: "ESS", icon: "user", roles: '["*"]', order: 2, active: true },
  { id: 101, key: "ess-profile", permissionKey: "ess_profile", label: "My Profile", icon: "user", href: "/ess/profile", parentId: 10, roles: '["*"]', order: 1, active: true },
  { id: 102, key: "ess-onboarding", permissionKey: "ess_onboarding", label: "My Onboarding", icon: "clipboard", href: "/ess/onboarding", parentId: 10, roles: '["*"]', order: 2, active: true },
  { id: 103, key: "ess-clock", permissionKey: "ess_clock", label: "Clock In/Out", icon: "clock", href: "/ess/clock", parentId: 10, roles: '["*"]', order: 3, active: true },
  { id: 104, key: "ess-calendar", permissionKey: "ess_calendar", label: "My Calendar", icon: "calendar", href: "/ess/calendar", parentId: 10, roles: '["*"]', order: 4, active: true },
  { id: 105, key: "ess-attendance", permissionKey: "ess_attendance", label: "My Attendance", icon: "calendar", href: "/ess/attendance", parentId: 10, roles: '["*"]', order: 5, active: true },
  { id: 106, key: "ess-leave", permissionKey: "ess_leave_apply", label: "Apply Leave", icon: "calendar", href: "/ess/apply-leave", parentId: 10, roles: '["*"]', order: 6, active: true },
  { id: 107, key: "ess-leave-balance", permissionKey: "ess_leave_balance", label: "Leave Balance", icon: "calendar", href: "/ess/leave-balance", parentId: 10, roles: '["*"]', order: 7, active: true },
  { id: 108, key: "ess-payslip", permissionKey: "ess_payslip", label: "Payslip", icon: "dollar", href: "/ess/payslip", parentId: 10, roles: '["*"]', departments: '["*"]', order: 8, active: true },
  { id: 109, key: "ess-livestream", permissionKey: "ess_livestream", label: "Live Streaming Host", icon: "video", href: "/ess/livestream", parentId: 10, roles: '["*"]', departments: '["Live Streaming","Livestream"]', order: 9, active: true },
  { id: 110, key: "ess-overtime", permissionKey: "ess_overtime", label: "Apply Overtime", icon: "clock", href: "/ess/overtime", parentId: 10, roles: '["*"]', departments: '["*"]', order: 10, active: true },

  { id: 20, key: "lms", label: "Learning", icon: "book", roles: '["hr_officer","hr_manager","manager","superadmin"]', order: 3, active: true },
  { id: 201, key: "lms-dashboard", permissionKey: "lms_dashboard", label: "Dashboard", icon: "book", href: "/ess/learning/dashboard", parentId: 20, roles: '["hr_officer","hr_manager","manager","superadmin"]', order: 1, active: true },
  { id: 202, key: "lms-catalog", permissionKey: "lms_catalog", label: "Course Catalog", icon: "book", href: "/ess/learning/catalog", parentId: 20, roles: '["hr_officer","hr_manager","manager","superadmin"]', order: 2, active: true },
  { id: 203, key: "lms-courses", permissionKey: "lms_courses", label: "My Courses", icon: "book", href: "/ess/learning/my-courses", parentId: 20, roles: '["hr_officer","hr_manager","manager","superadmin"]', order: 3, active: true },
  { id: 204, key: "lms-certificates", permissionKey: "lms_certificates", label: "My Certificates", icon: "award", href: "/ess/learning/certificates", parentId: 20, roles: '["hr_officer","hr_manager","manager","superadmin"]', order: 4, active: true },
  { id: 205, key: "lms-leaderboard", permissionKey: "lms_leaderboard", label: "Leaderboard", icon: "trophy", href: "/ess/learning/leaderboard", parentId: 20, roles: '["hr_officer","hr_manager","manager","superadmin"]', order: 5, active: true },

  { id: 30, key: "hr", label: "HR", icon: "users", roles: '["hr","hr_officer","hr_manager","superadmin"]', order: 4, active: true },
  { id: 301, key: "hr-employee", permissionKey: "hr_employee", label: "Employee Data", icon: "users", href: "/hr/employee", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', order: 1, active: true },
  { id: 311, key: "hr-attendance", permissionKey: "hr_attendance", label: "Attendance Management", icon: "calendarClock", href: "/hr/attendance", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', departments: '["*"]', order: 2, active: true },
  { id: 315, key: "hr-geofencing", permissionKey: "hr_geofencing", label: "Geofencing & Lokasi Sales", icon: "mapPin", href: "/sysadmin/settings/work-location?tab=geofencing", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', departments: '["*"]', order: 3, active: true },
  { id: 302, key: "hr-leave", permissionKey: "hr_leave", label: "Leave Management", icon: "calendar", href: "/hr/apply-leave", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', order: 4, active: true },
  { id: 313, key: "hr-leave-report", permissionKey: "hr_leave_report", label: "Leave Report (Laporan Cuti)", icon: "chart", href: "/hr/leave-report", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', order: 5, active: true },
  { id: 314, key: "hr-overtime", permissionKey: "hr_overtime", label: "Overtime Management", icon: "clock", href: "/hr/overtime", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', order: 6, active: true },
  { id: 303, key: "hr-recruitment", permissionKey: "hr_recruitment", label: "Recruitment", icon: "userCheck", href: "/hr/recruitment/job-requisition", parentId: 30, roles: '["hr","hr_manager","superadmin"]', order: 7, active: true },
  { id: 304, key: "hr-onboarding", permissionKey: "hr_onboarding", label: "Onboarding", icon: "clipboard", href: "/hr/onboarding/tracker", parentId: 30, roles: '["hr","hr_manager","superadmin"]', order: 8, active: true },
  { id: 305, key: "hr-payroll", permissionKey: "hr_payroll", label: "Payroll", icon: "dollar", href: "/hr/payroll/ho-calculator", parentId: 30, roles: '["hr","hr_manager","superadmin"]', order: 9, active: true },
  { id: 3050, key: "hr-payroll-ho-calculator", permissionKey: "hr_payroll_ho_calculator", label: "Kalkulator Payroll HO", icon: "calculator", href: "/hr/payroll/ho-calculator", parentId: 305, roles: '["hr","hr_manager","superadmin"]', order: 1, active: true },
  { id: 3051, key: "hr-payroll-odoo-sync", permissionKey: "hr_payroll_odoo_sync", label: "Integrasi Odoo Payroll", icon: "link", href: "/hr/payroll/odoo-sync", parentId: 305, roles: '["hr","hr_manager","superadmin"]', order: 2, active: true },
  { id: 3052, key: "hr-payroll-setup", permissionKey: "hr_payroll_setup", label: "Setup Komponen Gaji", icon: "settings", href: "/hr/payroll/setup", parentId: 305, roles: '["hr","hr_manager","superadmin"]', order: 3, active: true },
  { id: 306, key: "hr-performance", permissionKey: "hr_performance", label: "Performance", icon: "trending", href: "/hr/performance", parentId: 30, roles: '["hr","hr_manager","superadmin"]', order: 10, active: true },
  { id: 307, key: "hr-talent", permissionKey: "hr_talent", label: "Talent", icon: "star", href: "/hr/talent", parentId: 30, roles: '["hr","hr_manager","superadmin"]', order: 11, active: true },
  { id: 308, key: "hr-org-chart", permissionKey: "hr_org_chart", label: "Org Chart", icon: "building", href: "/hr/org-chart", parentId: 30, roles: '["*"]', order: 12, active: true },
  { id: 309, key: "hr-livestream-schedule", permissionKey: "hr_livestream_schedule", label: "Livestream Schedule", icon: "calendarcheck", href: "/hr/livestream/schedule", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', order: 13, active: true },
  { id: 310, key: "hr-livestream-payroll", permissionKey: "hr_livestream_payroll", label: "Livestream Payroll", icon: "coins", href: "/hr/livestream/payroll", parentId: 30, roles: '["hr","hr_manager","superadmin"]', order: 14, active: true },
  { id: 312, key: "hr-holiday-calendar", permissionKey: "hr_holiday_calendar", label: "Kalender Hari Libur", icon: "calendar", href: "/hr/absence/holiday-calendar", parentId: 30, roles: '["hr","hr_officer","hr_manager","superadmin"]', departments: '["*"]', order: 15, active: true },

  { id: 40, key: "mss", label: "MSS", icon: "briefcase", roles: '["manager","hr_manager","superadmin"]', order: 5, active: true },
  { id: 401, key: "mss-attendance", permissionKey: "mss_attendance", label: "Team Attendance", icon: "calendar", href: "/mss/team-attendance", parentId: 40, roles: '["manager","hr_manager","superadmin"]', order: 1, active: true },
  { id: 402, key: "mss-leave", permissionKey: "mss_leave", label: "Approve Leave", icon: "calendar", href: "/mss/approve-leave", parentId: 40, roles: '["manager","hr_manager","superadmin"]', order: 2, active: true },
  { id: 403, key: "mss-performance", permissionKey: "mss_performance", label: "Performance", icon: "trending", href: "/mss/performance", parentId: 40, roles: '["manager","hr_manager","superadmin"]', order: 3, active: true },
  { id: 404, key: "mss-talent", permissionKey: "mss_talent", label: "Talent Review", icon: "star", href: "/mss/talent", parentId: 40, roles: '["manager","hr_manager","superadmin"]', order: 4, active: true },
  { id: 405, key: "mss-approve-overtime", permissionKey: "mss_approve_overtime", label: "Approve Overtime", icon: "checkCircle", href: "/mss/approve-overtime", parentId: 40, roles: '["manager","supervisor","hr_manager","superadmin"]', departments: '["*"]', order: 5, active: true },

  { id: 50, key: "sysadmin", label: "System", icon: "settings", roles: '["superadmin","hr_manager","hr"]', order: 6, active: true },
  { id: 501, key: "sysadmin-users", permissionKey: "system_users", label: "User Management", icon: "users", href: "/sysadmin/users", parentId: 50, roles: '["superadmin"]', order: 1, active: true },
  { id: 508, key: "sysadmin-odoo", permissionKey: "system_odoo", label: "Odoo API", icon: "link", href: "/sysadmin/users/odoo-api", parentId: 50, roles: '["superadmin"]', order: 2, active: true },
  { id: 502, key: "sysadmin-role", permissionKey: "system_role", label: "Role", icon: "shield", href: "/sysadmin/role", parentId: 50, roles: '["superadmin"]', order: 3, active: true },
  { id: 503, key: "sysadmin-permission", permissionKey: "system_permission", label: "Permission", icon: "key", href: "/sysadmin/role/permission", parentId: 50, roles: '["superadmin"]', order: 4, active: true },
  { id: 504, key: "sysadmin-menus", permissionKey: "system_menus", label: "Menu Management", icon: "settings", href: "/sysadmin/menus", parentId: 50, roles: '["superadmin"]', order: 5, active: true },
  { id: 505, key: "sysadmin-leave-workflow", permissionKey: "system_leave_workflow", label: "Leave Settings", icon: "clipboard", href: "/sysadmin/leave-workflow", parentId: 50, roles: '["superadmin"]', order: 6, active: true },
  { id: 506, key: "sysadmin-settings", permissionKey: "system_settings", label: "Settings", icon: "settings", href: "/sysadmin/settings/master-lookup", parentId: 50, roles: '["superadmin"]', order: 7, active: true },
  { id: 507, key: "sysadmin-branding", permissionKey: "system_branding", label: "Branding", icon: "building", href: "/sysadmin/branding/company-logo", parentId: 50, roles: '["superadmin"]', order: 8, active: true },
  { id: 509, key: "sysadmin-workflow-entry", permissionKey: "system_workflow_entry", label: "Workflow Engine", icon: "gitbranch", href: "/sysadmin/workflow", parentId: 50, roles: '["superadmin","sysadmin"]', order: 9, active: true },
  { id: 516, key: "sysadmin-work-location", permissionKey: "system_work_location", label: "Aturan Jam Kerja & Lokasi", icon: "clock", href: "/sysadmin/settings/work-location", parentId: 50, roles: '["superadmin","hr_manager","hr"]', order: 10, active: true },

  // Workflow Management (Flowable + BPMN.js)
  { id: 510, key: "sysadmin-workflow", label: "Workflow Engine", icon: "gitbranch", roles: '["superadmin","sysadmin","hr_manager","hr","hr_officer"]', order: 9, active: true },
  { id: 511, key: "sysadmin-workflow-main", permissionKey: "workflow_engine_main", label: "Workflow Menu", icon: "gitbranch", href: "/sysadmin/workflow", parentId: 510, roles: '["superadmin","sysadmin"]', order: 1, active: true },
  { id: 512, key: "sysadmin-workflow-designer", permissionKey: "workflow_engine_designer", label: "BPMN Designer", icon: "palette", href: "/sysadmin/workflow/designer", parentId: 510, roles: '["superadmin","sysadmin"]', order: 2, active: true },
  { id: 513, key: "sysadmin-workflow-definitions", permissionKey: "workflow_engine_definitions", label: "Definitions", icon: "clipboard", href: "/sysadmin/workflow/definitions", parentId: 510, roles: '["superadmin","sysadmin"]', order: 3, active: true },
  { id: 517, key: "sysadmin-workflow-userlists", permissionKey: "workflow_engine_userlists", label: "Userlists (Grup Penyetuju)", icon: "users", href: "/sysadmin/workflow/userlists", parentId: 510, roles: '["superadmin","sysadmin","hr_manager","hr","hr_officer"]', order: 4, active: true },
  { id: 515, key: "sysadmin-workflow-analytics", permissionKey: "workflow_engine_analytics", label: "Workflow Analytics", icon: "trending", href: "/sysadmin/workflow/analytics", parentId: 510, roles: '["superadmin","sysadmin"]', order: 5, active: true },
  { id: 514, key: "sysadmin-workflow-settings", permissionKey: "workflow_engine_settings", label: "Engine Settings", icon: "settings", href: "/sysadmin/workflow/flowable-settings", parentId: 510, roles: '["superadmin","sysadmin"]', order: 6, active: true },

  // User Workflow
  { id: 900, key: "user-workflow", label: "Workflow", icon: "gitbranch", roles: '["*"]', order: 10, active: true },
  { id: 901, key: "user-workflow-tasks", permissionKey: "workflow_tasks", label: "Task Inbox", icon: "tasks", href: "/workflow/tasks", parentId: 900, roles: '["*"]', order: 1, active: true },
  { id: 902, key: "user-workflow-my", permissionKey: "workflow_my_requests", label: "My Requests", icon: "clipboard", href: "/workflow/my-requests", parentId: 900, roles: '["*"]', order: 2, active: true },
  { id: 903, key: "user-workflow-history", permissionKey: "workflow_history", label: "History", icon: "clock", href: "/workflow/history", parentId: 900, roles: '["*"]', order: 3, active: true },
  { id: 904, key: "user-workflow-analytics", permissionKey: "workflow_analytics", label: "Analisa Workflow", icon: "trending", href: "/sysadmin/workflow/analytics", parentId: 900, roles: '["*"]', order: 4, active: true },
]

function parseRoles(str) {
  try { return JSON.parse(str) } catch { return [] }
}

function parseList(str) {
  try {
    if (!str) return []
    if (Array.isArray(str)) return str
    return JSON.parse(str)
  } catch {
    return []
  }
}

function hasAccess(roles, role) {
  return parseRoles(roles).includes("*") || parseRoles(roles).includes(role)
}

function hasDeptAccess(departments, userDept, menuKey, role) {
  // Superadmin dan hr_manager punya akses lihat semua menu untuk keperluan kontrol & audit
  if (!role || role === 'superadmin' || role === 'hr_manager') return true

  let depts = parseList(departments)
  // Fallback bawaan jika kolom departments belum terset di DB
  if (depts.length === 0 || (depts.length === 1 && depts[0] === '*')) {
    if (menuKey === 'ess-livestream') {
      depts = ['Live Streaming', 'Livestream']
    } else {
      return true
    }
  }

  if (depts.includes('*')) return true

  const uDept = String(userDept || '').toLowerCase().trim()
  if (!uDept) return false

  return depts.some(d => {
    const target = String(d || '').toLowerCase().trim()
    return uDept.includes(target) || target.includes(uDept)
  })
}

export function isMenuAllowedForUser(m, role, hasPermissionFn, userDept) {
  if (!m || !m.active) return false
  if (role === 'superadmin') return true

  // Dashboard adalah beranda universal yang selalu dapat diakses semua pengguna yang login
  if (m.key === 'dashboard' || m.href === '/dashboard' || m.permissionKey === 'dashboard_view') return true

  // 1. Cek Hak Akses Role / Permission
  const permKey = resolveMenuPermissionKey(m)
  const roleOk = hasPermissionFn ? hasPermissionFn(role, permKey) : hasAccess(m.roles, role)
  if (!roleOk) return false

  // 2. Cek Filter Departemen
  return hasDeptAccess(m.departments, userDept, m.key, role)
}

export function resolveMenuPermissionKey(m) {
  if (!m) return ''
  if (m.permissionKey) return m.permissionKey
  const defByKey = DEFAULT_MENUS.find(d => d.key === m.key)
  if (defByKey?.permissionKey) return defByKey.permissionKey
  const defByHref = DEFAULT_MENUS.find(d => d.href && d.href === m.href)
  if (defByHref?.permissionKey) return defByHref.permissionKey
  return m.key?.replace(/-/g, '_') || ''
}

export const useMenuStore = create(
  persist(
    (set, get) => ({
      menus: DEFAULT_MENUS,
      dbLoaded: false,
      loading: false,

      // Sync dari PostgreSQL Database
      syncFromDatabase: async () => {
        set({ loading: true })
        try {
          const res = await fetch('/api/menus')
          if (!res.ok) throw new Error('db_unavailable')
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            // Merge with DEFAULT_MENUS and ensure permissionKey & departments are preserved
            const defMap = new Map(DEFAULT_MENUS.map(m => [m.key, m]))
            const enriched = data.map(m => {
              const def = defMap.get(m.key) || DEFAULT_MENUS.find(d => d.href && d.href === m.href)
              return {
                ...m,
                departments: m.departments || def?.departments || '["*"]',
                permissionKey: m.permissionKey || def?.permissionKey || m.key?.replace(/-/g, '_'),
              }
            })
            const dbKeys = new Set(data.map(m => m.key))
            const missing = DEFAULT_MENUS.filter(m => !dbKeys.has(m.key))
            set({ menus: [...enriched, ...missing], dbLoaded: true, loading: false })
          } else {
            set({ loading: false })
          }
        } catch (e) {
          console.warn('Menu DB tidak tersedia, pakai data lokal:', e.message)
          set({ loading: false })
          // dbLoaded tetap false → sidebar pakai DEFAULT_MENUS dari store
        }
      },

      // Sync ke PostgreSQL Database
      syncToDatabase: async () => {
        try {
          const res = await fetch('/api/sync/menu', { method: 'POST' })
          const data = await res.json()
          return data
        } catch (e) {
          return { success: false, error: e.message }
        }
      },

      getSections: (role, hasPermissionFn, userDept) => {
        return get().menus
          .filter(m => {
            if (m.parentId || !m.active) return false
            if (!role || role === 'superadmin') return true

            // Jika section memiliki direct href (misal /dashboard)
            if (m.href) {
              return isMenuAllowedForUser(m, role, hasPermissionFn, userDept)
            }

            // Jika section adalah parent folder: hanya tampil jika memiliki minimal 1 sub-menu aktif yang diizinkan untuk role & dept ini!
            const childItems = get().menus.filter(c => c.parentId === m.id && c.active)
            if (childItems.length === 0) return false

            const hasAllowedChild = childItems.some(item =>
              isMenuAllowedForUser(item, role, hasPermissionFn, userDept)
            )

            if (hasPermissionFn) return hasAllowedChild
            return hasAllowedChild && hasAccess(m.roles, role)
          })
          .sort((a, b) => a.order - b.order)
      },

      getItems: (parentId, role, hasPermissionFn, userDept) => {
        return get().menus
          .filter(m => {
            if (m.parentId !== parentId) return false
            return isMenuAllowedForUser(m, role, hasPermissionFn, userDept)
          })
          .sort((a, b) => a.order - b.order)
      },

      toggleActive: async (id) => {
        const menu = get().menus.find(m => m.id === id)
        if (!menu) return
        const newActive = !menu.active
        // Update store dulu (optimistic)
        set(s => ({
          menus: s.menus.map(m => m.id === id ? { ...m, active: newActive } : m)
        }))
        // Write-through ke DB
        try {
          await fetch(`/api/menus/${id}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...menu, active: newActive }),
          })
        } catch {}
      },

      resetToDefault: () => {
        set({ menus: DEFAULT_MENUS, dbLoaded: false })
      },

      addMenu: async (menu) => {
        // Coba simpan ke DB dulu, pakai id dari DB
        try {
          const res = await fetch('/api/menus', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(menu),
          })
          if (res.ok) {
            const created = await res.json()
            set(s => ({ menus: [...s.menus, created] }))
            return created
          }
        } catch {}
        // Fallback: simpan lokal saja jika DB tidak tersedia
        const newId = Math.max(0, ...get().menus.map(m => m.id)) + 1
        const newMenu = { ...menu, id: newId }
        set(s => ({ menus: [...s.menus, newMenu] }))
        return newMenu
      },

      updateMenu: async (id, data) => {
        // Update store dulu (optimistic)
        set(s => ({
          menus: s.menus.map(m => m.id === id ? { ...m, ...data } : m)
        }))
        // Write-through ke DB
        try {
          await fetch(`/api/menus/${id}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data),
          })
        } catch {}
      },

      deleteMenu: async (id) => {
        // Update store dulu (optimistic)
        set(s => ({
          menus: s.menus.filter(m => m.id !== id && m.parentId !== id)
        }))
        // Write-through ke DB
        try {
          await fetch(`/api/menus/${id}`, { method: 'DELETE' })
        } catch {}
      },
    }),
    {
      name: "hcm-menus",
      version: 5,
      migrate: (persistedState, version) => {
        const existing = persistedState?.menus || []
        const existingKeys = new Set(existing.map((m) => m.key))
        const missing = DEFAULT_MENUS.filter((m) => !existingKeys.has(m.key))
        const updated = existing.map(m => {
          if (m.key === 'sysadmin-workflow') {
            return { ...m, roles: '["superadmin","sysadmin","hr_manager","hr","hr_officer"]' }
          }
          if (m.key === 'sysadmin-workflow-userlists') {
            return { ...m, roles: '["superadmin","sysadmin","hr_manager","hr","hr_officer"]', permissionKey: 'workflow_engine_userlists' }
          }
          if (m.key === 'sysadmin') {
            return { ...m, roles: '["superadmin","hr_manager","hr"]' }
          }
          if (m.key === 'sysadmin-work-location') {
            return { ...m, roles: '["superadmin","hr_manager","hr"]', permissionKey: 'system_work_location' }
          }
          if (m.key === 'hr-geofencing') {
            return { ...m, roles: '["hr","hr_officer","hr_manager","superadmin"]', permissionKey: 'hr_geofencing' }
          }
          if (m.key === 'hr-payroll') {
            return { ...m, href: '/hr/payroll/ho-calculator' }
          }
          if (m.key === 'hr-payroll-odoo-sync') {
            return { ...m, order: 2 }
          }
          if (m.key === 'hr-payroll-setup') {
            return { ...m, order: 3 }
          }
          return m
        })
        return {
          ...persistedState,
          menus: [...updated, ...missing],
          dbLoaded: false,
        }
      },
    }
  )
)
