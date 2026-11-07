'use client'
import Icon from '@/components/ui/Icon'
import { useState }             from 'react'
import { useAuthStore }         from '@/store/authStore'
import { useEmployeeStore }     from '@/store/employeeStore'
import { useStructureStore }    from '@/store/structureStore'
import { useOnboardingStore, onboardingStage }   from '@/store/onboardingStore'
import { useCourseBatchStore }  from '@/store/courseBatchStore'
import { useT }                 from '@/store/languageStore'
import { assigneeLabel, assigneeBadgeCls } from '@/utils/assigneeUtils'
import { frequencyLabel } from '@/utils/reviewCadence'

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_LOV = ['Manual Task','Video','Document (Attachment)','Report','Application Task','External URL','Electronic Signature','Questionnaire','Configurable Form','Learning Course']

const BLANK_BUDDY = {
  buddyEmpId: '', buddyName: '', buddyPosition: '',
  programDuration: '', programDurationUnit: 'Bulan',
  programStartDate: '', programEndDate: '', hrbpNotes: '',
}

function calcEndDate(startDate, duration, unit) {
  if (!startDate || !duration) return ''
  const d = new Date(startDate)
  if (isNaN(d.getTime())) return ''
  const n = parseInt(duration, 10)
  if (isNaN(n) || n <= 0) return ''
  if (unit === 'Hari')   d.setDate(d.getDate() + n)
  if (unit === 'Minggu') d.setDate(d.getDate() + n * 7)
  if (unit === 'Bulan')  d.setMonth(d.getMonth() + n)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getDirectSupervisorId(userId, employees) {
  return employees.find(e => e.id === userId)?.managerId ?? null
}
function getIndirectSupervisorId(userId, employees) {
  const d = getDirectSupervisorId(userId, employees)
  return d ? getDirectSupervisorId(d, employees) : null
}
function canActOnStep(step, ob, currentUser, employees) {
  if (step.status !== 'Pending') return false
  const uid  = currentUser?.id
  const role = currentUser?.role
  const rId  = ob.employeeId
  switch (step.type) {
    case 'supervisor':        return getDirectSupervisorId(rId, employees)   === uid
    case 'indirect_sup':      return getIndirectSupervisorId(rId, employees) === uid
    case 'supervisor_pc53':
    case 'indirect_sup_pc53': return role === 'manager' || role === 'superadmin'
    case 'role': {
      const roles = step.roles ?? []
      return roles.includes(role) || role === 'superadmin'
    }
    case 'userlist':
    case 'employee':          return role === 'hr'       || role === 'superadmin'
    default:                  return role === 'superadmin'
  }
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
const STATUS_CLS = {
  Draft:       'bg-gray-100 text-gray-600',
  Preparation: 'bg-indigo-100 text-indigo-700',
  Active:      'bg-blue-100 text-blue-700',
  Pending:     'bg-yellow-100 text-yellow-700',
  Approved:    'bg-green-100 text-green-700',
  Completed:   'bg-green-100 text-green-700',
  Rejected:    'bg-red-100 text-red-700',
}
const STEP_CFG = {
  Approved: { bg:'bg-green-100',  border:'border-green-300',  color:'text-green-700',  icon:'✅' },
  Rejected: { bg:'bg-red-100',    border:'border-red-300',    color:'text-red-700',    icon:'❌' },
  Pending:  { bg:'bg-amber-100',  border:'border-amber-300',  color:'text-amber-700',  icon:'⏳' },
  Waiting:  { bg:'bg-gray-100',   border:'border-gray-200',   color:'text-gray-500',   icon:'⬜' },
}
const SEC_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-400',
  'bg-red-50 text-red-700 border-red-400',
  'bg-amber-50 text-amber-700 border-amber-400',
  'bg-green-50 text-green-700 border-green-400',
  'bg-rose-50 text-rose-700 border-rose-400',
  'bg-teal-50 text-teal-700 border-teal-400',
]

// ── Shared cell components ────────────────────────────────────────────────────
function toDateInput(val) {
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = new Date(val)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function IC({ value, onChange, placeholder = '' }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white' />
  )
}

function DateCell({ value, onChange }) {
  return (
    <input type='date' value={toDateInput(value)} onChange={e => onChange(e.target.value)}
      className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white' />
  )
}

function LinkCell({ type, value, onChange, batches }) {
  if (type === 'Learning Course') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)}
        className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[180px]'>
        <option value=''>— Pilih Batch —</option>
        {batches.map(b => <option key={b.id} value={b.batch_name}>{b.batch_name}</option>)}
      </select>
    )
  }
  return <IC value={value} onChange={onChange} placeholder='https://…' />
}

