import { HR_ROLES } from '@/constants/roles'

// The four role dashboards on the Home page, shared by dashboard/page.jsx
// (renders them) and preferences/page.jsx (toggles them) so the two can never
// disagree about what exists, what it contains, or who may see it.
//
// Labels are [indonesian, english] tuples — the caller applies t().
// `chart: true` marks a widget whose shape the user may switch between bar and
// pie (prefs.chartType); widgets without it aren't charts at all.
export const DASHBOARDS = [
  {
    id: 'ess',
    showKey: 'showEssDashboard',
    orderKey: 'essDashboard',
    label: ['ESS Dashboard', 'ESS Dashboard'],
    hint: ['Data diri kamu sendiri.', 'Your own self-service data.'],
    widgets: [
      { key: 'leaveBalance', label: ['Leave Balance', 'Leave Balance'] },
      { key: 'leaveChart',   label: ['Grafik Cuti Saya', 'My Leave Usage'], chart: true },
    ],
  },
  {
    id: 'mss',
    showKey: 'showMssDashboard',
    orderKey: 'mssDashboard',
    label: ['MSS Dashboard', 'MSS Dashboard'],
    hint: ['Data tim yang kamu pimpin.', 'Data for the team you manage.'],
    widgets: [
      { key: 'teamLeaveChart', label: ['Grafik Status Approval Tim', "Team's Leave Status"], chart: true },
    ],
  },
  {
    id: 'hr',
    showKey: 'showHrDashboard',
    orderKey: 'hrDashboard',
    label: ['HR Dashboard', 'HR Dashboard'],
    hint: ['Data kepegawaian seluruh organisasi.', 'Organisation-wide people data.'],
    widgets: [
      { key: 'headcountChart',      label: ['Grafik Headcount per Departemen', 'Headcount by Department'], chart: true },
      { key: 'demographyGender',    label: ['Demografi — Jenis Kelamin', 'Demography — Gender'], chart: true },
      { key: 'demographyReligion',  label: ['Demografi — Agama', 'Demography — Religion'], chart: true },
      { key: 'demographyAge',       label: ['Demografi — Usia', 'Demography — Age'], chart: true },
      { key: 'demographyCompany',   label: ['Demografi — Perusahaan', 'Demography — Company'], chart: true },
    ],
  },
  {
    id: 'superadmin',
    showKey: 'showSuperadminDashboard',
    orderKey: 'superadminDashboard',
    label: ['Superadmin Dashboard', 'Superadmin Dashboard'],
    hint: ['Data sistem dan pengguna.', 'System and user data.'],
    widgets: [
      { key: 'userRoleChart', label: ['Grafik Distribusi Role Pengguna', 'User Role Distribution'], chart: true },
    ],
  },
]

// Who may see each dashboard at all — mirrors the sidebar's own gating
// (canMgr / canHR / canSA in components/layout/Sidebar.jsx) so a user sees the
// dashboard for exactly the modules they can already open.
export function accessibleDashboards({ role, hasDirectReports }) {
  const canMss = role === 'manager' || role === 'superadmin' || hasDirectReports
  const canHr  = HR_ROLES.includes(role)
  const canSa  = role === 'superadmin'
  const allowed = { ess: true, mss: canMss, hr: canHr, superadmin: canSa }
  return DASHBOARDS.filter(d => allowed[d.id])
}
