'use client'
import Icon from '@/components/ui/Icon'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'

// ─── Static page index ────────────────────────────────────────────────────────
const PAGES = [
  // Dashboard
  { label: 'Dashboard',                  href: '/dashboard',                                    icon: '🏠', section: 'Dashboard' },
  // ESS
  { label: 'Apply Leave',                href: '/ess/apply-leave',                              icon: '📝', section: 'Employee Self-Service' },
  { label: 'Leave Balance',              href: '/ess/leave-balance',                            icon: '📊', section: 'Employee Self-Service' },
  { label: 'Attendance',                 href: '/ess/attendance',                               icon: '🕐', section: 'Employee Self-Service' },
  { label: 'Payslip',                    href: '/ess/payslip',                                  icon: '💰', section: 'Employee Self-Service' },
  { label: 'My Onboarding',              href: '/ess/onboarding',                               icon: '🎯', section: 'Employee Self-Service' },
  // MSS
  { label: 'Apply Leave (My Team)',      href: '/mss/apply-leave-team',                         icon: '📝', section: 'Manager Self-Service' },
  { label: 'Approve Leave',             href: '/mss/approve-leave',                            icon: '✅', section: 'Manager Self-Service' },
  { label: 'Onboarding Tim Saya',       href: '/mss/approve-onboarding',                       icon: '📋', section: 'Manager Self-Service' },
  { label: 'Team Attendance',           href: '/mss/team-attendance',                          icon: '📋', section: 'Manager Self-Service' },
  // HR - Employee
  { label: 'Emergency SOS Log',         href: '/hr/emergency-sos',                             icon: '🆘', section: 'HR Administration' },
  { label: 'Employee Data',             href: '/hr/employee',                                  icon: '📋', section: 'HR Administration' },
  { label: 'Apply Leave (HR)',          href: '/hr/apply-leave',                               icon: '📝', section: 'HR Administration' },
  { label: 'Org Chart',                 href: '/hr/org-chart',                                 icon: '🌳', section: 'HR Administration' },
  // HR - Recruitment
  { label: 'Career Site Setup',         href: '/hr/recruitment/career-site-setup',             icon: '🌐', section: 'HR · Recruitment' },
  { label: 'Job Requisition',           href: '/hr/recruitment/job-requisition',               icon: '💼', section: 'HR · Recruitment' },
  { label: 'Candidate Pipeline',        href: '/hr/recruitment/candidate-pipeline',            icon: '🔀', section: 'HR · Recruitment' },
  { label: 'Interview Schedule',        href: '/hr/recruitment/interview-schedule',            icon: '🎥', section: 'HR · Recruitment' },
  { label: 'Candidate Database',        href: '/hr/recruitment/candidate-database',            icon: '🗂️', section: 'HR · Recruitment' },
  { label: 'Psychotest',                href: '/hr/recruitment/psychotest',                    icon: '🧠', section: 'HR · Recruitment' },
  { label: 'Hasil Psychotest',          href: '/hr/recruitment/psychotest/results',            icon: '📊', section: 'HR · Recruitment' },
  // HR - Personnel Action
  { label: 'Personnel Action',          href: '/hr/employee/personnel-action',                  icon: '🔄', section: 'HR · Personnel Action' },
  { label: 'Promote',                   href: '/hr/employee/personnel-action/promote',          icon: '⬆️', section: 'HR · Personnel Action' },
  { label: 'Transfer',                  href: '/hr/employee/personnel-action/transfer',         icon: '↔️', section: 'HR · Personnel Action' },
  { label: 'Demote',                    href: '/hr/employee/personnel-action/demote',           icon: '⬇️', section: 'HR · Personnel Action' },
  { label: 'Transfer Across Company',   href: '/hr/employee/personnel-action/transfer-across-company', icon: '🏢', section: 'HR · Personnel Action' },
  { label: 'Terminate',                 href: '/hr/employee/personnel-action/terminate',        icon: '🚪', section: 'HR · Personnel Action' },
  { label: 'Rehire',                    href: '/hr/employee/personnel-action/rehire',           icon: '🔄', section: 'HR · Personnel Action' },
  { label: 'Change Employment Type',    href: '/hr/employee/personnel-action/change-employment-type', icon: '📋', section: 'HR · Personnel Action' },
  { label: 'Extend Contract',           href: '/hr/employee/personnel-action/extend-contract',  icon: '📅', section: 'HR · Personnel Action' },
  // HR - Structure
  { label: 'Enterprise',                href: '/hr/structure/enterprise',                      icon: '🌐', section: 'HR · Structure' },
  { label: 'Division',                  href: '/hr/structure/division',                        icon: '🏛️', section: 'HR · Structure' },
  { label: 'Company',                   href: '/hr/structure/company',                         icon: '🏠', section: 'HR · Structure' },
  { label: 'Business Unit',             href: '/hr/structure/business-unit',                   icon: '💼', section: 'HR · Structure' },
  { label: 'Department',                href: '/hr/structure/department',                      icon: '🗂️', section: 'HR · Structure' },
  { label: 'Job Family',                href: '/hr/structure/job-family',                      icon: '🧩', section: 'HR · Structure' },
  { label: 'Position',                  href: '/hr/structure/position',                        icon: '📌', section: 'HR · Structure' },
  { label: 'Position Profile',          href: '/hr/structure/position-profile',                icon: '🎯', section: 'HR · Structure' },
  { label: 'Headcount',                 href: '/hr/structure/headcount',                       icon: '👤', section: 'HR · Structure' },
  { label: 'RKTK',                      href: '/hr/people-planning/rktk',                      icon: '📊', section: 'HR · People Planning' },
  { label: 'Adjustment Planning',       href: '/hr/people-planning/adjustment-planning',       icon: '🧮', section: 'HR · People Planning' },
  { label: 'Org Tree',                  href: '/hr/org-tree',                                  icon: '🌲', section: 'HR · Structure' },
  // HR - Onboarding
  { label: 'Employee Onboarding (HR)',   href: '/hr/onboarding/tracker',                        icon: '📋', section: 'HR · Onboarding' },
  { label: 'Master Onboarding',         href: '/hr/onboarding/master',                         icon: '📄', section: 'HR · Onboarding' },
  { label: 'Laporan Onboarding',        href: '/hr/onboarding/laporan',                        icon: '📊', section: 'HR · Onboarding' },
  // HR - Time & Labour
  { label: 'Shift Setting',             href: '/hr/time-labour/shift-setting',                 icon: '🕐', section: 'HR · Time & Labor' },
  { label: 'Shift Pattern',             href: '/hr/time-labour/shift-pattern',                 icon: '🔄', section: 'HR · Time & Labor' },
  { label: 'Work Schedule',             href: '/hr/time-labour/work-schedule',                 icon: '📆', section: 'HR · Time & Labor' },
  { label: 'Schedule Assignment',       href: '/hr/time-labour/schedule-assignment',           icon: '🔗', section: 'HR · Time & Labor' },
  { label: 'Time Entries',      href: '/hr/time-labour/time-entries',      icon: '📥', section: 'HR · Time & Labor' },
  { label: 'Eligibility Group', href: '/hr/time-labour/eligibility-group', icon: '🧩', section: 'HR · Time & Labor' },
  { label: 'Overtime Matrix',   href: '/hr/time-labour/overtime-matrix',   icon: '📐', section: 'HR · Time & Labor' },
  // HR - Absence
  { label: 'Holiday Calendar',          href: '/hr/absence/holiday-calendar',                  icon: '📅', section: 'HR · Absence' },
  // HR - Payroll
  { label: 'Payroll (Odoo Sync)',       href: '/hr/payroll/odoo-sync',                         icon: '💼', section: 'HR · Payroll' },
  { label: 'Payroll Run',               href: '/hr/payroll/run',                               icon: '💼', section: 'HR · Payroll' },
  { label: 'Payroll Setup',             href: '/hr/payroll/setup',                             icon: '🧾', section: 'HR · Payroll' },
  { label: 'Payroll Settings',          href: '/hr/payroll/settings',                           icon: '⚙️', section: 'HR · Payroll' },
  // Sysadmin
  { label: 'User Management',           href: '/sysadmin/users',                               icon: '👥', section: 'System Administration' },
  { label: 'Master Lookup',             href: '/sysadmin/settings/master-lookup',              icon: '🗂️', section: 'System Administration' },
  { label: 'Master Document Types',     href: '/sysadmin/settings/master-document-types',      icon: '🗂️', section: 'System Administration' },
  { label: 'Batas SOS Serentak',        href: '/sysadmin/settings/emergency-sos-limit',        icon: '🆘', section: 'System Administration' },
  { label: 'Leave Workflow',            href: '/sysadmin/leave-workflow',                      icon: '🔀', section: 'System Administration' },
  { label: 'Workflow Settings',         href: '/sysadmin/workflow/settings',                   icon: '⚙️', section: 'System Administration' },
  { label: 'Userlists',                 href: '/sysadmin/workflow/userlists',                  icon: '👥', section: 'System Administration' },
  { label: 'Transaction Manager',       href: '/sysadmin/workflow/transaction-manager',        icon: '🗂️', section: 'System Administration' },
  { label: 'Company Logo',              href: '/sysadmin/branding/company-logo',               icon: '🖼️', section: 'System Administration' },
  { label: 'Login Theme',               href: '/sysadmin/branding/login-theme',                icon: '🎭', section: 'System Administration' },
  { label: 'Career Site',               href: '/sysadmin/branding/career-site',                icon: '🌐', section: 'System Administration' },
]