// ── Table header: General / Technical ────────────────────────────────────────
function AgendaHead({ t, showCompleted = false }) {
  const cols = ['NO', t('Tanggal','Date'), t('AGENDA','AGENDA'), 'Type', 'Link',
    t('Nama Mentor','Mentor Name'), t('Posisi Mentor','Mentor Position')]
  if (showCompleted) cols.push(t('Completed','Completed'))
  return (
    <thead>
      <tr style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
        {cols.map((h, i) => (
          <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap'
            style={{ minWidth: i===2?180 : i===4?160 : i===0?40 : i===cols.length-1&&showCompleted?80 : 100 }}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}

// ── Feedback View Modal ───────────────────────────────────────────────────────
function FeedbackModal({ reviewItem, employeeId, employeeName, getFeedback, onClose, t }) {
  const fb = getFeedback(reviewItem.reviewerEmpId, employeeId)
  const hasData = !!(fb.strength || fb.areaDevelopment)
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className='bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden'>
        {/* Header */}
        <div className='px-5 py-4 flex items-center justify-between'
          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
          <div>
            <h3 className='text-sm font-bold text-white'><Icon name='message' size={14} className='inline align-[-2px]' /> {t('Form Feedback','Form Feedback')}</h3>
            <p className='text-[11px] text-red-200 mt-0.5'>
              {t('Reviewer','Reviewer')}: <strong>{reviewItem.reviewerName || '—'}</strong>
              {' · '}{reviewItem.reviewerPosition || '—'}
            </p>
          </div>
          <button onClick={onClose}
            className='text-white/70 hover:text-white text-xl leading-none transition'><Icon name='close' size={15} /></button>
        </div>

        {/* Body */}
        <div className='p-5 space-y-4'>
          {/* Employee info */}
          <div className='text-xs text-gray-500 pb-3 border-b border-gray-100'>
            <span className='font-semibold text-gray-700'>{t('Karyawan','Employee')}: </span>
            {employeeName}
            {fb.effectiveDate && (
              <span className='ml-3 text-gray-400'>
                · {t('Tgl Efektif','Eff. Date')}: {fb.effectiveDate}
              </span>
            )}
            {fb.documentNumber && (
              <span className='ml-3 text-gray-400'>
                · {t('No. Dok','Doc No.')}: {fb.documentNumber}
              </span>
            )}
          </div>

          {!hasData ? (
            <div className='py-8 text-center text-gray-400 text-sm'>
              {t('Reviewer belum mengisi Form Feedback.','Reviewer has not filled in the Form Feedback yet.')}
            </div>
          ) : (
            <>
              <div>
                <label className='block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1'>
                  {t('Kekuatan (Strength)','Strength')}
                </label>
                <div className='w-full px-3 py-2.5 text-xs rounded border border-gray-200 bg-gray-50 text-gray-700 whitespace-pre-wrap min-h-[60px]'>
                  {fb.strength || <span className='text-gray-300 italic'>—</span>}
                </div>
              </div>
              <div>
                <label className='block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1'>
                  {t('Area Pengembangan (Area Development)','Area Development')}
                </label>
                <div className='w-full px-3 py-2.5 text-xs rounded border border-gray-200 bg-gray-50 text-gray-700 whitespace-pre-wrap min-h-[60px]'>
                  {fb.areaDevelopment || <span className='text-gray-300 italic'>—</span>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className='px-5 pb-5 flex justify-end'>
          <button onClick={onClose}
            className='px-5 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition'>
            {t('Tutup','Close')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ApproveOnboardingPage() {
  const t                                        = useT()
  const { currentUser }                          = useAuthStore()
  const { employees }                            = useEmployeeStore()
  const { positions }                            = useStructureStore()
  const { onboardings, approveStep, rejectStep, updateOnboarding } = useOnboardingStore()
  const { batches }                              = useCourseBatchStore()
  const [view,                setView              ] = useState('list')
  const [selectedId,          setSelectedId        ] = useState(null)
  const [note,                setNote              ] = useState('')
  const [rejecting,           setRejecting         ] = useState(false)
  const [localGeneralItems,   setLocalGeneralItems ] = useState([])
  const [localTechnicalItems, setLocalTechnicalItems] = useState([])
  const [localReviewItems,    setLocalReviewItems  ] = useState([])
  const [localMainSections,   setLocalMainSections ] = useState([])
  const [localHasilChecked,   setLocalHasilChecked ] = useState(false)
  const [hasilError,          setHasilError        ] = useState(false)
  const [localBuddy,          setLocalBuddy        ] = useState({ ...BLANK_BUDDY })

  const submitted = onboardings.filter(o => o.workflowStatus !== 'Draft')

  // My team's Active/Preparation onboardings (new flow — no approval needed but manager can view/edit)
  const myEmpIds = employees
    .filter(e => e.managerId === currentUser?.id)
    .map(e => e.id)
  const myTeamActive = onboardings.filter(o =>
    (o.workflowStatus === 'Active' || o.workflowStatus === 'Preparation') &&
    myEmpIds.includes(Number(o.employeeId))
  )

  const actionable = submitted.filter(o => {
    const pending = (o.steps || []).find(s => s.status === 'Pending')
    return pending && canActOnStep(pending, o, currentUser, employees)
  })
  const acted = submitted.filter(o =>
    (o.steps || []).some(s => s.approverId === currentUser?.id) &&
    !actionable.find(a => a.id === o.id)
  )

  const allVisible = [...submitted, ...myTeamActive.filter(o => !submitted.find(s => s.id === o.id))]
  const selected    = allVisible.find(o => o.id === selectedId) ?? null
  const pendingStep = selected ? (selected.steps || []).find(s => s.status === 'Pending') : null
  const myTurn      = selected && pendingStep && canActOnStep(pendingStep, selected, currentUser, employees)

  const openDetail = (id) => {
    const ob = onboardings.find(o => o.id === id)
    setLocalGeneralItems(JSON.parse(JSON.stringify(ob?.generalItems   || [])))
    setLocalTechnicalItems(JSON.parse(JSON.stringify(ob?.technicalItems || [])))
    setLocalReviewItems(JSON.parse(JSON.stringify(ob?.reviewItems     || [])))
    setLocalMainSections(JSON.parse(JSON.stringify(ob?.mainSections   || [])))
    setLocalHasilChecked(ob?.hasilInductionChecked || false)
    setLocalBuddy({ ...BLANK_BUDDY, ...(ob?.buddyAssignment ?? {}) })
    setSelectedId(id)
    setNote('')
    setRejecting(false)
    setView('detail')
  }

  // ── Local item updaters ───────────────────────────────────────────────────
  const updG = (id, key, val) =>
    setLocalGeneralItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i))
  const patchG = (id, patch) =>
    setLocalGeneralItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i))

  const updT = (id, key, val) =>
    setLocalTechnicalItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i))
  const patchT = (id, patch) =>
    setLocalTechnicalItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i))

  const updR = (id, key, val) =>
    setLocalReviewItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i))
  const patchR = (id, patch) =>
    setLocalReviewItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i))

  const patchBuddy = (patch) =>
    setLocalBuddy(prev => ({ ...prev, ...patch }))

  const updMsItem = (msId, itemId, key, val) =>
    setLocalMainSections(p => p.map(ms => ms.id !== msId ? ms :
      { ...ms, items: ms.items.map(i => i.id === itemId ? { ...i, [key]: val } : i) }))

  const persistLocalChanges = () => {
    if (!selected) return
    updateOnboarding(selected.id, {
      generalItems:          localGeneralItems,
      technicalItems:        localTechnicalItems,
      reviewItems:           localReviewItems,
      mainSections:          localMainSections,
      hasilInductionChecked: localHasilChecked,
      buddyAssignment:       localBuddy,
    })
  }

  const handleApprove = () => {
    if (!pendingStep) return
    if (!localHasilChecked) { setHasilError(true); return }
    setHasilError(false)
    persistLocalChanges()
    approveStep(selected.id, pendingStep.level, currentUser.id, currentUser.name, note)
    setNote(''); setRejecting(false); setView('list')
  }

  const handleReject = () => {
    if (!pendingStep) return
    persistLocalChanges()
    rejectStep(selected.id, pendingStep.level, currentUser.id, currentUser.name, note)
    setNote(''); setRejecting(false); setView('list')
  }

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <h1 className='text-2xl font-bold text-gray-800 mb-1'>
          {t('Employee Onboarding (My Team)', 'Employee Onboarding (My Team)')}
        </h1>
        <p className='text-gray-500 text-sm mb-6'>
          {t(
            'Review dan setujui pengajuan onboarding/induksi karyawan sesuai level approval Anda.',
            'Review and approve employee onboarding/induction requests at your approval level.'
          )}
        </p>

        {/* Pending */}
        <div className='bg-white rounded-xl shadow-sm mb-6'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-700'>
              <Icon name='clock' size={14} className='inline align-[-2px]' /> {t('Menunggu Persetujuan', 'Pending Approval')}
              <span className='ml-2 text-xs font-normal text-gray-400'>({actionable.length})</span>
            </h2>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-gray-50'>
                  {[t('Karyawan','Employee'), 'Department',
                    t('Status Karyawan','Emp. Status'), t('Masa Probasi','Probation'),
                    t('Atasan','Supervisor'), 'Step',
                    t('Tanggal Submit','Submitted')].map((h, i) => (
                    <th key={i} className='text-left px-4 py-3 text-xs font-semibold text-gray-500'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {actionable.length ? actionable.map(ob => {
                  const ps = (ob.steps || []).find(s => s.status === 'Pending')
                  return (
                    <tr key={ob.id} onClick={() => openDetail(ob.id)}
                      className='hover:bg-red-50 cursor-pointer transition'>
                      <td className='px-4 py-3 font-semibold text-gray-800'>{ob.employeeName}</td>
                      <td className='px-4 py-3 text-gray-600'>{ob.department || '—'}</td>
                      <td className='px-4 py-3'>
                        <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium'>
                          {ob.employmentStatus}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-gray-600'>{ob.probationPeriod} {t('bln','mo')}</td>
                      <td className='px-4 py-3 text-gray-600'>{ob.supervisorName || '—'}</td>
                      <td className='px-4 py-3'>
                        {ps && (
                          <span className='text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full'>
                            Step {ps.level} · {ps.label}
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-gray-500 text-xs'>
                        {ob.submittedAt ? new Date(ob.submittedAt).toLocaleDateString('id-ID') : '—'}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={7} className='px-4 py-10 text-center text-gray-400 text-sm'>
                      {t('Tidak ada pengajuan yang perlu disetujui.','No pending approvals.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* History */}
        <div className='bg-white rounded-xl shadow-sm'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-700'>
              <Icon name='clipboard' size={14} className='inline align-[-2px]' /> {t('Riwayat Keputusan', 'Decision History')}
              <span className='ml-2 text-xs font-normal text-gray-400'>({acted.length})</span>
            </h2>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-gray-50'>
                  {[t('Karyawan','Employee'), 'Department',
                    t('Status Karyawan','Emp. Status'), t('Masa Probasi','Probation'),
                    t('Atasan','Supervisor'), t('Status Workflow','Workflow Status'),
                    t('Tanggal Submit','Submitted')].map((h, i) => (
                    <th key={i} className='text-left px-4 py-3 text-xs font-semibold text-gray-500'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {acted.length ? acted.map(ob => (
                  <tr key={ob.id} onClick={() => openDetail(ob.id)}
                    className='hover:bg-gray-50 cursor-pointer transition'>
                    <td className='px-4 py-3 font-semibold text-gray-800'>{ob.employeeName}</td>
                    <td className='px-4 py-3 text-gray-600'>{ob.department || '—'}</td>
                    <td className='px-4 py-3'>
                      <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium'>
                        {ob.employmentStatus}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-gray-600'>{ob.probationPeriod} {t('bln','mo')}</td>
                    <td className='px-4 py-3 text-gray-600'>{ob.supervisorName || '—'}</td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${onboardingStage(ob.workflowStatus).cls}`}>
                        {t(onboardingStage(ob.workflowStatus).id, onboardingStage(ob.workflowStatus).en)}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-gray-500 text-xs'>
                      {ob.submittedAt ? new Date(ob.submittedAt).toLocaleDateString('id-ID') : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className='px-4 py-10 text-center text-gray-400 text-sm'>
                      {t('Belum ada riwayat.','No history yet.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Active/Preparation */}
        {myTeamActive.length > 0 && (
          <div className='bg-white rounded-xl shadow-sm mt-6'>
            <div className='px-6 py-4 border-b border-gray-100'>
              <h2 className='text-sm font-bold text-gray-700'>
                <Icon name='rocket' size={14} className='inline align-[-2px]' /> {t('Tim Saya (Onboarding Aktif)', 'My Team (Active Onboarding)')}
                <span className='ml-2 text-xs font-normal text-gray-400'>({myTeamActive.length})</span>
              </h2>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gray-50'>
                    {[t('Karyawan','Employee'), 'Department', t('Status','Status'), t('Progress','Progress'), t('Join Date','Join Date')].map((h, i) => (
                      <th key={i} className='text-left px-4 py-3 text-xs font-semibold text-gray-500'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {myTeamActive.map(ob => {
                    const allItems = (ob.mainSections ?? []).flatMap(ms => ms.items ?? [])
                    const empItems = allItems.filter(i => { const v = i.assignedTo; return !v || v === 'self' || v === 'employee' || v === 'hr' })
                    const done = empItems.filter(i => i.completed).length
                    const pct = empItems.length === 0 ? 0 : Math.round(done / empItems.length * 100)
                    const emp = employees.find(e => e.id === Number(ob.employeeId))
                    return (
                      <tr key={ob.id} onClick={() => openDetail(ob.id)}
                        className='hover:bg-gray-50 cursor-pointer transition'>
                        <td className='px-4 py-3 font-semibold text-gray-800'>{ob.employeeName}</td>
                        <td className='px-4 py-3 text-gray-600'>{ob.department || '—'}</td>
                        <td className='px-4 py-3'>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${onboardingStage(ob.workflowStatus).cls}`}>
                            {t(onboardingStage(ob.workflowStatus).id, onboardingStage(ob.workflowStatus).en)}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            <div className='w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                              <div className='h-full bg-green-500 rounded-full' style={{ width: `${pct}%` }} />
                            </div>
                            <span className='text-xs text-gray-500'>{done}/{empItems.length} ({pct}%)</span>
                          </div>
                        </td>
                        <td className='px-4 py-3 text-gray-500 text-xs'>
                          {emp?.joinDate ? String(emp.joinDate).slice(0, 10) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (!selected) { setView('list'); return null }

  const isApproved        = selected.workflowStatus === 'Approved'
  const isCompleted       = selected.workflowStatus === 'Completed'
  // Show the read-only "Completed" column both after final approval and once
  // the employee has finished the whole program.
  const showDone          = isApproved || isCompleted
  // Auto-assigned / active records have no approval step but the atasan can
  // still adjust the technical tasks and save.
  const isAdjustable      = !pendingStep && (selected.workflowStatus === 'Active' || selected.workflowStatus === 'Preparation')
  const generalSections   = selected.generalSections   ?? []
  const technicalSections = selected.technicalSections ?? []

  return (
    <div className='pb-32'>

      {/* ── Top bar ── */}
      <div className='flex items-center gap-3 mb-5'>
        <button onClick={() => setView('list')}
          className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition'>
          <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali ke List', 'Back to List')}
        </button>
        <span className='text-gray-300'>|</span>
        <h1 className='text-xl font-bold text-gray-800'>
          {t('Detail Onboarding', 'Onboarding Detail')} — {selected.employeeName}
        </h1>
        <span className={`ml-auto text-xs font-bold px-3 py-1.5 rounded-full ${onboardingStage(selected.workflowStatus).cls}`}>
          {t(onboardingStage(selected.workflowStatus).id, onboardingStage(selected.workflowStatus).en)}
        </span>
      </div>

      {/* ── Form card ── */}
      <div className='bg-white rounded-xl shadow-sm overflow-hidden mb-5'>

        {/* Header gradient */}
        <div style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }} className='px-6 py-4'>
          <h2 className='text-sm font-bold text-white mb-3'>
            {t('FORMULIR ONBOARDING / INDUKSI KARYAWAN', 'EMPLOYEE ONBOARDING / INDUCTION FORM')}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3'>
            {[
              [t('Nama','Name'),                         selected.employeeName],
              ['NIK',                                      selected.nik || '—'],
              ['Department',                               selected.department || '—'],
              [t('Join Date','Join Date'),                selected.joinDate ? String(selected.joinDate).slice(0, 10) : '—'],
              [t('Nama / Posisi Atasan','Supervisor'),    `${selected.supervisorName || '—'} / ${selected.supervisorPosition || '—'}`],
              [t('Status Karyawan','Employee Status'),    selected.employmentStatus],
              [t('Masa Probation/Orientasi','Probation'), `${selected.probationPeriod} ${t('Bulan','Month(s)')}`],
              [t('Contract No','Contract No'),            selected.contractNo || '—'],
              [t('Probation End Date','Probation End Date'), selected.probationEndDate || '—'],
            ].map(([label, val]) => (
              <div key={label} className='flex items-center gap-2'>
                <span className='text-xs text-red-200 w-36 flex-shrink-0'>{label} :</span>
                <span className='text-xs text-white font-semibold'>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Progress Summary ── */}
        {localMainSections.length > 0 && (() => {
          const allItems = localMainSections.flatMap(ms => ms.items ?? [])
          const isSelf = (v) => !v || v === 'self' || v === 'employee' || v === 'hr'
          const selfItems  = allItems.filter(i => isSelf(i.assignedTo))
          const mgrItems   = allItems.filter(i => i.assignedTo === 'manager')
          const otherItems = allItems.filter(i => i.assignedTo === 'assessor' || (i.assignedTo && i.assignedTo.startsWith('emp:')))
          const pct = (items) => items.length === 0 ? 0 : Math.round(items.filter(i => i.completed).length / items.length * 100)
          return (
            <div className='px-6 pt-5 pb-2'>
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
                <h3 className='text-sm font-bold text-gray-800'><Icon name='chart' size={14} className='inline align-[-2px]' /> {t('Ringkasan Progress','Progress Summary')}</h3>
              </div>
              <div className='grid grid-cols-3 gap-3'>
                {[
                  { label: 'Self', items: selfItems, color: 'green' },
                  { label: 'Manager', items: mgrItems, color: 'purple' },
                  { label: 'Lainnya', items: otherItems, color: 'orange' },
                ].map(({ label, items, color }) => (
                  <div key={label} className={`rounded-lg border border-${color}-100 bg-${color}-50 px-4 py-3`}>
                    <div className='flex justify-between items-center mb-1.5'>
                      <span className={`text-xs font-bold text-${color}-700`}>{label}</span>
                      <span className={`text-xs font-semibold text-${color}-600`}>{items.filter(i => i.completed).length}/{items.length}</span>
                    </div>
                    <div className='h-1.5 bg-white rounded-full overflow-hidden'>
                      <div className={`h-full bg-${color}-500 rounded-full transition-all`} style={{ width: `${pct(items)}%` }} />
                    </div>
                    <span className={`text-[10px] text-${color}-400 mt-1 block`}>{pct(items)}% {t('selesai','done')}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Main Sections (new format) — Teknis handled by the editable block below ── */}
        {localMainSections.length > 0 && localMainSections.filter(ms => ms.type !== 'Onboarding Teknis').map(ms => {
          const allMsItems = ms.items ?? []
          if (allMsItems.length === 0 && (ms.sections ?? []).length === 0) return null
          return (
            <div key={ms.id} className='px-6 pt-5 pb-2'>
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
                <h3 className='text-sm font-bold text-gray-800'>{ms.type}</h3>
              </div>
              <div className='overflow-x-auto rounded-lg border border-gray-200'>
                {(ms.sections ?? []).length === 0 ? (
                  <div className='px-6 py-6 text-center text-gray-400 text-sm'>{t('Tidak ada section.','No sections.')}</div>
                ) : (ms.sections ?? []).map(sec => {
                  const cls  = SEC_COLORS[sec.colorIdx % SEC_COLORS.length]
                  const rows = allMsItems.filter(i => i.category === sec.id)
                  const colSpan = 8
                  const isGeneral = ms.type === 'Onboarding General'
                  return (
                    <table key={sec.id} className='w-full text-xs border-b border-gray-100 last:border-b-0'>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                          {['NO', t('Tanggal','Date'), t('AGENDA','AGENDA'), 'Type', t('Nama Mentor','Mentor'),
                            t('Assignee','Assignee'), t('Completed','Completed'), ''].map((h, i) => (
                            <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap'
                              style={{ minWidth: i===2?180 : i===0?40 : i===6?80 : i===7?36 : 90 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={cls.split(' ').filter(c => c.startsWith('bg-')).join(' ')}>
                          <td colSpan={colSpan} className='px-3 py-2'>
                            <span className={`text-xs font-semibold ${cls.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                              {sec.label || '—'}
                              {isGeneral && <span className='ml-2 text-[10px] font-normal opacity-60'>(Read Only)</span>}
                            </span>
                          </td>
                        </tr>
                        {rows.length === 0 && (
                          <tr><td colSpan={colSpan} className='px-4 py-3 text-center text-gray-300 text-xs italic'>{t('Tidak ada baris.','No rows.')}</td></tr>
                        )}
                        {rows.map((item, idx) => {
                          const roleCls   = assigneeBadgeCls(item.assignedTo)
                          const roleLabel = assigneeLabel(item.assignedTo, employees)
                          return (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className='px-2 py-1.5 w-10 text-center text-gray-500 font-medium'>{idx + 1}</td>
                              <td className='px-2 py-1.5 w-28'>
                                {isGeneral
                                  ? <span className='text-xs text-gray-600'>{item.date ? String(item.date).slice(0, 10) : '—'}</span>
                                  : <DateCell value={item.date || ''} onChange={v => updMsItem(ms.id, item.id, 'date', v)} />}
                              </td>
                              <td className='px-2 py-1.5'>
                                {isGeneral
                                  ? <span className='text-xs text-gray-700'>{item.module || '—'}</span>
                                  : <IC value={item.module || ''} onChange={v => updMsItem(ms.id, item.id, 'module', v)} placeholder={t('Nama modul…','Module name…')} />}
                              </td>
                              <td className='px-2 py-1.5 w-40 text-gray-600 text-xs'>{item.type || '—'}</td>
                              <td className='px-2 py-1.5 w-28 text-gray-600 text-xs'>{item.mentorName || '—'}</td>
                              <td className='px-2 py-1.5 w-24'>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${roleCls}`}>{roleLabel}</span>
                              </td>
                              <td className='px-2 py-1.5 w-16 text-center'>
                                {isGeneral
                                  ? <input type='checkbox' checked={!!item.completed} readOnly className='w-4 h-4 accent-green-600 cursor-default' />
                                  : <input type='checkbox' checked={!!item.completed}
                                      onChange={e => updMsItem(ms.id, item.id, 'completed', e.target.checked)}
                                      className='w-4 h-4 accent-red-600' />}
                              </td>
                              <td className='px-2 py-1.5 w-9' />
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── SECTION 1: Onboarding General (legacy format) ── */}
        {localMainSections.length === 0 && <>
        <div className='px-6 pt-5 pb-2'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
            <h3 className='text-sm font-bold text-gray-800'>{t('Onboarding General','General Induction Material')}</h3>
          </div>
          <div className='overflow-x-auto rounded-lg border border-gray-200'>
            {generalSections.length === 0 ? (
              <div className='px-6 py-6 text-center text-gray-400 text-sm'>{t('Tidak ada data.','No data.')}</div>
            ) : generalSections.map(sec => {
              const cls     = SEC_COLORS[sec.colorIdx % SEC_COLORS.length]
              const rows    = localGeneralItems.filter(i => i.category === sec.id)
              const colSpan = showDone ? 8 : 7
              return (
                <table key={sec.id} className='w-full text-xs border-b border-gray-100 last:border-b-0'>
                  <AgendaHead t={t} showCompleted={showDone} />
                  <tbody>
                    <tr className={cls.split(' ').filter(c => c.startsWith('bg-')).join(' ')}>
                      <td colSpan={colSpan} className='px-3 py-2'>
                        <span className={`text-xs font-semibold ${cls.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                          {sec.label || sec.labelEN || '—'}
                        </span>
                      </td>
                    </tr>
                    {rows.length === 0 && (
                      <tr><td colSpan={colSpan} className='px-4 py-3 text-center text-gray-300 text-xs italic'>{t('Tidak ada baris.','No rows.')}</td></tr>
                    )}
                    {rows.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className='px-2 py-1.5 w-10 text-center text-gray-500 font-medium'>{idx + 1}</td>
                        <td className='px-2 py-1.5 w-28'>
                          <DateCell value={item.date || ''} onChange={v => updG(item.id, 'date', v)} />
                        </td>
                        <td className='px-2 py-1.5'>
                          <IC value={item.module || ''} onChange={v => updG(item.id, 'module', v)} placeholder={t('Nama modul…','Module name…')} />
                        </td>
                        <td className='px-2 py-1.5 w-40'>
                          <select value={item.type || ''} onChange={e => patchG(item.id, { type: e.target.value, link: '' })}
                            className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white'>
                            <option value=''>— Pilih —</option>
                            {TYPE_LOV.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className='px-2 py-1.5'>
                          <LinkCell type={item.type} value={item.link || ''} onChange={v => updG(item.id, 'link', v)} batches={batches} />
                        </td>
                        <td className='px-2 py-1.5 w-36'>
                          <select value={item.mentorEmpId || ''} onChange={e => {
                            const emp = employees.find(em => em.id === Number(e.target.value))
                            const pos = positions.find(p => p.id === emp?.positionId)
                            patchG(item.id, { mentorEmpId: e.target.value, mentorName: emp?.name ?? '', mentorPosition: pos?.name ?? '' })
                          }}
                            className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[130px]'>
                            <option value=''>— Pilih Mentor —</option>
                            {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                          </select>
                        </td>
                        <td className='px-2 py-1.5 w-28 text-xs text-gray-500'>
                          {item.mentorPosition || <span className='text-gray-300 italic'>{t('Otomatis','Auto')}</span>}
                        </td>
                        {showDone && (
                          <td className='px-2 py-1.5 w-16 text-center'>
                            <input type='checkbox' checked={!!item.completed} readOnly
                              className='w-4 h-4 accent-green-600 cursor-default' />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })}
          </div>
        </div>

        {/* ── SECTION 2: Onboarding Teknis (legacy format) ── */}
        <div className='px-6 pt-5 pb-2'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
            <h3 className='text-sm font-bold text-gray-800'>{t('Onboarding Teknis','Technical Induction Material')}</h3>
          </div>
          <div className='overflow-x-auto rounded-lg border border-gray-200'>
            {technicalSections.length === 0 ? (
              <div className='px-6 py-6 text-center text-gray-400 text-sm'>{t('Tidak ada data.','No data.')}</div>
            ) : technicalSections.map(sec => {
              const cls     = SEC_COLORS[sec.colorIdx % SEC_COLORS.length]
              const rows    = localTechnicalItems.filter(i => i.category === sec.id)
              const colSpan = showDone ? 8 : 7
              return (
                <table key={sec.id} className='w-full text-xs border-b border-gray-100 last:border-b-0'>
                  <AgendaHead t={t} showCompleted={showDone} />
                  <tbody>
                    <tr className={cls.split(' ').filter(c => c.startsWith('bg-')).join(' ')}>
                      <td colSpan={colSpan} className='px-3 py-2'>
                        <span className={`text-xs font-semibold ${cls.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                          {sec.label || sec.labelEN || '—'}
                        </span>
                      </td>
                    </tr>
                    {rows.length === 0 && (
                      <tr><td colSpan={colSpan} className='px-4 py-3 text-center text-gray-300 text-xs italic'>{t('Tidak ada baris.','No rows.')}</td></tr>
                    )}
                    {rows.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className='px-2 py-1.5 w-10 text-center text-gray-500 font-medium'>{idx + 1}</td>
                        <td className='px-2 py-1.5 w-28'>
                          <DateCell value={item.date || ''} onChange={v => updT(item.id, 'date', v)} />
                        </td>
                        <td className='px-2 py-1.5'>
                          <IC value={item.module || ''} onChange={v => updT(item.id, 'module', v)} placeholder={t('Nama modul…','Module name…')} />
                        </td>
                        <td className='px-2 py-1.5 w-40'>
                          <select value={item.type || ''} onChange={e => patchT(item.id, { type: e.target.value, link: '' })}
                            className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white'>
                            <option value=''>— Pilih —</option>
                            {TYPE_LOV.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className='px-2 py-1.5'>
                          <LinkCell type={item.type} value={item.link || ''} onChange={v => updT(item.id, 'link', v)} batches={batches} />
                        </td>
                        <td className='px-2 py-1.5 w-36'>
                          <select value={item.mentorEmpId || ''} onChange={e => {
                            const emp = employees.find(em => em.id === Number(e.target.value))
                            const pos = positions.find(p => p.id === emp?.positionId)
                            patchT(item.id, { mentorEmpId: e.target.value, mentorName: emp?.name ?? '', mentorPosition: pos?.name ?? '' })
                          }}
                            className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[130px]'>
                            <option value=''>— Pilih Mentor —</option>
                            {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                          </select>
                        </td>
                        <td className='px-2 py-1.5 w-28 text-xs text-gray-500'>
                          {item.mentorPosition || <span className='text-gray-300 italic'>{t('Otomatis','Auto')}</span>}
                        </td>
                        {showDone && (
                          <td className='px-2 py-1.5 w-16 text-center'>
                            <input type='checkbox' checked={!!item.completed} readOnly
                              className='w-4 h-4 accent-green-600 cursor-default' />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })}
          </div>
        </div>
        </>}

        {/* ── SECTION 3: Periodic Review ── */}
        <div className='px-6 pt-5 pb-2'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
            <h3 className='text-sm font-bold text-gray-800'>{t('Evaluasi Berkala','Periodic Evaluation')}</h3>
          </div>
          <div className='overflow-x-auto rounded-lg border border-gray-200'>
            <table className='w-full text-xs'>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  {[
                    'NO', t('Tanggal','Date'), t('Agenda','Agenda'), t('Form','Form'),
                    t('Evaluators','Evaluators'),
                    ...(showDone ? [t("Completed","Completed")] : [])
                  ].map((h, i) => (
                    <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap'
                      style={{ minWidth: i===2?200 : i===0?40 : i===4?180 : 100 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {localReviewItems.length === 0 ? (
                  <tr>
                    <td colSpan={showDone ? 6 : 5} className='px-6 py-6 text-center text-gray-400 text-sm'>
                      {t('Tidak ada data.','No data.')}
                    </td>
                  </tr>
                ) : localReviewItems.map((item, idx) => {
                  const doneEval = (item.formSubmissions ?? []).length
                  const totalEval = (item.evaluators ?? []).length
                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className='px-2 py-1.5 w-10 text-center text-gray-500 font-medium'>{idx + 1}</td>
                      <td className='px-2 py-1.5 w-28'>
                        <DateCell value={item.date || ''} onChange={v => updR(item.id, 'date', v)} />
                        {(item.frequency ?? 'once') !== 'once' && (
                          <span className='text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block'>
                            <Icon name='repeat' size={14} className='inline align-[-2px]' /> {frequencyLabel(item, t('id','en') === 'en')}
                            {item.nextReviewDate && <span className='text-orange-400 ml-1'><Icon e='→' size={14} className='inline align-[-2px]' /> {item.nextReviewDate}</span>}
                          </span>
                        )}
                      </td>
                      <td className='px-2 py-1.5'>
                        <IC value={item.agenda || ''} onChange={v => updR(item.id, 'agenda', v)} placeholder={t('Agenda…','Agenda…')} />
                      </td>
                      <td className='px-2 py-1.5 w-40 text-xs text-gray-600'>
                        {item.masterFormName || <span className='text-gray-300 italic'>—</span>}
                      </td>
                      <td className='px-2 py-1.5'>
                        <div className='flex flex-wrap gap-1 items-center'>
                          {(item.evaluators ?? []).length === 0
                            ? <span className='text-xs text-gray-400'>—</span>
                            : (item.evaluators ?? []).map(e => (
                              <span key={e.id} className='text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full'>{e.label}</span>
                            ))
                          }
                          {totalEval > 0 && (
                            <span className={`text-[10px] ml-1 font-semibold ${doneEval >= totalEval ? 'text-green-600' : 'text-amber-600'}`}>
                              {doneEval}/{totalEval}
                            </span>
                          )}
                        </div>
                      </td>
                      {showDone && (
                        <td className='px-2 py-1.5 w-16 text-center'>
                          <input type='checkbox' checked={!!item.completed} readOnly
                            className='w-4 h-4 accent-green-600 cursor-default' />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Assign Buddy ── */}
        <div className='px-6 pt-5 pb-2'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
            <h3 className='text-sm font-bold text-gray-800'><Icon name='users' size={14} className='inline align-[-2px]' /> {t('Assign Buddy','Assign Buddy')}</h3>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-white rounded-xl border border-gray-200 p-5'>

            {/* Buddy Name */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Buddy Name','Buddy Name')}</label>
              <select
                value={localBuddy.buddyEmpId || ''}
                onChange={e => {
                  const emp = employees.find(em => em.id === Number(e.target.value))
                  const pos = positions.find(p => p.id === emp?.positionId)
                  patchBuddy({ buddyEmpId: e.target.value, buddyName: emp?.name ?? '', buddyPosition: pos?.name ?? '' })
                }}
                className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white'>
                <option value=''>— {t('Pilih Buddy','Select Buddy')} —</option>
                {employees.filter(e => e.status === 'Active').map(e => (
                  <option key={e.id} value={e.id}>{e.nik || `#${e.id}`} — {e.name}</option>
                ))}
              </select>
            </div>

            {/* Buddy Program Duration */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Buddy Program Duration','Buddy Program Duration')}</label>
              <div className='flex gap-2'>
                <input type='number' min={1}
                  value={localBuddy.programDuration || ''}
                  onChange={e => {
                    const dur = e.target.value
                    patchBuddy({ programDuration: dur, programEndDate: calcEndDate(localBuddy.programStartDate, dur, localBuddy.programDurationUnit || 'Bulan') })
                  }}
                  placeholder='0'
                  className='w-24 px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none' />
                <select
                  value={localBuddy.programDurationUnit || 'Bulan'}
                  onChange={e => {
                    const unit = e.target.value
                    patchBuddy({ programDurationUnit: unit, programEndDate: calcEndDate(localBuddy.programStartDate, localBuddy.programDuration, unit) })
                  }}
                  className='flex-1 px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white'>
                  <option value='Hari'>Hari</option>
                  <option value='Minggu'>Minggu</option>
                  <option value='Bulan'>Bulan</option>
                </select>
              </div>
            </div>

            {/* Program Start Date */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Program Start Date','Program Start Date')}</label>
              <input type='date'
                value={localBuddy.programStartDate || ''}
                onChange={e => {
                  const sd = e.target.value
                  patchBuddy({ programStartDate: sd, programEndDate: calcEndDate(sd, localBuddy.programDuration, localBuddy.programDurationUnit || 'Bulan') })
                }}
                className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none' />
            </div>

            {/* Program End Date */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Program End Date','Program End Date')}</label>
              <input type='date'
                value={localBuddy.programEndDate || ''}
                onChange={e => patchBuddy({ programEndDate: e.target.value })}
                className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-gray-50' />
            </div>

            {/* HRBP Notes */}
            <div className='md:col-span-2'>
              <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('HRBP Special Instructions / Notes:','HRBP Special Instructions / Notes:')}</label>
              <textarea rows={3}
                value={localBuddy.hrbpNotes || ''}
                onChange={e => patchBuddy({ hrbpNotes: e.target.value })}
                placeholder={t('Type here','Type here')}
                className='w-full px-3 py-2 text-xs rounded border border-gray-200 focus:border-red-400 outline-none resize-none' />
            </div>

          </div>
        </div>

        {/* ── Hasil Induksi ── */}
        <div className='px-6 py-5'>
          <div className={`border rounded-lg p-4 flex items-start gap-3 transition ${hasilError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50/60'}`}>
            <input type='checkbox' checked={!!localHasilChecked}
              onChange={() => { setLocalHasilChecked(v => !v); setHasilError(false) }}
              className='mt-0.5 flex-shrink-0 w-5 h-5 accent-green-600 cursor-pointer' />
            <div>
              <span className='text-xs text-gray-700 leading-relaxed'>
                {t(
                  'Saya sebagai atasan menyatakan bahwa karyawan bersangkutan sudah dapat secara mandiri mengerjakan pekerjaan yang dituju berdasarkan hasil review yang dilakukan.',
                  'I, as the supervisor, declare that the relevant employee is able to independently carry out the targeted work based on the review conducted.'
                )}
              </span>
              {hasilError && (
                <p className='text-xs text-red-500 font-semibold mt-1'>
                  {t('Wajib dicentang sebelum Approve.', 'Must be checked before approving.')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Onboarding Teknis (Manager dapat menambahkan saat approval) ── */}
      {(() => {
        const TEKNIS = 'Onboarding Teknis'
        const teknisMs = localMainSections.find(ms => ms.type === TEKNIS)
        const rows = teknisMs?.items ?? []

        const addTeknisRow = () => {
          setLocalMainSections(prev => {
            const exists = prev.find(m => m.type === TEKNIS)
            const newRow = () => ({
              id: Math.random(), module: '', type: '', link: '', date: '',
              mentorName: '', mentorPosition: '', mentorEmpId: '',
              completed: false, assignedTo: 'employee',
            })
            if (!exists) {
              const secId = `sec_teknis_${Date.now()}`
              return [...prev, {
                id: `ms_teknis_${Date.now()}`, type: TEKNIS,
                sections: [{ id: secId, label: t('Materi Teknis','Technical Material'), colorIdx: 1 }],
                items: [{ ...newRow(), category: secId }],
              }]
            }
            return prev.map(m => {
              if (m.type !== TEKNIS) return m
              const sections = (m.sections ?? []).length
                ? m.sections
                : [{ id: `sec_teknis_${Date.now()}`, label: t('Materi Teknis','Technical Material'), colorIdx: 1 }]
              return { ...m, sections, items: [...(m.items ?? []), { ...newRow(), category: sections[0].id }] }
            })
          })
        }
        const delTeknisRow = (itemId) =>
          setLocalMainSections(prev => prev.map(m => m.type !== TEKNIS ? m : { ...m, items: m.items.filter(i => i.id !== itemId) }))
        const updTeknisRow = (itemId, key, val) =>
          setLocalMainSections(prev => prev.map(m => m.type !== TEKNIS ? m : { ...m, items: m.items.map(i => i.id === itemId ? { ...i, [key]: val } : i) }))
        const patchTeknisRow = (itemId, patch) =>
          setLocalMainSections(prev => prev.map(m => m.type !== TEKNIS ? m : { ...m, items: m.items.map(i => i.id === itemId ? { ...i, ...patch } : i) }))

        return (
          <div className='bg-white rounded-xl shadow-sm overflow-hidden mb-5'>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center gap-2'>
              <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
              <h3 className='text-sm font-bold text-gray-800'><Icon name='settings' size={14} className='inline align-[-2px]' /> {t('Onboarding Teknis','Technical Induction')}</h3>
              <span className='text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full'>
                {rows.filter(i => i.completed).length}/{rows.length} {t('selesai','done')}
              </span>
              <button onClick={addTeknisRow}
                className='ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition'>
                + {t('Tambah Materi Teknis','Add Technical Item')}
              </button>
            </div>
            {rows.length === 0 ? (
              <div className='px-6 py-8 text-center text-gray-400 text-sm'>
                {t('Belum ada materi teknis. Klik "+ Tambah Materi Teknis" untuk menambahkan.','No technical items yet. Click "+ Add Technical Item" to add one.')}
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                      {['NO', t('Tanggal','Date'), t('AGENDA','AGENDA'), 'Type', 'Link',
                        t('Nama Mentor','Mentor'), t('Assignee','Assignee'), t('Completed','Completed'), ''].map((h, i) => (
                        <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap'
                          style={{ minWidth: i===2?180 : i===4?160 : i===7?80 : i===8?36 : i===0?40 : 100 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className='px-3 py-1.5 text-center text-gray-500 font-medium w-8'>{idx + 1}</td>
                        <td className='px-2 py-1.5 w-28'>
                          <DateCell value={item.date || ''} onChange={v => updTeknisRow(item.id, 'date', v)} />
                        </td>
                        <td className='px-2 py-1.5'>
                          <IC value={item.module || ''} onChange={v => updTeknisRow(item.id, 'module', v)}
                            placeholder={t('Nama modul…','Module name…')} />
                        </td>
                        <td className='px-2 py-1.5 w-40'>
                          <select value={item.type || ''} onChange={e => patchTeknisRow(item.id, { type: e.target.value, link: '' })}
                            className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white'>
                            <option value=''>— Pilih —</option>
                            {TYPE_LOV.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className='px-2 py-1.5'>
                          <LinkCell type={item.type} value={item.link || ''} onChange={v => updTeknisRow(item.id, 'link', v)} batches={batches} />
                        </td>
                        <td className='px-2 py-1.5 w-36'>
                          <select value={item.mentorEmpId || ''} onChange={e => {
                            const emp = employees.find(em => em.id === Number(e.target.value))
                            const pos = positions.find(p => p.id === emp?.positionId)
                            patchTeknisRow(item.id, { mentorEmpId: e.target.value, mentorName: emp?.name ?? '', mentorPosition: pos?.name ?? '' })
                          }}
                            className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[130px]'>
                            <option value=''>— Pilih Mentor —</option>
                            {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                          </select>
                        </td>
                        <td className='px-2 py-1.5 w-28'>
                          <select value={item.assignedTo || 'employee'} onChange={e => updTeknisRow(item.id, 'assignedTo', e.target.value)}
                            className={`px-2 py-1 text-xs border rounded outline-none focus:border-red-400 w-full font-semibold ${assigneeBadgeCls(item.assignedTo || 'self')}`}>
                            <option value='self'>Self (Karyawan)</option>
                            <option value='manager'>Manager Langsung</option>
                            <option value='hr'>HR / Admin</option>
                            <option value='assessor'>Assessor</option>
                          </select>
                        </td>
                        <td className='px-2 py-1.5 text-center w-16'>
                          <input type='checkbox' checked={!!item.completed}
                            onChange={e => updTeknisRow(item.id, 'completed', e.target.checked)}
                            className='w-4 h-4 accent-red-600' />
                        </td>
                        <td className='px-2 py-1.5 w-9 text-center'>
                          <button onClick={() => delTeknisRow(item.id)}
                            className='text-red-400 hover:text-red-600 text-sm font-bold transition'><Icon name='close' size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Workflow Monitor ── */}
      <div className='bg-white rounded-xl shadow-sm mb-5'>
        <div className='px-6 py-4 border-b border-gray-100'>
          <h2 className='text-sm font-bold text-gray-700'><Icon name='shuffle' size={14} className='inline align-[-2px]' /> Workflow Monitor</h2>
          <p className='text-xs text-gray-400 mt-0.5'>
            TXN-{String(selected.id).padStart(6, '0')} ·{' '}
            {t('Submitted oleh','Submitted by')} {selected.submittedByName ?? '—'} ·{' '}
            {selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString('id-ID') : '—'}
          </p>
        </div>
        <div className='px-6 py-5 overflow-x-auto'>
          <div className='flex gap-3 items-start pb-2'>
            <div className='flex-shrink-0 flex items-start'>
              <div className='flex flex-col items-center bg-white border-2 border-blue-200 rounded-xl px-4 py-3 w-44 text-center shadow-sm'>
                <span className='mb-1 text-gray-500'><Icon name='upload' size={20} /></span>
                <span className='text-xs font-bold text-blue-600 mb-1'>{t('Submitted','Submitted')}</span>
                <span className='text-xs font-semibold text-gray-700 truncate w-full text-center'>
                  {selected.submittedByName ?? selected.employeeName}
                </span>
                <span className='text-xs text-gray-400 font-mono mt-0.5'>
                  {selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString('id-ID') : '—'}
                </span>
                <span className='mt-2 text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full'><Icon name='check' size={12} className='inline align-[-2px]' /> Done</span>
              </div>
              <div className='flex items-center h-32 px-2'>
                <span className='text-gray-300 text-xl'><Icon e='→' size={15} /></span>
              </div>
            </div>
            {(selected.steps || []).map((step, i) => {
              const cfg = STEP_CFG[step.status] ?? STEP_CFG.Waiting
              return (
                <div key={step.level} className='flex-shrink-0 flex items-start'>
                  <div className={`flex flex-col items-center border-2 rounded-xl px-4 py-3 w-52 text-center shadow-sm relative ${cfg.bg} ${cfg.border}`}>
                    {step.status === 'Pending' && (
                      <span className='absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping' />
                    )}
                    <span className='mb-1 text-gray-500'><Icon e={cfg.icon} size={20} /></span>
                    <span className={`text-xs font-bold mb-1 ${cfg.color}`}>Step {step.level}</span>
                    <span className='text-xs font-semibold text-gray-700'>{step.label}</span>
                    {step.approverName ? (
                      <div className='mt-2 w-full text-center'>
                        <div className='text-xs font-semibold text-gray-700'>{step.approverName}</div>
                        {step.actedAt && (
                          <div className='text-xs text-gray-400 font-mono'>
                            {new Date(step.actedAt).toLocaleDateString('id-ID')}
                          </div>
                        )}
                        {step.note && <div className='text-xs text-gray-500 mt-1 italic'>"{step.note}"</div>}
                      </div>
                    ) : step.status === 'Pending' ? (
                      <div className='text-xs text-amber-600 font-semibold mt-2'>
                        {t('Menunggu aksi…','Awaiting action…')}
                      </div>
                    ) : (
                      <div className='text-xs text-gray-400 mt-1'>—</div>
                    )}
                  </div>
                  {i < (selected.steps || []).length - 1 && (
                    <div className='flex items-center h-32 px-2'>
                      <span className='text-gray-300 text-xl'><Icon e='→' size={15} /></span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Sticky Save bar (Approved / adjustable active records) ── */}
      {(isApproved || isAdjustable) && (
        <div className='fixed bottom-0 left-60 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-8 py-4'>
          <div className='max-w-4xl mx-auto flex items-center justify-between gap-3'>
            {isAdjustable
              ? <span className='text-xs text-gray-500'>{t('Anda dapat menambah/mengurangi task teknis lalu simpan.','You can add/remove technical tasks then save.')}</span>
              : <span />}
            <div className='flex gap-3'>
              <button onClick={() => setView('list')}
                className='px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition'>
                {t('Kembali', 'Back')}
              </button>
              <button onClick={() => { persistLocalChanges(); setView('list') }}
                className='px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition flex items-center gap-2'>
                <Icon name='save' size={14} className='inline align-[-2px]' /> {t('Simpan', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky action bar ── */}
      {myTurn && (
        <div className='fixed bottom-0 left-60 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-8 py-4'>
          <div className='max-w-4xl mx-auto'>
            {!rejecting ? (
              <div className='flex items-center gap-4'>
                <div className='flex-1'>
                  <p className='text-xs text-gray-500 mb-1'>{t('Catatan (opsional)','Note (optional)')}</p>
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder={t('Tambahkan catatan…','Add a note…')}
                    className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400' />
                </div>
                <button onClick={handleApprove}
                  className='px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition flex items-center gap-2 flex-shrink-0'>
                  <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Approve','Approve')}
                </button>
                <button onClick={() => setRejecting(true)}
                  className='px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition flex items-center gap-2 flex-shrink-0'>
                  <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Reject','Reject')}
                </button>
              </div>
            ) : (
              <div className='flex items-center gap-4'>
                <div className='flex-1'>
                  <p className='text-xs text-red-500 font-semibold mb-1'>
                    {t('Alasan penolakan (wajib diisi)','Rejection reason (required)')}
                  </p>
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder={t('Tuliskan alasan penolakan…','Enter rejection reason…')}
                    className='w-full px-3 py-2 text-sm border border-red-300 rounded-lg outline-none focus:border-red-500'
                    autoFocus />
                </div>
                <button onClick={handleReject} disabled={!note.trim()}
                  className='px-6 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition flex-shrink-0'>
                  <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Konfirmasi Tolak','Confirm Reject')}
                </button>
                <button onClick={() => { setRejecting(false); setNote('') }}
                  className='px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition flex-shrink-0'>
                  {t('Batal','Cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
