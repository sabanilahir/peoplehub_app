'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore, PA_STATUS_COLOR, PA_TO_HIST } from '@/store/personnelActionStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { useT } from '@/store/languageStore'
import { todayStr, fmtDate, daysBetween, lwdOf, clearanceProgress } from '@/lib/offboarding'
import { autoAssignOffboardingForEmployee } from '@/lib/offboardingAutoAssign'
import { HR_ROLES as HR_MENU_ROLES } from '@/constants/roles'

// ─── Inline line icons ──────────────────────────────────────────────────────
const svg = (children, size = 16) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcClock   = svg(<><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></>)
const IcCheck   = svg(<><polyline points='20 6 9 17 4 12' /></>)
const IcX       = svg(<><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></>)
const IcPower   = svg(<><path d='M18.36 6.64a9 9 0 11-12.73 0' /><line x1='12' y1='2' x2='12' y2='12' /></>)
const IcFile    = svg(<><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' /></>)
const IcAlert   = svg(<><path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' /><line x1='12' y1='9' x2='12' y2='13' /><line x1='12' y1='17' x2='12.01' y2='17' /></>)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (name) => asText(name).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const REHIRE_CLS = { Yes: 'bg-green-100 text-green-700', Conditional: 'bg-amber-100 text-amber-700', No: 'bg-red-100 text-red-700' }
// HR-type roles that may approve (the central HR menu roles + the dedicated
// Offboarding HR persona).
const HR_ROLES = [...HR_MENU_ROLES, 'of_admin']

export default function OffboardingApproval() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees = [], updateEmployee, addHistory } = useEmployeeStore()
  const { departments = [], positions = [] } = useStructureStore()
  const { pas = [], updatePA } = usePersonnelActionStore()
  const { items = [] } = useOffboardingChecklistStore()

  const isHR = HR_ROLES.includes(currentUser?.role)

  const [selected, setSelected] = useState(null)   // PA in detail modal
  const [rejectNote, setRejectNote] = useState('')
  const [confirmApply, setConfirmApply] = useState(null)  // PA pending finalize
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const empById = id => employees.find(e => String(e.id) === String(id))
  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''

  const termPAs = useMemo(() =>
    [...(pas || [])].filter(p => p && p.action === 'Terminate')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [pas])

  const pending  = termPAs.filter(p => p.status === 'Submitted')
  const approved = termPAs.filter(p => p.status === 'Approved')
  const done     = termPAs.filter(p => ['Applied', 'Rejected'].includes(p.status))

  const approve = (pa) => {
    updatePA(pa.id, { status: 'Approved', approvedByName: currentUser?.name || 'HR', approvedAt: todayStr() })
    // Rule-based auto-assign (see Auto Assign Offboarding page): if the employee
    // matches an active rule, the fixed template is distributed automatically so
    // HR skips the manual step. If no rule matches, the checklist stays empty and
    // HR picks & distributes a template themselves — the message says which path
    // was taken so it is never ambiguous which template (if any) was applied.
    const emp = empById(pa.employeeId)
    const approvedPa = { ...pa, status: 'Approved' }
    const res = autoAssignOffboardingForEmployee(emp, [approvedPa, ...(pas || [])])
    flash(res.assigned
      ? t(`Pengajuan disetujui. Checklist "${res.templateName}" otomatis didistribusikan${res.ruleName ? ` (rule: ${res.ruleName})` : ''}.`, `Request approved. Checklist "${res.templateName}" auto-distributed${res.ruleName ? ` (rule: ${res.ruleName})` : ''}.`)
      : t('Pengajuan disetujui. Tidak ada rule yang cocok — pilih & sebarkan template checklist untuk karyawan ini.', 'Request approved. No rule matched — choose and distribute a checklist template for this employee.'))
    setSelected(null)
  }
  const reject = (pa) => {
    if (!rejectNote.trim()) return flash(t('Masukkan alasan penolakan.', 'Enter a rejection reason.'), 'error')
    updatePA(pa.id, { status: 'Rejected', rejectNote })
    flash(t('Pengajuan ditolak.', 'Request rejected.'))
    setRejectNote(''); setSelected(null)
  }
  // Finalize = deactivate the employee on/after LWD. Kept separate from approval.
  const finalize = (pa) => {
    updatePA(pa.id, { status: 'Applied', appliedAt: todayStr() })
    updateEmployee(pa.employeeId, { status: 'Inactive', endDate: pa.effectiveDate || lwdOf(pa) })
    addHistory(pa.employeeId, {
      effectiveDate: pa.effectiveDate || lwdOf(pa), effectiveSeq: 1,
      action: PA_TO_HIST['Terminate'], reason: pa.reason,
      companyId: pa.fromCompanyId, departmentId: pa.fromDepartmentId,
      positionId: pa.fromPositionId, gradeId: pa.fromGradeId, note: pa.note,
    })
    setConfirmApply(null)
    flash(t('Offboarding difinalisasi. Karyawan kini Inactive.', 'Offboarding finalized. Employee is now Inactive.'))
  }

  if (!isHR) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-5xl mx-auto px-6 py-8'>
          <h1 className='text-2xl font-bold text-gray-900'>{t('Persetujuan Offboarding', 'Offboarding Approval')}</h1>
          <div className='mt-6 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700'>
            {t('Halaman ini hanya untuk HR.', 'This page is for HR only.')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-6 py-8'>

        {/* Header */}
        <h1 className='text-2xl font-bold text-gray-900'>{t('Persetujuan Offboarding', 'Offboarding Approval')}</h1>
        <p className='text-gray-500 mt-1'>{t('Setujui pengajuan resign dari manager, pantau prosesnya, lalu finalisasi (nonaktifkan) karyawan saat Last Working Day tiba.', 'Approve resignation requests from managers, track the process, then finalize (deactivate) the employee once the Last Working Day arrives.')}</p>

        {/* Stat row */}
        <div className='mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <StatCard label={t('Menunggu Persetujuan', 'Pending Approval')} value={pending.length} icon={<IcClock />} tint='amber' />
          <StatCard label={t('Sedang Berjalan', 'In Progress')} value={approved.length} icon={<IcCheck />} tint='red' />
          <StatCard label={t('Selesai / Ditolak', 'Done / Rejected')} value={done.length} icon={<IcFile />} tint='gray' />
        </div>

        {/* Pending approval */}
        <Section title={t('Menunggu Persetujuan', 'Pending Approval')} count={pending.length} icon={<IcClock />}>
          {pending.length === 0 ? (
            <Empty text={t('Tidak ada pengajuan menunggu persetujuan.', 'No requests pending approval.')} />
          ) : (
            <div className='divide-y divide-gray-50'>
              {pending.map(pa => {
                const e = empById(pa.employeeId)
                const lwd = lwdOf(pa)
                return (
                  <div key={pa.id} className='px-5 py-4 flex flex-wrap items-center gap-4'>
                    <Avatar name={e?.name} />
                    <div className='min-w-0'>
                      <p className='font-semibold text-gray-800'>{e?.name || '—'} <span className='font-mono text-[11px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded ml-1'>{pa.paNumber}</span></p>
                      <p className='text-xs text-gray-500'>{posName(e?.positionId) || e?.position || '—'} · {dpName(e?.departmentId) || e?.department || '—'} · LWD {fmtDate(lwd)}</p>
                    </div>
                    <div className='ml-auto flex items-center gap-2'>
                      <button onClick={() => { setSelected(pa); setRejectNote('') }} className='px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50'>{t('Detail', 'Details')}</button>
                      <button onClick={() => approve(pa)} className='flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow'><IcCheck /> {t('Setujui', 'Approve')}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* In progress (approved, awaiting LWD / finalize) */}
        <Section title={t('Sedang Berjalan', 'In Progress')} count={approved.length} icon={<IcCheck />}>
          {approved.length === 0 ? (
            <Empty text={t('Belum ada offboarding yang berjalan.', 'No offboarding in progress.')} />
          ) : (
            <div className='divide-y divide-gray-50'>
              {approved.map(pa => {
                const e = empById(pa.employeeId)
                const lwd = lwdOf(pa)
                const daysToLwd = daysBetween(todayStr(), lwd)
                const clr = clearanceProgress(items, pa.employeeId)
                const lwdReached = daysToLwd != null && daysToLwd <= 0
                return (
                  <div key={pa.id} className='px-5 py-4 flex flex-wrap items-center gap-4'>
                    <Avatar name={e?.name} />
                    <div className='min-w-0'>
                      <p className='font-semibold text-gray-800'>{e?.name || '—'} <span className='font-mono text-[11px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded ml-1'>{pa.paNumber}</span></p>
                      <p className='text-xs text-gray-500'>
                        LWD {fmtDate(lwd)}
                        {daysToLwd != null && <span className={daysToLwd <= 7 ? 'text-red-600 font-semibold' : daysToLwd <= 30 ? 'text-amber-600' : ''}> · {daysToLwd < 0 ? t('lewat', 'passed') : `${daysToLwd} ${t('hari lagi', 'days left')}`}</span>}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 ml-auto'>
                      <div className='text-right mr-2'>
                        <p className='text-[11px] text-gray-400'>Clearance</p>
                        <div className='flex items-center gap-1.5'>
                          <div className='w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden'><div className='h-full bg-red-500' style={{ width: `${clr.pct}%` }} /></div>
                          <span className='text-xs font-semibold text-gray-600'>{clr.pct}%</span>
                        </div>
                      </div>
                      <button onClick={() => setConfirmApply({ pa, lwdReached, clr })}
                        title={lwdReached ? '' : t('LWD belum tiba', 'LWD not yet reached')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl shadow transition ${lwdReached ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}>
                        <IcPower /> {t('Finalisasi', 'Finalize')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Decision history */}
        <Section title={t('Riwayat', 'History')} count={done.length} icon={<IcFile />}>
          {done.length === 0 ? (
            <Empty text={t('Belum ada riwayat.', 'No history yet.')} />
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm min-w-[640px]'>
                <thead>
                  <tr className='bg-gray-50 border-b'>
                    {['PA Number', t('Karyawan', 'Employee'), 'LWD', t('Rehire', 'Rehire'), 'Status'].map(h => (
                      <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {done.map(pa => {
                    const e = empById(pa.employeeId)
                    return (
                      <tr key={pa.id} className='hover:bg-gray-50/50 cursor-pointer' onClick={() => { setSelected(pa); setRejectNote('') }}>
                        <td className='px-4 py-3'><span className='font-mono text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded'>{pa.paNumber}</span></td>
                        <td className='px-4 py-3 text-gray-800 text-xs font-medium'>{e?.name || '—'}</td>
                        <td className='px-4 py-3 text-gray-600 text-xs'>{fmtDate(lwdOf(pa))}</td>
                        <td className='px-4 py-3'>{pa.rehireEligible ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${REHIRE_CLS[pa.rehireEligible] || 'bg-gray-100 text-gray-500'}`}>{pa.rehireEligible}</span> : <span className='text-gray-300'>—</span>}</td>
                        <td className='px-4 py-3'><span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PA_STATUS_COLOR[pa.status] || 'bg-gray-100 text-gray-600'}`}>{pa.status}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* Detail / decision modal */}
      {selected && (() => {
        const e = empById(selected.employeeId)
        const lwd = lwdOf(selected)
        return (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm' onClick={() => setSelected(null)}>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden' onClick={ev => ev.stopPropagation()}>
              <div className='flex items-center justify-between px-6 py-4 border-b'>
                <div className='flex items-center gap-3'>
                  <Avatar name={e?.name} />
                  <div>
                    <h2 className='font-bold text-gray-900'>{e?.name || '—'}</h2>
                    <p className='text-xs text-gray-500'>{selected.paNumber} · <span className={`font-semibold px-1.5 py-0.5 rounded-full ${PA_STATUS_COLOR[selected.status] || ''}`}>{selected.status}</span></p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
              </div>

              <div className='overflow-y-auto flex-1 px-6 py-5 space-y-3'>
                <div className='grid grid-cols-2 gap-3'>
                  <RV label='Notice Date' value={fmtDate(selected.noticeDate)} />
                  <RV label='Last Working Day' value={fmtDate(lwd)} />
                  <RV label={t('Effective / Separation', 'Effective / Separation')} value={fmtDate(selected.effectiveDate)} />
                  <RV label={t('Kepatuhan Notice', 'Notice Compliance')} value={selected.noticeCompliant === undefined ? '—' : (selected.noticeCompliant ? t('Sesuai', 'Compliant') : t('Kurang', 'Below min'))} />
                  <RV label={t('Jenis / Alasan', 'Type / Reason')} value={selected.reason} />
                  <RV label={t('Kategori Alasan', 'Reason Category')} value={selected.reasonCategory} />
                </div>
                <RV label={t('Rehire Eligibility', 'Rehire Eligibility')} value={selected.rehireEligible} />
                {selected.note && <RV label={t('Penjelasan', 'Detail')} value={selected.note} />}
                {selected.resignLetter && <RV label={t('Surat Resign', 'Resignation Letter')} value={selected.resignLetter} />}
                {selected.submittedByName && <p className='text-xs text-gray-400'>{t('Diajukan oleh', 'Submitted by')}: {selected.submittedByName}</p>}
                {selected.rejectNote && (
                  <div className='bg-red-50 rounded-xl px-4 py-3'>
                    <p className='text-xs font-semibold text-red-400 mb-1'>{t('Alasan Penolakan', 'Rejection Reason')}</p>
                    <p className='text-sm text-red-600'>{selected.rejectNote}</p>
                  </div>
                )}
                {selected.status === 'Submitted' && (
                  <div>
                    <p className='text-sm font-semibold text-gray-800 mb-1.5'>{t('Alasan penolakan (jika ditolak)', 'Rejection reason (if rejecting)')}</p>
                    <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder={t('Tulis alasan…', 'Write a reason…')}
                      className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                  </div>
                )}
              </div>

              <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
                <button onClick={() => setSelected(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Tutup', 'Close')}</button>
                {selected.status === 'Submitted' && (
                  <>
                    <button onClick={() => reject(selected)} className='flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100'><IcX /> {t('Tolak', 'Reject')}</button>
                    <button onClick={() => approve(selected)} className='flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow'><IcCheck /> {t('Setujui', 'Approve')}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Finalize confirm */}
      {confirmApply && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm'>
            <p className='font-bold text-gray-900 mb-2'>{t('Finalisasi offboarding?', 'Finalize offboarding?')}</p>
            <p className='text-sm text-gray-500 mb-3'>{t('Karyawan akan berstatus', 'The employee will be set to')} <span className='font-semibold text-gray-700'>Inactive</span> {t('dan endDate diisi', 'and endDate set to')} {fmtDate(confirmApply.pa.effectiveDate || lwdOf(confirmApply.pa))}.</p>
            {!confirmApply.lwdReached && (
              <p className='text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2 flex items-start gap-1.5'><IcAlert /> {t('Last Working Day belum tiba. Umumnya finalisasi dilakukan pada/ setelah LWD.', 'The Last Working Day has not arrived yet. Finalization is usually done on/after the LWD.')}</p>
            )}
            {confirmApply.clr.pct < 100 && (
              <p className='text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2 flex items-start gap-1.5'><IcAlert /> {t(`Clearance baru ${confirmApply.clr.pct}%. Masih ada aktivitas belum selesai.`, `Clearance is only ${confirmApply.clr.pct}%. Some activities are still incomplete.`)}</p>
            )}
            <div className='flex gap-2 justify-end mt-4'>
              <button onClick={() => setConfirmApply(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
              <button onClick={() => finalize(confirmApply.pa)} className='flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow'><IcPower /> {t('Finalisasi', 'Finalize')}</button>
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>{msg.text}</div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, tint }) {
  const C = { amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', gray: 'bg-gray-100 text-gray-500' }
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between'>
      <div><p className='text-sm text-gray-500'>{label}</p><p className='text-3xl font-bold text-gray-900 mt-1'>{value}</p></div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${C[tint] || C.gray}`}>{icon}</div>
    </div>
  )
}
function Section({ title, count, icon, children }) {
  return (
    <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-5 py-4 border-b border-gray-50 flex items-center gap-2'>
        <span className='text-red-600'>{icon}</span>
        <p className='font-bold text-gray-900'>{title}</p>
        <span className='ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600'>{count}</span>
      </div>
      {children}
    </div>
  )
}
function Empty({ text }) { return <p className='text-center py-10 text-gray-400 text-sm'>{text}</p> }
function Avatar({ name }) {
  return <div className='w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white' style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)' }}>{initials(name)}</div>
}
function RV({ label, value }) {
  return (
    <div>
      <p className='text-xs font-semibold text-gray-400 mb-1'>{label}</p>
      <div className='px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 min-h-[36px]'>{value || <span className='text-gray-300'>—</span>}</div>
    </div>
  )
}
