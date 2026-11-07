'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore } from '@/store/personnelActionStore'
import {
  useExitInterviewStore, HR_INTERVIEWERS, INTERVIEW_ROOMS,
  RATING_SECTIONS, RATING_SCALE, RATING_ITEMS, RESIGN_REASON_OPTIONS,
  AFTER_PLAN_OPTIONS, WORK_QUESTIONS, SUGGESTION_QUESTIONS, avgOf,
} from '@/store/exitInterviewStore'
import { useT } from '@/store/languageStore'

// ─── Icons ────────────────────────────────────────────────────────────────────
const svg = (children, size = 15) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcCal   = svg(<><rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' /></>, 14)
const IcPin   = svg(<><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' /><circle cx='12' cy='10' r='3' /></>, 14)
const IcVideo = svg(<><polygon points='23 7 16 12 23 17 23 7' /><rect x='1' y='5' width='15' height='14' rx='2' /></>, 14)
const IcUser  = svg(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></>, 14)
const IcForm  = svg(<><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' /><line x1='16' y1='13' x2='8' y2='13' /><line x1='16' y1='17' x2='8' y2='17' /></>, 14)
const IcPlus  = svg(<><line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' /></>, 16)
const IcClock = svg(<><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></>, 13)
const IcCheck = svg(<><path d='M22 11.08V12a10 10 0 11-5.93-9.14' /><polyline points='22 4 12 14.01 9 11.01' /></>, 13)
const IcSend  = svg(<><line x1='22' y1='2' x2='11' y2='13' /><polygon points='22 2 15 22 11 13 2 9 22 2' /></>, 15)
const IcSliders = svg(<><line x1='4' y1='21' x2='4' y2='14' /><line x1='4' y1='10' x2='4' y2='3' /><line x1='12' y1='21' x2='12' y2='12' /><line x1='12' y1='8' x2='12' y2='3' /><line x1='20' y1='21' x2='20' y2='16' /><line x1='20' y1='12' x2='20' y2='3' /><line x1='1' y1='14' x2='7' y2='14' /><line x1='9' y1='8' x2='15' y2='8' /><line x1='17' y1='16' x2='23' y2='16' /></>, 14)
const IcLink  = svg(<><path d='M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71' /><path d='M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' /></>, 14)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (name) => asText(name).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const fmtDate = (d) => { const s = asText(d); if (!s) return '—'; const dt = new Date(s); if (isNaN(dt.getTime())) return s; return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
const AVATAR_TINTS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
const tintFor = (name) => AVATAR_TINTS[(asText(name).length) % AVATAR_TINTS.length]

const STATUS = {
  'Scheduled':   { cls: 'bg-gray-100 text-gray-600', Icon: IcClock },
  'In Progress': { cls: 'bg-rose-50 text-rose-600',  Icon: IcClock },
  'Completed':   { cls: 'bg-green-50 text-green-600', Icon: IcCheck },
}
const EMPTY = { employeeId: '', employeeName: '', position: '', dept: '', hrName: HR_INTERVIEWERS[0], date: '', time: '', mode: 'Offline', room: INTERVIEW_ROOMS[0], link: '', formAccess: false }

export default function ExitInterview() {
  const t = useT()
  const { employees = [] } = useEmployeeStore()
  const { departments = [], positions = [] } = useStructureStore()
  const { pas = [] } = usePersonnelActionStore()
  const { schedules = [], addSchedule, updateSchedule, toggleAccess } = useExitInterviewStore()

  const [modal, setModal] = useState(null)   // { mode:'add'|'edit', sch } | null
  const [form, setForm]   = useState({ ...EMPTY })
  const [preview, setPreview] = useState(null) // 'master' | schedule object (for results/preview)
  const [result, setResult]   = useState(null) // schedule object
  const [msg, setMsg] = useState(null)
  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2500) }

  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const posName = id => positions.find(x => x.id === Number(id))?.name || ''

  const eligible = useMemo(() =>
    (employees || []).filter(e => (pas || []).some(p => p && p.action === 'Terminate' &&
      String(p.employeeId) === String(e.id) && ['Approved', 'Applied'].includes(p.status))),
    [employees, pas])

  const openAdd  = () => { setForm({ ...EMPTY }); setModal({ mode: 'add' }) }
  const openEdit = (sch) => { setForm({ ...EMPTY, ...sch }); setModal({ mode: 'edit', sch }) }

  const pickEmployee = (id) => {
    const e = (employees || []).find(x => String(x.id) === String(id))
    setForm(f => ({
      ...f, employeeId: id,
      employeeName: e?.name || '',
      position: e ? (posName(e.positionId) || e.position || '') : '',
      dept: e ? (dpName(e.departmentId) || e.department || '') : '',
    }))
  }

  const handleSave = () => {
    if (!form.employeeName) return flash(t('Pilih karyawan.', 'Select an employee.'))
    if (!form.date || !form.time) return flash(t('Tanggal & jam wajib diisi.', 'Date & time are required.'))
    if (modal.mode === 'add') {
      addSchedule({ ...form, status: 'Scheduled' })
      flash(t('Jadwal disimpan & undangan terkirim.', 'Schedule saved & invitation sent.'))
    } else {
      updateSchedule(modal.sch.id, { ...form })
      flash(t('Jadwal diperbarui.', 'Schedule updated.'))
    }
    setModal(null)
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-5xl mx-auto px-6 py-8'>

        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Exit Interview</h1>
            <p className='text-gray-500 mt-1'>{t('HR mengatur jadwal interview dan membukakan akses Exit Interview Digital Form.', 'HR schedules interviews and opens access to the Exit Interview Digital Form.')}</p>
          </div>
          <div className='flex items-center gap-2 flex-shrink-0'>
            <button onClick={() => setPreview('master')}
              className='flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50'>
              <IcSliders /> {t('Master Form', 'Master Form')}
            </button>
            <button onClick={openAdd}
              className='flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow hover:shadow-md'>
              <IcPlus /> {t('Set Interview Schedule', 'Set Interview Schedule')}
            </button>
          </div>
        </div>

        {/* Schedule list */}
        <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <div className='flex items-center justify-between'>
            <p className='font-bold text-gray-900'>{t('Jadwal Interview', 'Interview Schedule')}</p>
            <span className='text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full'>{schedules.length} {t('sesi', 'sessions')}</span>
          </div>

          <div className='mt-4 space-y-4'>
            {schedules.length === 0 ? (
              <p className='text-center py-10 text-gray-400 text-sm'>{t('Belum ada jadwal interview.', 'No interview scheduled yet.')}</p>
            ) : schedules.map(sch => {
              const st = STATUS[sch.status] || STATUS['Scheduled']
              const avg = sch.result ? avgOf(sch.result.ratings) : null
              return (
                <div key={sch.id} className='border border-gray-100 rounded-2xl p-4'>
                  <div className='flex items-start gap-3'>
                    <div className='w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white' style={{ background: tintFor(sch.employeeName) }}>
                      {initials(sch.employeeName)}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <p className='font-bold text-gray-900'>{sch.employeeName}</p>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}><st.Icon />{sch.status}</span>
                      </div>
                      <p className='text-xs text-gray-500'>{sch.position} · {sch.dept}</p>
                      <div className='flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs text-gray-500'>
                        <span className='flex items-center gap-1'><IcCal /> {fmtDate(sch.date)} · {sch.time}</span>
                        {sch.mode === 'Online'
                          ? <span className='flex items-center gap-1'><IcVideo /> Online · {sch.link || '—'}</span>
                          : <span className='flex items-center gap-1'><IcPin /> Offline · {sch.room || '—'}</span>}
                        <span className='flex items-center gap-1'><IcUser /> HR: {sch.hrName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Completed summary */}
                  {sch.status === 'Completed' && sch.result && (
                    <div className='mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3'>
                      <div className='flex items-start justify-between gap-3 flex-wrap'>
                        <p className='flex items-center gap-1.5 text-sm font-semibold text-green-700'><IcForm /> {t('Form terkirim', 'Form submitted')}: {sch.result.submittedAt}</p>
                        <span className='text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-full'>{t('Rata-rata skor', 'Avg score')}: {avg} / 4</span>
                      </div>
                      <p className='text-xs text-gray-600 mt-1'><span className='font-semibold'>{t('Alasan resign', 'Resign reason')}:</span> {sch.result.resignReason}</p>
                    </div>
                  )}

                  {/* Footer row */}
                  <div className='mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap'>
                    <label className='flex items-center gap-2 text-sm cursor-pointer'>
                      <IcForm />
                      <span className='text-gray-600'>{t('Akses Exit Interview Digital Form', 'Exit Interview Digital Form access')}</span>
                      <button type='button' onClick={() => toggleAccess(sch.id)}
                        className={`relative w-9 h-5 rounded-full transition ${sch.formAccess ? 'bg-red-600' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${sch.formAccess ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                      <span className={`flex items-center gap-1 text-xs font-semibold ${sch.formAccess ? 'text-green-600' : 'text-gray-400'}`}>
                        {sch.formAccess ? <><IcCheck /> {t('Dibukakan', 'Opened')}</> : t('Ditutup', 'Closed')}
                      </span>
                    </label>
                    <div className='flex items-center gap-2'>
                      {sch.status === 'Completed' && (
                        <button onClick={() => setResult(sch)}
                          className='flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg'>
                          <IcForm /> {t('Lihat Hasil', 'View Result')}
                        </button>
                      )}
                      <button onClick={() => setPreview(sch)}
                        className='flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg'>
                        <IcForm /> {t('Preview Form', 'Preview Form')}
                      </button>
                      <button onClick={() => openEdit(sch)}
                        className='text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg'>
                        {t('Edit Jadwal', 'Edit Schedule')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Schedule modal */}
      {modal && (
        <ScheduleModal t={t} mode={modal.mode} form={form} setForm={setForm}
          eligible={eligible} dpName={dpName} posName={posName} onPick={pickEmployee}
          onClose={() => setModal(null)} onSave={handleSave} />
      )}

      {/* Form preview / master */}
      {preview && (
        <FormPreview t={t} schedule={preview === 'master' ? null : preview} onClose={() => setPreview(null)} />
      )}

      {/* Results */}
      {result && <FormResult t={t} schedule={result} onClose={() => setResult(null)} />}

      {msg && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold bg-green-600 text-white pointer-events-none'>{msg}</div>
      )}
    </div>
  )
}

const fieldCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white'
function Label({ children }) { return <label className='text-sm font-semibold text-gray-800'>{children}</label> }

function ScheduleModal({ t, mode, form, setForm, eligible, dpName, posName, onPick, onClose, onSave }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden'>
        <div className='flex items-start justify-between px-6 py-4 border-b'>
          <div>
            <h2 className='font-bold text-gray-900'>{t('Set Interview Schedule', 'Set Interview Schedule')}</h2>
            <p className='text-xs text-gray-400'>{t('Pilih karyawan, HR yang mewawancarai, waktu, dan mode.', 'Choose employee, HR interviewer, time and mode.')}</p>
          </div>
          <button onClick={onClose} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
        </div>

        <div className='overflow-y-auto px-6 py-5 space-y-4'>
          <div>
            <Label>{t('Karyawan Resign', 'Resigning Employee')}</Label>
            {eligible.length ? (
              <select value={form.employeeId} onChange={e => onPick(e.target.value)} className={`mt-1.5 ${fieldCls}`}>
                <option value=''>{t('-- Pilih Karyawan --', '-- Select Employee --')}</option>
                {eligible.map(e => <option key={e.id} value={e.id}>{e.name} — {posName(e.positionId) || e.position || '—'}</option>)}
              </select>
            ) : (
              <input value={form.employeeName} onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))}
                placeholder={t('Nama karyawan', 'Employee name')} className={`mt-1.5 ${fieldCls}`} />
            )}
          </div>
          <div>
            <Label>HR Interviewer</Label>
            <select value={form.hrName} onChange={e => setForm(f => ({ ...f, hrName: e.target.value }))} className={`mt-1.5 ${fieldCls}`}>
              {HR_INTERVIEWERS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div><Label>{t('Tanggal', 'Date')}</Label>
              <input type='date' value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={`mt-1.5 ${fieldCls}`} /></div>
            <div><Label>{t('Jam', 'Time')}</Label>
              <input type='time' value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={`mt-1.5 ${fieldCls}`} /></div>
          </div>
          <div>
            <Label>Mode</Label>
            <div className='mt-1.5 flex items-center gap-5 text-sm'>
              {['Offline', 'Online'].map(m => (
                <label key={m} className='flex items-center gap-1.5 cursor-pointer'>
                  <input type='radio' name='mode' checked={form.mode === m} onChange={() => setForm(f => ({ ...f, mode: m }))} className='accent-red-600' />
                  {m === 'Offline' ? <><IcPin /> Offline</> : <><IcVideo /> Online</>}
                </label>
              ))}
            </div>
          </div>
          {form.mode === 'Offline' ? (
            <div>
              <Label>{t('Ruangan', 'Room')}</Label>
              <select value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className={`mt-1.5 ${fieldCls}`}>
                {INTERVIEW_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <Label>{t('Link Meeting', 'Meeting Link')}</Label>
              <div className='mt-1.5 relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'><IcLink /></span>
                <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder='https://meet.google.com/...' className={`${fieldCls} pl-9`} />
              </div>
            </div>
          )}
          <label className='flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer'>
            <span className='flex items-center gap-2'>
              <IcForm />
              <span>
                <span className='text-sm font-semibold text-gray-800 block'>{t('Bukakan Akses Digital Form', 'Open Digital Form Access')}</span>
                <span className='text-xs text-gray-400'>{t('Karyawan menerima email undangan mengisi form.', 'The employee receives an email invitation to fill the form.')}</span>
              </span>
            </span>
            <button type='button' onClick={() => setForm(f => ({ ...f, formAccess: !f.formAccess }))}
              className={`relative w-10 h-5 rounded-full transition flex-shrink-0 ${form.formAccess ? 'bg-red-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.formAccess ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
        </div>

        <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
          <button onClick={onClose} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
          <button onClick={onSave} className='flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow'>
            <IcSend /> {t('Simpan & Kirim Undangan', 'Save & Send Invitation')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden'>
        <div className='flex items-start justify-between px-6 py-4 border-b flex-shrink-0'>
          <div><h2 className='font-bold text-gray-900'>{title}</h2>{subtitle && <p className='text-xs text-gray-400'>{subtitle}</p>}</div>
          <button onClick={onClose} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
        </div>
        <div className='overflow-y-auto px-6 py-5'>{children}</div>
      </div>
    </div>
  )
}

// Read-only preview of the digital form (also the Master Form view)
function FormPreview({ t, schedule, onClose }) {
  const isMaster = !schedule
  return (
    <ModalShell onClose={onClose}
      title={isMaster ? t('Master — Exit Interview Digital Form', 'Master — Exit Interview Digital Form') : t('Preview — Exit Interview Digital Form', 'Preview — Exit Interview Digital Form')}
      subtitle={isMaster ? t('Template form yang diisi karyawan resign.', 'Template filled by resigning employees.') : `${schedule.employeeName} · ${schedule.position}`}>
      <FormBody t={t} />
    </ModalShell>
  )
}

function FormBody({ t, values }) {
  const ro = !values // read-only when no answers
  return (
    <div className='space-y-6 text-sm'>
      {/* Section I — ratings */}
      <section>
        <p className='font-bold text-gray-900'>I. {t('PANDANGAN / OPINI KARYAWAN', 'EMPLOYEE OPINION')}</p>
        <p className='text-xs text-gray-400 mb-2'>1 = {RATING_SCALE[0].l}, 2 = {RATING_SCALE[1].l}, 3 = {RATING_SCALE[2].l}, 4 = {RATING_SCALE[3].l}</p>
        <div className='border border-gray-200 rounded-lg overflow-hidden'>
          <table className='w-full text-xs'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                <th className='text-left px-3 py-2 font-semibold text-gray-500'>{t('ASPEK', 'ASPECT')}</th>
                {[1, 2, 3, 4].map(n => <th key={n} className='w-9 text-center px-1 py-2 font-semibold text-gray-500'>{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {RATING_SECTIONS.map(sec => (
                <FragmentSection key={sec.code} sec={sec} ro={ro} values={values} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section A */}
      <section>
        <p className='font-bold text-gray-900'>A. {t('TERKAIT PENGUNDURAN DIRI', 'ABOUT THE RESIGNATION')}</p>
        <p className='text-gray-700 mt-1 font-medium'>1. {t('Alasan utama mengundurkan diri', 'Main reason for resigning')}</p>
        <div className='mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
          {RESIGN_REASON_OPTIONS.map(o => {
            const checked = values?.resignReasons?.includes(o)
            return <label key={o} className='flex items-center gap-2 text-gray-600'><input type='checkbox' disabled readOnly checked={!!checked} className='accent-red-600' /> {o}</label>
          })}
        </div>
        {values?.resignReason && <p className='mt-2 text-gray-700 bg-gray-50 rounded-lg px-3 py-2'>{values.resignReason}</p>}
        {ro && <p className='mt-2 border-b border-dashed border-gray-300 h-5' />}
        <p className='text-gray-700 mt-3 font-medium'>2. {t('Hal khusus yang memicu pengunduran diri', 'Specific trigger for resigning')}</p>
        <AnswerLine ro={ro} value={values?.trigger} />
        <p className='text-gray-700 mt-3 font-medium'>3. {t('Rencana setelah keluar', 'Plan after leaving')}</p>
        <div className='mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
          {AFTER_PLAN_OPTIONS.map(o => {
            const checked = values?.afterPlans?.includes(o)
            return <label key={o} className='flex items-center gap-2 text-gray-600'><input type='checkbox' disabled readOnly checked={!!checked} className='accent-red-600' /> {o}</label>
          })}
        </div>
      </section>

      {/* Section B */}
      <section>
        <p className='font-bold text-gray-900'>B. {t('PELAKSANAAN PEKERJAAN DAN TANGGUNG JAWAB', 'JOB & RESPONSIBILITIES')}</p>
        {WORK_QUESTIONS.map((q, i) => (
          <div key={i} className='mt-2'>
            <p className='text-gray-700'>{i + 1}. {q}</p>
            <AnswerLine ro={ro} value={values?.work?.[i]} />
          </div>
        ))}
      </section>

      {/* Section C */}
      <section>
        <p className='font-bold text-gray-900'>C. {t('SARAN DAN LAIN-LAIN', 'SUGGESTIONS & OTHERS')}</p>
        {SUGGESTION_QUESTIONS.map((q, i) => (
          <div key={i} className='mt-2'>
            <p className='text-gray-700'>{i + 1}. {q}</p>
            <AnswerLine ro={ro} value={values?.suggestions?.[i]} />
          </div>
        ))}
      </section>
    </div>
  )
}

function FragmentSection({ sec, ro, values }) {
  // Determine the starting flat index for this section
  const start = RATING_ITEMS.findIndex(it => it.section === sec.code)
  return (
    <>
      <tr className='bg-gray-100/70 border-b'>
        <td colSpan={5} className='px-3 py-1.5 font-bold text-gray-700'>{sec.code}. {sec.title}</td>
      </tr>
      {sec.items.map((label, i) => {
        const flatIdx = start + i
        const score = values?.ratings?.[flatIdx]
        return (
          <tr key={label} className='border-b last:border-0'>
            <td className='px-3 py-2 text-gray-600'>{label}</td>
            {[1, 2, 3, 4].map(n => (
              <td key={n} className='text-center px-1 py-2'>
                <span className={`inline-flex w-5 h-5 items-center justify-center rounded ${score === n ? 'bg-red-600 text-white font-bold' : 'text-gray-300'}`}>
                  {score === n ? '✓' : (ro ? '' : '')}
                </span>
              </td>
            ))}
          </tr>
        )
      })}
    </>
  )
}

function AnswerLine({ ro, value }) {
  if (value) return <p className='mt-1 text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5'>{value}</p>
  return <p className='mt-2 border-b border-dashed border-gray-300 h-5' />
}

// Results view — shows the employee's filled answers & scores
function FormResult({ t, schedule, onClose }) {
  const r = schedule.result || {}
  const overall = avgOf(r.ratings)
  const sectionAvg = RATING_SECTIONS.map(sec => {
    const start = RATING_ITEMS.findIndex(it => it.section === sec.code)
    const slice = (r.ratings || []).slice(start, start + sec.items.length)
    return { code: sec.code, title: sec.title, avg: avgOf(slice) }
  })
  return (
    <ModalShell onClose={onClose}
      title={`${t('Hasil Exit Interview', 'Exit Interview Result')} — ${schedule.employeeName}`}
      subtitle={`${schedule.position} · ${schedule.dept} · ${t('dikirim', 'submitted')} ${r.submittedAt || '—'}`}>
      <div className='space-y-5'>
        <div className='flex items-center justify-between bg-red-50 rounded-xl px-4 py-3'>
          <p className='text-sm font-semibold text-red-700'>{t('Rata-rata Skor Keseluruhan', 'Overall Average Score')}</p>
          <p className='text-2xl font-bold text-red-700'>{overall} <span className='text-sm font-normal text-red-400'>/ 4</span></p>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
          {sectionAvg.map(s => (
            <div key={s.code} className='bg-gray-50 rounded-xl px-3 py-2 text-center'>
              <p className='text-[11px] text-gray-400'>{s.code}. {s.title}</p>
              <p className='text-lg font-bold text-gray-800'>{s.avg}</p>
            </div>
          ))}
        </div>
        {r.resignReason && (
          <div className='bg-amber-50 border border-amber-100 rounded-xl px-4 py-3'>
            <p className='text-xs font-semibold text-amber-700'>{t('Alasan Resign', 'Resign Reason')}</p>
            <p className='text-sm text-gray-700 mt-0.5'>{r.resignReason}</p>
            {r.trigger && <p className='text-xs text-gray-500 mt-1'>{t('Pemicu', 'Trigger')}: {r.trigger}</p>}
          </div>
        )}
        <FormBody t={t} values={r} />
      </div>
    </ModalShell>
  )
}
