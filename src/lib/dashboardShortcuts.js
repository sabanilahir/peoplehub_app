// Shared between the Dashboard page and the Homepage Preferences page —
// role-aware shortcut definitions and their icon set.

/* ── Shortcut SVG icons (professional line set) ────────────────────────────── */
const S = (paths) => (
  <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>{paths}</svg>
)
export const SICONS = {
  user:        S(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2'/><circle cx='12' cy='7' r='4'/></>),
  users:       S(<><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'/></>),
  userPlus:    S(<><path d='M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/><line x1='19' y1='8' x2='19' y2='14'/><line x1='22' y1='11' x2='16' y2='11'/></>),
  calendar:    S(<><rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></>),
  money:       S(<><rect x='2' y='5' width='20' height='14' rx='2'/><circle cx='12' cy='12' r='3'/><line x1='6' y1='12' x2='6.01' y2='12'/><line x1='18' y1='12' x2='18.01' y2='12'/></>),
  chat:        S(<><path d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'/></>),
  book:        S(<><path d='M4 19.5A2.5 2.5 0 016.5 17H20'/><path d='M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'/></>),
  target:      S(<><circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='6'/><circle cx='12' cy='12' r='2'/></>),
  clock:       S(<><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></>),
  sitemap:     S(<><rect x='9' y='2' width='6' height='5' rx='1'/><rect x='2' y='17' width='6' height='5' rx='1'/><rect x='16' y='17' width='6' height='5' rx='1'/><path d='M12 7v4M5 17v-2a1 1 0 011-1h12a1 1 0 011 1v2'/></>),
  checkCircle: S(<><path d='M22 11.08V12a10 10 0 11-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></>),
  clipboard:   S(<><path d='M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2'/><rect x='8' y='2' width='8' height='4' rx='1'/></>),
  barChart:    S(<><line x1='18' y1='20' x2='18' y2='10'/><line x1='12' y1='20' x2='12' y2='4'/><line x1='6' y1='20' x2='6' y2='14'/></>),
  bookmark:    S(<><path d='M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z'/></>),
  workflow:    S(<><circle cx='18' cy='18' r='3'/><circle cx='6' cy='6' r='3'/><path d='M13 6h3a2 2 0 012 2v7'/><line x1='6' y1='9' x2='6' y2='21'/></>),
  palette:     S(<><circle cx='13.5' cy='6.5' r='.5' fill='currentColor'/><circle cx='17.5' cy='10.5' r='.5' fill='currentColor'/><circle cx='8.5' cy='7.5' r='.5' fill='currentColor'/><circle cx='6.5' cy='12.5' r='.5' fill='currentColor'/><path d='M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z'/></>),
  settings:    S(<><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'/></>),
}

/* ── Menu shortcut definitions (role-aware) ────────────────────────────────── */
export const ALL_SHORTCUTS = {
  employee: [
    { id: 'personal',  label: 'Personal Information', icon: 'user',        href: '/ess/personal-info' },
    { id: 'leave',     label: 'Leave Request',         icon: 'calendar',    href: '/ess/leave' },
    { id: 'payslip',   label: 'Payslip',               icon: 'money',       href: '/ess/payslip' },
    { id: 'checkin',   label: 'Performance Check-In',  icon: 'chat',        href: '/ess/check-in' },
    { id: 'learning',  label: 'Learning',              icon: 'book',        href: '/ess/learning' },
    { id: 'goals',     label: 'Performance Goals',     icon: 'target',      href: '/ess/performance-goals' },
    { id: 'timecard',  label: 'Attendance',            icon: 'clock',       href: '/ess/attendance' },
    { id: 'orgchart',  label: 'Organization',          icon: 'sitemap',     href: '/hr/orgchart' },
  ],
  manager: [
    { id: 'approval',  label: 'Leave Approval',         icon: 'checkCircle', href: '/mss/leave-approval' },
    { id: 'checkin',   label: 'Team Check-In',          icon: 'chat',        href: '/mss/check-in' },
    { id: 'personal',  label: 'Personal Information',   icon: 'user',        href: '/ess/personal-info' },
    { id: 'leave',     label: 'My Leave',               icon: 'calendar',    href: '/ess/leave' },
    { id: 'goals',     label: 'Performance Goals',      icon: 'target',      href: '/ess/performance-goals' },
    { id: 'orgchart',  label: 'Organization',           icon: 'sitemap',     href: '/hr/orgchart' },
  ],
  hr: [
    { id: 'employee',  label: 'Employee',              icon: 'user',        href: '/hr/employee' },
    { id: 'headcount', label: 'Headcount',             icon: 'barChart',    href: '/hr/headcount' },
    { id: 'leave',     label: 'Leave Management',      icon: 'calendar',    href: '/hr/leave' },
    { id: 'onboarding',label: 'Onboarding',            icon: 'userPlus',    href: '/hr/onboarding' },
    { id: 'payroll',   label: 'Payroll',               icon: 'money',       href: '/hr/payroll' },
    { id: 'orgchart',  label: 'Organization',          icon: 'sitemap',     href: '/hr/orgchart' },
    { id: 'learning',  label: 'Learning',              icon: 'book',        href: '/hr/learning' },
    { id: 'position',  label: 'Position',              icon: 'bookmark',    href: '/hr/position' },
  ],
  superadmin: [
    { id: 'users',     label: 'Users',                 icon: 'users',       href: '/sysadmin/users' },
    { id: 'workflow',  label: 'Workflow',              icon: 'workflow',    href: '/sysadmin/workflow/settings' },
    { id: 'branding',  label: 'Branding',              icon: 'palette',     href: '/sysadmin/branding' },
    { id: 'employee',  label: 'Employee',              icon: 'user',        href: '/hr/employee' },
    { id: 'leave',     label: 'Leave Management',      icon: 'calendar',    href: '/hr/leave' },
    { id: 'payroll',   label: 'Payroll',               icon: 'money',       href: '/hr/payroll' },
    { id: 'settings',  label: 'Settings',              icon: 'settings',    href: '/sysadmin/settings/workflow' },
    { id: 'orgchart',  label: 'Organization',          icon: 'sitemap',     href: '/hr/orgchart' },
  ],
}
