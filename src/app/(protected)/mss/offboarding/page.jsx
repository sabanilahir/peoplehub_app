'use client'
import { useState, useMemo, useRef } from 'react'
import { useAuthStore }             from '@/store/authStore'
import { useEmployeeStore }         from '@/store/employeeStore'
import { useStructureStore }        from '@/store/structureStore'
import { usePersonnelActionStore, PA_STATUS_COLOR } from '@/store/personnelActionStore'
import { useT } from '@/store/languageStore'
import {
  todayStr, daysBetween, fmtDate, lwdOf,
  TERMINATION_TYPES, REASON_CATEGORIES, REHIRE_OPTIONS, NOTICE_PERIOD_DAYS,
} from '@/lib/offboarding'

const ACTION = 'Terminate'

// ─── Inline line icons ──────────────────────────────────────────────────────
const svg = (children, size = 18) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcUserBriefcase = svg(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></>, 20)
const IcCheckCircle = svg(<><path d='M22 11.08V12a10 10 0 11-5.93-9.14' /><polyline points='22 4 12 14.01 9 11.01' /></>)
const IcXCircle     = svg(<><circle cx='12' cy='12' r='10' /><line x1='15' y1='9' x2='9' y2='15' /><line x1='9' y1='9' x2='15' y2='15' /></>)
const IcClock       = svg(<><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></>)
const IcFileText    = svg(<><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' /><line x1='16' y1='13' x2='8' y2='13' /><line x1='16' y1='17' x2='8' y2='17' /></>, 16)
const IcAlert       = svg(<><path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' /><line x1='12' y1='9' x2='12' y2='13' /><line x1='12' y1='17' x2='12.01' y2='17' /></>, 16)
const IcUpload      = svg(<><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' /><polyline points='17 8 12 3 7 8' /><line x1='12' y1='3' x2='12' y2='15' /></>, 15)

const EMPTY = {
  employeeId: '', terminationType: 'Voluntary Resign', reasonCategory: '', reason: '',
  noticeDate: todayStr(), lastWorkingDay: '', effectiveDate: '',
  rehireEligible: 'Yes', resignLetter: '',
}

function Field({ label, children, full, hint }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <p className='text-sm font-semibold text-gray-800 mb-1.5'>{label}</p>
      {children}
      {hint && <p className='text-xs text-gray-400 mt-1'>{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white transition'
const roCls    = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50'

export default function MSSOffboardingResign() {
  const t = useT()
  const { currentUser }  = useAuthStore()
  const { employees }    = useEmployeeStore()
  const { departments, positions } = useStructureStore()
  const { pas, addPA, nextNumber } = usePersonnelActionStore()

  const [form, setForm] = useState({ ...EMPTY })
  const [submittedPA, setSubmittedPA] = useState(null)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500) }

  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''

  // Roles that may submit a resignation for anyone (HR / admin), vs a line
  // manager who only sees their own direct reports.
  const SEE_ALL_ROLES = ['superadmin', 'hr', 'of_admin', 'ob_admin']
  const teamOpts = useMemo(() => {
    const seeAll = SEE_ALL_ROLES.includes(currentUser?.role)
    const team = seeAll
      ? employees
      : employees.filter(e => String(e.managerId) === String(currentUser?.id))
    return team.filter(e => e.status === 'Active').map(e => ({ v: e.id, l: `${e.name} — ${e.nik}` }))
  }, [employees, currentUser])

  const emp = useMemo(() => employees.find(e => String(e.id) === String(form.employeeId)), [employees, form.employeeId])

  const existingPA = useMemo(() => {
    if (!form.employeeId) return null
    return [...pas].filter(p => p.action === ACTION && String(p.employeeId) === String(form.employeeId))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null
  }, [pas, form.employeeId])
  const banner = submittedPA || existingPA

  // Notice-period compliance (live)
  const noticeDays = daysBetween(form.noticeDate, form.lastWorkingDay)
  const noticeCompliant = noticeDays != null && noticeDays >= NOTICE_PERIOD_DAYS
  const reasonOpts = REASON_CATEGORIES[form.terminationType] || []

  // Setting LWD auto-fills the effective (separation) date
  const setLWD = (v) => setForm(f => ({ ...f, lastWorkingDay: v, effectiveDate: (!f.effectiveDate || f.effectiveDate === f.lastWorkingDay) ? v : f.effectiveDate }))

  const onFile = (e) => { const file = e.target.files?.[0]; if (file) setForm(f => ({ ...f, resignLetter: file.name })) }

  const handleSubmit = () => {
    if (!form.employeeId)       return flash(t('Pilih karyawan terlebih dahulu.', 'Select an employee first.'), 'error')
    if (existingPA && ['Submitted', 'Approved'].includes(existingPA.status))
      return flash(t(`Sudah ada pengajuan offboarding aktif (${existingPA.paNumber}, ${existingPA.status}) untuk karyawan ini.`, `An active offboarding request already exists (${existingPA.paNumber}, ${existingPA.status}) for this employee.`), 'error')
    if (!form.noticeDate)       return flash(t('Notice Date wajib diisi.', 'Notice Date is required.'), 'error')
    if (!form.lastWorkingDay)   return flash(t('Last Working Day wajib diisi.', 'Last Working Day is required.'), 'error')
    if (daysBetween(form.noticeDate, form.lastWorkingDay) < 0) return flash(t('Last Working Day tidak boleh sebelum Notice Date.', 'Last Working Day cannot precede the Notice Date.'), 'error')
    const eff = form.effectiveDate || form.lastWorkingDay
    if (daysBetween(form.lastWorkingDay, eff) < 0) return flash(t('Effective Date tidak boleh sebelum Last Working Day.', 'Effective Date cannot precede the Last Working Day.'), 'error')
    if (!form.terminationType)  return flash(t('Jenis Terminasi wajib dipilih.', 'Termination type is required.'), 'error')
    if (!form.reasonCategory)   return flash(t('Kategori alasan wajib dipilih.', 'Reason category is required.'), 'error')
    if (!form.reason.trim())    return flash(t('Penjelasan alasan wajib diisi.', 'Reason detail is required.'), 'error')

    const pa = {
      paNumber:           nextNumber(),
      action:             ACTION,
      status:             'Submitted',
      employeeId:         Number(form.employeeId),
      reason:             form.terminationType,   // shown in lists
      reasonCategory:     form.reasonCategory,
      note:               form.reason,
      noticeDate:         form.noticeDate,
      lastWorkingDay:     form.lastWorkingDay,
      effectiveDate:      eff,                     // separation / effective date
      noticeCompliant:    !!noticeCompliant,
      rehireEligible:     form.rehireEligible,
      resignLetter:       form.resignLetter,
      submittedBy:        currentUser?.id,
      submittedByName:    currentUser?.name,
      fromCompanyId:      emp?.companyId,
      fromDepartmentId:   emp?.departmentId,
      fromPositionId:     emp?.positionId,
      fromGradeId:        emp?.gradeId,
      fromEmploymentType: emp?.employmentType,
      fromStatus:         emp?.status,
      toStatus:           'Inactive',
      createdAt:          todayStr(),
      appliedAt:          '',
    }
    addPA(pa)
    setSubmittedPA(pa)
    flash(t('Pengajuan offboarding terkirim. Menunggu persetujuan HR.', 'Offboarding request submitted. Awaiting HR approval.'))
  }

  const resetForm = () => { setForm({ ...EMPTY, noticeDate: todayStr() }); setSubmittedPA(null); if (fileRef.current) fileRef.current.value = '' }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-5xl mx-auto px-6 py-8'>
        <p className='text-xs font-bold tracking-[0.15em] text-gray-400 uppercase mb-1'>{t('Manager Portal', 'Manager Portal')}</p>
        <h1 className='text-3xl font-bold text-gray-900'>PA Terminate</h1>
        <p className='text-gray-500 mt-1'>{t('Ajukan Personnel Action untuk memulai proses offboarding karyawan.', 'Submit a Personnel Action to start the employee offboarding process.')}</p>

        {banner && (
          <div className={`mt-6 flex items-center gap-3 rounded-2xl px-5 py-4 border ${
            banner.status === 'Approved' ? 'bg-blue-50 border-blue-100 text-blue-700'
            : banner.status === 'Applied' ? 'bg-green-50 border-green-100 text-green-700'
            : banner.status === 'Rejected' ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
            <span className='flex-shrink-0'>{banner.status === 'Approved' || banner.status === 'Applied' ? <IcCheckCircle /> : banner.status === 'Rejected' ? <IcXCircle /> : <IcClock />}</span>
            <p className='text-sm font-semibold'>
              {banner.status === 'Approved' ? t('PA Terminate telah disetujui oleh HR.', 'PA Terminate has been approved by HR.')
                : banner.status === 'Applied' ? t('PA Terminate telah diterapkan. Karyawan berstatus Inactive.', 'PA Terminate applied. Employee is now Inactive.')
                : banner.status === 'Rejected' ? t('PA Terminate ditolak oleh HR.', 'PA Terminate was rejected by HR.')
                : t('PA Terminate telah diajukan dan menunggu persetujuan HR.', 'PA Terminate submitted and awaiting HR approval.')}
            </p>
            <span className='ml-auto font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/70 border border-current/10'>{banner.paNumber}</span>
          </div>
        )}

        <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-6 py-5 border-b border-gray-50 flex items-center gap-2'>
            <span className='text-red-600'><IcUserBriefcase /></span>
            <h2 className='font-bold text-gray-900 text-lg'>{t('Form Pengajuan', 'Submission Form')}</h2>
          </div>

          <div className='px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5'>
            <Field label={t('Karyawan', 'Employee')} full>
              <select value={form.employeeId} onChange={e => { setForm(f => ({ ...f, employeeId: e.target.value })); setSubmittedPA(null) }} className={inputCls}>
                <option value=''>{t('-- Pilih Karyawan Tim --', '-- Select Team Member --')}</option>
                {teamOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              {teamOpts.length === 0 && <p className='text-xs text-amber-600 mt-1'>{t('Tidak ada anggota tim aktif untuk akun ini. Login sebagai atasan langsung karyawan (mis. offboarding-manager) atau sebagai HR/Admin untuk melihat semua karyawan aktif.', 'No active team members for this account. Log in as the employee’s direct manager (e.g. offboarding-manager), or as HR/Admin to see all active employees.')}</p>}
            </Field>

            <Field label={t('Employee ID', 'Employee ID')}><input readOnly value={emp?.nik || ''} placeholder='—' className={roCls} /></Field>
            <Field label={t('Nama Karyawan', 'Employee Name')}><input readOnly value={emp?.name || ''} placeholder='—' className={roCls} /></Field>
            <Field label={t('Departemen', 'Department')}><input readOnly value={emp ? (dpName(emp.departmentId) || emp.department || '') : ''} placeholder='—' className={roCls} /></Field>
            <Field label={t('Posisi', 'Position')}><input readOnly value={emp ? (posName(emp.positionId) || emp.position || '') : ''} placeholder='—' className={roCls} /></Field>

            {/* Dates — Notice, LWD, auto Effective */}
            <Field label={t('Notice Date (Tgl Pengajuan)', 'Notice Date')}>
              <input type='date' value={form.noticeDate} onChange={e => setForm(f => ({ ...f, noticeDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label={t('Last Working Day', 'Last Working Day')}>
              <input type='date' value={form.lastWorkingDay} onChange={e => setLWD(e.target.value)} className={inputCls} />
            </Field>
            <Field label={t('Effective / Separation Date', 'Effective / Separation Date')} hint={t('Otomatis = LWD, bisa diedit (mis. + sisa cuti).', 'Auto = LWD, editable (e.g. + remaining leave).')}>
              <input type='date' value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label={t('Kepatuhan Notice Period', 'Notice Period Compliance')}>
              <div className={`px-4 py-2.5 rounded-lg text-sm font-semibold border ${form.lastWorkingDay ? (noticeCompliant ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700') : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                {form.lastWorkingDay
                  ? (noticeCompliant
                      ? t(`Sesuai — ${noticeDays} hari (min. ${NOTICE_PERIOD_DAYS})`, `Compliant — ${noticeDays} days (min ${NOTICE_PERIOD_DAYS})`)
                      : t(`Kurang dari ${NOTICE_PERIOD_DAYS} hari (${noticeDays} hari)`, `Below ${NOTICE_PERIOD_DAYS} days (${noticeDays} days)`))
                  : t('Isi LWD dulu', 'Fill LWD first')}
              </div>
            </Field>

            <Field label={t('Jenis Terminasi', 'Termination Type')}>
              <select value={form.terminationType} onChange={e => setForm(f => ({ ...f, terminationType: e.target.value, reasonCategory: '' }))} className={inputCls}>
                {TERMINATION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label={t('Kategori Alasan', 'Reason Category')}>
              <select value={form.reasonCategory} onChange={e => setForm(f => ({ ...f, reasonCategory: e.target.value }))} className={inputCls}>
                <option value=''>{t('-- Pilih Kategori --', '-- Select Category --')}</option>
                {reasonOpts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>

            <Field label={t('Rehire Eligibility', 'Rehire Eligibility')} hint={t('Rekomendasi atasan untuk perekrutan kembali.', "Manager's recommendation for future rehire.")}>
              <div className='flex gap-2'>
                {REHIRE_OPTIONS.map(o => (
                  <button key={o} type='button' onClick={() => setForm(f => ({ ...f, rehireEligible: o }))}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border transition ${form.rehireEligible === o ? (o === 'Yes' ? 'bg-green-50 border-green-300 text-green-700' : o === 'No' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-300 text-amber-700') : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('Surat Resign / Dokumen', 'Resignation Letter / Document')}>
              <input ref={fileRef} type='file' onChange={onFile} className='hidden' id='resign-file' />
              <label htmlFor='resign-file' className='flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:border-red-400 hover:bg-red-50/40 transition'>
                <IcUpload /> {form.resignLetter || t('Pilih file (PDF/gambar)…', 'Choose file (PDF/image)…')}
              </label>
              <p className='text-xs text-gray-400 mt-1'>{t('Prototype — hanya nama file yang dicatat.', 'Prototype — only the file name is recorded.')}</p>
            </Field>

            <Field label={t('Penjelasan Alasan', 'Reason Detail')} full>
              <textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder={t('Jelaskan alasan, status handover, dan catatan lainnya…', 'Describe the reason, handover status, and any other notes…')}
                className={`${inputCls} resize-y`} />
            </Field>
          </div>

          <div className='px-6 py-4 border-t border-gray-50 bg-gray-50/60 flex items-center justify-end gap-3'>
            <button onClick={resetForm} className='px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition'>{t('Reset', 'Reset')}</button>
            <button onClick={handleSubmit} disabled={submittedPA?.status === 'Submitted' || (existingPA && ['Submitted', 'Approved'].includes(existingPA.status))}
              className='px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow hover:shadow-md hover:from-red-700 hover:to-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed'>
              {submittedPA?.status === 'Submitted' ? t('Terkirim', 'Submitted') : (existingPA && ['Submitted', 'Approved'].includes(existingPA.status)) ? t('Sudah Diajukan', 'Already Submitted') : t('Ajukan ke HR', 'Submit to HR')}
            </button>
          </div>
        </div>

        <RecentList currentUser={currentUser} pas={pas} employees={employees} t={t} />
      </div>

      {msg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span>{msg.type === 'error' ? <IcAlert /> : <IcCheckCircle />}</span>{msg.text}
        </div>
      )}
    </div>
  )
}

function RecentList({ currentUser, pas, employees, t }) {
  const mine = useMemo(() =>
    [...pas].filter(p => p.action === ACTION && (currentUser?.role === 'superadmin' || String(p.submittedBy) === String(currentUser?.id)))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8),
    [pas, currentUser])
  const empName = id => employees.find(e => e.id === Number(id))?.name || '—'
  if (mine.length === 0) return null
  return (
    <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-6 py-4 border-b border-gray-50 flex items-center gap-2'>
        <span className='text-gray-500'><IcFileText /></span>
        <h3 className='font-bold text-gray-900'>{t('Pengajuan Offboarding Saya', 'My Offboarding Submissions')}</h3>
      </div>
      <table className='w-full text-sm'>
        <thead>
          <tr className='bg-gray-50 border-b'>
            {['PA Number', t('Karyawan', 'Employee'), t('Jenis', 'Type'), 'Last Working Day', 'Status'].map(h => (
              <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-50'>
          {mine.map(pa => (
            <tr key={pa.id} className='hover:bg-gray-50/50'>
              <td className='px-4 py-3'><span className='font-mono text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded'>{pa.paNumber}</span></td>
              <td className='px-4 py-3 text-gray-800 font-medium text-xs'>{empName(pa.employeeId)}</td>
              <td className='px-4 py-3 text-xs text-gray-600'>{pa.reason}</td>
              <td className='px-4 py-3 text-xs text-gray-600'>{fmtDate(lwdOf(pa))}</td>
              <td className='px-4 py-3'><span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PA_STATUS_COLOR[pa.status] || 'bg-gray-100 text-gray-600'}`}>{pa.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
