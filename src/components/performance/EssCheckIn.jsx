'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useT } from '@/store/languageStore'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useHayStore } from '@/store/hayStore'
import { useVipStore } from '@/store/vipStore'
import { usePipStore, PERNYATAAN } from '@/store/pipStore'
import PipSignoffBlock from '@/components/performance/PipSignoffBlock'

/* ── HAY fields ─────────────────────────────────────────────────────────── */
const EMPTY_HAY = { topic: '', goal: '', reality: '', options: '', wayForward: '' }
const HAY_FIELDS = [
  { key: 'topic',      label: '1. T — Topic',                labelEN: '1. T — Topic',                hint: 'Apa fokus bahasan yang disepakati dalam sesi HAY ini?',                   hintEN: 'What is the focus of discussion in this HAY session?' },
  { key: 'goal',       label: '2. G — Goal',                 labelEN: '2. G — Goal',                 hint: 'Apa tujuan yang ingin dicapai dari sesi HAY ini?',                        hintEN: 'What is the objective to be achieved in this HAY session?' },
  { key: 'reality',    label: '3. R — Reality',              labelEN: '3. R — Reality',              hint: 'Apa situasi yang dialami/dipikirkan/dirasakan saat ini?',                  hintEN: 'What is the thought/feeling in the current situation?' },
  { key: 'options',    label: '4. O — Options/Alternatives', labelEN: '4. O — Options/Alternatives', hint: 'Apa alternatif solusi yang dapat dilakukan?',                             hintEN: 'What are the solution alternatives to achieve the desired objective?' },
  { key: 'wayForward', label: '5. W — Way Forward',          labelEN: '5. W — Way Forward',          hint: 'Apa rencana tindakan yang akan diambil?',                                hintEN: 'What is the action plan to achieve the desired objective?' },
]

/* ── VIP helpers ────────────────────────────────────────────────────────── */
const EMPTY_VIP_TOPIC = () => ({ id: Date.now() + Math.random(), title: '', description: '', goalPlan: '', weight: '', status: 'In Progress', checkInNotes: '' })
const VIP_STATUSES = ['Not Started', 'In Progress', 'Completed']

const pipStatusLabel = (s, t) => ({
  'Pending HR Review':       t('Review HR', 'HR Review'),
  'Rejected by HR':          t('Ditolak HR', 'Rejected by HR'),
  'Pending Acknowledgement': t('Perlu Diterima', 'Awaiting Acknowledgement'),
  'Disputed':                t('Keberatan (Mediasi HR)', 'Disputed (HR mediation)'),
  'Active':                  ''  + t('Berjalan', 'Active'),
  'Pending HR Outcome':      t('Menunggu Sign-off HR', 'Awaiting HR Sign-off'),
  'Passed':                  t('Lulus', 'Passed'),
  'Failed':                  t('Gagal', 'Failed'),
}[s] || s)

/* ── Status helpers ─────────────────────────────────────────────────────── */
const hayStatusColor = (s) =>
  s === 'Completed' ? 'bg-green-50 text-green-700'
  : s === 'Pending Employee' ? 'bg-blue-50 text-blue-700'
  : 'bg-yellow-50 text-yellow-700'

const hayStatusLabel = (s, t) =>
  s === 'Completed' ? t('Selesai', 'Completed')
  : s === 'Pending Employee' ? t('Perlu Diisi', 'Fill Required')
  : t('Menunggu Atasan', 'Awaiting Manager')