export default function GlobalSearch() {
  const t      = useT()
  const router = useRouter()
  const { employees } = useEmployeeStore()
  const { positions, departments, companies } = useStructureStore()

  const posName     = (id) => positions.find(p  => p.id  === +id)?.name       || ''
  const deptName    = (id) => departments.find(d => d.id  === +id)?.name       || ''
  const companyCode = (id) => companies.find(c  => c.id  === +id)?.companyCode || ''

  const [query,  setQuery ] = useState('')
  const [open,   setOpen  ] = useState(false)
  const [cursor, setCursor] = useState(-1)
  // Below `sm`, the inline w-72 bar doesn't fit alongside the logo + topbar
  // controls (SOS/bell/avatar) — it collapses to an icon that expands into
  // a full-width overlay instead of pushing everything else off-screen.
  const [mobileOpen, setMobileOpen] = useState(false)
  const inputRef = useRef()
  const boxRef   = useRef()

  const q = query.trim().toLowerCase()

  const matchedPages = q.length < 1 ? [] : PAGES.filter(p =>
    p.label.toLowerCase().includes(q) ||
    p.section.toLowerCase().includes(q)
  ).slice(0, 6)

  const matchedEmps = q.length < 1 ? [] : employees.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.nik.toLowerCase().includes(q)
  ).slice(0, 5)

  const totalResults = matchedPages.length + matchedEmps.length

  const flatResults = [
    ...matchedEmps.map(e => ({ type: 'employee', ...e })),
    ...matchedPages.map(p => ({ type: 'page',     ...p })),
  ]

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setMobileOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKey = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flatResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault(); navigate(flatResults[cursor])
    }
  }

  const navigate = (item) => {
    setOpen(false); setQuery(''); setCursor(-1)
    if (item.type === 'employee') router.push(`/hr/employee?id=${item.id}`)
    else                          router.push(item.href)
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    setOpen(true)
    setCursor(-1)
  }

  return (
    <>
      {/* Mobile: collapsed to a single icon so it doesn't push SOS/bell/avatar
          off-screen — tapping it opens the same search as a full-width overlay. */}
      {!mobileOpen && (
        <button onClick={() => { setMobileOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className='flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 sm:hidden'
          aria-label={t('Cari', 'Search')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      )}

      <div ref={boxRef}
        className={`relative sm:static sm:z-auto sm:block sm:w-72 sm:bg-transparent sm:p-0 sm:shadow-none ${
          mobileOpen ? 'fixed inset-x-0 top-0 z-[200] bg-white p-3 shadow-md' : 'hidden'
        }`}>
      <div className='flex items-center gap-2 bg-white/15 border border-white/20 rounded-lg px-3 py-1.5 hover:border-white/40 hover:bg-white/20 transition focus-within:border-white focus-within:bg-white text-white focus-within:text-gray-800'>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/80 group-focus-within:text-gray-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query) setOpen(true) }}
          onKeyDown={handleKey}
          placeholder={t('Cari karyawan, halaman… (Ctrl+K)', 'Search employees, pages… (Ctrl+K)')}
          className='flex-1 bg-transparent text-white focus:text-gray-800 text-xs placeholder-white/70 focus:placeholder-gray-400 outline-none'
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); setCursor(-1) }}
            className='text-white/70 hover:text-white text-xs'><Icon e='✕' size={15} /></button>
        )}
        {!query && (
          <kbd className='hidden text-white/80 text-[11px] bg-white/20 border border-white/25 px-1.5 py-0.5 rounded font-mono sm:inline'>⌘K</kbd>
        )}
        {mobileOpen && (
          <button onClick={() => { setMobileOpen(false); setOpen(false); setQuery(''); setCursor(-1) }}
            className='text-gray-400 hover:text-gray-600 text-xs sm:hidden'><Icon e='✕' size={15} /></button>
        )}
      </div>

      {open && q.length > 0 && (
        <div className='absolute top-full mt-2 left-0 w-[calc(100vw-1.5rem)] max-w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[999]'>

          {totalResults === 0 && (
            <div className='px-5 py-6 text-center text-gray-400 text-sm'>
              {t('Tidak ada hasil untuk', 'No results for')} <span className='font-semibold text-gray-600'>"{query}"</span>
            </div>
          )}

          {matchedEmps.length > 0 && (
            <div>
              <div className='px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide'>
                <Icon e='👤' size={14} className='inline align-[-2px]' /> {t('Karyawan', 'Employees')}
              </div>
              {matchedEmps.map((e, i) => (
                <button key={e.id} onClick={() => navigate({ type:'employee', ...e })}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${cursor===i ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                  <div className='w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 text-[10px] font-bold text-white'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {e.photo
                      ? <img src={e.photo} className='w-full h-full object-cover' />
                      : (e.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
                    }
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-semibold text-gray-800'>
                        <Highlight text={e.name} q={q} />
                      </span>
                      {companyCode(e.companyId) && (
                        <span className='font-mono font-bold text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded tracking-widest flex-shrink-0'>
                          {companyCode(e.companyId)}
                        </span>
                      )}
                    </div>
                    <div className='text-xs text-gray-400'>
                      <Highlight text={e.nik} q={q} />
                      {posName(e.positionId)    && <> · <span className='text-gray-600'>{posName(e.positionId)}</span></>}
                      {deptName(e.departmentId) && <> · {deptName(e.departmentId)}</>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${e.status==='Active'?'bg-green-100 text-green-600':'bg-red-100 text-red-500'}`}>
                    {e.employmentType || 'Permanent'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {matchedPages.length > 0 && (
            <div className={matchedEmps.length > 0 ? 'border-t border-gray-100' : ''}>
              <div className='px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide'>
                <Icon e='📄' size={14} className='inline align-[-2px]' /> {t('Halaman', 'Pages')}
              </div>
              {matchedPages.map((p, i) => {
                const idx = matchedEmps.length + i
                return (
                  <button key={p.href} onClick={() => navigate({ type:'page', ...p })}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${cursor===idx ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                    <span className='text-base flex-shrink-0 w-6 text-center'><Icon e={p.icon} size={16} /></span>
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-semibold text-gray-800'>
                        <Highlight text={p.label} q={q} />
                      </div>
                      <div className='text-xs text-gray-400'>{p.section}</div>
                    </div>
                    <span className='text-gray-300 text-xs flex-shrink-0'><Icon e='→' size={15} /></span>
                  </button>
                )
              })}
            </div>
          )}

          {totalResults > 0 && (
            <div className='px-4 py-2 border-t border-gray-100 flex gap-3 text-xs text-gray-400'>
              <span>↑<Icon e='↓' size={14} className='inline align-[-2px]' /> {t('navigasi', 'navigate')}</span>
              <span><Icon e='↵' size={14} className='inline align-[-2px]' /> {t('buka', 'open')}</span>
              <span>Esc {t('tutup', 'close')}</span>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  )
}

function Highlight({ text, q }) {
  if (!q || !text) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className='bg-yellow-100 text-yellow-800 rounded px-0.5'>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
