'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useEffect } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import { useOffboardingChecklistStore, OFFBOARDING_STATUSES } from '@/store/offboardingChecklistStore'
import { useT } from '@/store/languageStore'

// ─── Inline line icons ──────────────────────────────────────────────────────
const svg = (children, size = 15) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcBuilding = svg(<><path d='M3 21h18M5 21V7l8-4v18M19 21V11l-6-3' /></>)
const IcBriefcase = svg(<><rect x='2' y='7' width='20' height='14' rx='2' /><path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' /></>)
const IcCalendar = svg(<><rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' /></>)
const IcUser = svg(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></>)
const IcClip = svg(<><path d='M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48' /></>, 16)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (name) => asText(name).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const fmtDate = (d) => {
  const s = asText(d); if (!s) return '—'
  const dt = new Date(s); if (isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const SRC_CHIP = {
  'HR':              'bg-red-100 text-red-700',
  'Atasan Langsung': 'bg-rose-100 text-rose-700',
}
const STATUS_STYLE = {
  'Not Started': 'bg-gray-100 text-gray-600 border-gray-200',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'Complete':    'bg-green-50 text-green-700 border-green-200',
}

export default function OffboardingTracker() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees = [] } = useEmployeeStore()
  const { departments = [], positions = [], companies = [] } = useStructureStore()
  const { pas = [] } = usePersonnelActionStore()
  const { items = [], updateActivity } = useOffboardingChecklistStore()

  // ESS (Employee Self Service): always locked to the signed-in employee — no
  // cross-employee picker here, whatever the role. Managers/HR track other
  // people's offboarding from the MSS/HR monitor pages instead.
  const isPrivileged = false

  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''
  const coName  = id => companies.find(x => x.id === Number(id))?.name || ''
  const empById = id => employees.find(e => String(e.id) === String(id))

  // Employees with an HR-approved resignation (scoped to reports for managers)
  const eligible = useMemo(() => {
    const approved = (employees || []).filter(e =>
      (pas || []).some(p => p && p.action === 'Terminate' &&
        String(p.employeeId) === String(e.id) && ['Approved', 'Applied'].includes(p.status)))
    const scoped = currentUser?.role === 'manager'
      ? approved.filter(e => String(e.managerId) === String(currentUser?.id))
      : approved
    return [...scoped].sort((a, b) => asText(a.name).localeCompare(asText(b.name)))
  }, [employees, pas, currentUser])

  const selfEmp = empById(currentUser?.id)
  const selfHasChecklist = selfEmp && (items || []).some(i => String(i.employeeId) === String(selfEmp.id))

  const [empId, setEmpId] = useState('')
  useEffect(() => {
    if (empId) return
    if (selfEmp && (selfHasChecklist || eligible.some(e => e.id === selfEmp.id))) setEmpId(String(selfEmp.id))
    else if (isPrivileged && eligible.length) setEmpId(String(eligible[0].id))
  }, [selfEmp, selfHasChecklist, eligible, isPrivileged, empId])

  const emp = empById(empId)
  const termPA = useMemo(() =>
    [...(pas || [])].filter(p => p && p.action === 'Terminate' && String(p.employeeId) === String(empId))
      .sort((a, b) => asText(b.createdAt).localeCompare(asText(a.createdAt)))[0] || null,
    [pas, empId])
  const lastWorkingDay = termPA?.lastWorkingDay || termPA?.effectiveDate

  // No auto-seed: the checklist is created by rule-based auto-assign at approval
  // time (see lib/offboardingAutoAssign). This ESS view only displays it.

  const list = useMemo(
    () => (items || []).filter(i => String(i.employeeId) === String(empId)),
    [items, empId])

  const [src, setSrc] = useState('')   // '' = all
  const [evidenceFor, setEvidenceFor] = useState(null)
  const rows = src ? list.filter(i => i.category === src) : list

  const stats = useMemo(() => {
    const total = list.length
    const complete   = list.filter(i => i.status === 'Complete').length
    const inProgress = list.filter(i => i.status === 'In Progress').length
    const notStarted = total - complete - inProgress
    const pct = total ? Math.round((complete / total) * 100) : 0
    return { total, complete, inProgress, notStarted, pct }
  }, [list])

  // The signed-in employee's own latest resignation PA (any status), so they can
  // see a Submitted/Rejected request before it becomes an active offboarding.
  const selfPA = useMemo(() => {
    if (!selfEmp) return null
    return [...(pas || [])].filter(p => p && p.action === 'Terminate' && String(p.employeeId) === String(selfEmp.id))
      .sort((a, b) => asText(b.createdAt).localeCompare(asText(a.createdAt)))[0] || null
  }, [pas, selfEmp])

  if (!emp) {
    const st = selfPA?.status
    const banner = st && ['Submitted', 'Rejected'].includes(st)
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-5xl mx-auto px-6 py-8'>
          <h1 className='text-2xl font-bold text-gray-900'>Offboarding Checklist</h1>
          {banner ? (
            <div className={`mt-6 rounded-2xl px-5 py-4 border ${st === 'Rejected' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
              <p className='font-semibold'>
                {st === 'Rejected'
                  ? t('Pengajuan resign Anda ditolak.', 'Your resignation request was rejected.')
                  : t('Pengajuan resign Anda telah diajukan dan menunggu persetujuan HR.', 'Your resignation request has been submitted and is awaiting HR approval.')}
              </p>
              <p className='text-xs mt-1 opacity-90'>{selfPA.paNumber} · Last Working Day {fmtDate(selfPA.lastWorkingDay || selfPA.effectiveDate)}</p>
              {st === 'Rejected' && selfPA.rejectNote && <p className='text-xs mt-1'>{t('Alasan', 'Reason')}: {selfPA.rejectNote}</p>}
              {st === 'Submitted' && <p className='text-xs mt-1'>{t('Checklist offboarding akan muncul di sini setelah disetujui.', 'Your offboarding checklist will appear here once approved.')}</p>}
            </div>
          ) : (
            <div className='mt-6 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700'>
              {isPrivileged
                ? t('Belum ada karyawan dengan pengajuan resign yang disetujui HR.', 'No employees with an HR-approved resignation yet.')
                : t('Anda tidak memiliki proses offboarding yang aktif.', 'You have no active offboarding process.')}
            </div>
          )}
        </div>
      </div>
    )
  }

  const active = emp.status !== 'Inactive'

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-5xl mx-auto px-6 py-8'>

        {/* Header */}
        <h1 className='text-2xl font-bold text-gray-900'>Offboarding Checklist</h1>
        <p className='text-gray-500 mt-1'>{t('Update status setiap aktivitas dan lampirkan evidence (link atau file) sebagai bukti penyelesaian.', 'Update each activity status and attach evidence (link or file) as proof of completion.')}</p>

        {/* Employee card */}
        <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5'>
          <div className='flex items-start gap-4'>
            <div className='w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white' style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
              {initials(emp.name)}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <p className='text-lg font-bold text-gray-900'>{emp.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className='text-sm text-gray-500'>{asText(emp.nik)} · {posName(emp.positionId) || emp.position || '—'}</p>
              <div className='flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-sm'>
                <span className='flex items-center gap-1.5 text-gray-600'><span className='text-gray-400'><IcBuilding /></span>{coName(emp.companyId) || '—'}</span>
                <span className='flex items-center gap-1.5 text-gray-600'><span className='text-gray-400'><IcBriefcase /></span>{dpName(emp.departmentId) || emp.department || '—'}</span>
                <span className='flex items-center gap-1.5 text-gray-600'>
                  <span className='text-gray-400'><IcCalendar /></span>
                  <span><span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1'>{t('Last Working Day', 'Last Working Day')}</span><span className='font-semibold'>{fmtDate(lastWorkingDay)}</span></span>
                </span>
                <span className='flex items-center gap-1.5 text-gray-600'>
                  <span className='text-gray-400'><IcUser /></span>
                  <span><span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1'>{t('Manager', 'Manager')}</span><span className='font-semibold'>{empById(emp.managerId)?.name || '—'}</span></span>
                </span>
              </div>
            </div>
            {isPrivileged && eligible.length > 1 && (
              <select value={empId} onChange={e => setEmpId(e.target.value)}
                className='px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 bg-white flex-shrink-0'>
                {eligible.map(e => <option key={e.id} value={e.id}>{asText(e.name)}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Toolbar + summary */}
        <div className='mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-4'>
          <select value={src} onChange={e => setSrc(e.target.value)}
            className='px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 bg-white'>
            <option value=''>{t('Semua Sumber', 'All Sources')}</option>
            <option value='HR'>HR</option>
            <option value='Atasan Langsung'>{t('Atasan Langsung', 'Direct Manager')}</option>
          </select>
          <div className='ml-auto flex items-center gap-6 text-center'>
            <Stat label={t('Total Activities', 'Total Activities')} value={stats.total} />
            <Stat label={t('Complete', 'Complete')} value={stats.complete} tone='text-green-600' />
            <Stat label={t('In Progress', 'In Progress')} value={stats.inProgress} tone='text-amber-600' />
            <Stat label={t('Not Started', 'Not Started')} value={stats.notStarted} tone='text-gray-500' />
            <Stat label={t('Completion', 'Completion')} value={`${stats.pct}%`} tone='text-red-600' />
          </div>
        </div>

        {/* Table */}
        <div className='mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto'>
          <table className='w-full text-sm min-w-[880px]'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                {['#', t('Activity', 'Activity'), t('Sumber', 'Source'), 'PIC', 'Due Date', 'Status', 'Remark', 'Evidence'].map(h => (
                  <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className='text-center py-10 text-gray-400 text-sm'>{t('Belum ada aktivitas', 'No activities yet')}</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id ?? i} className='hover:bg-gray-50/40 align-top'>
                  <td className='px-4 py-3 text-gray-400 text-xs pt-4'>{i + 1}</td>
                  <td className='px-4 py-3'>
                    <p className='font-semibold text-gray-800'>{asText(r.title)}</p>
                    {r.description && <p className='text-xs text-gray-400'>{asText(r.description)}</p>}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${SRC_CHIP[r.category] || 'bg-gray-100 text-gray-600'}`}>{r.category}</span>
                  </td>
                  <td className='px-4 py-3 text-gray-700 text-xs whitespace-nowrap'>{r.picName ? asText(r.picName) : <span className='text-gray-300'>—</span>}</td>
                  <td className='px-4 py-3 text-gray-600 text-xs whitespace-nowrap'>{fmtDate(r.deadline)}</td>
                  <td className='px-4 py-3'>
                    <select value={r.status || 'Not Started'} onChange={e => updateActivity(r.id, { status: e.target.value })}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${STATUS_STYLE[r.status] || STATUS_STYLE['Not Started']}`}>
                      {OFFBOARDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className='px-4 py-3'>
                    <input value={r.remark || ''} onChange={e => updateActivity(r.id, { remark: e.target.value })}
                      placeholder={t('Tulis catatan…', 'Write a note…')}
                      className='w-44 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400' />
                  </td>
                  <td className='px-4 py-3'>
                    <button onClick={() => setEvidenceFor(r)} title={r.evidence ? asText(r.evidence) : t('Lampirkan evidence', 'Attach evidence')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${r.evidence ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                      <IcClip />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {evidenceFor && (
        <EvidenceModal
          activity={evidenceFor} t={t}
          onClose={() => setEvidenceFor(null)}
          onSave={(value) => { updateActivity(evidenceFor.id, { evidence: value }); setEvidenceFor(null) }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone = 'text-gray-900' }) {
  return (
    <div>
      <p className='text-[11px] text-gray-400 whitespace-nowrap'>{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function EvidenceModal({ activity, t, onClose, onSave }) {
  const [link, setLink] = useState(activity.evidence || '')
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden'>
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <h2 className='font-bold text-gray-900'>{t('Lampirkan Evidence', 'Attach Evidence')}</h2>
          <button onClick={onClose} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
        </div>
        <div className='px-6 py-5 space-y-4'>
          <p className='text-xs text-gray-500'>{t('Aktivitas', 'Activity')}: <span className='font-semibold text-gray-700'>{activity.title}</span></p>
          <div>
            <p className='text-sm font-semibold text-gray-800 mb-1.5'>{t('Link Evidence', 'Evidence Link')}</p>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder='https://…'
              className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500' />
          </div>
          <div>
            <p className='text-sm font-semibold text-gray-800 mb-1.5'>{t('atau Upload File', 'or Upload File')}</p>
            <input type='file' onChange={e => { const f = e.target.files?.[0]; if (f) setLink(f.name) }}
              className='w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-red-50 file:text-red-700 file:text-sm file:font-semibold' />
            <p className='text-[11px] text-gray-400 mt-1'>{t('Nama file akan dicatat sebagai bukti (prototype, file tidak diunggah).', 'The file name is recorded as proof (prototype — file is not uploaded).')}</p>
          </div>
        </div>
        <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
          {activity.evidence && (
            <button onClick={() => onSave('')} className='mr-auto px-3 py-2 text-sm text-red-500 rounded-xl hover:bg-red-50'>{t('Hapus', 'Remove')}</button>
          )}
          <button onClick={onClose} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
          <button onClick={() => onSave(link.trim())} className='px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700'>{t('Simpan', 'Save')}</button>
        </div>
      </div>
    </div>
  )
}
