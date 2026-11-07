'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useT } from '@/store/languageStore'
import { useAuthStore } from '@/store/authStore'
import { useHayStore } from '@/store/hayStore'
import { useVipStore, computeWeightedScore } from '@/store/vipStore'
import { usePipStore, PERNYATAAN, PIP_MIN_MONTHS, PIP_MAX_MONTHS, pipEndDate, makeEvaluasiRows, resizeBulan } from '@/store/pipStore'
import PipSignoffBlock from '@/components/performance/PipSignoffBlock'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'

const pipStatusLabel = (s, t) => ({
  'Pending HR Review':       t('Menunggu Review HR', 'Awaiting HR Review'),
  'Rejected by HR':          t('Ditolak HR', 'Rejected by HR'),
  'Pending Acknowledgement': t('Menunggu Karyawan', 'Awaiting Employee'),
  'Disputed':                t('Keberatan (Mediasi HR)', 'Disputed (HR mediation)'),
  'Active':                  ''  + t('Berjalan', 'Active'),
  'Pending HR Outcome':      t('Sign-off HR', 'HR Sign-off'),
  'Passed':                  t('Lulus', 'Passed'),
  'Failed':                  t('Gagal', 'Failed'),
}[s] || s)

const EMPTY_HAY = { topic: '', goal: '', reality: '', options: '', wayForward: '' }
const HAY_FIELDS = [
  { key: 'topic',      label: '1. T — Topic',                labelEN: '1. T — Topic' },
  { key: 'goal',       label: '2. G — Goal',                 labelEN: '2. G — Goal' },
  { key: 'reality',    label: '3. R — Reality',              labelEN: '3. R — Reality' },
  { key: 'options',    label: '4. O — Options/Alternatives', labelEN: '4. O — Options/Alternatives' },
  { key: 'wayForward', label: '5. W — Way Forward',          labelEN: '5. W — Way Forward' },
]

const HAY_FIELD_HINTS = {
  topic:      { id: 'Apa fokus bahasan yang disepakati?',                       en: 'What is the agreed focus of discussion?' },
  goal:       { id: 'Apa tujuan yang ingin dicapai?',                           en: 'What is the objective to be achieved?' },
  reality:    { id: 'Apa situasi yang dialami saat ini?',                       en: 'What is the current situation?' },
  options:    { id: 'Apa alternatif solusi yang dapat dilakukan?',              en: 'What are the solution alternatives?' },
  wayForward: { id: 'Apa rencana tindakan yang akan diambil?',                  en: 'What is the action plan?' },
}

const EMPTY_VIP_TOPIC = () => ({ id: Date.now() + Math.random(), title: '', description: '', goalPlan: '', weight: '', status: 'In Progress', checkInNotes: '' })
const VIP_STATUSES = ['Not Started', 'In Progress', 'Completed']

const hayStatusColor = (s) =>
  s === 'Completed' ? 'bg-green-50 text-green-700'
  : s === 'Pending Employee' ? 'bg-blue-50 text-blue-700'
  : 'bg-yellow-50 text-yellow-700'

const vipStatusColor = (s) =>
  s === 'Completed' ? 'bg-green-50 text-green-700'
  : s === 'Not Started' ? 'bg-gray-100 text-gray-500'
  : 'bg-blue-50 text-blue-700'

