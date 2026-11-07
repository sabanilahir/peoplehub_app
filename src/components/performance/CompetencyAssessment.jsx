'use client'
import { useState, useMemo, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { useAuthStore }     from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { useCompetencyStore, LEVEL_LABELS, buildIdpCompetencies } from '@/store/competencyStore'
import { useCompetencyAssessmentStore, CURRENT_PERIOD, assessmentStatus } from '@/store/competencyAssessmentStore'
import { useT } from '@/store/languageStore'

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const initials = (n) => asText(n).trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

// Two-tab grouping: "Technical" competencies are functional/technical, the rest are soft.
const isTechnical = (cat) => cat === 'Technical'
const STATUS_TINT = {
  'Not Started': 'bg-gray-100 text-gray-500', 'Self Draft': 'bg-amber-50 text-amber-700',
  'Awaiting Manager': 'bg-blue-50 text-blue-700', 'Completed': 'bg-green-50 text-green-700',
}

// Generic Key Behavior descriptors per level (fallback when the catalog has none).
const KEY_BEHAVIORS = {
  1: { id: 'Memahami konsep dasar dan menerapkannya dengan bimbingan penuh dari atasan/rekan.', en: 'Understands basic concepts and applies them with full guidance from a supervisor/peer.' },
  2: { id: 'Menjalankan tugas rutin secara mandiri untuk situasi yang umum ditemui.', en: 'Independently performs routine tasks for commonly encountered situations.' },
  3: { id: 'Menangani tugas yang kompleks dan mampu menyelesaikan masalah non-rutin secara mandiri.', en: 'Handles complex tasks and independently resolves non-routine problems.' },
  4: { id: 'Menjadi rujukan bagi rekan, membimbing orang lain, dan mengoptimalkan proses kerja.', en: 'Acts as a reference for peers, coaches others, and optimises work processes.' },
  5: { id: 'Menjadi ahli/panutan, membentuk standar, strategi, dan inovasi pada bidang ini.', en: 'Recognised expert/role model who shapes standards, strategy, and innovation in the field.' },
}

// mode: 'self' | 'manager'
export default function CompetencyAssessment({ mode = 'self' }) {
  const t = useT()
  const isManager = mode === 'manager'
  const { currentUser } = useAuthStore()
  const { employees = [] } = useEmployeeStore()
  const { positions = [], departments = [] } = useStructureStore()
  const { catalog, positionCompetencies } = useCompetencyStore()
  const { getAssessment, saveSelf, saveManager } = useCompetencyAssessmentStore()

  const posName = id => positions.find(x => x.id === Number(id))?.name || ''
  const dpName  = id => departments.find(x => x.id === Number(id))?.name || ''
  const empById = id => employees.find(e => String(e.id) === String(id))

  // Self-service target = the logged-in user only (no employee picker). Prefer a
  // matching employee record; otherwise synthesize one from the session so any
  // signed-in employee can assess their own position competencies.
  const selfEmp = useMemo(() => {
    if (isManager || !currentUser) return null
    const rec = employees.find(e =>
      String(e.id) === String(currentUser.id) ||
      (currentUser.email && e.email === currentUser.email))
    if (rec) return rec
    const pid = positions.find(p => p.name === currentUser.position)?.id ?? null
    return {
      id: currentUser.id, name: currentUser.name,
      nik: currentUser.nik || currentUser.username || '',
      positionId: pid, position: currentUser.position,
      departmentId: null, department: currentUser.dept, email: currentUser.email,
    }
  }, [isManager, employees, positions, currentUser])

  // Team members for manager (superadmin/hr see all)
  const team = useMemo(() => {
    if (!isManager) return []
    const base = currentUser?.role === 'manager'
      ? employees.filter(e => String(e.managerId) === String(currentUser?.id))
      : employees
    return base.filter(e => e.status === 'Active')
  }, [employees, currentUser, isManager])

  const [empId, setEmpId] = useState('')
  useEffect(() => {
    if (isManager) {
      // Manager POV: default to the first team member; picker lets them switch.
      if (!empId && team.length) setEmpId(String(team[0].id))
    } else {
      // Self-service: always the logged-in employee — no employee picker.
      setEmpId(selfEmp ? String(selfEmp.id) : '')
    }
  }, [team, isManager, currentUser, employees]) // eslint-disable-line

  const emp = isManager ? empById(empId) : selfEmp
  const comps = useMemo(
    () => emp ? buildIdpCompetencies(emp.positionId, catalog, positionCompetencies) : [],
    [emp, catalog, positionCompetencies])

  const saved = getAssessment(empId, CURRENT_PERIOD)
  const status = assessmentStatus(saved)

  // Local editable ratings for the active mode
  const [self, setSelf]   = useState({})
  const [mgr, setMgr]     = useState({})
  const [selfNote, setSelfNote] = useState('')
  const [mgrNote, setMgrNote]   = useState('')
  const [msg, setMsg] = useState(null)
  const [tab, setTab] = useState('soft')          // 'soft' | 'technical'
  const [behaviorFor, setBehaviorFor] = useState(null)   // competency object for the Key Behavior modal
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  useEffect(() => {
    setSelf(saved?.selfRatings || {})
    setMgr(saved?.managerRatings || {})
    setSelfNote(saved?.selfNote || '')
    setMgrNote(saved?.managerNote || '')
  }, [empId]) // eslint-disable-line

  const ratings = isManager ? mgr : self
  const setRating = (cid, lvl) => {
    const upd = { ...ratings, [cid]: lvl }
    if (isManager) setMgr(upd); else setSelf(upd)
  }
  const readOnlySelf = saved?.selfRatings || {}

  // Split competencies into the two tabs.
  const soft = useMemo(() => comps.filter(c => !isTechnical(c.category)), [comps])
  const tech = useMemo(() => comps.filter(c => isTechnical(c.category)), [comps])
  const activeList = tab === 'technical' ? tech : soft

  // Stats over the whole assessment (both tabs).
  const stats = useMemo(() => {
    const rated = comps.filter(c => ratings[c.competencyId] != null)
    const avg = rated.length ? rated.reduce((n, c) => n + ratings[c.competencyId], 0) / rated.length : 0
    const expAvg = comps.length ? comps.reduce((n, c) => n + c.expected, 0) / comps.length : 0
    const gaps = comps.filter(c => (ratings[c.competencyId] ?? 0) < c.expected).length
    return {
      done: rated.length, total: comps.length,
      avg: Math.round(avg * 10) / 10, expAvg: Math.round(expAvg * 10) / 10, gaps,
    }
  }, [comps, ratings])

  const handleSave = (submit) => {
    if (!empId) return flash(t('Pilih karyawan.', 'Select an employee.'), 'error')
    if (submit && stats.done < stats.total) return flash(t('Nilai semua kompetensi sebelum submit.', 'Rate all competencies before submitting.'), 'error')
    if (isManager) saveManager(empId, CURRENT_PERIOD, { ratings: mgr, note: mgrNote, submit, by: currentUser?.name })
    else saveSelf(empId, CURRENT_PERIOD, { ratings: self, note: selfNote, submit })
    flash(submit ? t('Assessment dikirim.', 'Assessment submitted.') : t('Draft disimpan.', 'Draft saved.'))
  }

  const locked = isManager ? !!saved?.managerSubmittedAt : !!saved?.selfSubmittedAt
  const colLabel = isManager ? t('Penilaian Akhir (Atasan)', 'Final (Manager)') : t('Self Assessment', 'Self Assessment')
  // Manager view adds a read-only "employee self score" column before the final score.
  // Full literal classes so Tailwind's JIT scanner emits them.
  const gridCls = isManager
    ? 'sm:grid-cols-[1fr_120px_120px_150px_120px]'
    : 'sm:grid-cols-[1fr_140px_170px_130px]'

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-5xl mx-auto px-6 py-8'>
        {/* Header */}
        <div className='flex items-start justify-between gap-3 flex-wrap'>
          <div>
            <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full'>
              <Icon name='shield' size={13} /> {isManager ? t('Manager Portal', 'Manager Portal') : t('Employee Self-Service', 'Employee Self-Service')}
            </span>
            <h1 className='text-2xl font-bold text-gray-900 mt-2'>{t('Individual Competency Assessment', 'Individual Competency Assessment')}</h1>
            <p className='text-gray-500 mt-1'>
              {isManager
                ? t('Nilai kompetensi anggota tim berdasarkan kemampuannya saat ini.', "Assess your team member's competencies based on their current ability.")
                : t('Nilai diri Anda berdasarkan kompetensi yang dimiliki saat ini.', 'Rate yourself based on the competencies you currently possess.')}
            </p>
          </div>
          <span className='text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg'>{t('Periode', 'Cycle')}: {CURRENT_PERIOD}</span>
        </div>

        {/* Employee card + picker */}
        <div className='mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-4'>
          <div className='w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white' style={{ background: 'linear-gradient(135deg,#4F46E5,#2563EB)' }}>{initials(emp?.name)}</div>
          <div className='min-w-0'>
            <p className='font-bold text-gray-900 truncate'>{emp?.name || t('Belum ada karyawan dipilih', 'No employee selected')}</p>
            <p className='text-xs text-gray-500 truncate'>{emp ? `${asText(emp.nik)} · ${posName(emp.positionId) || emp.position || '—'} · ${dpName(emp.departmentId) || emp.department || '—'}` : '—'}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_TINT[status]}`}>{status}</span>
          {/* Employee picker only in manager POV (assessing subordinates). */}
          {isManager && team.length > 1 && (
            <select value={empId} onChange={e => setEmpId(e.target.value)}
              className='ml-auto min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-500 bg-white'>
              {team.map(e => <option key={e.id} value={e.id}>{e.name} — {posName(e.positionId) || e.position || '—'}</option>)}
            </select>
          )}
        </div>

        {comps.length === 0 ? (
          <div className='mt-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700'>
            {t('Posisi ini belum memiliki profil kompetensi. Atur di Competency Catalog / Position Profile.', 'This position has no competency profile yet. Configure it in the Competency Catalog / Position Profile.')}
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className='mt-6 flex items-center gap-6 border-b border-gray-200'>
              <TabButton active={tab === 'soft'} onClick={() => setTab('soft')} count={soft.length}>
                {t('Soft Competencies', 'Soft Competencies')}
              </TabButton>
              <TabButton active={tab === 'technical'} onClick={() => setTab('technical')} count={tech.length}>
                {t('Functional Technical Competencies', 'Functional Technical Competencies')}
              </TabButton>
            </div>

            {/* Info banner */}
            <div className='mt-5 flex items-start gap-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl px-5 py-4'>
              <span className='mt-0.5 text-indigo-500 flex-shrink-0'><Icon name='info' size={18} /></span>
              <p className='text-sm text-gray-600 leading-relaxed'>
                {t('Pilih level yang paling menggambarkan kemampuan Anda saat ini untuk setiap kompetensi.', 'Select the level that best describes your current ability for each competency.')}
                <br />
                {t('Klik ikon (i) untuk melihat Key Behavior pada setiap level.', 'Click the (i) icon to view the Key Behaviors for each level.')}
              </p>
            </div>

            {/* Assessment table */}
            <div className='mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
              {/* Column head */}
              <div className={`hidden sm:grid ${gridCls} gap-4 px-6 py-4 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide`}>
                <div>{t('Kompetensi', 'Competency')}</div>
                <div className='text-center'>{t('Target (JCP)', 'Target (JCP)')}</div>
                {isManager && <div className='text-center'>{t('Nilai Karyawan', 'Employee Score')}<span className='block text-[10px] font-medium text-gray-400 normal-case'>{t('Self Assessment', 'Self Assessment')}</span></div>}
                <div className='text-center'>{colLabel}<span className='block text-[10px] font-medium text-gray-400 normal-case'>{t('Pilih Level', 'Select Level')}</span></div>
                <div className='text-center'>{t('Gap', 'Gap')}</div>
              </div>

              {activeList.length === 0 ? (
                <div className='px-6 py-10 text-center text-sm text-gray-400'>
                  {t('Tidak ada kompetensi pada kategori ini.', 'No competencies in this category.')}
                </div>
              ) : (
                <div className='divide-y divide-gray-50'>
                  {activeList.map(c => (
                    <CompetencyRow key={c.competencyId} t={t} c={c} gridCls={gridCls}
                      rating={ratings[c.competencyId]} onRate={v => setRating(c.competencyId, v)}
                      readOnly={locked} isManager={isManager}
                      onInfo={() => setBehaviorFor(c)}
                      selfRef={isManager ? readOnlySelf[c.competencyId] : null} />
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className='mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4'>
              <Stat label={t('Rata-rata Nilai', 'Average Score')} value={stats.avg || '—'} tint='indigo' />
              <Stat label={t('Rata-rata Target', 'Target Avg')} value={stats.expAvg || '—'} tint='gray' />
              <Stat label={t('Gap (di bawah target)', 'Gaps (below target)')} value={stats.gaps} tint={stats.gaps ? 'red' : 'green'} />
              <Stat label={t('Terisi', 'Rated')} value={`${stats.done}/${stats.total}`} tint='blue' />
            </div>

            {/* Note */}
            <div className='mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
              <p className='text-sm font-semibold text-gray-800 mb-1.5'>{isManager ? t('Catatan Manager', 'Manager Note') : t('Catatan / Refleksi', 'Note / Reflection')}</p>
              <textarea rows={3} disabled={locked}
                value={isManager ? mgrNote : selfNote}
                onChange={e => isManager ? setMgrNote(e.target.value) : setSelfNote(e.target.value)}
                placeholder={t('Tuliskan catatan pengembangan, kekuatan, dan area perbaikan…', 'Notes on development, strengths, and areas for improvement…')}
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-y disabled:bg-gray-50' />
              {isManager && saved?.selfNote && (
                <div className='mt-3 bg-blue-50 rounded-xl px-4 py-3'>
                  <p className='text-xs font-semibold text-blue-600'>{t('Catatan Self-Assessment', 'Self-Assessment Note')}</p>
                  <p className='text-sm text-gray-700 mt-0.5'>{saved.selfNote}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className='mt-5 flex items-center justify-end gap-3'>
              {locked ? (
                <span className='text-sm text-green-600 font-semibold flex items-center gap-1.5'><Icon name='check' size={16} /> {t('Sudah dikirim', 'Submitted')}</span>
              ) : (
                <>
                  <button onClick={() => handleSave(false)} className='px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50'>{t('Simpan Draft', 'Save Draft')}</button>
                  <button onClick={() => handleSave(true)} className='px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow hover:shadow-md'>{t('Submit Assessment', 'Submit Assessment')}</button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Key Behavior modal */}
      {behaviorFor && (
        <KeyBehaviorModal t={t} c={behaviorFor} onClose={() => setBehaviorFor(null)} />
      )}

      {msg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>{msg.text}</div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, count, children }) {
  return (
    <button onClick={onClick}
      className={`relative -mb-px pb-3 pt-1 text-sm font-semibold transition ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
      <span className='inline-flex items-center gap-1.5'>
        {children}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
      </span>
      {active && <span className='absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-600 rounded-full' />}
    </button>
  )
}