const vipStatusColor = (s) =>
  s === 'Completed' ? 'bg-green-50 text-green-700'
  : s === 'Not Started' ? 'bg-gray-100 text-gray-500'
  : 'bg-blue-50 text-blue-700'

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EssCheckInPage({ pipOnly = false }) {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees } = useEmployeeStore()
  const hayStore = useHayStore()
  const vipStore = useVipStore()

  /* top-level tab: 'checkin' | 'pip' — dikunci ke 'pip' saat halaman PIP */
  const [mainTab, setMainTab] = useState(pipOnly ? 'pip' : 'checkin')

  /* view machine: 'list' | 'type-select' | 'new-hay' | 'new-vip' | 'detail-hay' | 'detail-vip' */
  const [view, setView] = useState('list')

  /* HAY form state */
  const [hayForm, setHayForm] = useState(EMPTY_HAY)
  const [selectedHayId, setSelectedHayId] = useState(null)
  const [employeeFillForm, setEmployeeFillForm] = useState(EMPTY_HAY)

  const [editVipId, setEditVipId] = useState(null)   // set when revising a Returned VIP
  /* VIP form state */
  const [vipName, setVipName] = useState('')
  const [vipTopics, setVipTopics] = useState([EMPTY_VIP_TOPIC()])
  const [selectedVipId, setSelectedVipId] = useState(null)
  const [selfScore, setSelfScore] = useState('')
  const [selfNote, setSelfNote] = useState('')
  const [ackNote, setAckNote] = useState('')

  /* PIP state */
  const pipStore = usePipStore()
  const [selectedPipId, setSelectedPipId] = useState(null)
  const [pipApproveNote, setPipApproveNote] = useState('')
  const [showPipApprove, setShowPipApprove] = useState(false)
  const [pipChecked, setPipChecked] = useState(PERNYATAAN.map(() => false))
  const [showPipDispute, setShowPipDispute] = useState(false)
  const [pipDisputeNote, setPipDisputeNote] = useState('')
  const [pipAppealNote, setPipAppealNote] = useState('')
  const [pipResultDraft, setPipResultDraft] = useState(null) // employee-entered results (Active PIP)

  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500) }

  const uid = currentUser?.id || 1
  const myEmp    = employees.find(e => e.id === uid)
  const myMgr    = myEmp?.managerId ? employees.find(e => e.id === myEmp.managerId) : null
  const managerId   = myMgr?.id   ?? null
  const managerName = myMgr?.name ?? ''

  /* merged history */
  const hayItems = hayStore.getByEmployee(uid).map(h => ({ ...h, _type: 'hay' }))
  const vipItems = vipStore.getByEmployee(uid).map(v => ({ ...v, _type: 'vip' }))
  const allItems = [...hayItems, ...vipItems].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  /* PIP */
  const myPips = pipStore.getByEmployee(uid).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  const selectedPip = myPips.find(p => p.id === selectedPipId)
  const pendingPips = myPips.filter(p => p.status === 'Pending Acknowledgement').length

  const handlePipApprove = () => {
    pipStore.acknowledgePip(selectedPipId, pipApproveNote)
    flash(t('PIP telah Anda terima & ketahui.', 'PIP acknowledged.'))
    setShowPipApprove(false)
    setPipApproveNote('')
  }

  const handlePipDispute = () => {
    if (!pipDisputeNote.trim()) return flash(t('Alasan keberatan wajib diisi.', 'Dispute reason is required.'), 'error')
    pipStore.disputePip(selectedPipId, pipDisputeNote)
    flash(t('Keberatan dikirim ke HR untuk dimediasi.', 'Dispute sent to HR for mediation.'))
    setShowPipDispute(false); setPipDisputeNote('')
  }

  const handlePipAppeal = () => {
    if (!pipAppealNote.trim()) return flash(t('Alasan banding wajib diisi.', 'Appeal reason is required.'), 'error')
    pipStore.appealPip(selectedPipId, pipAppealNote)
    flash(t('Banding Anda telah dicatat & dikirim ke HR.', 'Your appeal has been recorded & sent to HR.'))
    setPipAppealNote('')
  }

  /* ── Employee fills PIP results after accepting (Active) ───────────── */
  useEffect(() => {
    const p = myPips.find(x => x.id === selectedPipId)
    setPipResultDraft(p && p.status === 'Active'
      ? { kpiRows: JSON.parse(JSON.stringify(p.kpiRows ?? [])), evaluasiRows: JSON.parse(JSON.stringify(p.evaluasiRows ?? [])) }
      : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPipId])

  const updPipKpiBulan = (id, monthIdx, val) => setPipResultDraft(d => ({ ...d, kpiRows: d.kpiRows.map(r => r.id === id ? { ...r, bulan: r.bulan.map((b, i) => i === monthIdx ? val : b) } : r) }))
  const updPipEval = (idx, key, val) => setPipResultDraft(d => ({ ...d, evaluasiRows: d.evaluasiRows.map((r, i) => i === idx ? { ...r, [key]: val } : r) }))
  const handleSavePipResults = () => {
    pipStore.updatePip(selectedPipId, { kpiRows: pipResultDraft.kpiRows, evaluasiRows: pipResultDraft.evaluasiRows })
    flash(t('Hasil PIP tersimpan & dikirim ke atasan.', 'PIP results saved & shared with your manager.'))
  }
  const handleSignPip = () => {
    pipStore.signPip(selectedPipId, 'employee', { name: selectedPip.employeeName, position: selectedPip.employeePosition })
    flash(t('Anda telah menandatangani persetujuan final.', 'You have signed the final agreement.'))
  }

  /* ── VIP self-assessment & rating acknowledgement ──────────────────── */
  const handleSelfAssess = () => {
    if (selfScore === '') return flash(t('Isi skor penilaian diri terlebih dahulu.', 'Enter your self-assessment score first.'), 'error')
    vipStore.submitSelfAssessment(selectedVipId, Number(selfScore), selfNote)
    flash(t('Self-assessment dikirim ke atasan untuk dinilai.', 'Self-assessment sent to your manager for rating.'))
    setSelfScore(''); setSelfNote(''); setView('list')
  }
  const handleAckRating = (objected) => {
    vipStore.acknowledgeRating(selectedVipId, ackNote, objected)
    flash(objected
      ? t('Keberatan atas nilai telah dicatat.', 'Your objection to the rating has been recorded.')
      : t('Nilai telah Anda terima.', 'Rating acknowledged.'))
    setAckNote(''); setView('list')
  }

  const pipStatusColor = (s) =>
    s === 'Passed'  ? 'bg-green-50 text-green-700'
    : s === 'Failed' ? 'bg-red-50 text-red-700'
    : s === 'Active' ? 'bg-blue-50 text-blue-700'
    : 'bg-yellow-50 text-yellow-700'

  const selectedHay = hayItems.find(h => h.id === selectedHayId)
  const selectedVip = vipItems.find(v => v.id === selectedVipId)

  /* ── HAY submit ─────────────────────────────────────────────────────── */
  const handleHaySubmit = () => {
    if (!managerId) return flash(t('Atasan Anda belum diatur. Hubungi HR.', 'Your manager is not set. Please contact HR.'), 'error')
    const missing = HAY_FIELDS.find(f => !hayForm[f.key]?.trim())
    if (missing) return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    hayStore.submitHay({
      employeeId: uid,
      employeeName: currentUser?.name || '',
      managerId,
      managerName,
      date: new Date().toISOString().slice(0, 10),
      ...hayForm,
    })
    flash(t('Form HAY berhasil dikirim ke atasan.', 'HAY form successfully sent to your manager.'))
    setHayForm(EMPTY_HAY)
    setView('list')
  }

  /* ── Employee fills their T-G-R-O-W on manager-created session ──── */
  const handleEmployeeFill = () => {
    const missing = HAY_FIELDS.find(f => !employeeFillForm[f.key]?.trim())
    if (missing) return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    hayStore.fillEmployeeAnswers(selectedHayId, employeeFillForm)
    flash(t('Jawaban berhasil disimpan.', 'Answers saved successfully.'))
    setEmployeeFillForm(EMPTY_HAY)
    setView('list')
  }

  /* ── VIP submit ─────────────────────────────────────────────────────── */
  const handleVipSubmit = () => {
    if (!managerId) return flash(t('Atasan Anda belum diatur. Hubungi HR.', 'Your manager is not set. Please contact HR.'), 'error')
    if (!vipName.trim()) return flash(t('Nama sesi wajib diisi.', 'Session name is required.'), 'error')
    if (vipTopics.some(tp => !tp.title.trim())) return flash(t('Judul setiap topik wajib diisi.', 'Each topic title is required.'), 'error')
    const totalWeight = vipTopics.reduce((sum, tp) => sum + (Number(tp.weight) || 0), 0)
    if (totalWeight !== 100) return flash(t(`Total bobot harus 100% (saat ini ${totalWeight}%).`, `Total weight must be 100% (currently ${totalWeight}%).`), 'error')
    const payload = {
      name: vipName,
      date: new Date().toISOString().slice(0, 10),
      topics: vipTopics.map((tp, i) => ({ ...tp, id: i + 1 })),
    }
    if (editVipId) {
      vipStore.resubmitVip(editVipId, payload)
      flash(t('Revisi goal diajukan ulang ke atasan.', 'Revised goals resubmitted to your manager.'))
    } else {
      vipStore.submitVip({
        employeeId: uid,
        employeeName: currentUser?.name || '',
        managerId,
        managerName,
        ...payload,
      })
      flash(t('Sesi VIP berhasil disimpan.', 'VIP session saved successfully.'))
    }
    setEditVipId(null)
    setVipName('')
    setVipTopics([EMPTY_VIP_TOPIC()])
    setView('list')
  }

  /* ── VIP topic helpers ──────────────────────────────────────────────── */
  const addTopic = () => setVipTopics(p => [...p, EMPTY_VIP_TOPIC()])
  const removeTopic = (id) => setVipTopics(p => p.filter(tp => tp.id !== id))
  const updateTopic = (id, key, val) => setVipTopics(p => p.map(tp => tp.id === id ? { ...tp, [key]: val } : tp))

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div>

      {/* PAGE HEADER */}
      <div className='flex items-start justify-between mb-5'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800'>
            {pipOnly
              ? 'PIP — Performance Improvement Plan'
              : t('Performance Check-In', 'Performance Check-In')}
          </h1>
          <p className='text-gray-500 text-sm mt-1'>
            {pipOnly
              ? t('PIP dari atasan Anda — tinjau dan berikan acknowledgement.', 'PIP from your manager — review and acknowledge.')
              : t('Sesi one-on-one dengan atasan. Pilih template HAY atau VIP.', 'One-on-one sessions with your manager. Choose HAY or VIP templates.')}
          </p>
        </div>
        {!pipOnly && mainTab === 'checkin' && view === 'list' && (
          <button
            onClick={() => setView('type-select')}
            className='px-4 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition shrink-0'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            + {t('New Check-In', 'New Check-In')}
          </button>
        )}
      </div>

      {/* ── CHECK-IN TAB ─────────────────────────────────────────────────── */}
      {mainTab === 'checkin' && (<>

      {/* STATS */}

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl mb-4 ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {msg.text}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VIEW: TYPE SELECT */}
      {view === 'type-select' && (
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-5'>
            <button onClick={() => setView('list')} className='text-sm text-gray-400 hover:text-gray-600'><Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}</button>
            <h2 className='font-bold text-gray-700'>{t('Pilih Template Check-In', 'Choose Check-In Template')}</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            {/* HAY Card */}
            <button
              onClick={() => setView('new-hay')}
              className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 text-left hover:shadow-md hover:ring-red-200 transition group'>
              <div className='w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4' style={{ background: '#052B5222' }}><Icon name='handshake' size={22} /></div>
              <h3 className='font-bold text-gray-800 mb-1'>HAY — How Are You?</h3>
              <p className='text-xs text-gray-500 mb-3'>{t('Framework T-G-R-O-W untuk sesi coaching & refleksi diri bersama atasan.', 'T-G-R-O-W framework for coaching & self-reflection sessions with your manager.')}</p>
              <div className='flex flex-wrap gap-1.5'>
                {['Topic','Goal','Reality','Options','Way Forward'].map(l => (
                  <span key={l} className='text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full'>{l}</span>
                ))}
              </div>
              <div className='mt-4 text-xs font-semibold text-red-700 group-hover:underline'>
                {t('Pilih template ini →', 'Choose this template →')}
              </div>
            </button>

            {/* VIP Card */}
            <button
              onClick={() => setView('new-vip')}
              className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 text-left hover:shadow-md hover:ring-orange-200 transition group'>
              <div className='w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4' style={{ background: '#d9740622' }}><Icon name='target' size={22} /></div>
              <h3 className='font-bold text-gray-800 mb-1'>VIP — Valuing Improvement & Progress</h3>
              <p className='text-xs text-gray-500 mb-3'>{t('Diskusi progress performance goals dengan atasan. Tambahkan topik sesuai goal plan Anda.', 'Discuss performance goal progress with your manager. Add topics matching your goal plan.')}</p>
              <div className='flex flex-wrap gap-1.5'>
                {['Goal Topics','Weight','Status','Check-In Notes'].map(l => (
                  <span key={l} className='text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full'>{l}</span>
                ))}
              </div>
              <div className='mt-4 text-xs font-semibold text-orange-700 group-hover:underline'>
                {t('Pilih template ini →', 'Choose this template →')}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VIEW: NEW HAY FORM */}
      {view === 'new-hay' && (
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='font-bold text-gray-800 text-lg'>HAY Form — How Are You?</h2>
              <p className='text-xs text-gray-400 mt-0.5'>T-G-R-O-W Framework</p>
            </div>
            <button onClick={() => setView('type-select')} className='text-sm text-gray-400 hover:text-gray-600'>
              <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Batal', 'Cancel')}
            </button>
          </div>

          <div className='bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700'>
            <Icon name='bulb' size={14} className='inline align-[-2px]' /> {t('Form ini akan dikirim ke atasan langsung Anda untuk direview dan dibalas.', 'This form will be sent to your direct manager for review and reply.')}
          </div>

          {(() => {
            const last = hayItems
              .filter(h => h.status === 'Completed' && h.employeeAnswers?.wayForward)
              .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            return last ? (
              <div className='bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-amber-800'>
                <Icon name='refresh' size={14} className='inline align-[-2px]' /> <span className='font-semibold'>{t('Tindak lanjut dari HAY sebelumnya', 'Follow-up from your previous HAY')}</span> ({last.date}):{' '}
                <span className='italic'>"{last.employeeAnswers.wayForward}"</span>
              </div>
            ) : null
          })()}

          <div className='space-y-5'>
            {HAY_FIELDS.map(f => (
              <div key={f.key}>
                <label className='block text-sm font-bold text-gray-700 mb-0.5'>{t(f.label, f.labelEN)}</label>
                <p className='text-xs text-gray-400 mb-2'>{t(f.hint, f.hintEN)}</p>
                <textarea rows={3} value={hayForm[f.key]}
                  onChange={e => setHayForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={t(f.hint, f.hintEN)}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none transition' />
              </div>
            ))}
          </div>

          <div className='flex gap-3 mt-6'>
            <button onClick={handleHaySubmit}
              className='px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              {t('Kirim ke Atasan', 'Send to Manager')}
            </button>
            <button onClick={() => setView('type-select')}
              className='px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
              {t('Batal', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VIEW: NEW VIP FORM */}
      {view === 'new-vip' && (
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='font-bold text-gray-800 text-lg'>{t('Form VIP — Valuing Improvement & Progress', 'VIP Form — Valuing Improvement & Progress')}</h2>
              <p className='text-xs text-gray-400 mt-0.5'>{t('Performance Goal Discussion', 'Performance Goal Discussion')}</p>
            </div>
            <button onClick={() => setView('type-select')} className='text-sm text-gray-400 hover:text-gray-600'>
              <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Batal', 'Cancel')}
            </button>
          </div>

          <div className='bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 text-sm text-orange-700'>
            <Icon name='bulb' size={14} className='inline align-[-2px]' /> {t('Isi nama sesi dan tambahkan topik sesuai performance goals Anda. Atasan dapat melihat sesi ini.', 'Fill in the session name and add topics matching your performance goals. Your manager can view this session.')}
          </div>

          {/* Session name */}
          <div className='mb-6'>
            <label className='block text-sm font-bold text-gray-700 mb-1.5'>
              {t('Nama Sesi', 'Session Name')} <span className='text-red-500'>*</span>
            </label>
            <input
              value={vipName}
              onChange={e => setVipName(e.target.value)}
              placeholder={t('cth. OKR Q3 2025', 'e.g. OKR Q3 2025')}
              className='w-full max-w-sm px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition'
            />
          </div>

          {/* Topics */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='font-bold text-gray-700 text-sm'>{t('Performance Goal Discussion Topics', 'Performance Goal Discussion Topics')}</h3>
              <span className='text-xs text-gray-400'>{vipTopics.length} {t('topik', 'topic(s)')}</span>
            </div>

            {vipTopics.map((tp, idx) => (
              <div key={tp.id} className='rounded-xl border border-gray-200 overflow-hidden'>
                <div className='flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-100'>
                  <span className='text-xs font-bold text-orange-700'>
                    {tp.title || `${t('Topik', 'Topic')} #${idx + 1}`}
                  </span>
                  {vipTopics.length > 1 && (
                    <button onClick={() => removeTopic(tp.id)} className='text-xs text-gray-400 hover:text-red-500 transition'>
                      <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Hapus', 'Remove')}
                    </button>
                  )}
                </div>
                <div className='p-4 space-y-3'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Judul Topik / Goal', 'Topic Title / Goal')} *</label>
                    <input value={tp.title} onChange={e => updateTopic(tp.id, 'title', e.target.value)}
                      placeholder={t('Nama goal atau topik diskusi', 'Goal name or discussion topic')}
                      className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 transition' />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Deskripsi Goal', 'Goal Description')}</label>
                    <textarea rows={2} value={tp.description} onChange={e => updateTopic(tp.id, 'description', e.target.value)}
                      placeholder={t('Detail target dan konteks goal ini', 'Goal details and context')}
                      className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 resize-none transition' />
                  </div>
                  <div className='grid grid-cols-3 gap-3'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Goal Plan', 'Goal Plan')}</label>
                      <input value={tp.goalPlan} onChange={e => updateTopic(tp.id, 'goalPlan', e.target.value)}
                        placeholder='Goal Plan 2025'
                        className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 transition' />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Bobot (%)', 'Weight (%)')}</label>
                      <input type='number' min={0} max={100} value={tp.weight} onChange={e => updateTopic(tp.id, 'weight', e.target.value)}
                        placeholder='0'
                        className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 transition' />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>Status</label>
                      <select value={tp.status} onChange={e => updateTopic(tp.id, 'status', e.target.value)}
                        className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 transition bg-white'>
                        {VIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      <Icon name='edit' size={14} className='inline align-[-2px]' /> {t('Notes pada Check-In ini', 'Notes for this Check-In')}
                    </label>
                    <textarea rows={2} value={tp.checkInNotes} onChange={e => updateTopic(tp.id, 'checkInNotes', e.target.value)}
                      placeholder={t('Update progress, hambatan, atau rencana ke depan...', 'Progress update, blockers, or next steps...')}
                      className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 resize-none transition' />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addTopic}
              className='w-full py-2.5 border-2 border-dashed border-orange-200 rounded-xl text-sm text-orange-500 font-semibold hover:border-orange-400 hover:text-orange-600 transition'>
              + {t('Tambah Topik', 'Add Topic')}
            </button>
          </div>

          <div className='flex gap-3 mt-6'>
            <button onClick={handleVipSubmit}
              className='px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
              style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
              {editVipId ? t('Ajukan Ulang Revisi', 'Resubmit Revision') : t('Simpan Sesi VIP', 'Save VIP Session')}
            </button>
            <button onClick={() => { setEditVipId(null); setVipName(''); setVipTopics([EMPTY_VIP_TOPIC()]); setView('list') }}
              className='px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
              {t('Batal', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VIEW: DETAIL HAY */}
      {view === 'detail-hay' && selectedHay && (
        <div className='mb-6 space-y-5'>
          {/* Header */}
          <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 px-6 py-4 flex items-center justify-between'>
            <div>
              <div className='flex items-center gap-2'>
                <span className='text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold'>HAY</span>
                <h2 className='font-bold text-gray-800'>{t('Detail Sesi HAY', 'HAY Session Detail')}</h2>
              </div>
              <p className='text-xs text-gray-400 mt-0.5'>{selectedHay.date} · {t('Atasan', 'Manager')}: {selectedHay.managerName}</p>
            </div>
            <div className='flex items-center gap-3'>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${hayStatusColor(selectedHay.status)}`}>
                {hayStatusLabel(selectedHay.status, t)}
              </span>
              <button onClick={() => setView('list')} className='text-sm text-gray-400 hover:text-gray-600'>
                <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}
              </button>
            </div>
          </div>

          {/* Side-by-side answers (or single column if only one party filled) */}
          {(selectedHay.employeeAnswers || selectedHay.managerAnswers) && (
            <div className={`grid gap-5 ${selectedHay.employeeAnswers && selectedHay.managerAnswers ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Employee answers */}
              {selectedHay.employeeAnswers && (
                <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
                  <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-100'>
                    <div className='w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                      {(selectedHay.employeeName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                    </div>
                    <div>
                      <p className='text-xs font-bold text-gray-700'>{selectedHay.employeeName}</p>
                      <p className='text-[10px] text-gray-400'>{t('Jawaban Karyawan', 'Employee Answers')}</p>
                    </div>
                  </div>
                  <div className='space-y-3'>
                    {HAY_FIELDS.map(f => (
                      <div key={f.key} className='bg-gray-50 rounded-xl p-3.5'>
                        <p className='text-xs font-bold text-gray-500 mb-1'>{t(f.label, f.labelEN)}</p>
                        <p className='text-sm text-gray-700'>{selectedHay.employeeAnswers[f.key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {selectedHay.employeeFilledAt && (
                    <p className='text-[10px] text-gray-400 mt-3'>
                      {new Date(selectedHay.employeeFilledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              )}

              {/* Manager answers */}
              {selectedHay.managerAnswers && (
                <div className='bg-white rounded-2xl shadow-sm ring-1 ring-green-100 p-5 border border-green-100'>
                  <div className='flex items-center gap-2 mb-4 pb-3 border-b border-green-100'>
                    <div className='w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-green-600'>
                      {(selectedHay.managerName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                    </div>
                    <div>
                      <p className='text-xs font-bold text-green-700'>{selectedHay.managerName}</p>
                      <p className='text-[10px] text-green-500'>{t('Jawaban Atasan', 'Manager Answers')}</p>
                    </div>
                  </div>
                  <div className='space-y-3'>
                    {HAY_FIELDS.map(f => (
                      <div key={f.key} className='bg-green-50 rounded-xl p-3.5'>
                        <p className='text-xs font-bold text-green-600 mb-1'>{t(f.label, f.labelEN)}</p>
                        <p className='text-sm text-green-900'>{selectedHay.managerAnswers[f.key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {selectedHay.managerFilledAt && (
                    <p className='text-[10px] text-green-500 mt-3'>
                      {new Date(selectedHay.managerFilledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Employee fill form — side-by-side: manager's answers (left) + employee fill form (right) */}
          {selectedHay.status === 'Pending Employee' && !selectedHay.employeeAnswers && (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
              {/* Left: manager's initial answers for reference */}
              <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
                <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-100'>
                  <div className='w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-green-600'>
                    {(selectedHay.managerName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <p className='text-xs font-bold text-gray-700'>{selectedHay.managerName}</p>
                    <p className='text-[10px] text-gray-400'>{t('Isian Atasan (Referensi)', "Manager's Input (Reference)")}</p>
                  </div>
                </div>
                <div className='space-y-3'>
                  {HAY_FIELDS.map(f => (
                    <div key={f.key} className='bg-gray-50 rounded-xl p-3.5'>
                      <p className='text-xs font-bold text-gray-500 mb-1'>{t(f.label, f.labelEN)}</p>
                      <p className='text-sm text-gray-700 whitespace-pre-wrap'>{selectedHay.managerAnswers?.[f.key] || <span className='italic text-gray-300'>—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: employee fill form */}
              <div className='bg-white rounded-2xl shadow-sm ring-1 ring-blue-200 p-5 border border-blue-100'>
                <div className='flex items-center gap-2 mb-2 pb-3 border-b border-blue-100'>
                  <div className='w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {(selectedHay.employeeName||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <p className='text-xs font-bold text-gray-700'>{selectedHay.employeeName}</p>
                    <p className='text-[10px] text-blue-500'>{t('Jawaban Karyawan', 'Employee Answers')}</p>
                  </div>
                </div>
                <p className='text-xs text-blue-600 mb-4'>
                  {t('Silakan isi perspektif Anda terhadap sesi coaching ini.', 'Please fill in your perspective on this coaching session.')}
                </p>
                <div className='space-y-4'>
                  {HAY_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className='block text-sm font-bold text-gray-700 mb-0.5'>{t(f.label, f.labelEN)}</label>
                      <p className='text-xs text-gray-400 mb-1.5'>{t(f.hint, f.hintEN)}</p>
                      <textarea rows={3} value={employeeFillForm[f.key]}
                        onChange={e => setEmployeeFillForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={t(f.hint, f.hintEN)}
                        className='w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none transition' />
                    </div>
                  ))}
                </div>
                <div className='flex gap-3 mt-5'>
                  <button onClick={handleEmployeeFill}
                    className='px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {t('Simpan Jawaban Saya', 'Save My Answers')}
                  </button>
                  <button onClick={() => setView('list')}
                    className='px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                    {t('Kembali', 'Back')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VIEW: DETAIL VIP */}
      {view === 'detail-vip' && selectedVip && (
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6'>
          <div className='flex items-center justify-between mb-5'>
            <div>
              <div className='flex items-center gap-2'>
                <span className='text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold'>VIP</span>
                <h2 className='font-bold text-gray-800'>{selectedVip.name}</h2>
              </div>
              <p className='text-xs text-gray-400 mt-0.5'>{selectedVip.date} · {t('Atasan', 'Manager')}: {selectedVip.managerName}</p>
            </div>
            <button onClick={() => setView('list')} className='text-sm text-gray-400 hover:text-gray-600'>
              <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}
            </button>
          </div>

          {selectedVip.status === 'Returned' && (
            <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5'>
              <p className='text-sm font-bold text-amber-700 mb-1'><Icon name='undo' size={14} className='inline align-[-2px]' /> {t('Dikembalikan oleh atasan untuk revisi', 'Returned by your manager for revision')}</p>
              {selectedVip.returnNote && <p className='text-xs text-amber-700 italic mb-3'>"{selectedVip.returnNote}"</p>}
              <button onClick={() => {
                  setEditVipId(selectedVip.id)
                  setVipName(selectedVip.name)
                  setVipTopics(JSON.parse(JSON.stringify(selectedVip.topics)))
                  setView('new-vip')
                }}
                className='px-4 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition'
                style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
                <Icon name='repeat' size={14} className='inline align-[-2px]' /> {t('Perbaiki & Ajukan Ulang', 'Revise & Resubmit')}
              </button>
            </div>
          )}
          {selectedVip.status === 'Pending Manager' && (
            <div className='bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-5 text-xs text-yellow-700'>
              <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Menunggu persetujuan goal dari atasan.', 'Awaiting goal approval from your manager.')}
            </div>
          )}
          {selectedVip.status === 'Active' && (
            <div className='bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5'>
              <p className='text-sm font-bold text-blue-700 mb-2'><Icon name='edit' size={14} className='inline align-[-2px]' /> {t('Self-Assessment Akhir Periode', 'End-of-period Self-Assessment')}</p>
              <p className='text-xs text-blue-600 mb-3'>{t('Nilai pencapaian Anda sendiri sebelum atasan memberi nilai akhir.', 'Rate your own achievement before your manager gives the final rating.')}</p>
              <div className='flex flex-wrap items-center gap-2'>
                <input type='number' min='0' max='100' value={selfScore} onChange={e => setSelfScore(e.target.value)}
                  placeholder={t('Skor 0-100', 'Score 0-100')}
                  className='w-28 px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:border-blue-400' />
                <input value={selfNote} onChange={e => setSelfNote(e.target.value)}
                  placeholder={t('Catatan (opsional)', 'Note (optional)')}
                  className='flex-1 min-w-[180px] px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:border-blue-400' />
                <button onClick={handleSelfAssess}
                  className='px-5 py-2 text-white text-sm font-bold rounded-xl transition'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  {t('Kirim Self-Assessment', 'Submit Self-Assessment')}
                </button>
              </div>
            </div>
          )}
          {selectedVip.status === 'In Review' && (
            <div className='bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-5 text-xs text-yellow-700'>
              <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Self-assessment terkirim', 'Self-assessment submitted')} ({selectedVip.selfScore}). {t('Menunggu penilaian atasan.', 'Awaiting your manager\'s rating.')}
            </div>
          )}
          {selectedVip.status === 'Pending Employee Ack' && (
            <div className='bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5'>
              <p className='text-sm font-bold text-orange-700 mb-1'><Icon e='⭐' size={14} className='inline align-[-2px]' /> {t('Skor Akhir dari Atasan', 'Final Score from Manager')}: {selectedVip.finalScore}</p>
              {selectedVip.ratingNote && <p className='text-xs text-orange-700 mb-2 italic'>"{selectedVip.ratingNote}"</p>}
              <p className='text-xs text-orange-600 mb-2'>{t('Terima nilai ini, atau ajukan keberatan disertai alasan.', 'Acknowledge this rating, or object with a reason.')}</p>
              <textarea rows={2} value={ackNote} onChange={e => setAckNote(e.target.value)}
                placeholder={t('Tanggapan / alasan keberatan (opsional untuk terima, wajib untuk keberatan)', 'Response / objection reason (optional to accept, required to object)')}
                className='w-full px-3 py-2 border border-orange-200 rounded-lg text-sm outline-none focus:border-orange-400 resize-none mb-3 bg-white' />
              <div className='flex gap-2'>
                <button onClick={() => handleAckRating(false)}
                  className='px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition'>
                  <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Terima Nilai', 'Accept Rating')}
                </button>
                <button onClick={() => { if (!ackNote.trim()) return flash(t('Alasan keberatan wajib diisi.', 'Objection reason is required.'), 'error'); handleAckRating(true) }}
                  className='px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition'>
                  <Icon name='warning' size={14} className='inline align-[-2px]' /> {t('Ajukan Keberatan', 'Object')}
                </button>
              </div>
            </div>
          )}
          {selectedVip.status === 'Cancelled' && (
            <div className='bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5 text-xs text-gray-500'>
              {t('Sesi ini dibatalkan', 'This session was cancelled')}{selectedVip.cancelReason ? `: ${selectedVip.cancelReason}` : '.'}
            </div>
          )}
          {selectedVip.status === 'Closed' && (
            <div className='bg-green-50 border border-green-100 rounded-xl p-3 mb-5 text-sm text-green-700 font-semibold'>
              <Icon e='⭐' size={14} className='inline align-[-2px]' /> {t('Skor Akhir', 'Final Score')}: {selectedVip.finalScore}
              {selectedVip.ratingNote && <span className='font-normal text-xs'> — {selectedVip.ratingNote}</span>}
              {selectedVip.objected && <span className='block font-bold text-red-600 mt-1'>⚠ {t('Anda mengajukan keberatan atas nilai ini.', 'You objected to this rating.')}</span>}
            </div>
          )}

          <h3 className='text-sm font-bold text-gray-600 mb-3'>{t('Performance Goal Discussion Topics', 'Performance Goal Discussion Topics')}</h3>
          <div className='space-y-4'>
            {selectedVip.topics.map((tp, idx) => (
              <div key={tp.id} className='border border-gray-200 rounded-xl overflow-hidden'>
                <div className='px-4 py-2.5 bg-orange-50 border-b border-orange-100'>
                  <p className='text-sm font-bold text-orange-600'>{tp.title}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    {t('Notes added in this check-in', 'Notes added in this check-in')}: {tp.checkInNotes ? 1 : 0}
                  </p>
                </div>
                <div className='p-4 space-y-3'>
                  {tp.description && (
                    <p className='text-sm text-gray-600'>{tp.description}</p>
                  )}
                  <div className='flex flex-wrap gap-4 text-xs'>
                    {tp.goalPlan && (
                      <div><span className='text-gray-400'>{t('Goal Plan', 'Goal Plan')}: </span><span className='font-semibold text-gray-700'>{tp.goalPlan}</span></div>
                    )}
                    {tp.weight !== '' && tp.weight !== undefined && (
                      <div><span className='text-gray-400'>{t('Bobot', 'Weight')}: </span><span className='font-semibold text-gray-700'>{tp.weight}%</span></div>
                    )}
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${vipStatusColor(tp.status)}`}>
                        {tp.status}
                      </span>
                    </div>
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* HAY cadence reminder — nudge a monthly coaching rhythm */}
      {mainTab === 'checkin' && view === 'list' && (() => {
        const lastHay = hayItems
          .map(h => new Date(h.submittedAt || h.date))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => b - a)[0]
        const days = lastHay ? Math.floor((Date.now() - lastHay.getTime()) / 86400000) : null
        if (days !== null && days < 30) return null
        return (
          <div className='bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3'>
            <p className='text-sm text-amber-800'>
              <Icon name='handshake' size={14} className='inline align-[-2px]' /> {days === null
                ? t('Anda belum pernah melakukan sesi HAY. Jadwalkan percakapan pertama dengan atasan Anda!', "You haven't had a HAY session yet. Schedule your first conversation with your manager!")
                : t(`Sudah ${days} hari sejak sesi HAY terakhir. Saatnya check-in lagi dengan atasan Anda.`, `It's been ${days} days since your last HAY session. Time to check in with your manager again.`)}
            </p>
            <button onClick={() => setView('type-select')}
              className='shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              + {t('Mulai HAY', 'Start HAY')}
            </button>
          </div>
        )
      })()}

      {/* VIEW: LIST */}
      {view === 'list' && (
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='font-bold text-gray-700 text-sm'>{t('Riwayat Check-In', 'Check-In History')}</h2>
          </div>
          {allItems.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-gray-400 gap-2'>
              <span className='text-gray-300'><Icon name='message' size={44} /></span>
              <p className='text-sm'>{t('Belum ada sesi check-in. Mulai check-in pertama Anda!', 'No check-in sessions yet. Start your first check-in!')}</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-100'>
              {allItems.map(item => (
                <button
                  key={`${item._type}-${item.id}`}
                  onClick={() => {
                    if (item._type === 'hay') { setSelectedHayId(item.id); setView('detail-hay') }
                    else { setSelectedVipId(item.id); setView('detail-vip') }
                  }}
                  className='w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition text-left'>
                  <div className='w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0'
                    style={{ background: item._type === 'vip' ? '#d9740622' : (item.status === 'Completed' ? '#05966922' : item.status === 'Pending Employee' ? '#2563eb22' : '#dc262622') }}>
                    {item._type === 'vip' ? <Icon name='target' size={18} /> : item.status === 'Completed' ? <Icon name='check' size={18} /> : item.status === 'Pending Employee' ? <Icon name='edit' size={18} /> : <Icon name='clock' size={18} />}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-semibold text-gray-800 line-clamp-1'>
                      {item._type === 'vip' ? item.name : item.topic}
                    </p>
                    <p className='text-xs text-gray-400 mt-0.5'>
                      {item.date} · {t('Atasan', 'Manager')}: {item.managerName}
                    </p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item._type === 'vip' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {item._type === 'vip' ? 'VIP' : 'HAY'}
                    </span>
                    {item._type === 'hay' && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${hayStatusColor(item.status)}`}>
                        {hayStatusLabel(item.status, t)}
                      </span>
                    )}
                    <span className='text-gray-300'>›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      </>)} {/* end checkin tab */}

      {/* ── PIP TAB ──────────────────────────────────────────────────────── */}
      {mainTab === 'pip' && (
        <>

          {pendingPips > 0 && !selectedPip && (
            <div className='bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 text-sm text-yellow-700'>
              <Icon name='warning' size={14} className='inline align-[-2px]' /> {pendingPips} {t('PIP menunggu persetujuan Anda.', 'PIP(s) are waiting for your approval.')}
            </div>
          )}

          <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
            {/* Left: list */}
            <div className='lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100'>
              <div className='px-4 py-3 border-b border-gray-100'>
                <p className='text-xs font-semibold text-gray-500'>{t('PIP dari Atasan Anda', 'PIP from Your Manager')}</p>
              </div>
              {myPips.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-gray-400 gap-2'>
                  <span className='text-gray-300'><Icon name='clipboard' size={34} /></span>
                  <p className='text-xs text-center'>{t('Belum ada PIP. PIP dibuat oleh atasan Anda.', 'No PIP yet. PIP is created by your manager.')}</p>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  {myPips.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPipId(p.id); setShowPipApprove(false); setPipChecked(PERNYATAAN.map(() => false)) }}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left ${selectedPipId === p.id ? 'bg-red-50/40' : ''}`}>
                      <div className='w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 bg-red-100 text-red-500'><Icon name='clipboard' size={15} /></div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-semibold text-gray-800'>{t('Form PIP', 'PIP Form')}</p>
                        <p className='text-xs text-gray-500 mt-0.5'>{p.startDate} <Icon e='→' size={14} className='inline align-[-2px]' /> {p.endDate}</p>
                        <p className='text-xs text-gray-400 mt-0.5'>{t('Atasan', 'Manager')}: {p.managerName}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${pipStatusColor(p.status)}`}>
                        {pipStatusLabel(p.status, t)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: detail + approval */}
            <div className='lg:col-span-3'>
              {!selectedPip ? (
                <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 flex flex-col items-center justify-center py-20 text-gray-400'>
                  <span className='text-gray-300 mb-3'><Icon name='clipboard' size={44} /></span>
                  <p className='text-sm'>{t('Pilih PIP untuk melihat detail.', 'Select a PIP to view details.')}</p>
                </div>
              ) : (
                <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-6'>

                  {/* PIP Header */}
                  <div className='text-center border-b border-gray-100 pb-4'>
                    <p className='text-xs text-gray-400 mb-1'>FORM PERFORMANCE IMPROVEMENT PLAN (PIP)</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${pipStatusColor(selectedPip.status)}`}>
                      {pipStatusLabel(selectedPip.status, t)}
                    </div>
                  </div>

                  {/* Identity fields */}

                  {/* Section 1 */}
                  <div>
                    <h3 className='text-sm font-bold text-gray-700 mb-3'>1. {t('Alasan PIP & Rencana Perbaikan Kinerja', 'PIP Reason & Performance Improvement Plan')}</h3>
                    <div className='space-y-3'>
                      <div className='bg-gray-50 rounded-xl p-3.5'>
                        <p className='text-xs font-bold text-gray-500 mb-1'>{t('Alasan PIP', 'PIP Reason')}</p>
                        <p className='text-sm text-gray-700'>{selectedPip.alasanPip || '—'}</p>
                      </div>
                      <div className='bg-gray-50 rounded-xl p-3.5'>
                        <p className='text-xs font-bold text-gray-500 mb-1'>{t('Rencana Perbaikan Kinerja', 'Performance Improvement Plan')}</p>
                        <p className='text-sm text-gray-700'>{selectedPip.rencanaPerbaikan || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: KPI table */}
                  <div>
                    <h3 className='text-sm font-bold text-gray-700 mb-3'>2. {t('Detail KPI dan Hasil Pemantauan Kinerja', 'KPI Details and Performance Monitoring Results')}</h3>
                    <div className='overflow-x-auto'>
                      <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden'>
                        <thead>
                          <tr className='bg-gray-50'>
                            <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>KPI</th>
                            <th className='border border-gray-200 px-3 py-2 text-left font-bold text-gray-600'>{t('Deskripsi', 'Description')}</th>
                            <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600'>Target</th>
                            <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600 bg-red-50' colSpan={selectedPip.durationMonths ?? (selectedPip.kpiRows?.[0]?.bulan?.length || 0)}>Achievement</th>
                          </tr>
                          <tr className='bg-gray-50'>
                            <th className='border border-gray-200 px-2 py-1' colSpan={3}></th>
                            {Array.from({ length: selectedPip.durationMonths ?? (selectedPip.kpiRows?.[0]?.bulan?.length || 0) }, (_, i) => (
                              <th key={i} className='border border-gray-200 px-3 py-1 text-center text-gray-500 font-semibold bg-red-50/50'>{t('Bulan', 'Month')} {i + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPip.kpiRows.map(row => (
                            <tr key={row.id}>
                              <td className='border border-gray-200 px-3 py-2 text-gray-700'>{row.kpi || '—'}</td>
                              <td className='border border-gray-200 px-3 py-2 text-gray-600'>{row.deskripsi || '—'}</td>
                              <td className='border border-gray-200 px-3 py-2 text-center text-gray-700'>{row.target || '—'}</td>
                              {(row.bulan ?? []).map((b, i) => (
                                <td key={i} className='border border-gray-200 px-3 py-2 text-center text-gray-500'>{b || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Evaluasi table */}
                  <div>
                    <div className='overflow-x-auto'>
                      <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden'>
                        <thead>
                          <tr className='bg-gray-50'>
                            <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600'>{t('Evaluasi PIP', 'PIP Evaluation')}</th>
                            <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600'>{t('Perbaikan Kinerja yang sudah dilakukan', 'Improvements Made')}</th>
                            <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600'>{t('Perbaikan Kinerja yang belum dilakukan', 'Improvements Not Yet Made')}</th>
                            <th className='border border-gray-200 px-3 py-2 text-center font-bold text-gray-600'>{t('Rencana Perbaikan (Action Plan)', 'Action Plan')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPip.evaluasiRows.map((row, i) => (
                            <tr key={i}>
                              <td className='border border-gray-200 px-3 py-2 text-gray-700 font-semibold'>
                                {row.bulan}<br/><span className='text-gray-400 font-normal'>{row.tanggal}</span>
                              </td>
                              <td className='border border-gray-200 px-3 py-2 text-gray-600'>{row.sudah || '—'}</td>
                              <td className='border border-gray-200 px-3 py-2 text-gray-600'>{row.belum || '—'}</td>
                              <td className='border border-gray-200 px-3 py-2 text-gray-600'>{row.rencana || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Results approved by manager — locked */}
                  {selectedPip.status === 'Active' && selectedPip.resultsApprovedAt && (
                    <div className='bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700'>
                      <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Hasil Anda telah disetujui atasan', 'Your results have been approved by your manager')}{selectedPip.resultsApprovedBy ? ` (${selectedPip.resultsApprovedBy})` : ''}. {t('Menunggu usulan hasil akhir & sign-off HR.', 'Awaiting final outcome proposal & HR sign-off.')}
                    </div>
                  )}

                  {/* Employee input of results — only while Active and not yet approved */}
                  {selectedPip.status === 'Active' && !selectedPip.resultsApprovedAt && pipResultDraft && (
                    <div className='border-2 border-blue-200 rounded-xl p-4 bg-blue-50/30'>
                      <h3 className='text-sm font-bold text-blue-800 mb-1'><Icon name='edit' size={14} className='inline align-[-2px]' /> {t('Input Hasil PIP (diisi oleh Anda)', 'Input PIP Results (filled by you)')}</h3>
                      <p className='text-xs text-blue-600 mb-3'>{t('Isi capaian bulanan dan evaluasi perbaikan kinerja Anda. Data ini disetujui atasan sebelum menetapkan hasil.', 'Fill your monthly achievements and improvement evaluation. Your manager approves this before deciding the outcome.')}</p>
                      {selectedPip.resultsReturnNote && (
                        <div className='bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs text-amber-700'>
                          <Icon name='undo' size={14} className='inline align-[-2px]' /> <b>{t('Dikembalikan atasan untuk revisi', 'Returned by manager for revision')}:</b> {selectedPip.resultsReturnNote}
                        </div>
                      )}

                      {/* Achievement per month */}
                      <div className='overflow-x-auto mb-4'>
                        <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden bg-white'>
                          <thead>
                            <tr className='bg-gray-50'>
                              <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>KPI</th>
                              <th className='border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600'>Target</th>
                              {(pipResultDraft.kpiRows[0]?.bulan ?? []).map((_, i) => (
                                <th key={i} className='border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600 bg-blue-50'>{t('Bulan', 'Month')} {i + 1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pipResultDraft.kpiRows.map(row => (
                              <tr key={row.id}>
                                <td className='border border-gray-200 px-2 py-1.5 text-gray-700'>{row.kpi || '—'}</td>
                                <td className='border border-gray-200 px-2 py-1.5 text-center text-gray-600'>{row.target || '—'}</td>
                                {(row.bulan ?? []).map((val, i) => (
                                  <td key={i} className='border border-gray-200 p-1 bg-blue-50/30'>
                                    <input value={val || ''} onChange={e => updPipKpiBulan(row.id, i, e.target.value)}
                                      placeholder='…' className='w-16 px-1.5 py-1 text-xs text-center border border-gray-200 rounded outline-none focus:border-blue-400 bg-white' />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Evaluation rows */}
                      <div className='overflow-x-auto mb-3'>
                        <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden bg-white'>
                          <thead>
                            <tr className='bg-gray-50'>
                              <th className='border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600 w-24'>{t('Evaluasi PIP', 'PIP Evaluation')}</th>
                              <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>{t('Perbaikan Kinerja yang sudah dilakukan', 'Improvements Made')}</th>
                              <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>{t('Perbaikan Kinerja yang belum dilakukan', 'Improvements Not Yet Made')}</th>
                              <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>{t('Rencana Perbaikan (Action Plan)', 'Action Plan')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pipResultDraft.evaluasiRows.map((row, i) => (
                              <tr key={i}>
                                <td className='border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-700'>
                                  {row.bulan}
                                  <input type='date' value={row.tanggal || ''} onChange={e => updPipEval(i, 'tanggal', e.target.value)}
                                    className='mt-1 w-full text-[11px] text-gray-500 text-center border border-gray-200 rounded outline-none focus:border-blue-400 px-1 py-0.5' />
                                </td>
                                {['sudah', 'belum', 'rencana'].map(k => (
                                  <td key={k} className='border border-gray-200 p-1'>
                                    <textarea rows={2} value={row[k] || ''} onChange={e => updPipEval(i, k, e.target.value)}
                                      className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-blue-400 resize-none' />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <button onClick={handleSavePipResults}
                        className='px-5 py-2 text-white text-sm font-bold rounded-xl transition'
                        style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                        <Icon name='save' size={14} className='inline align-[-2px]' /> {t('Simpan Hasil', 'Save Results')}
                      </button>
                    </div>
                  )}

                  {/* Pernyataan */}
                  <div className='bg-gray-50 rounded-xl p-4 border border-gray-200'>
                    <h3 className='text-sm font-bold text-gray-700 mb-3'>{t('Pernyataan', 'Declaration')}</h3>
                    <ul className='space-y-3'>
                      {PERNYATAAN.map((p, i) => (
                        <li key={i} className='flex gap-3 items-start'>
                          <input
                            type='checkbox'
                            id={`pip-pernyataan-${i}`}
                            checked={pipChecked[i]}
                            onChange={e => setPipChecked(prev => prev.map((v, idx) => idx === i ? e.target.checked : v))}
                            className='mt-0.5 flex-shrink-0 w-4 h-4 accent-red-700 cursor-pointer'
                          />
                          <label htmlFor={`pip-pernyataan-${i}`} className='text-xs text-gray-600 leading-relaxed cursor-pointer'>{p}</label>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Acknowledgement section */}
                  {selectedPip.status === 'Pending HR Review' ? (
                    <div className='bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-xs text-yellow-700'>
                      <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('PIP ini masih menunggu review HR sebelum dapat Anda terima.', 'This PIP is awaiting HR review before you can acknowledge it.')}
                    </div>
                  ) : selectedPip.status === 'Rejected by HR' ? (
                    <div className='bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700'>
                      <Icon name='close' size={14} className='inline align-[-2px]' /> {t('PIP ini dikembalikan HR ke atasan untuk perbaikan.', 'This PIP was returned by HR to the manager for revision.')}
                    </div>
                  ) : selectedPip.status === 'Disputed' ? (
                    <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700'>
                      <Icon name='warning' size={14} className='inline align-[-2px]' /> {t('Keberatan Anda sedang dimediasi HR.', 'Your dispute is being mediated by HR.')}
                      {selectedPip.disputeNote && <p className='italic mt-1'>"{selectedPip.disputeNote}"</p>}
                    </div>
                  ) : selectedPip.status !== 'Pending Acknowledgement' ? (
                    <div className='bg-blue-50 border border-blue-100 rounded-xl p-4'>
                      <p className='text-xs font-bold text-blue-700 mb-1'><Icon name='check' size={14} className='inline align-[-2px]' /> {t('Sudah Anda terima & ketahui', 'Acknowledged by you')}</p>
                      {selectedPip.acknowledgedAt && <p className='text-xs text-blue-600'>{new Date(selectedPip.acknowledgedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                      {selectedPip.employeeNote && <p className='text-xs text-blue-700 mt-1'>{t('Tanggapan', 'Response')}: {selectedPip.employeeNote}</p>}
                      {selectedPip.status === 'Passed' || selectedPip.status === 'Failed' ? (
                        <p className={`text-xs font-bold mt-2 ${selectedPip.status === 'Passed' ? 'text-green-700' : 'text-red-700'}`}>
                          {t('Hasil akhir', 'Outcome')}: {selectedPip.status === 'Passed' ? t('Lulus', 'Passed') : t('Gagal', 'Failed')}
                          {selectedPip.outcomeConfirmedBy ? ` (${t('disahkan', 'signed off')}: ${selectedPip.outcomeConfirmedBy})` : ''}
                          {selectedPip.outcomeNote ? ` — ${selectedPip.outcomeNote}` : ''}
                        </p>
                      ) : selectedPip.status === 'Pending HR Outcome' ? (
                        <p className='text-xs font-bold mt-2 text-yellow-700'>{t('Usulan hasil', 'Proposed outcome')}: {selectedPip.outcome} — {t('menunggu sign-off HR.', 'awaiting HR sign-off.')}</p>
                      ) : null}
                      {selectedPip.status === 'Failed' && (
                        <div className='mt-3 pt-3 border-t border-blue-100'>
                          {selectedPip.appealedAt ? (
                            <p className='text-xs text-gray-600'><Icon name='check' size={14} className='inline align-[-2px]' /> {t('Banding tercatat', 'Appeal recorded')}: "{selectedPip.appealNote}"</p>
                          ) : (
                            <>
                              <p className='text-xs font-semibold text-gray-600 mb-1'>{t('Ajukan banding atas hasil ini (opsional)', 'Appeal this outcome (optional)')}</p>
                              <textarea rows={2} value={pipAppealNote} onChange={e => setPipAppealNote(e.target.value)}
                                placeholder={t('Alasan banding...', 'Appeal reason...')}
                                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none mb-2 bg-white' />
                              <button onClick={handlePipAppeal}
                                className='px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition'>
                                {t('Kirim Banding ke HR', 'Send Appeal to HR')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {!showPipApprove && !showPipDispute ? (
                        <div className='space-y-2'>
                          <button onClick={() => setShowPipApprove(true)}
                            disabled={!pipChecked.every(Boolean)}
                            className='w-full py-3 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90'
                            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                            <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Saya Menerima & Mengetahui Form PIP Ini', 'I Acknowledge This PIP Form')}
                          </button>
                          <button onClick={() => setShowPipDispute(true)}
                            className='w-full py-2.5 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl transition hover:bg-amber-100'>
                            <Icon name='warning' size={14} className='inline align-[-2px]' /> {t('Saya Keberatan — Ajukan ke HR', 'I Object — Escalate to HR')}
                          </button>
                        </div>
                      ) : showPipDispute ? (
                        <div className='bg-amber-50 border border-amber-200 rounded-xl p-4'>
                          <p className='text-sm font-bold text-amber-700 mb-2'>{t('Ajukan Keberatan atas PIP', 'Dispute this PIP')}</p>
                          <p className='text-xs text-amber-600 mb-3'>{t('Keberatan akan dikirim ke HR untuk dimediasi sebelum PIP berjalan.', 'Your dispute goes to HR for mediation before the PIP starts.')}</p>
                          <textarea rows={3} value={pipDisputeNote} onChange={e => setPipDisputeNote(e.target.value)}
                            placeholder={t('Jelaskan alasan keberatan Anda...', 'Explain your reason for objecting...')}
                            className='w-full px-3 py-2 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 resize-none mb-3 bg-white' />
                          <div className='flex gap-2'>
                            <button onClick={handlePipDispute}
                              className='px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition'>
                              {t('Kirim Keberatan ke HR', 'Send Dispute to HR')}
                            </button>
                            <button onClick={() => { setShowPipDispute(false); setPipDisputeNote('') }}
                              className='px-5 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                              {t('Batal', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className='bg-red-50 border border-red-200 rounded-xl p-4'>
                          <p className='text-sm font-bold text-red-700 mb-3'>
                            {t('Konfirmasi Penerimaan PIP', 'Confirm PIP Acknowledgement')}
                          </p>
                          <p className='text-xs text-red-600 mb-3'>
                            {t('Dengan menerima, Anda menyatakan telah membaca dan memahami seluruh isi Form PIP serta Pernyataan di atas. Anda dapat menambahkan tanggapan bila tidak setuju.', 'By acknowledging, you confirm you have read and understood the entire PIP Form and the Declaration above. You may add a response if you disagree.')}
                          </p>
                          <textarea rows={2} value={pipApproveNote} onChange={e => setPipApproveNote(e.target.value)}
                            placeholder={t('Tanggapan / catatan (opsional)...', 'Response / note (optional)...')}
                            className='w-full px-3 py-2 border border-red-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none transition mb-3 bg-white' />
                          <div className='flex gap-2'>
                            <button onClick={handlePipApprove}
                              className='px-5 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition'
                              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                              <Icon name='check' size={14} className='inline align-[-2px]' /> {t('Ya, Saya Terima', 'Yes, I Acknowledge')}
                            </button>
                            <button onClick={() => setShowPipApprove(false)}
                              className='px-5 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                              {t('Batal', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedPip.status === 'Passed' || selectedPip.status === 'Failed') && (
                    <PipSignoffBlock pip={selectedPip}
                      canSign={selectedPip.signoffs?.employee ? null : 'employee'}
                      onSign={handleSignPip} />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  )
}