export default function MssCheckInPage({ pipOnly = false }) {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees } = useEmployeeStore()
  const { fillManagerAnswers, getByManager: getHayByManager, submitHayByManager } = useHayStore()
  const { getByManager: getVipByManager, approveVip, rateVip, returnVip } = useVipStore()
  const { signOffHay } = useHayStore()
  const { submitPip, resubmitPip, proposePipOutcome, signPip, approveResults, returnResults, getByManager: getPipByManager } = usePipStore()

  const { departments, positions } = useStructureStore()

  const mid = currentUser?.id || 2

  /* ── tab: 'hay' | 'vip' | 'pip' — dikunci ke 'pip' saat halaman PIP ── */
  const [activeTab, setActiveTab] = useState(pipOnly ? 'pip' : 'hay')

  /* ── HAY state ───────────────────────────────────────────────────── */
  const [hayView, setHayView] = useState('list') // 'list' | 'create'
  const [selectedHayId, setSelectedHayId] = useState(null)
  const [managerFillForm, setManagerFillForm] = useState(EMPTY_HAY)
  const [hayFilter, setHayFilter] = useState('All')
  const [hayForm, setHayForm] = useState(EMPTY_HAY)
  const [selectedEmployee, setSelectedEmployee] = useState('')

  /* ── VIP state ───────────────────────────────────────────────────── */
  const [selectedVipId, setSelectedVipId] = useState(null)
  const [vipTopicScores, setVipTopicScores] = useState({})
  const [vipRateNote, setVipRateNote] = useState('')
  const [vipReturning, setVipReturning] = useState(false)
  const [vipReturnNote, setVipReturnNote] = useState('')

  /* ── PIP state ───────────────────────────────────────────────────── */
  const [pipView, setPipView] = useState('list') // 'list' | 'create'
  const [selectedPipId, setSelectedPipId] = useState(null)
  const [mgrReturning, setMgrReturning] = useState(false)
  const [mgrReturnNote, setMgrReturnNote] = useState('')
  const EMPTY_PIP = {
    employeeIdNo: '', employeeDept: '', employeePosition: '',
    managerIdNo: '', startDate: '', durationMonths: 3, endDate: '',
    alasanPip: '', rencanaPerbaikan: '',
    kpiRows: [
      { id: 1, kpi: '', deskripsi: '', target: '', bulan: ['', '', ''] },
      { id: 2, kpi: '', deskripsi: '', target: '', bulan: ['', '', ''] },
      { id: 3, kpi: '', deskripsi: '', target: '', bulan: ['', '', ''] },
    ],
    evaluasiRows: makeEvaluasiRows(3),
    selectedEmpId: '',
  }
  const [pipForm, setPipForm] = useState(EMPTY_PIP)

  useEffect(() => {
    if (!pipForm.selectedEmpId) return
    const emp = employees.find(e => String(e.id) === pipForm.selectedEmpId)
    if (!emp) return
    const deptName = departments.find(d => d.id === emp.departmentId)?.name || ''
    const posName  = positions.find(p => p.id === emp.positionId)?.name || ''
    const mgr      = employees.find(e => e.id === emp.managerId)
    setPipForm(f => ({
      ...f,
      employeeDept:     deptName,
      employeePosition: posName,
      employeeIdNo:     emp.nik || '',
      managerIdNo:      mgr?.nik || '',
    }))
  }, [pipForm.selectedEmpId, employees, departments, positions])

  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500) }

  const myTeam = employees.filter(e => e.managerId === mid && e.status === 'Active')

  const teamHay = getHayByManager(mid).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  const teamVip = getVipByManager(mid).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  const teamPip = getPipByManager(mid).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  const filteredHay = hayFilter === 'All' ? teamHay : teamHay.filter(h => h.status === hayFilter)
  const selectedHay = teamHay.find(h => h.id === selectedHayId)
  const selectedVip = teamVip.find(v => v.id === selectedVipId)
  const selectedPip = teamPip.find(p => p.id === selectedPipId)

  const pending = teamHay.filter(h => h.status === 'Pending Manager').length

  // Manager may only PROPOSE the outcome once the employee has filled every
  // month's "sudah" (Improvements Made) column during the ongoing PIP.
  const evalComplete = (rows) => (rows ?? []).length > 0 && rows.every(r => (r.sudah ?? '').trim() !== '')

  /* ── PIP helpers ─────────────────────────────────────────────────── */
  const updateKpiRow = (id, key, val) => setPipForm(f => ({ ...f, kpiRows: f.kpiRows.map(r => r.id === id ? { ...r, [key]: val } : r) }))
  const addKpiRow = () => setPipForm(f => ({ ...f, kpiRows: [...f.kpiRows, { id: Date.now(), kpi: '', deskripsi: '', target: '', bulan: resizeBulan([], f.durationMonths) }] }))
  const removeKpiRow = (id) => setPipForm(f => ({ ...f, kpiRows: f.kpiRows.filter(r => r.id !== id) }))

  // Recompute end date + resize the monthly KPI columns & evaluation rows to
  // follow the chosen start date / duration (employee fills their content later).
  const applyDuration = (patch) => setPipForm(f => {
    const next = { ...f, ...patch }
    const months = Math.min(PIP_MAX_MONTHS, Math.max(PIP_MIN_MONTHS, Number(next.durationMonths) || PIP_MIN_MONTHS))
    next.durationMonths = months
    next.endDate = pipEndDate(next.startDate, months)
    next.kpiRows = next.kpiRows.map(r => ({ ...r, bulan: resizeBulan(r.bulan, months) }))
    next.evaluasiRows = makeEvaluasiRows(months, next.startDate)
    return next
  })

  const handlePipCreate = () => {
    if (!pipForm.selectedEmpId) return flash(t('Pilih karyawan terlebih dahulu.', 'Please select an employee.'), 'error')
    if (!pipForm.startDate) return flash(t('Tanggal mulai wajib diisi.', 'Start date is required.'), 'error')
    if (!pipForm.durationMonths) return flash(t('Durasi PIP wajib diisi.', 'PIP duration is required.'), 'error')
    if (!pipForm.alasanPip.trim()) return flash(t('Alasan PIP wajib diisi.', 'PIP reason is required.'), 'error')
    const emp = myTeam.find(e => String(e.id) === pipForm.selectedEmpId)
    submitPip({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeDept: emp.department || pipForm.employeeDept,
      employeePosition: emp.position || pipForm.employeePosition,
      employeeIdNo: emp.employeeId || pipForm.employeeIdNo,
      managerId: mid,
      managerName: currentUser?.name || 'Ahmad Fauzi',
      managerIdNo: pipForm.managerIdNo,
      startDate: pipForm.startDate,
      durationMonths: pipForm.durationMonths,
      endDate: pipForm.endDate || pipEndDate(pipForm.startDate, pipForm.durationMonths),
      alasanPip: pipForm.alasanPip,
      rencanaPerbaikan: pipForm.rencanaPerbaikan,
      kpiRows: pipForm.kpiRows,
      evaluasiRows: pipForm.evaluasiRows,
    })
    flash(t('Form PIP dikirim ke HR untuk direview.', 'PIP form sent to HR for review.'))
    setPipForm(EMPTY_PIP)
    setPipView('list')
  }

  const pipStatusColor = (s) =>
    s === 'Passed'  ? 'bg-green-50 text-green-700'
    : s === 'Failed' ? 'bg-red-50 text-red-700'
    : s === 'Rejected by HR' ? 'bg-red-50 text-red-700'
    : s === 'Active' ? 'bg-blue-50 text-blue-700'
    : 'bg-yellow-50 text-yellow-700'

  /* ── Manager fills T-G-R-O-W ────────────────────────────────────── */
  const handleManagerFill = () => {
    const missing = HAY_FIELDS.find(f => !managerFillForm[f.key]?.trim())
    if (missing) return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    fillManagerAnswers(selectedHayId, managerFillForm)
    flash(t('Jawaban berhasil disimpan.', 'Answers saved successfully.'))
    setManagerFillForm(EMPTY_HAY)
    setSelectedHayId(null)
  }

  /* ── HAY create for employee ─────────────────────────────────────── */
  const handleCreate = () => {
    if (!selectedEmployee) return flash(t('Pilih karyawan terlebih dahulu.', 'Please select an employee.'), 'error')
    const missing = HAY_FIELDS.find(f => !hayForm[f.key]?.trim())
    if (missing) return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    const emp = myTeam.find(e => String(e.id) === selectedEmployee)
    submitHayByManager({
      employeeId: emp.id,
      employeeName: emp.name,
      managerId: mid,
      managerName: currentUser?.name || 'Ahmad Fauzi',
      date: new Date().toISOString().slice(0, 10),
      ...hayForm,
    })
    flash(t('Sesi HAY berhasil dibuat.', 'HAY session successfully created.'))
    setHayForm(EMPTY_HAY)
    setSelectedEmployee('')
    setHayView('list')
  }

  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>
        {pipOnly ? 'PIP — Performance Improvement Plan' : t('Team Check-In', 'Team Check-In')}
      </h1>
      <p className='text-gray-500 text-sm mb-5'>
        {pipOnly
          ? t('Kelola PIP anggota tim Anda: buat, ajukan, dan tetapkan hasil.', 'Manage your team members\' PIP: create, submit, and set outcomes.')
          : t('Kelola sesi HAY (coaching) dan VIP (performance goals) dari anggota tim Anda.', 'Manage HAY (coaching) and VIP (performance goals) sessions from your team members.')}
      </p>

      {/* TABS — disembunyikan pada halaman PIP */}
      {!pipOnly && (
        <div className='flex gap-2 mb-6'>
          {[
            ['hay', 'HAY Sessions'],
            ['vip', 'VIP Sessions'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === key ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              style={activeTab === key ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
              {label}
            </button>
          ))}
        </div>
      )}

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl mb-4 ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {msg.text}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HAY TAB */}
      {activeTab === 'hay' && (
        <>

          {pending > 0 && hayView === 'list' && (
            <div className='bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 text-sm text-yellow-700'>
              <Icon name='warning' size={14} className='inline align-[-2px]' /> {pending} {t('sesi HAY menunggu balasan Anda.', 'HAY session(s) are waiting for your reply.')}
            </div>
          )}

          {/* Create HAY form */}
          {hayView === 'create' && (
            <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-5'>
              <div className='flex items-center justify-between mb-5'>
                <h2 className='font-bold text-gray-800'>{t('Buat Sesi HAY untuk Karyawan', 'Create HAY Session for Employee')}</h2>
                <button onClick={() => setHayView('list')} className='text-sm text-gray-400 hover:text-gray-600'><Icon name='close' size={14} className='inline align-[-2px]' /> {t('Batal', 'Cancel')}</button>
              </div>

              <div className='bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-700'>
                <Icon name='bulb' size={14} className='inline align-[-2px]' /> {t('Dokumentasikan sesi coaching dengan karyawan menggunakan framework T-G-R-O-W.', 'Document a coaching session with an employee using the T-G-R-O-W framework.')}
              </div>

              <div className='mb-5'>
                <label className='block text-sm font-bold text-gray-700 mb-1.5'><Icon name='user' size={14} className='inline align-[-2px]' /> {t('Pilih Karyawan', 'Select Employee')}</label>
                <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 transition bg-white'>
                  <option value=''>{t('— Pilih karyawan —', '— Select employee —')}</option>
                  {myTeam.map(e => <option key={e.id} value={String(e.id)}>{e.name} — {e.position}</option>)}
                </select>
              </div>

              <div className='space-y-4'>
                {HAY_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className='block text-sm font-bold text-gray-700 mb-0.5'>{t(f.label, f.labelEN)}</label>
                    <p className='text-xs text-gray-400 mb-1'>{t(HAY_FIELD_HINTS[f.key].id, HAY_FIELD_HINTS[f.key].en)}</p>
                    <textarea rows={2} value={hayForm[f.key]}
                      onChange={e => setHayForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className='w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none transition' />
                  </div>
                ))}
              </div>

              <div className='flex gap-3 mt-5'>
                <button onClick={handleCreate}
                  className='px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  {t('Simpan Sesi HAY', 'Save HAY Session')}
                </button>
                <button onClick={() => setHayView('list')}
                  className='px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                  {t('Batal', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {/* HAY list + detail */}
          {hayView === 'list' && (
            <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
              {/* Left: list */}
              <div className='lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100'>
                <div className='px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap items-center justify-between'>
                  <div className='flex gap-1.5 flex-wrap'>
                    {['All', 'Pending Manager', 'Completed', 'Pending Employee'].map(f => (
                      <button key={f} onClick={() => setHayFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${hayFilter === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={hayFilter === f ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
                        {f === 'All' ? t('Semua', 'All')
                          : f === 'Pending Manager' ? t('Perlu Diisi', 'Fill Now')
                          : f === 'Completed' ? t('Selesai', 'Completed')
                          : t('Dari Atasan', 'By Mgr')}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setHayView('create')}
                    className='px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    + {t('Buat', 'Create')}
                  </button>
                </div>

                {filteredHay.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-gray-400 gap-2'>
                    <span className='text-gray-300'><Icon name='message' size={34} /></span>
                    <p className='text-xs'>{t('Tidak ada sesi.', 'No sessions.')}</p>
                  </div>
                ) : (
                  <div className='divide-y divide-gray-100'>
                    {filteredHay.map(h => (
                      <button key={h.id} onClick={() => { setSelectedHayId(h.id); setManagerFillForm(EMPTY_HAY) }}
                        className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left ${selectedHayId === h.id ? 'bg-red-50/40' : ''}`}>
                        <div className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5'
                          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                          {h.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-xs font-semibold text-gray-800'>{h.employeeName}</p>
                          <p className='text-xs text-gray-500 line-clamp-1 mt-0.5'>{h.topic}</p>
                          <p className='text-xs text-gray-400 mt-0.5'>{h.date}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${hayStatusColor(h.status)}`}>
                          {h.status === 'Completed' ? t('Selesai', 'Completed')
                            : h.status === 'Pending Employee' ? t('Menunggu Emp', 'Pending Emp')
                            : t('Perlu Diisi', 'Fill Now')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: detail */}
              <div className='lg:col-span-3'>
                {!selectedHay ? (
                  <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 flex flex-col items-center justify-center py-20 text-gray-400'>
                    <span className='text-gray-300 mb-3'><Icon name='message' size={44} /></span>
                    <p className='text-sm'>{t('Pilih sesi HAY untuk melihat detail.', 'Select a HAY session to view details.')}</p>
                  </div>
                ) : (
                  <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6'>
                    <div className='flex items-start justify-between mb-5'>
                      <div>
                        <h2 className='font-bold text-gray-800'>{selectedHay.employeeName}</h2>
                        <p className='text-xs text-gray-400 mt-0.5'>{selectedHay.date}</p>
                        {selectedHay.createdBy === 'manager' && (
                          <p className='text-xs text-blue-500 mt-0.5'><Icon name='edit' size={14} className='inline align-[-2px]' /> {t('Dibuat oleh atasan', 'Created by manager')}</p>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${hayStatusColor(selectedHay.status)}`}>
                          {selectedHay.status === 'Completed' ? t('Selesai', 'Completed')
                            : selectedHay.status === 'Pending Employee' ? t('Menunggu Karyawan', 'Pending Employee')
                            : t('Perlu Diisi', 'Fill Required')}
                        </span>
                        {selectedHay.status === 'Completed' && (
                          selectedHay.signedOffManager
                            ? <span className='text-xs text-green-600 font-semibold'><Icon name='check' size={14} className='inline align-[-2px]' /> {t('Anda sign-off', 'You signed off')}</span>
                            : <button onClick={() => { signOffHay(selectedHay.id, 'manager'); flash(t('Sesi HAY Anda sign-off.', 'HAY session signed off.')) }}
                                className='px-3 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition'>
                                {t('Sign-off Sesi', 'Sign off Session')}
                              </button>
                        )}
                      </div>
                    </div>

                    {/* Completed: both answers shown side by side */}
                    {selectedHay.employeeAnswers && selectedHay.managerAnswers && (
                      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
                        <div>
                          <div className='flex items-center gap-2 mb-2'>
                            <div className='w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                              {(selectedHay.employeeName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                            </div>
                            <p className='text-xs font-bold text-gray-600'>{selectedHay.employeeName} — {t('Jawaban Karyawan', 'Employee Answers')}</p>
                          </div>
                          <div className='space-y-2'>
                            {HAY_FIELDS.map(f => (
                              <div key={f.key} className='bg-gray-50 rounded-xl p-3'>
                                <p className='text-xs font-bold text-gray-400 mb-0.5'>{t(f.label, f.labelEN)}</p>
                                <p className='text-sm text-gray-700'>{selectedHay.employeeAnswers[f.key] || '—'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className='flex items-center gap-2 mb-2'>
                            <div className='w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-green-600'>
                              {(selectedHay.managerName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                            </div>
                            <p className='text-xs font-bold text-green-700'>{selectedHay.managerName} — {t('Jawaban Atasan', 'Manager Answers')}</p>
                          </div>
                          <div className='space-y-2'>
                            {HAY_FIELDS.map(f => (
                              <div key={f.key} className='bg-green-50 rounded-xl p-3 border border-green-100'>
                                <p className='text-xs font-bold text-green-600 mb-0.5'>{t(f.label, f.labelEN)}</p>
                                <p className='text-sm text-green-900'>{selectedHay.managerAnswers[f.key] || '—'}</p>
                              </div>
                            ))}
                          </div>
                          {selectedHay.managerFilledAt && (
                            <p className='text-[10px] text-green-500 mt-2'>
                              {new Date(selectedHay.managerFilledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Only employee answers, manager hasn't filled yet — show employee ref (left) + manager form (right) */}
                    {selectedHay.employeeAnswers && !selectedHay.managerAnswers && selectedHay.status === 'Pending Manager' && (
                      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
                        {/* Left: employee answers as reference */}
                        <div>
                          <div className='flex items-center gap-2 mb-2'>
                            <div className='w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                              {(selectedHay.employeeName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                            </div>
                            <p className='text-xs font-bold text-gray-600'>{selectedHay.employeeName} — {t('Jawaban Karyawan (Referensi)', 'Employee Answers (Reference)')}</p>
                          </div>
                          <div className='space-y-2'>
                            {HAY_FIELDS.map(f => (
                              <div key={f.key} className='bg-gray-50 rounded-xl p-3'>
                                <p className='text-xs font-bold text-gray-400 mb-0.5'>{t(f.label, f.labelEN)}</p>
                                <p className='text-sm text-gray-700'>{selectedHay.employeeAnswers[f.key] || '—'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Right: manager fill form */}
                        <div className='border border-green-100 rounded-xl p-4 bg-green-50/30'>
                          <div className='flex items-center gap-2 mb-3'>
                            <div className='w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-green-600'>
                              {(selectedHay.managerName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                            </div>
                            <p className='text-xs font-bold text-green-700'>{selectedHay.managerName} — {t('Jawaban Atasan', 'Manager Answers')}</p>
                          </div>
                          <div className='space-y-3 mb-4'>
                            {HAY_FIELDS.map(f => (
                              <div key={f.key}>
                                <label className='block text-xs font-bold text-gray-600 mb-0.5'>{t(f.label, f.labelEN)}</label>
                                <p className='text-[10px] text-gray-400 mb-1'>{t(HAY_FIELD_HINTS[f.key].id, HAY_FIELD_HINTS[f.key].en)}</p>
                                <textarea rows={2} value={managerFillForm[f.key]}
                                  onChange={e => setManagerFillForm(p => ({ ...p, [f.key]: e.target.value }))}
                                  className='w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none transition bg-white' />
                              </div>
                            ))}
                          </div>
                          <button onClick={handleManagerFill}
                            className='px-5 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
                            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                            {t('Simpan Jawaban Saya', 'Save My Answers')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Manager created session, waiting for employee */}
                    {selectedHay.status === 'Pending Employee' && !selectedHay.employeeAnswers && (
                      <div className='bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700'>
                        ℹ️ {t('Sesi ini dibuat oleh Anda. Karyawan sedang mengisi jawaban mereka.', 'You created this session. The employee is filling their answers.')}
                      </div>
                    )}

                    {/* Fallback: manager-only answers (no employee answers) */}
                    {!selectedHay.employeeAnswers && selectedHay.managerAnswers && (
                      <div>
                        <div className='flex items-center gap-2 mb-2'>
                          <div className='w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-green-600'>
                            {(selectedHay.managerName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                          </div>
                          <p className='text-xs font-bold text-green-700'>{selectedHay.managerName} — {t('Jawaban Atasan', 'Manager Answers')}</p>
                        </div>
                        <div className='space-y-2'>
                          {HAY_FIELDS.map(f => (
                            <div key={f.key} className='bg-green-50 rounded-xl p-3 border border-green-100'>
                              <p className='text-xs font-bold text-green-600 mb-0.5'>{t(f.label, f.labelEN)}</p>
                              <p className='text-sm text-green-900'>{selectedHay.managerAnswers[f.key] || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* VIP TAB */}
      {activeTab === 'vip' && (
        <>

          <div className='bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-sm text-blue-700'>
            ℹ️ {t('Sesi VIP dibuat oleh karyawan. Anda dapat melihat isinya sebagai referensi coaching.', 'VIP sessions are created by employees. You can view them as coaching reference.')}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
            {/* Left: list */}
            <div className='lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100'>
              <div className='px-4 py-3 border-b border-gray-100'>
                <p className='text-xs font-semibold text-gray-500'>{teamVip.length} {t('sesi dari tim Anda', 'sessions from your team')}</p>
              </div>
              {teamVip.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-gray-400 gap-2'>
                  <span className='text-gray-300'><Icon name='target' size={34} /></span>
                  <p className='text-xs'>{t('Belum ada sesi VIP dari tim.', 'No VIP sessions from your team yet.')}</p>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  {teamVip.map(v => (
                    <button key={v.id} onClick={() => setSelectedVipId(v.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left ${selectedVipId === v.id ? 'bg-orange-50/40' : ''}`}>
                      <div className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5'
                        style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
                        {v.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-semibold text-gray-800'>{v.employeeName}</p>
                        <p className='text-xs text-orange-600 font-medium mt-0.5'>{v.name}</p>
                        <p className='text-xs text-gray-400 mt-0.5'>{v.date} · {v.topics.length} {t('topik', 'topic(s)')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: detail */}
            <div className='lg:col-span-3'>
              {!selectedVip ? (
                <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 flex flex-col items-center justify-center py-20 text-gray-400'>
                  <span className='text-gray-300 mb-3'><Icon name='target' size={44} /></span>
                  <p className='text-sm'>{t('Pilih sesi VIP untuk melihat detail.', 'Select a VIP session to view details.')}</p>
                </div>
              ) : (
                <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6'>
                  <div className='flex items-start justify-between mb-5'>
                    <div>
                      <div className='flex items-center gap-2 mb-0.5'>
                        <span className='text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold'>VIP</span>
                        <h2 className='font-bold text-gray-800'>{selectedVip.name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selectedVip.status === 'Closed' ? 'bg-green-50 text-green-700' : selectedVip.status === 'Cancelled' ? 'bg-gray-100 text-gray-500' : (selectedVip.status === 'Active' || selectedVip.status === 'In Review' || selectedVip.status === 'Pending Employee Ack') ? 'bg-blue-50 text-blue-700' : selectedVip.status === 'Returned' ? 'bg-amber-50 text-amber-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {selectedVip.status === 'Closed' ? t('Selesai Dinilai', 'Rated')
                            : selectedVip.status === 'Active' ? t('Berjalan', 'Active')
                            : selectedVip.status === 'In Review' ? t('Self-Assessment', 'In Review')
                            : selectedVip.status === 'Pending Employee Ack' ? t('Menunggu Terima Nilai', 'Awaiting Ack')
                            : selectedVip.status === 'Cancelled' ? t('Dibatalkan', 'Cancelled')
                            : selectedVip.status === 'Returned' ? t('Dikembalikan', 'Returned')
                            : t('Menunggu Approval', 'Awaiting Approval')}
                        </span>
                      </div>
                      <p className='text-xs text-gray-400'>{selectedVip.employeeName} · {selectedVip.date}</p>
                    </div>
                    <span className='text-xs text-gray-400'>
                      {t('Total Bobot', 'Total Weight')}: {selectedVip.topics.reduce((s, tp) => s + (Number(tp.weight) || 0), 0)}%
                    </span>
                  </div>

                  <h3 className='text-sm font-bold text-gray-600 mb-3'>{t('Performance Goal Discussion Topics', 'Performance Goal Discussion Topics')}</h3>
                  <div className='space-y-4'>
                    {selectedVip.topics.map(tp => (
                      <div key={tp.id} className='border border-gray-200 rounded-xl overflow-hidden'>
                        <div className='px-4 py-2.5 bg-orange-50 border-b border-orange-100 flex items-center justify-between'>
                          <p className='text-sm font-bold text-orange-600'>{tp.title}</p>
                          <span className='text-xs text-gray-400'>
                            {t('Notes added in this check-in', 'Notes added in this check-in')}: {tp.checkInNotes ? 1 : 0}
                          </span>
                        </div>
                        <div className='p-4 space-y-3'>
                          {tp.description && <p className='text-sm text-gray-600'>{tp.description}</p>}
                          <div className='flex flex-wrap gap-4 text-xs'>
                            {tp.goalPlan && (
                              <div><span className='text-gray-400'>{t('Goal Plan', 'Goal Plan')}: </span><span className='font-semibold text-gray-700'>{tp.goalPlan}</span></div>
                            )}
                            {(tp.weight !== '' && tp.weight !== undefined) && (
                              <div><span className='text-gray-400'>{t('Bobot', 'Weight')}: </span><span className='font-semibold text-gray-700'>{tp.weight}%</span></div>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${vipStatusColor(tp.status)}`}>{tp.status}</span>
                          </div>
                          {tp.checkInNotes && (
                            <div className='bg-blue-50 rounded-lg p-3'>
                              <p className='text-xs font-bold text-blue-600 mb-1'><Icon name='edit' size={14} className='inline align-[-2px]' /> {t('Notes Check-In', 'Check-In Notes')}</p>
                              <p className='text-sm text-blue-800'>{tp.checkInNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manager approval / rating */}
                  {selectedVip.status === 'Pending Manager' && (
                    <div className='mt-5 border-t border-gray-100 pt-4'>
                      {!vipReturning ? (
                        <>
                          <p className='text-xs text-gray-500 mb-2'>{t('Setujui goal & bobot ini agar periode berjalan, atau kembalikan untuk direvisi.', 'Approve these goals & weights to start the period, or return them for revision.')}</p>
                          <div className='flex gap-2'>
                            <button onClick={() => { approveVip(selectedVip.id, currentUser); flash(t('Goal VIP disetujui — periode berjalan.', 'VIP goals approved — period is now running.')) }}
                              className='px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition'>
                              <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Setujui Goal', 'Approve Goals')}
                            </button>
                            <button onClick={() => setVipReturning(true)}
                              className='px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition'>
                              <Icon name='undo' size={14} className='inline align-[-2px]' /> {t('Kembalikan untuk Revisi', 'Return for Revision')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className='bg-amber-50 border border-amber-200 rounded-xl p-4'>
                          <p className='text-xs font-semibold text-amber-700 mb-1'>{t('Catatan revisi untuk karyawan (wajib)', 'Revision note for the employee (required)')}</p>
                          <textarea rows={2} value={vipReturnNote} onChange={e => setVipReturnNote(e.target.value)}
                            className='w-full px-3 py-2 text-sm border border-amber-300 rounded-lg outline-none focus:border-amber-500 resize-none bg-white mb-3' />
                          <div className='flex gap-2'>
                            <button onClick={() => {
                                if (!vipReturnNote.trim()) return flash(t('Catatan revisi wajib diisi.', 'Revision note is required.'), 'error')
                                returnVip(selectedVip.id, currentUser, vipReturnNote)
                                setVipReturning(false); setVipReturnNote('')
                                flash(t('Goal dikembalikan ke karyawan.', 'Goals returned to the employee.'))
                              }}
                              disabled={!vipReturnNote.trim()}
                              className='px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition'>
                              {t('Konfirmasi Kembalikan', 'Confirm Return')}
                            </button>
                            <button onClick={() => { setVipReturning(false); setVipReturnNote('') }}
                              className='px-5 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                              {t('Batal', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedVip.status === 'Returned' && (
                    <div className='mt-5 border-t border-gray-100 pt-4 bg-amber-50 rounded-xl p-4'>
                      <p className='text-xs font-bold text-amber-700'><Icon name='undo' size={14} className='inline align-[-2px]' /> {t('Dikembalikan untuk revisi', 'Returned for revision')}</p>
                      {selectedVip.returnNote && <p className='text-xs text-amber-700 mt-1 italic'>"{selectedVip.returnNote}"</p>}
                      <p className='text-[11px] text-amber-600 mt-1'>{t('Menunggu karyawan memperbaiki dan mengajukan ulang.', 'Waiting for the employee to revise and resubmit.')}</p>
                    </div>
                  )}
                  {selectedVip.status === 'Active' && (
                    <div className='mt-5 border-t border-gray-100 pt-4 bg-blue-50/40 rounded-xl p-4'>
                      <p className='text-xs text-blue-700'><Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Periode berjalan. Karyawan mengisi self-assessment sebelum Anda memberi nilai akhir.', 'Period running. The employee completes a self-assessment before you give the final rating.')}</p>
                    </div>
                  )}
                  {selectedVip.status === 'In Review' && (
                    <div className='mt-5 border-t border-gray-100 pt-4'>
                      <p className='text-xs font-bold text-gray-600 mb-2'>{t('Penilaian Akhir Periode (skor per-topik, tertimbang bobot)', 'End-of-period Rating (per-topic score, weighted)')}</p>
                      {selectedVip.selfScore != null && (
                        <div className='bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-3 text-xs text-indigo-700'>
                          <span className='font-bold'>{t('Self-assessment karyawan', 'Employee self-assessment')}: {selectedVip.selfScore}</span>
                          {selectedVip.selfNote && <span> — {selectedVip.selfNote}</span>}
                        </div>
                      )}
                      <div className='space-y-2 mb-3'>
                        {selectedVip.topics.map(tp => (
                          <div key={tp.id} className='flex items-center gap-3'>
                            <span className='flex-1 text-xs text-gray-700 truncate'>{tp.title} <span className='text-gray-400'>({tp.weight || 0}%)</span></span>
                            <input type='number' min='0' max='100' value={vipTopicScores[tp.id] ?? ''} onChange={e => setVipTopicScores(p => ({ ...p, [tp.id]: e.target.value }))}
                              placeholder='0-100'
                              className='w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400' />
                          </div>
                        ))}
                      </div>
                      <input value={vipRateNote} onChange={e => setVipRateNote(e.target.value)}
                        placeholder={t('Catatan penilaian (opsional)', 'Rating note (optional)')}
                        className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400 mb-3' />
                      <button onClick={() => {
                          if (selectedVip.topics.some(tp => vipTopicScores[tp.id] === undefined || vipTopicScores[tp.id] === '')) return flash(t('Isi skor semua topik terlebih dahulu.', 'Score every topic first.'), 'error')
                          rateVip(selectedVip.id, vipTopicScores, vipRateNote, currentUser)
                          setVipTopicScores({}); setVipRateNote('')
                          flash(t('Nilai dikirim ke karyawan untuk diterima.', 'Rating sent to the employee for acknowledgement.'))
                        }}
                        className='px-5 py-2 text-white text-sm font-bold rounded-xl transition'
                        style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                        <Icon e='⭐' size={14} className='inline align-[-2px]' /> {t('Kirim Nilai ke Karyawan', 'Send Rating to Employee')}
                        <span className='ml-2 font-normal opacity-80'>({t('bobot', 'weighted')}: {computeWeightedScore(selectedVip.topics.map(tp => ({ ...tp, score: vipTopicScores[tp.id] }))) ?? '—'})</span>
                      </button>
                    </div>
                  )}
                  {selectedVip.status === 'Pending Employee Ack' && (
                    <div className='mt-5 border-t border-gray-100 pt-4 bg-yellow-50 rounded-xl p-4 text-xs text-yellow-700'>
                      <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Skor akhir', 'Final score')}: <b>{selectedVip.finalScore}</b>. {t('Menunggu karyawan menerima nilai.', 'Awaiting employee acknowledgement.')}
                    </div>
                  )}
                  {selectedVip.status === 'Closed' && (
                    <div className='mt-5 border-t border-gray-100 pt-4 bg-green-50 rounded-xl p-4'>
                      <p className='text-sm font-bold text-green-700'><Icon e='⭐' size={14} className='inline align-[-2px]' /> {t('Skor Akhir', 'Final Score')}: {selectedVip.finalScore}</p>
                      {selectedVip.ratingNote && <p className='text-xs text-green-700 mt-1'>{selectedVip.ratingNote}</p>}
                      {selectedVip.ackNote && <p className='text-xs text-gray-600 mt-1'>{t('Tanggapan karyawan', 'Employee response')}: {selectedVip.ackNote}</p>}
                      {selectedVip.objected && <p className='text-xs font-bold text-red-600 mt-1'>⚠ {t('Karyawan mengajukan keberatan atas nilai ini.', 'Employee objected to this rating.')}</p>}
                    </div>
                  )}
                  {selectedVip.status === 'Cancelled' && (
                    <div className='mt-5 border-t border-gray-100 pt-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-500'>
                      {t('Sesi dibatalkan', 'Session cancelled')}{selectedVip.cancelReason ? `: ${selectedVip.cancelReason}` : '.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PIP TAB */}
      {activeTab === 'pip' && (
        <>

          {/* CREATE FORM */}
          {pipView === 'create' && (
            <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-5'>
              <div className='flex items-center justify-between mb-5'>
                <div>
                  <h2 className='font-bold text-gray-800'>FORM PERFORMANCE IMPROVEMENT PLAN (PIP)</h2>
                  <p className='text-xs text-gray-400 mt-0.5'>{t('Diisi oleh Atasan', 'Filled by Manager')}</p>
                </div>
                <button onClick={() => setPipView('list')} className='text-sm text-gray-400 hover:text-gray-600'><Icon name='close' size={14} className='inline align-[-2px]' /> {t('Batal', 'Cancel')}</button>
              </div>

              {/* Identity grid */}
              <div className='grid grid-cols-2 gap-x-8 gap-y-4 mb-6'>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Pilih Karyawan', 'Select Employee')} *</label>
                  <select value={pipForm.selectedEmpId} onChange={e => setPipForm(f => ({ ...f, selectedEmpId: e.target.value }))}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white transition'>
                    <option value=''>{t('— Pilih karyawan —', '— Select employee —')}</option>
                    {myTeam.map(e => <option key={e.id} value={String(e.id)}>{e.name} — {e.position}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Nama Atasan Langsung', 'Direct Manager')}</label>
                  <input value={currentUser?.name || ''} readOnly className='w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Departemen', 'Department')}</label>
                  <input value={pipForm.employeeDept} onChange={e => setPipForm(f => ({ ...f, employeeDept: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-red-400 transition ${pipForm.employeeDept ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'}`} />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>Employee ID {t('Atasan', 'Manager')}</label>
                  <input value={pipForm.managerIdNo} onChange={e => setPipForm(f => ({ ...f, managerIdNo: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-red-400 transition ${pipForm.managerIdNo ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'}`} />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Posisi', 'Position')}</label>
                  <input value={pipForm.employeePosition} onChange={e => setPipForm(f => ({ ...f, employeePosition: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-red-400 transition ${pipForm.employeePosition ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'}`} />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>Employee ID {t('Pekerja', 'Employee')}</label>
                  <input value={pipForm.employeeIdNo} onChange={e => setPipForm(f => ({ ...f, employeeIdNo: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-red-400 transition ${pipForm.employeeIdNo ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'}`} />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Tanggal Mulai PIP', 'PIP Start Date')} *</label>
                  <input type='date' value={pipForm.startDate} onChange={e => applyDuration({ startDate: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 transition' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Durasi PIP (bulan)', 'PIP Duration (months)')} *</label>
                  <select value={pipForm.durationMonths}
                    onChange={e => applyDuration({ durationMonths: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 transition bg-white'>
                    {Array.from({ length: PIP_MAX_MONTHS - PIP_MIN_MONTHS + 1 }, (_, i) => PIP_MIN_MONTHS + i).map(n => (
                      <option key={n} value={n}>{n} {t('bulan', n === 1 ? 'month' : 'months')}</option>
                    ))}
                  </select>
                  <p className='text-[11px] text-gray-400 mt-1'>{t('1–12 bulan. Jumlah baris evaluasi & kolom capaian mengikuti durasi.', '1–12 months. Evaluation rows & achievement columns follow the duration.')}</p>
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Tanggal Akhir PIP (otomatis)', 'PIP End Date (auto)')}</label>
                  <input type='date' value={pipForm.endDate} readOnly tabIndex={-1}
                    className='w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500' />
                </div>
              </div>

              {/* Section 1 */}
              <h3 className='text-sm font-bold text-gray-700 mb-3 border-t border-gray-100 pt-4'>1. {t('Alasan PIP & Rencana Perbaikan Kinerja', 'PIP Reason & Performance Improvement Plan')}</h3>
              <div className='space-y-4 mb-6'>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Alasan PIP', 'PIP Reason')} *</label>
                  <p className='text-xs text-gray-400 mb-1.5'>{t('Sampaikan alasan mengenai rancangan perbaikan kinerja ini dibuat.', 'Explain the reason this performance improvement plan was created.')}</p>
                  <textarea rows={4} value={pipForm.alasanPip} onChange={e => setPipForm(f => ({ ...f, alasanPip: e.target.value }))}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none transition' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>{t('Rencana Perbaikan Kinerja', 'Performance Improvement Plan')}</label>
                  <p className='text-xs text-gray-400 mb-1.5'>{t('Jelaskan action plan dalam proses perbaikan kinerja.', 'Explain the action plan in the performance improvement process.')}</p>
                  <textarea rows={4} value={pipForm.rencanaPerbaikan} onChange={e => setPipForm(f => ({ ...f, rencanaPerbaikan: e.target.value }))}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none transition' />
                </div>
              </div>

              {/* Section 2: KPI table — manager sets KPI, description & target only.
                  Monthly achievement columns are filled by the employee while the PIP runs. */}
              <h3 className='text-sm font-bold text-gray-700 mb-2 border-t border-gray-100 pt-4'>2. {t('Detail KPI & Target', 'KPI Details & Target')}</h3>
              <p className='text-xs text-gray-400 mb-3'>{t('Tetapkan KPI dan target. Capaian Bulan I–' + (pipForm.durationMonths || 0) + ' diisi karyawan saat PIP berjalan.', 'Set KPIs and targets. Achievements for Month I–' + (pipForm.durationMonths || 0) + ' are filled by the employee while the PIP runs.')}</p>
              <div className='overflow-x-auto mb-3'>
                <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden mb-2'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>KPI</th>
                      <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>{t('Deskripsi', 'Description')}</th>
                      <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600'>Target</th>
                      <th className='border border-gray-200 px-2 py-2 text-center font-bold text-gray-400 w-8'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipForm.kpiRows.map(row => (
                      <tr key={row.id}>
                        <td className='border border-gray-200 p-1'><input value={row.kpi} onChange={e => updateKpiRow(row.id, 'kpi', e.target.value)} className='w-full px-2 py-1 text-xs outline-none border-0' /></td>
                        <td className='border border-gray-200 p-1'><input value={row.deskripsi} onChange={e => updateKpiRow(row.id, 'deskripsi', e.target.value)} className='w-full px-2 py-1 text-xs outline-none border-0' /></td>
                        <td className='border border-gray-200 p-1'><input value={row.target} onChange={e => updateKpiRow(row.id, 'target', e.target.value)} className='w-24 px-2 py-1 text-xs outline-none border-0 text-center' /></td>
                        <td className='border border-gray-200 p-1 text-center'>
                          {pipForm.kpiRows.length > 1 && (
                            <button onClick={() => removeKpiRow(row.id)} className='text-red-400 hover:text-red-600 text-xs'><Icon name='close' size={12} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addKpiRow}
                className='text-xs text-red-600 font-semibold hover:underline mb-6'>
                + {t('Tambah Baris KPI', 'Add KPI Row')}
              </button>

              {/* Section 3: Evaluation schedule — rows follow the duration; the employee
                  fills the content (Improvements / Action Plan) during the ongoing PIP. */}
              <div className='border-t border-gray-100 pt-4 mb-6'>
                <h3 className='text-sm font-bold text-gray-700 mb-1'>3. {t('Jadwal Evaluasi PIP', 'PIP Evaluation Schedule')}</h3>
                <p className='text-xs text-gray-400 mb-3'><Icon name='info' size={13} className='inline align-[-2px]' /> {t(`${pipForm.durationMonths || 0} periode evaluasi (mengikuti durasi). Kolom evaluasi diisi oleh karyawan saat PIP berjalan.`, `${pipForm.durationMonths || 0} evaluation periods (follows the duration). The evaluation columns are filled by the employee while the PIP runs.`)}</p>
                <div className='overflow-x-auto'>
                  <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden'>
                    <thead>
                      <tr className='bg-gray-50'>
                        <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600 w-28'>{t('Evaluasi PIP', 'PIP Evaluation')}</th>
                        <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>{t('Perbaikan Kinerja yang sudah dilakukan', 'Improvements Made')}</th>
                        <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>{t('Perbaikan Kinerja yang belum dilakukan', 'Improvements Not Yet Made')}</th>
                        <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>{t('Rencana Perbaikan (Action Plan)', 'Action Plan')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipForm.evaluasiRows.map((row, i) => (
                        <tr key={i} className='text-gray-400'>
                          <td className='border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700'>
                            <div className='font-bold'>{row.bulan}</div>
                            <div className='text-[11px] text-gray-400 mt-0.5'>{row.tanggal || '—'}</div>
                          </td>
                          <td className='border border-gray-200 px-2 py-3 italic text-[11px]'>{t('diisi karyawan', 'by employee')}</td>
                          <td className='border border-gray-200 px-2 py-3 italic text-[11px]'>{t('diisi karyawan', 'by employee')}</td>
                          <td className='border border-gray-200 px-2 py-3 italic text-[11px]'>{t('diisi karyawan', 'by employee')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pernyataan preview */}
              <div className='bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5'>
                <h3 className='text-xs font-bold text-gray-600 mb-3'>{t('Pernyataan', 'Declaration')} ({t('akan ditampilkan ke karyawan untuk diterima & diketahui setelah HR menyetujui', 'will be shown to the employee for acknowledgement after HR approval')})</h3>
                <ul className='space-y-2'>
                  {PERNYATAAN.map((p, i) => (
                    <li key={i} className='flex gap-2 text-xs text-gray-500 leading-relaxed'>
                      <span className='mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-gray-300 text-white flex items-center justify-center text-[10px] font-bold'>{i + 1}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='flex gap-3'>
                <button onClick={handlePipCreate}
                  className='px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  <Icon name='upload' size={14} className='inline align-[-2px]' /> {t('Kirim PIP ke HR untuk Review', 'Send PIP to HR for Review')}
                </button>
                <button onClick={() => setPipView('list')}
                  className='px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                  {t('Batal', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {/* PIP List + Detail */}
          {pipView === 'list' && (
            <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
              {/* Left */}
              <div className='lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100'>
                <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between'>
                  <p className='text-xs font-semibold text-gray-500'>{teamPip.length} {t('PIP', 'PIP')}</p>
                  <button onClick={() => setPipView('create')}
                    className='px-2.5 py-1 rounded-lg text-xs font-semibold text-white'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    + {t('Buat PIP', 'Create PIP')}
                  </button>
                </div>
                {teamPip.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-gray-400 gap-2'>
                    <span className='text-gray-300'><Icon name='clipboard' size={34} /></span>
                    <p className='text-xs'>{t('Belum ada PIP.', 'No PIP yet.')}</p>
                  </div>
                ) : (
                  <div className='divide-y divide-gray-100'>
                    {teamPip.map(p => (
                      <button key={p.id} onClick={() => setSelectedPipId(p.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left ${selectedPipId === p.id ? 'bg-red-50/40' : ''}`}>
                        <div className='w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 bg-red-100 text-red-500'><Icon name='clipboard' size={15} /></div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-xs font-semibold text-gray-800'>{p.employeeName}</p>
                          <p className='text-xs text-gray-500 mt-0.5'>{p.startDate} <Icon e='→' size={14} className='inline align-[-2px]' /> {p.endDate}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${pipStatusColor(p.status)}`}>
                          {pipStatusLabel(p.status, t)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: detail */}
              <div className='lg:col-span-3'>
                {!selectedPip ? (
                  <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 flex flex-col items-center justify-center py-20 text-gray-400'>
                    <span className='text-gray-300 mb-3'><Icon name='clipboard' size={44} /></span>
                    <p className='text-sm'>{t('Pilih PIP untuk melihat detail.', 'Select a PIP to view details.')}</p>
                  </div>
                ) : (
                  <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5'>
                    <div className='text-center border-b border-gray-100 pb-4'>
                      <p className='text-xs text-gray-400 mb-1'>FORM PERFORMANCE IMPROVEMENT PLAN (PIP)</p>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${pipStatusColor(selectedPip.status)}`}>
                        {pipStatusLabel(selectedPip.status, t)}
                      </span>
                    </div>


                    <div className='space-y-2'>
                      <div className='bg-gray-50 rounded-xl p-3'>
                        <p className='text-xs font-bold text-gray-400 mb-1'>{t('Alasan PIP', 'PIP Reason')}</p>
                        <p className='text-xs text-gray-700'>{selectedPip.alasanPip}</p>
                      </div>
                      <div className='bg-gray-50 rounded-xl p-3'>
                        <p className='text-xs font-bold text-gray-400 mb-1'>{t('Rencana Perbaikan', 'Improvement Plan')}</p>
                        <p className='text-xs text-gray-700'>{selectedPip.rencanaPerbaikan || '—'}</p>
                      </div>
                    </div>

                    <div className='overflow-x-auto'>
                      <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden'>
                        <thead>
                          <tr className='bg-gray-50'>
                            <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>KPI</th>
                            <th className='border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600'>Target</th>
                            {Array.from({ length: selectedPip.durationMonths ?? (selectedPip.kpiRows?.[0]?.bulan?.length || 0) }, (_, i) => (
                              <th key={i} className='border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600 bg-red-50'>B.{i + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPip.kpiRows.map(row => (
                            <tr key={row.id}>
                              <td className='border border-gray-200 px-2 py-1.5 text-gray-700'>{row.kpi || '—'}</td>
                              <td className='border border-gray-200 px-2 py-1.5 text-center text-gray-700'>{row.target || '—'}</td>
                              {(row.bulan ?? []).map((b, i) => (
                                <td key={i} className='border border-gray-200 px-2 py-1.5 text-center text-gray-500'>{b || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedPip.status === 'Pending HR Review' && (
                      <div className='bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-xs text-yellow-700'>
                        <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Menunggu review & persetujuan HR sebelum diberikan ke karyawan.', 'Awaiting HR review & approval before it goes to the employee.')}
                      </div>
                    )}

                    {selectedPip.status === 'Rejected by HR' && (
                      <div className='bg-red-50 border border-red-100 rounded-xl p-4'>
                        <p className='text-xs font-bold text-red-700 mb-1'><Icon name='close' size={14} className='inline align-[-2px]' /> {t('Ditolak HR', 'Rejected by HR')}{selectedPip.hrReviewerName ? ` (${selectedPip.hrReviewerName})` : ''}</p>
                        {selectedPip.hrRejectNote && <p className='text-xs text-red-600 mb-3'>"{selectedPip.hrRejectNote}"</p>}
                        <button onClick={() => { resubmitPip(selectedPip.id); flash(t('PIP diajukan ulang ke HR.', 'PIP resubmitted to HR.')) }}
                          className='px-4 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition'
                          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                          <Icon name='repeat' size={14} className='inline align-[-2px]' /> {t('Perbaiki & Ajukan Ulang', 'Revise & Resubmit')}
                        </button>
                      </div>
                    )}

                    {(selectedPip.status === 'Active' || selectedPip.status === 'Passed' || selectedPip.status === 'Failed') && (
                      <div className='bg-blue-50 border border-blue-100 rounded-xl p-4'>
                        <p className='text-xs font-bold text-blue-700 mb-1'><Icon name='check' size={14} className='inline align-[-2px]' /> {t('Diterima karyawan', 'Acknowledged by employee')}</p>
                        {selectedPip.acknowledgedAt && <p className='text-xs text-blue-600'>{new Date(selectedPip.acknowledgedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                        {selectedPip.employeeNote && <p className='text-xs text-blue-700 mt-1'>{t('Tanggapan Karyawan', 'Employee Response')}: {selectedPip.employeeNote}</p>}
                      </div>
                    )}

                    {selectedPip.status === 'Active' && (
                      <div className='border border-gray-200 rounded-xl p-4'>
                        <p className='text-xs font-bold text-gray-600 mb-2'><Icon name='calendar' size={14} className='inline align-[-2px]' /> {t('Evaluasi Bulanan (diisi karyawan)', 'Monthly Evaluation (filled by employee)')}</p>
                        <div className='overflow-x-auto mb-3'>
                          <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden'>
                            <thead><tr className='bg-gray-50'>
                              {[t('Bulan','Month'), t('Tanggal','Date'), t('Yang Sudah Tercapai','Achieved'), t('Yang Belum','Not Yet'), t('Rencana','Plan')].map(h => (
                                <th key={h} className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {(selectedPip.evaluasiRows ?? []).map((row, i) => (
                                <tr key={i}>
                                  <td className='border border-gray-200 px-2 py-1.5 font-semibold text-gray-700 whitespace-nowrap'>{row.bulan}</td>
                                  <td className='border border-gray-200 px-2 py-1.5 text-gray-500 whitespace-nowrap'>{row.tanggal || '—'}</td>
                                  {['sudah', 'belum', 'rencana'].map(k => (
                                    <td key={k} className='border border-gray-200 px-2 py-1.5 text-gray-600'>{row[k] || <span className='text-gray-300 italic'>—</span>}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Manager approval of the employee-filled results */}
                        {!selectedPip.resultsApprovedAt ? (
                          <div className='border-t border-gray-100 pt-3 mb-3'>
                            <p className='text-xs font-bold text-gray-600 mb-2'>{t('Persetujuan Hasil oleh Atasan', 'Manager Approval of Results')}</p>
                            {!evalComplete(selectedPip.evaluasiRows) ? (
                              <p className='text-[11px] text-amber-600'>
                                <Icon name='warning' size={14} className='inline align-[-2px]' /> {t('Menunggu karyawan mengisi kolom "Yang Sudah Tercapai" untuk semua bulan.', 'Waiting for the employee to fill the "Achieved" column for every month.')}
                              </p>
                            ) : !mgrReturning ? (
                              <div className='flex gap-2'>
                                <button onClick={() => { approveResults(selectedPip.id, currentUser); flash(t('Hasil karyawan disetujui.', 'Employee results approved.')) }}
                                  className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition'>
                                  <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Setujui Hasil', 'Approve Results')}
                                </button>
                                <button onClick={() => setMgrReturning(true)}
                                  className='px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition'>
                                  <Icon name='undo' size={14} className='inline align-[-2px]' /> {t('Kembalikan untuk Revisi', 'Return for Revision')}
                                </button>
                              </div>
                            ) : (
                              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3'>
                                <textarea rows={2} value={mgrReturnNote} onChange={e => setMgrReturnNote(e.target.value)}
                                  placeholder={t('Catatan revisi untuk karyawan (wajib)', 'Revision note for the employee (required)')}
                                  className='w-full px-3 py-2 text-sm border border-amber-300 rounded-lg outline-none focus:border-amber-500 resize-none bg-white mb-2' />
                                <div className='flex gap-2'>
                                  <button onClick={() => { if (!mgrReturnNote.trim()) return flash(t('Catatan revisi wajib diisi.', 'Revision note is required.'), 'error'); returnResults(selectedPip.id, currentUser, mgrReturnNote); setMgrReturning(false); setMgrReturnNote(''); flash(t('Hasil dikembalikan ke karyawan.', 'Results returned to the employee.')) }}
                                    className='px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg'>{t('Konfirmasi', 'Confirm')}</button>
                                  <button onClick={() => { setMgrReturning(false); setMgrReturnNote('') }} className='px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg'>{t('Batal', 'Cancel')}</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className='bg-green-50 border border-green-100 rounded-lg p-2.5 mb-3 text-xs text-green-700'>
                            <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Hasil disetujui', 'Results approved')}{selectedPip.resultsApprovedBy ? ` — ${selectedPip.resultsApprovedBy}` : ''}
                          </div>
                        )}

                        <p className='text-xs font-bold text-gray-600 mb-2'>{t('Usulkan Hasil Akhir PIP (perlu sign-off HR)', 'Propose Final PIP Outcome (needs HR sign-off)')}</p>
                        {!selectedPip.resultsApprovedAt && (
                          <p className='text-[11px] text-amber-600 mb-2'>
                            <Icon name='warning' size={14} className='inline align-[-2px]' /> {t('Setujui hasil karyawan terlebih dahulu.', 'Approve the employee results first.')}
                          </p>
                        )}
                        <div className='flex gap-2'>
                          <button onClick={() => { proposePipOutcome(selectedPip.id, 'Passed', '', currentUser); flash(t('Usulan "Lulus" dikirim ke HR untuk sign-off.', 'Proposed "Passed" sent to HR for sign-off.')) }}
                            disabled={!selectedPip.resultsApprovedAt}
                            className='px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition'>
                            <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Usulkan Lulus', 'Propose Passed')}
                          </button>
                          <button onClick={() => { proposePipOutcome(selectedPip.id, 'Failed', '', currentUser); flash(t('Usulan "Gagal" dikirim ke HR untuk sign-off.', 'Proposed "Failed" sent to HR for sign-off.')) }}
                            disabled={!selectedPip.resultsApprovedAt}
                            className='px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition'>
                            <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Usulkan Gagal', 'Propose Failed')}
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedPip.status === 'Pending HR Outcome' && (
                      <div className='bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-xs text-yellow-700'>
                        <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Usulan hasil', 'Proposed outcome')}: <b>{selectedPip.outcome}</b>. {t('Menunggu sign-off HR sebelum final.', 'Awaiting HR sign-off before final.')}
                      </div>
                    )}
                    {selectedPip.status === 'Disputed' && (
                      <div className='bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-700'>
                        <Icon name='warning' size={14} className='inline align-[-2px]' /> {t('Karyawan mengajukan keberatan. HR sedang memediasi.', 'Employee raised a dispute. HR is mediating.')}
                        {selectedPip.disputeNote && <p className='italic mt-1'>"{selectedPip.disputeNote}"</p>}
                      </div>
                    )}

                    {(selectedPip.status === 'Passed' || selectedPip.status === 'Failed') && (
                      <div className={`rounded-xl p-4 ${selectedPip.status === 'Passed' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                        <p className={`text-xs font-bold ${selectedPip.status === 'Passed' ? 'text-green-700' : 'text-red-700'}`}>
                          {t('Hasil Akhir', 'Final Outcome')}: {selectedPip.status === 'Passed' ? t('Lulus', 'Passed') : t('Gagal', 'Failed')}
                        </p>
                        {selectedPip.closedAt && <p className='text-xs text-gray-500 mt-0.5'>{new Date(selectedPip.closedAt).toLocaleDateString('id-ID')}</p>}
                      </div>
                    )}

                    {(selectedPip.status === 'Passed' || selectedPip.status === 'Failed') && (
                      <PipSignoffBlock pip={selectedPip}
                        canSign={selectedPip.signoffs?.manager ? null : 'manager'}
                        onSign={() => { signPip(selectedPip.id, 'manager', { name: currentUser?.name || selectedPip.managerName, position: selectedPip.managerPosition || t('Atasan Langsung', 'Direct Manager') }); flash(t('Anda telah menandatangani persetujuan final.', 'You have signed the final agreement.')) }} />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}
