'use client'
import { useState, useMemo, useEffect } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { useOffboardingNotifyStore } from '@/store/offboardingNotifyStore'
import { useExitInterviewStore } from '@/store/exitInterviewStore'
import { useT } from '@/store/languageStore'
import {
  todayStr, fmtDate, daysBetween, lwdOf, getTerminatePA,
  approvedResignEmployees, clearanceProgress,
} from '@/lib/offboarding'
import { generatePaklaring, generateClearanceCertificate } from '@/lib/offboardingDocs'

const svg = (children, size = 15) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcUsers  = svg(<><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' /><circle cx='9' cy='7' r='4' /><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' /></>)
const IcCal    = svg(<><rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' /></>)
const IcCheck  = svg(<><path d='M22 11.08V12a10 10 0 11-5.93-9.14' /><polyline points='22 4 12 14.01 9 11.01' /></>)
const IcAlert  = svg(<><path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' /><line x1='12' y1='9' x2='12' y2='13' /><line x1='12' y1='17' x2='12.01' y2='17' /></>)
const IcClock  = svg(<><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></>)
const IcFile   = svg(<><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' /></>)
const IcDown   = svg(<><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' /><polyline points='7 10 12 15 17 10' /><line x1='12' y1='15' x2='12' y2='3' /></>)
const IcBell   = svg(<><path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' /><path d='M13.73 21a2 2 0 01-3.46 0' /></>)
const IcMsg    = svg(<><path d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' /></>)
const IcFlag   = svg(<><path d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' /><line x1='4' y1='22' x2='4' y2='15' /></>)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (name) => asText(name).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const REHIRE_CLS = { Yes: 'bg-green-100 text-green-700', Conditional: 'bg-amber-100 text-amber-700', No: 'bg-red-100 text-red-700' }

export default function OffboardingMonitor() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees = [] } = useEmployeeStore()
  const { departments = [], positions = [], companies = [] } = useStructureStore()
  const { pas = [] } = usePersonnelActionStore()
  const { items = [] } = useOffboardingChecklistStore()
  const { sends = {} } = useOffboardingNotifyStore()
  const { schedules = [] } = useExitInterviewStore()

  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''
  const coName  = id => companies.find(x => x.id === Number(id))?.name || ''

  const cases = useMemo(() => approvedResignEmployees(employees, pas).map(e => {
    const pa = getTerminatePA(pas, e.id, ['Approved', 'Applied'])
    const lwd = lwdOf(pa)
    const clr = clearanceProgress(items, e.id)
    const notifySent = Object.keys(sends).filter(k => k.startsWith(`${e.id}:`) && sends[k]?.status === 'Sent').length
    const exit = schedules.find(s => String(s.employeeId) === String(e.id) || s.employeeName === e.name) || null
    return {
      emp: e, pa, lwd,
      days: daysBetween(todayStr(), lwd),
      clr, notifySent, exit,
      dept: dpName(e.departmentId) || e.department || '—',
      position: posName(e.positionId) || e.position || '—',
      company: coName(e.companyId) || '—',
    }
  }).sort((a, b) => (a.lwd || '').localeCompare(b.lwd || '')), [employees, pas, items, sends, schedules])

  const [selId, setSelId] = useState('')
  useEffect(() => { if (!selId && cases.length) setSelId(String(cases[0].emp.id)) }, [cases, selId])
  const sel = cases.find(c => String(c.emp.id) === String(selId))

  // Aggregate stats
  const stats = useMemo(() => {
    const total = cases.length
    const soon = cases.filter(c => c.days != null && c.days >= 0 && c.days <= 30).length
    const overdue = cases.reduce((n, c) => n + c.clr.overdue, 0)
    const avgClr = total ? Math.round(cases.reduce((n, c) => n + c.clr.pct, 0) / total) : 0
    return { total, soon, overdue, avgClr }
  }, [cases])

  const topReasons = useMemo(() => {
    const m = {}
    cases.forEach(c => { const r = c.pa?.reasonCategory || c.pa?.reason || '—'; m[r] = (m[r] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [cases])

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-6 py-8'>
        <h1 className='text-2xl font-bold text-gray-900'>Offboarding Monitor</h1>
        <p className='text-gray-500 mt-1'>{t('Pipeline offboarding, progres clearance, dan case view per karyawan dalam satu tempat.', 'Offboarding pipeline, clearance progress, and per-employee case view in one place.')}</p>

        {/* Stats */}
        <div className='mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <Stat label={t('Total Case', 'Total Cases')} value={stats.total} icon={<IcUsers />} tint='indigo' />
          <Stat label={t('Keluar ≤ 30 hari', 'Leaving ≤ 30 days')} value={stats.soon} icon={<IcCal />} tint='blue' />
          <Stat label={t('Rata-rata Clearance', 'Avg Clearance')} value={`${stats.avgClr}%`} icon={<IcCheck />} tint='green' />
          <Stat label={t('Task Overdue', 'Overdue Tasks')} value={stats.overdue} icon={<IcAlert />} tint={stats.overdue ? 'red' : 'gray'} />
        </div>

        {/* Pipeline table */}
        <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-5 py-4 border-b border-gray-50 flex items-center justify-between'>
            <p className='font-bold text-gray-900'>{t('Pipeline Offboarding', 'Offboarding Pipeline')}</p>
            <span className='text-xs text-gray-400'>{cases.length} {t('karyawan', 'employees')}</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm min-w-[820px]'>
              <thead>
                <tr className='bg-gray-50 border-b'>
                  {[t('Karyawan', 'Employee'), t('Jenis', 'Type'), 'LWD', t('Sisa', 'Remaining'), 'Clearance', t('Notifikasi', 'Notify'), 'Exit', 'Rehire'].map(h => (
                    <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {cases.length === 0 ? (
                  <tr><td colSpan={8} className='text-center py-10 text-gray-400 text-sm'>{t('Belum ada karyawan resign yang disetujui HR.', 'No HR-approved resignations yet.')}</td></tr>
                ) : cases.map(c => {
                  const active = String(c.emp.id) === String(selId)
                  return (
                    <tr key={c.emp.id} onClick={() => setSelId(String(c.emp.id))}
                      className={`cursor-pointer transition ${active ? 'bg-red-50/60' : 'hover:bg-gray-50/60'}`}>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <div className='w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0' style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)' }}>{initials(c.emp.name)}</div>
                          <div><p className='font-semibold text-gray-800 text-xs'>{c.emp.name}</p><p className='text-[11px] text-gray-400'>{c.dept}</p></div>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-xs text-gray-600'>{c.pa?.reason || '—'}</td>
                      <td className='px-4 py-3 text-xs text-gray-600 whitespace-nowrap'>{fmtDate(c.lwd)}</td>
                      <td className='px-4 py-3 text-xs whitespace-nowrap'>
                        {c.days == null ? '—' : c.days < 0
                          ? <span className='text-gray-400'>{t('lewat', 'passed')}</span>
                          : <span className={c.days <= 7 ? 'text-red-600 font-semibold' : c.days <= 30 ? 'text-amber-600 font-medium' : 'text-gray-600'}>{c.days} {t('hari', 'days')}</span>}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <div className='w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden'><div className='h-full bg-red-500' style={{ width: `${c.clr.pct}%` }} /></div>
                          <span className='text-xs text-gray-500'>{c.clr.pct}%</span>
                          {c.clr.overdue > 0 && <span className='text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 rounded-full'>{c.clr.overdue} overdue</span>}
                        </div>
                      </td>
                      {(() => { const nearLwd = c.days != null && c.days <= 14; return (<>
                      <td className='px-4 py-3 text-xs'>
                        <span className={nearLwd && c.notifySent < 4 ? 'text-red-600 font-semibold' : 'text-gray-600'}>{c.notifySent}/4</span>
                        {nearLwd && c.notifySent < 4 && <span className='ml-1 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full' title={t('LWD dekat, notifikasi belum lengkap', 'LWD near, notifications incomplete')}>!</span>}
                      </td>
                      <td className='px-4 py-3'>
                        {c.exit
                          ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.exit.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>{c.exit.status}</span>
                          : <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${nearLwd ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`} title={nearLwd ? t('LWD dekat, exit interview belum dijadwalkan', 'LWD near, exit interview not scheduled') : ''}>{nearLwd ? t('Jadwalkan!', 'Schedule!') : t('Belum', 'None')}</span>}
                      </td>
                      </>) })()}
                      <td className='px-4 py-3'>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${REHIRE_CLS[c.pa?.rehireEligible] || 'bg-gray-100 text-gray-500'}`}>{c.pa?.rehireEligible || '—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top reasons */}
        {topReasons.length > 0 && (
          <div className='mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
            <p className='font-bold text-gray-900 text-sm mb-3'>{t('Alasan Resign Teratas', 'Top Resign Reasons')}</p>
            <div className='space-y-2'>
              {topReasons.map(([r, n]) => (
                <div key={r} className='flex items-center gap-3'>
                  <span className='w-48 text-xs text-gray-600 truncate'>{r}</span>
                  <div className='flex-1 h-2 rounded-full bg-gray-100 overflow-hidden'><div className='h-full bg-red-400' style={{ width: `${(n / cases.length) * 100}%` }} /></div>
                  <span className='text-xs font-semibold text-gray-500 w-6 text-right'>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Case view */}
        {sel && <CaseView t={t} c={sel} currentUser={currentUser} />}
      </div>
    </div>
  )
}

const TINT = {
  indigo: 'text-red-600 bg-red-50', blue: 'text-rose-600 bg-rose-50',
  green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50', gray: 'text-gray-500 bg-gray-100',
}
function Stat({ label, value, icon, tint }) {
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between'>
      <div><p className='text-xs text-gray-500'>{label}</p><p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p></div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TINT[tint] || TINT.indigo}`}>{icon}</div>
    </div>
  )
}

function CaseView({ t, c, currentUser }) {
  const { emp, pa, lwd, clr, notifySent, exit } = c
  const done = clr.complete === clr.total && clr.total > 0
  const final = pa?.status === 'Applied' || emp.status === 'Inactive'

  const stages = [
    { key: 'submit', title: t('Pengajuan Resign', 'Resignation Submitted'), Icon: IcFile, state: 'done',
      detail: `${t('Notice', 'Notice')}: ${fmtDate(pa?.noticeDate || pa?.createdAt)} · ${t('oleh', 'by')} ${pa?.submittedByName || '—'}` },
    { key: 'approve', title: t('Approval HR', 'HR Approval'), Icon: IcCheck, state: (pa?.status === 'Approved' || pa?.status === 'Applied') ? 'done' : 'pending',
      detail: pa?.status === 'Rejected' ? t('Ditolak', 'Rejected') : t('Disetujui HR', 'Approved by HR') },
    { key: 'clearance', title: t('Clearance Checklist', 'Clearance Checklist'), Icon: IcCheck, state: done ? 'done' : 'active',
      detail: `${clr.complete}/${clr.total} ${t('selesai', 'done')} (${clr.pct}%)${clr.overdue ? ` · ${clr.overdue} overdue` : ''}` },
    { key: 'notify', title: t('Notifikasi Departemen', 'Department Notifications'), Icon: IcBell, state: notifySent >= 4 ? 'done' : notifySent > 0 ? 'active' : 'pending',
      detail: `${notifySent}/4 ${t('departemen dinotifikasi', 'departments notified')}` },
    { key: 'exit', title: t('Exit Interview', 'Exit Interview'), Icon: IcMsg, state: exit?.status === 'Completed' ? 'done' : exit ? 'active' : 'pending',
      detail: exit ? `${exit.status} · ${fmtDate(exit.date)}` : t('Belum dijadwalkan', 'Not scheduled') },
    { key: 'final', title: t('Separasi Final', 'Final Separation'), Icon: IcFlag, state: final ? 'done' : 'pending',
      detail: final ? t('Karyawan Inactive', 'Employee Inactive') : `${t('Efektif', 'Effective')}: ${fmtDate(pa?.effectiveDate)}` },
  ]

  const docData = {
    company: c.company, name: emp.name, nik: emp.nik, position: c.position, dept: c.dept,
    joinDate: emp.joinDate, lwd, hrName: currentUser?.name || 'HR Department', items: clr.list,
  }

  return (
    <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      {/* Case header */}
      <div className='px-6 py-5 border-b border-gray-50 flex flex-wrap items-center gap-4'>
        <div className='w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0' style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)' }}>{initials(emp.name)}</div>
        <div className='min-w-0'>
          <p className='font-bold text-gray-900'>{emp.name} <span className='ml-1 font-mono text-xs text-gray-400'>{pa?.paNumber}</span></p>
          <p className='text-xs text-gray-500'>{emp.nik} · {c.position} · {c.dept} · {c.company}</p>
        </div>
        <div className='ml-auto flex flex-wrap gap-x-6 gap-y-1 text-xs'>
          <span><span className='text-gray-400'>Notice</span> <span className='font-semibold text-gray-700'>{fmtDate(pa?.noticeDate)}</span></span>
          <span><span className='text-gray-400'>LWD</span> <span className='font-semibold text-gray-700'>{fmtDate(lwd)}</span></span>
          <span><span className='text-gray-400'>Effective</span> <span className='font-semibold text-gray-700'>{fmtDate(pa?.effectiveDate)}</span></span>
          <span className={pa?.noticeCompliant ? 'text-green-600' : 'text-amber-600'}>{pa?.noticeCompliant ? t('Notice sesuai', 'Notice OK') : t('Notice < 30h', 'Notice < 30d')}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className='px-6 py-5'>
        <div className='relative'>
          {stages.map((s, i) => (
            <div key={s.key} className='flex gap-4 pb-5 last:pb-0 relative'>
              {i < stages.length - 1 && <div className='absolute left-[15px] top-8 bottom-0 w-px bg-gray-200' />}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                s.state === 'done' ? 'bg-green-100 text-green-600' : s.state === 'active' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}>
                {s.state === 'done' ? <IcCheck size={15} /> : s.state === 'active' ? <IcClock size={15} /> : <s.Icon size={15} />}
              </div>
              <div className='flex-1 pt-0.5'>
                <div className='flex items-center gap-2'>
                  <p className='font-semibold text-gray-800 text-sm'>{s.title}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    s.state === 'done' ? 'bg-green-100 text-green-700' : s.state === 'active' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.state === 'done' ? t('Selesai', 'Done') : s.state === 'active' ? t('Berjalan', 'In Progress') : t('Menunggu', 'Pending')}
                  </span>
                </div>
                <p className='text-xs text-gray-500 mt-0.5'>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Documents */}
        <div className='mt-4 pt-4 border-t border-gray-50'>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>{t('Dokumen', 'Documents')}</p>
          <div className='flex flex-wrap gap-2'>
            <button onClick={() => generatePaklaring(docData)}
              className='flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition'>
              <IcDown /> {t('Generate Paklaring', 'Generate Reference Letter')}
            </button>
            <button onClick={() => generateClearanceCertificate(docData)}
              className='flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition'>
              <IcDown /> {t('Generate Clearance Certificate', 'Generate Clearance Certificate')}
            </button>
          </div>
          {!done && <p className='text-xs text-amber-600 mt-2'>{t('Catatan: clearance belum 100% — certificate mencerminkan status saat ini.', 'Note: clearance is not 100% — the certificate reflects the current status.')}</p>}
        </div>
      </div>
    </div>
  )
}