function Stars({ level, max = 5 }) {
  return (
    <div className='flex items-center justify-center gap-0.5'>
      {Array.from({ length: max }).map((_, i) => {
        const on = i < level
        return (
          <svg key={i} width={15} height={15} viewBox='0 0 24 24'
            fill={on ? '#F59E0B' : 'none'} stroke={on ? '#F59E0B' : '#D1D5DB'} strokeWidth={1.5}
            strokeLinecap='round' strokeLinejoin='round'>
            <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
          </svg>
        )
      })}
    </div>
  )
}

// Gap descriptor: below target → develop, on target → meets, above → exceeds.
function gapMeta(gap, t) {
  if (gap < 0)  return { box: 'bg-red-50 text-red-600',    label: t('Needs Development', 'Needs Development'),  labelCls: 'text-red-600' }
  if (gap === 0) return { box: 'bg-amber-50 text-amber-600', label: t('Meets Expectation', 'Meets Expectation'), labelCls: 'text-amber-600' }
  return { box: 'bg-green-50 text-green-600', label: t('Exceeds Expectation', 'Exceeds Expectation'), labelCls: 'text-green-600' }
}

function Stat({ label, value, tint }) {
  const T = { indigo: 'text-indigo-600', gray: 'text-gray-600', red: 'text-red-600', green: 'text-green-600', blue: 'text-blue-600' }
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3'>
      <p className='text-[11px] text-gray-400'>{label}</p>
      <p className={`text-2xl font-bold ${T[tint] || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function CompetencyRow({ t, c, gridCls, rating, onRate, readOnly, isManager, onInfo, selfRef }) {
  const rated = rating != null
  // Final score = manager's input in manager mode, employee's own in self mode.
  const gap = (rating ?? c.expected) - c.expected
  const meta = gapMeta(gap, t)

  return (
    <div className={`grid grid-cols-1 ${gridCls} gap-3 sm:gap-4 sm:items-center px-6 py-5`}>
      {/* Competency */}
      <div className='min-w-0'>
        <div className='flex items-center gap-1.5'>
          <p className='font-bold text-gray-900 text-sm'>{c.name}</p>
          <button type='button' onClick={onInfo} title={t('Lihat Key Behavior', 'View Key Behaviors')}
            className='text-indigo-400 hover:text-indigo-600 transition flex-shrink-0'>
            <Icon name='info' size={15} />
          </button>
        </div>
        {c.description && <p className='text-xs text-gray-400 mt-0.5'>{c.description}</p>}
      </div>

      {/* Target (JCP) */}
      <div className='flex sm:flex-col items-center gap-1.5 sm:gap-1'>
        <span className='sm:hidden text-xs text-gray-400 w-24'>{t('Target (JCP)', 'Target (JCP)')}</span>
        <p className='font-bold text-gray-900 text-sm'>Lv. {c.expected}</p>
        <Stars level={c.expected} />
      </div>

      {/* Employee self score (manager view only) */}
      {isManager && (
        <div className='flex sm:flex-col items-center gap-1.5 sm:gap-1'>
          <span className='sm:hidden text-xs text-gray-400 w-24'>{t('Nilai Karyawan', 'Employee Score')}</span>
          {selfRef != null ? (
            <span className='inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-sm font-bold bg-blue-50 text-blue-700'>Lv. {selfRef}</span>
          ) : (
            <span className='text-xs text-gray-300'>{t('Belum diisi', 'Not filled')}</span>
          )}
        </div>
      )}

      {/* Self / Manager (final) assessment */}
      <div className='flex items-center gap-2 sm:justify-center'>
        <span className='sm:hidden text-xs text-gray-400 w-24 flex-shrink-0'>{isManager ? t('Penilaian Akhir', 'Final') : t('Self Assessment', 'Self Assessment')}</span>
        <div className='relative w-full sm:w-[130px]'>
          <select value={rating ?? ''} disabled={readOnly} onChange={e => onRate(Number(e.target.value))}
            className={`w-full appearance-none px-3 py-2 pr-8 rounded-lg text-sm font-medium outline-none bg-white border transition
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${rated ? 'border-indigo-400 text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' : 'border-gray-200 text-gray-400'}`}>
            <option value='' disabled>{t('Pilih Level', 'Select Level')}</option>
            {[1, 2, 3, 4, 5].map(lv => <option key={lv} value={lv}>Lv. {lv}</option>)}
          </select>
          <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
            <Icon name='arrowDown' size={14} />
          </span>
        </div>
      </div>

      {/* Gap */}
      <div className='flex sm:flex-col items-center gap-2 sm:gap-1'>
        {rated ? (
          <>
            <span className={`inline-flex items-center justify-center min-w-[44px] px-2.5 py-1.5 rounded-lg text-lg font-bold ${meta.box}`}>
              {gap > 0 ? `+${gap}` : gap}
            </span>
            <span className={`text-[11px] font-semibold text-center leading-tight ${meta.labelCls}`}>{meta.label}</span>
          </>
        ) : (
          <span className='text-xs text-gray-300'>—</span>
        )}
      </div>
    </div>
  )
}

function KeyBehaviorModal({ t, c, onClose }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40' onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
        <div className='flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100'>
          <div>
            <p className='text-xs font-semibold text-indigo-600'>{t('Key Behavior', 'Key Behaviors')}</p>
            <h3 className='text-lg font-bold text-gray-900 mt-0.5'>{c.name}</h3>
            {c.description && <p className='text-sm text-gray-500 mt-0.5'>{c.description}</p>}
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 flex-shrink-0'><Icon name='close' size={20} /></button>
        </div>
        <div className='px-6 py-5 space-y-3'>
          {[1, 2, 3, 4, 5].map(lv => {
            const kb = KEY_BEHAVIORS[lv]
            const isTarget = lv === c.expected
            return (
              <div key={lv} className={`flex gap-3 rounded-xl border px-4 py-3 ${isTarget ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100'}`}>
                <div className='flex-shrink-0'>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isTarget ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{lv}</div>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-bold text-gray-800'>{t('Level', 'Level')} {lv} · {LEVEL_LABELS[lv]}</p>
                    {isTarget && <span className='text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full'>{t('Target', 'Target')}</span>}
                  </div>
                  <p className='text-sm text-gray-600 mt-0.5 leading-relaxed'>{t(kb.id, kb.en)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
