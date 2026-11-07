'use client'
import Icon from '@/components/ui/Icon'
import React, { useState, useEffect }   from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore }          from '@/store/authStore'
import { useEmployeeStore }      from '@/store/employeeStore'
import { useWorkflowStore }      from '@/store/workflowStore'
import { useOnboardingStore }    from '@/store/onboardingStore'
import { useMasterOnboardingStore } from '@/store/masterOnboardingStore'
import { useMasterFormStore }       from '@/store/masterFormStore'
import { ruleMatchesEmployee, buildOnboardingFromRule } from '@/store/onboardingAutoAssign'
import { useOnboardingRulesStore } from '@/store/onboardingRulesStore'
import { useStructureStore }     from '@/store/structureStore'
import { useCourseBatchStore }   from '@/store/courseBatchStore'
import { useT }                  from '@/store/languageStore'
import { PageHeader, StatCard, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton, EmptyState, BRAND_GRADIENT } from '@/components/ui'
import { assigneeLabel, assigneeBadgeCls } from '@/utils/assigneeUtils'
import { frequencyLabel, DEFAULT_FREQUENCY } from '@/utils/reviewCadence'
import { TYPE_LOV, linkModeFor } from '@/utils/onboardingItemTypes'
import { exportCsv } from '@/utils/exportCsv'
import FormPickerPanel from '@/components/onboarding/FormPickerPanel'
import TechnicalMatrix from '@/components/onboarding/TechnicalMatrix'

// ── Evaluator Picker ──────────────────────────────────────────────────────────
function EvaluatorPicker({ evaluators = [], employees = [], onChange }) {
  const FIXED = [
    { id: 'manager', label: 'Direct Manager' },
    { id: 'self',    label: 'Karyawan Sendiri' },
  ]
  const toggle = (opt) => {
    const exists = evaluators.some(e => e.id === opt.id)
    onChange(exists ? evaluators.filter(e => e.id !== opt.id) : [...evaluators, opt])
  }
  return (
    <div className='space-y-1 min-w-[180px]'>
      <div className='flex flex-wrap gap-1'>
        {FIXED.map(opt => {
          const sel = evaluators.some(e => e.id === opt.id)
          return (
            <button key={opt.id} type='button' onClick={() => toggle(opt)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition
                ${sel ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'}`}>
              {opt.label}
            </button>
          )
        })}
        <select defaultValue='' onChange={e => {
          if (!e.target.value) return
          const emp = employees.find(em => String(em.id) === e.target.value)
          if (!emp) return
          const opt = { id: `emp:${emp.id}`, label: emp.name }
          if (!evaluators.some(x => x.id === opt.id)) onChange([...evaluators, opt])
          e.target.value = ''
        }} className='px-1.5 py-0.5 text-[10px] border border-gray-200 rounded outline-none bg-white'>
          <option value=''>+ Karyawan…</option>
          {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
        </select>
      </div>
      {evaluators.length > 0 && (
        <div className='flex flex-wrap gap-1 mt-0.5'>
          {evaluators.map(e => (
            <span key={e.id} className='flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-red-50 text-red-700 rounded-full border border-red-100'>
              {e.label}
              <button type='button' onClick={() => onChange(evaluators.filter(x => x.id !== e.id))} className='ml-0.5 font-bold text-red-400 hover:text-red-600'>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const PROBATION_OPTIONS = ['0', '3', '6', '12']
const EMPLOYMENT_STATUS = ['New Hire', 'Existing Employee']

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


function calcDateFromHplus(joinDate, hplus) {
  if (!joinDate || hplus === '' || hplus === null || hplus === undefined) return ''
  const n = parseInt(hplus, 10)
  if (isNaN(n) || n < 0) return ''
  const d = new Date(joinDate)
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function calcHplusFromDate(joinDate, date) {
  if (!joinDate || !date) return ''
  const j = new Date(joinDate), d = new Date(date)
  if (isNaN(j.getTime()) || isNaN(d.getTime())) return ''
  return String(Math.round((d - j) / 86400000))
}

function HplusCell({ joinDate, date, onChange, disabled }) {
  const hplus = calcHplusFromDate(joinDate, date)
  const actualDate = date ? new Date(date).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : ''
  return (
    <div className='min-w-[90px]'>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] font-bold text-red-600 flex-shrink-0'>H+</span>
        <input
          type='number'
          min='0'
          value={hplus}
          disabled={disabled}
          onChange={e => {
            const newDate = calcDateFromHplus(joinDate, e.target.value)
            onChange(newDate)
          }}
          placeholder='0'
          className={`w-14 px-1.5 py-0.5 text-xs rounded outline-none text-center
            ${disabled ? 'border-0 bg-transparent text-gray-700 cursor-default' : 'border border-gray-200 focus:border-red-400 bg-white'}`}
        />
      </div>
      {actualDate && <div className='text-[10px] text-gray-400 mt-0.5 leading-tight'>{actualDate}</div>}
    </div>
  )
}

const STATUS_BADGE = {
  Draft:       'bg-gray-100 text-gray-600',
  Preparation: 'bg-indigo-100 text-indigo-700',
  Active:      'bg-blue-100 text-blue-700',
  Pending:     'bg-yellow-100 text-yellow-700',
  Approved:    'bg-green-100 text-green-700',
  Rejected:    'bg-red-100 text-red-700',
}

const calcProgress = (ob) => {
  let total = 0, done = 0
  ;(ob.mainSections ?? []).forEach(ms => {
    ;(ms.items ?? []).forEach(item => { total++; if (item.completed) done++ })
    ;(ms.sections ?? []).forEach(sec => {
      ;(sec.items ?? []).forEach(item => { total++; if (item.completed) done++ })
    })
  })
  ;(ob.generalItems ?? []).forEach(item => { total++; if (item.completed) done++ })
  ;(ob.technicalItems ?? []).forEach(item => { total++; if (item.completed) done++ })
  return { total, done }
}

const isOverdue = (item) => {
  if (item.completed || !item.date) return false
  return new Date(item.date) < new Date(new Date().toDateString())
}

function toDateInput(val) {
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = new Date(val)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function InputCell({ value, onChange, placeholder = '', className = '', disabled = false, type = 'text' }) {
  const inputValue = type === 'date' ? toDateInput(value) : value
  return (
    <input
      type={type}
      value={inputValue}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-2 py-1 text-xs rounded outline-none
        ${disabled
          ? 'border-0 bg-transparent text-gray-700 cursor-default'
          : 'border border-gray-200 focus:border-red-400 bg-white'} ${className}`}
    />
  )
}

const EMPTY_FORM = {
  employeeId: '', employeeName: '', department: '',
  supervisorName: '', supervisorPosition: '',
  employmentStatus: '', probationPeriod: '',
  joinDate: '', probationEndDate: '', nik: '', contractNo: '',
  mainSections: [],
  reviewItems: null,
  hasilInductionChecked: false,
  buddyAssignment: { ...BLANK_BUDDY },
}

function migrateOnboarding(ob) {
  const copy = JSON.parse(JSON.stringify(ob))
  if (!copy.mainSections) {
    copy.mainSections = []
    if ((copy.generalItems ?? []).length > 0 || (copy.generalSections ?? []).length > 0) {
      copy.mainSections.push({
        id: 'ms_general', type: 'Onboarding General',
        sections: copy.generalSections ?? [],
        items:    copy.generalItems   ?? [],
      })
    }
    if ((copy.technicalItems ?? []).length > 0 || (copy.technicalSections ?? []).length > 0) {
      copy.mainSections.push({
        id: 'ms_technical', type: 'Onboarding Teknis',
        sections: copy.technicalSections ?? [],
        items:    copy.technicalItems    ?? [],
      })
    }
  }
  if (copy.reviewItems === undefined) copy.reviewItems = null
  // old format: reviewItems was [] (empty array) → treat as null (not added)
  if (Array.isArray(copy.reviewItems) && copy.reviewItems.length === 0 && !copy._hadReviewItems)
    copy.reviewItems = null
  return copy
}

export default function OnboardingTrackerPage() {
  const t                                           = useT()
  const router                                      = useRouter()
  const { currentUser }                             = useAuthStore()
  const { employees }                               = useEmployeeStore()
  const { positions, departments, companies }        = useStructureStore()
  const { getLevelsForPage }                        = useWorkflowStore()
  const { onboardings, addOnboarding, updateOnboarding,
          deleteOnboarding, submitOnboarding,
          activateOnboarding }                       = useOnboardingStore()

  const { templates }  = useMasterOnboardingStore()
  const { rules }      = useOnboardingRulesStore()
  const { forms: masterForms } = useMasterFormStore()
  const { batches }    = useCourseBatchStore()

  const [view,       setView      ] = useState('list')
  const [editId,     setEditId    ] = useState(null)
  const [viewOnly,   setViewOnly  ] = useState(false)
  const [msg,        setMsg       ] = useState(null)
  const [delId,      setDelId     ] = useState(null)
  const [perTypeTplId,   setPerTypeTplId ] = useState({})
  const [form,           setForm         ] = useState(null)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  const [autoAssignRows, setAutoAssignRows] = useState([])

  // Improvement 3 — Bulk Actions
  const [selected, setSelected] = useState(new Set())

  // Improvement 5 — Unsaved changes guard
  const [isDirty,          setIsDirty         ] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3500)
  }

  // Improvement 2 — date formatter
  const fmtDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    if (isNaN(dt)) return '—'
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const openNew = () => {
    setEditId(null)
    setForm(JSON.parse(JSON.stringify(EMPTY_FORM)))
    setIsDirty(false)
    setView('form')
  }

  const openEdit = (ob) => {
    setEditId(ob.id)
    setForm(migrateOnboarding(ob))
    setViewOnly(false)
    setIsDirty(false)
    setView('form')
  }

  const resolveDirectManager = (reviewItems, supervisor) =>
    (reviewItems ?? []).map(item =>
      item.isDirectManager
        ? { ...item,
            reviewerEmpId:    String(supervisor?.id ?? ''),
            reviewerName:     supervisor?.name ?? 'Direct Manager',
            reviewerPosition: positions.find(p => p.id === supervisor?.positionId)?.name ?? '',
          }
        : item
    )

  const handleGenerateByType = (type) => {
    const tplId = perTypeTplId[type]
    if (!tplId) return
    const tpl = templates.find(t => String(t.id) === String(tplId))
    if (!tpl) return
    const _uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const addRuntime = (item) => {
      const joinDate = form?.joinDate
      let date = ''
      if (joinDate && item.dueDate != null && item.dueDate !== '') {
        const d = new Date(joinDate)
        d.setDate(d.getDate() + Number(item.dueDate))
        date = d.toISOString().slice(0, 10)
      }
      return { ...item, id: _uid(), date, completed: false }
    }

    if (type === 'Evaluasi Berkala') {
      const rawReview = (tpl.reviewItems ?? []).map(addRuntime)
      if (rawReview.length === 0) return
      setForm(f => {
        if (f.reviewItems !== null) return f
        const currentEmp = employees.find(e => e.id === Number(f.employeeId))
        const supervisor  = currentEmp ? employees.find(e => e.id === currentEmp.managerId) : null
        return { ...f, reviewItems: resolveDirectManager(rawReview, supervisor) }
      })
    } else {
      let ms = (tpl.mainSections ?? []).find(s => s.type === type)
      // Old format fallback
      if (!ms) {
        if (type === 'Onboarding General' && (tpl.generalItems ?? []).length > 0)
          ms = { type, sections: tpl.generalSections ?? [], items: tpl.generalItems ?? [] }
        else if (type === 'Onboarding Teknis' && (tpl.technicalItems ?? []).length > 0)
          ms = { type, sections: tpl.technicalSections ?? [], items: tpl.technicalItems ?? [] }
      }
      if (!ms) return
      const newSection = {
        ...ms,
        id:       `ms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        sections: (ms.sections ?? []).map(s => ({ ...s })),
        items:    (ms.items    ?? []).map(addRuntime),
      }
      setForm(f => ({ ...f, mainSections: [...(f.mainSections ?? []), newSection] }))
    }
    setPerTypeTplId(prev => ({ ...prev, [type]: '' }))
  }

  const openAutoAssign = () => {
    // Single source of truth: the rules configured on the Auto Assign Onboarding
    // page. The first active rule that matches an employee wins (rule order =
    // priority) — the same engine used when a new hire is added.
    const activeRules = (rules || []).filter(r => r.active)
    if (activeRules.length === 0) {
      flash(t('Belum ada rule auto-assign aktif. Atur di halaman Auto Assign Onboarding.', 'No active auto-assign rules. Set them up on the Auto Assign Onboarding page.'), 'error')
      return
    }
    const assignedEmpIds = new Set(onboardings.map(o => Number(o.employeeId)))
    const candidates = employees.filter(e =>
      e.status === 'Active' && !assignedEmpIds.has(e.id)
    )
    const rows = candidates.map(emp => {
      const dept = departments.find(d => d.id === emp.departmentId)
      const rule = activeRules.find(r => ruleMatchesEmployee(r, emp)) || null
      return { emp, dept, rule, template: rule ? { name: rule.name } : null }
    }).filter(r => r.rule !== null)
    setAutoAssignRows(rows)
    setAutoAssignOpen(true)
  }

  const runAutoAssign = () => {
    let count = 0
    autoAssignRows.forEach(({ emp, rule }) => {
      addOnboarding(buildOnboardingFromRule(rule, emp, employees))
      count++
    })
    setAutoAssignOpen(false)
    setAutoAssignRows([])
    flash(t(`${count} onboarding berhasil dibuat secara otomatis.`, `${count} onboarding records created automatically.`))
  }

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e.id === Number(empId))
    if (!emp) {
      setForm(f => ({ ...f, employeeId: empId, employeeName: '' }))
      return
    }
    const supervisor = employees.find(e => e.id === emp.managerId)
    setForm(f => ({
      ...f,
      employeeId:   emp.id,
      employeeName: emp.name,
      reviewItems:  f.reviewItems !== null ? resolveDirectManager(f.reviewItems, supervisor) : null,
    }))
  }

  const setField = (key, val) => { setIsDirty(true); setForm(f => {
    const updated = { ...f, [key]: val }
    if (key === 'joinDate' || key === 'probationPeriod') {
      const jd = key === 'joinDate' ? val : f.joinDate
      const mp = key === 'probationPeriod' ? val : f.probationPeriod
      if (jd && mp) {
        const d = new Date(jd)
        d.setMonth(d.getMonth() + Number(mp))
        updated.probationEndDate = isNaN(d.getTime()) ? f.probationEndDate : d.toISOString().slice(0, 10)
      }
    }
    return updated
  }) }

  // ── Main Section item helpers ─────────────────────────────────────────────
  const updateMsItem = (msId, itemId, key, val) =>
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, items: ms.items.map(i => i.id === itemId ? { ...i, [key]: val } : i) }) }))
  const addMsItem = (msId, category) => {
    const _uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, items: [...ms.items, { id: _uid(), module: '', type: '', link: '',
          description: '', mandatory: true,
          date: '', dueDate: '', mentorName: '', mentorPosition: '', mentorEmpId: '', completed: false,
          // Technical induction/training matrix fields (Zona 3)
          docCode: '', kategoriBagian: '', tipe: 'Initial', parafTrainer: false, parafKaryawan: false, nilai: '', kesimpulan: '',
          assignedTo: 'employee', category }] }) }))
  }
  const delMsItem = (msId, itemId) =>
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, items: ms.items.filter(i => i.id !== itemId) }) }))
  const patchMsItem = (msId, itemId, patch) =>
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, items: ms.items.map(i => i.id === itemId ? { ...i, ...patch } : i) }) }))
  const addMsSection = (msId) =>
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, sections: [...ms.sections, { id: `sec_${Date.now()}`, label: '', labelEN: '', colorIdx: ms.sections.length % 6 }] }) }))
  const delMsSection = (msId, secId) =>
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, sections: ms.sections.filter(s => s.id !== secId), items: ms.items.filter(i => i.category !== secId) }) }))
  const updMsSection = (msId, secId, val) =>
    setForm(f => ({ ...f, mainSections: f.mainSections.map(ms => ms.id !== msId ? ms :
      { ...ms, sections: ms.sections.map(s => s.id === secId ? { ...s, label: val } : s) }) }))

  // ── Periodic Review helpers ───────────────────────────────────────────────
  const updateReview = (itemId, key, val) =>
    setForm(f => ({ ...f, reviewItems: (f.reviewItems ?? []).map(i => i.id === itemId ? { ...i, [key]: val } : i) }))
  const patchReview = (itemId, patch) =>
    setForm(f => ({ ...f, reviewItems: (f.reviewItems ?? []).map(i => i.id === itemId ? { ...i, ...patch } : i) }))
  const addReviewItem = () => {
    const _uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    setForm(f => ({ ...f, reviewItems: [...(f.reviewItems ?? []), { id: _uid(), agenda: '', type: '', date: '', reviewerEmpId: '', reviewerName: '', reviewerPosition: '', completed: false }] }))
  }
  const delReviewItem = (itemId) =>
    setForm(f => ({ ...f, reviewItems: (f.reviewItems ?? []).filter(i => i.id !== itemId) }))

  // ── Buddy helper ─────────────────────────────────────────────────────────
  const patchBuddy = (patch) =>
    setForm(f => {
      const prev   = f.buddyAssignment ?? BLANK_BUDDY
      const merged = { ...prev, ...patch }
      return { ...f, buddyAssignment: merged }
    })

  const handleSaveDraft = () => {
    if (!form.employeeId) return flash(t('Pilih karyawan terlebih dahulu', 'Please select an employee'), 'error')
    if (editId) {
      updateOnboarding(editId, { ...form })
      flash(t('Draft berhasil disimpan', 'Draft saved'))
    } else {
      addOnboarding({ ...form })
      flash(t('Onboarding baru dibuat', 'New onboarding created'))
    }
    setIsDirty(false)
    setView('list')
  }

  const handleSubmit = () => {
    if (!form.employeeId) return flash(t('Pilih karyawan terlebih dahulu', 'Please select an employee'), 'error')
    const levels = getLevelsForPage('Employee Onboarding')
    if (editId) {
      updateOnboarding(editId, { ...form })
      submitOnboarding(editId, currentUser, levels)
      flash(t('Berhasil disubmit untuk approval', 'Submitted for approval'))
      setIsDirty(false)
      setView('list')
    } else {
      // Add then immediately submit using the id returned by the store action
      const newId = addOnboarding({ ...form })
      if (newId) {
        submitOnboarding(newId, currentUser, levels)
        flash(t('Berhasil disubmit untuk approval', 'Submitted for approval'))
      } else {
        flash(t('Gagal membuat onboarding', 'Failed to create onboarding'), 'error')
      }
      setIsDirty(false)
      setView('list')
    }
  }

  const handleSubmitExisting = (ob) => {
    if (ob.workflowStatus !== 'Draft') return
    const levels = getLevelsForPage('Employee Onboarding')
    submitOnboarding(ob.id, currentUser, levels)
    flash(t('Berhasil disubmit untuk approval', 'Submitted for approval'))
  }

  // Improvement 3 — Bulk submit
  const handleBulkSubmit = () => {
    const levels = getLevelsForPage('Employee Onboarding')
    let count = 0
    selected.forEach(id => {
      const ob = onboardings.find(o => o.id === id)
      if (ob && (ob.workflowStatus === 'Preparation' || ob.workflowStatus === 'Draft')) {
        submitOnboarding(ob.id, currentUser, levels)
        count++
      }
    })
    setSelected(new Set())
    flash(t(`${count} onboarding disubmit.`, `${count} onboarding(s) submitted.`))
  }

  const confirmDelete = () => {
    const id = delId
    setDelId(null)
    deleteOnboarding(id)
    flash(t('Data onboarding dihapus', 'Onboarding record deleted'))
  }

  // Auto-activate: move to useEffect to avoid side-effects during render
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    onboardings.forEach(ob => {
      if (ob.workflowStatus !== 'Preparation') return
      const emp = employees.find(e => e.id === Number(ob.employeeId))
      if (emp?.joinDate && String(emp.joinDate).slice(0, 10) <= today) {
        activateOnboarding(ob.id, null, 'System (Auto)')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardings.map(o => o.id + o.workflowStatus).join(',')])

  // ── FORM VIEW ─────────────────────────────────────────────────────────────
  if (view === 'form' && form) {
    const savedStatus   = editId ? (onboardings.find(o => o.id === editId)?.workflowStatus ?? 'Draft') : 'Draft'
    const rejectedStep  = savedStatus === 'Rejected'
      ? (onboardings.find(o => o.id === editId)?.steps ?? []).find(s => s.status === 'Rejected')
      : null
    // HRBP may edit the onboarding agenda in ANY status (Draft / Pending / Approved).
    // The form is only locked when explicitly opened in view-only mode.
    const isReadOnly    = viewOnly
    const showCompleted = viewOnly && (savedStatus === 'Approved' || savedStatus === 'Completed')
    const colSpanMain   = 9
    const colSpanRev    = 7
    // Shared field styles for the header form
    const hdrLbl = 'block text-[11px] font-semibold text-gray-500 mb-1'
    const hdrFld = 'w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition disabled:bg-gray-50 disabled:text-gray-500'

    const SEC_COLORS = [
      'bg-blue-50 text-blue-700 border-blue-400',
      'bg-red-50 text-red-700 border-red-400',
      'bg-amber-50 text-amber-700 border-amber-400',
      'bg-green-50 text-green-700 border-green-400',
      'bg-rose-50 text-rose-700 border-rose-400',
      'bg-teal-50 text-teal-700 border-teal-400',
    ]

    // Improvement 4 — Status Timeline
    const STAGES = [
      t('Persiapan', 'Preparation'),
      t('Pending Approval', 'Pending Approval'),
      t('Aktif', 'Active'),
      t('Selesai', 'Completed'),
    ]
    const stageIdx = (status) => {
      if (['Preparation', 'Draft'].includes(status)) return 0
      if (status === 'Pending') return 1
      if (['Active', 'Approved'].includes(status)) return 2
      if (status === 'Completed') return 3
      return 0
    }

    return (
      <div>
        {/* Improvement 5 — Leave confirmation dialog */}
        {showLeaveConfirm && (
          <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
            <div className='bg-white rounded-2xl shadow-2xl p-6 w-80'>
              <h3 className='text-base font-bold text-gray-800 mb-2'>{t('Tinggalkan halaman?', 'Leave page?')}</h3>
              <p className='text-sm text-gray-500 mb-5'>{t('Ada perubahan yang belum disimpan.', 'There are unsaved changes.')}</p>
              <div className='flex gap-3'>
                <button onClick={() => { setShowLeaveConfirm(false); setIsDirty(false); setView('list') }}
                  className='flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600'>
                  {t('Tinggalkan', 'Leave')}
                </button>
                <button onClick={() => setShowLeaveConfirm(false)}
                  className='flex-1 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200'>
                  {t('Batal', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className='flex items-center gap-3 mb-5'>
          <button onClick={() => { if (isDirty) setShowLeaveConfirm(true); else setView('list') }}
            className='text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1'>
            <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}
          </button>
          <span className='text-gray-300'>|</span>
          <h1 className='text-xl font-bold text-gray-800'>
            {editId
              ? viewOnly ? t('Lihat Onboarding', 'View Onboarding') : t('Edit Onboarding', 'Edit Onboarding')
              : t('Onboarding Baru', 'New Onboarding')}
          </h1>
          {viewOnly && (
            <span className='text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full'>
              {t('Hanya Lihat', 'View Only')}
            </span>
          )}
        </div>

        {msg && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
            ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            <span>{msg.type === 'error' ? <Icon name='warning' size={14} /> : <Icon name='check' size={14} />}</span>
            <span>{msg.text}</span>
          </div>
        )}


        {/* ── Form card ────────────────────────────────────────────── */}
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>

          {/* Improvement 4 — Status Timeline */}
          {editId && (
            <div className='px-6 pt-5 pb-4 border-b border-gray-100'>
              <div className='text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3'>
                {t('Status Workflow', 'Workflow Status')}
              </div>
              <div className='flex items-center gap-0'>
                {STAGES.map((stage, i) => {
                  const idx = stageIdx(savedStatus)
                  const isRejected = savedStatus === 'Rejected'
                  const done = i < idx
                  const current = i === idx
                  return (
                    <React.Fragment key={stage}>
                      <div className='flex flex-col items-center'>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition
                          ${current && isRejected ? 'bg-red-500 border-red-500 text-white'
                            : done || (!isRejected && current) ? 'border-transparent text-white'
                            : 'bg-white border-gray-200 text-gray-400'}`}
                          style={done || (!isRejected && current) ? { background: 'linear-gradient(135deg,#052B52,#039299)' } : {}}>
                          {done ? <Icon name='checkSmall' size={13} /> : i + 1}
                        </div>
                        <span className={`text-[10px] mt-1 text-center whitespace-nowrap ${current ? 'font-bold text-gray-800' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                          {stage}
                        </span>
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-red-800' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
              {savedStatus === 'Rejected' && (
                <p className='text-xs text-red-500 font-semibold mt-1'>{t('Ditolak — perlu revisi', 'Rejected — revision required')}</p>
              )}
            </div>
          )}

          {/* ── HEADER: Employee info ─────────────────────────────── */}
          <div className='px-6 py-5 border-b border-gray-100'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-1 h-4 rounded-full' style={{ background: BRAND_GRADIENT }} />
              <h2 className='text-sm font-bold text-gray-800'>
                {t('Formulir Onboarding / Induksi Karyawan', 'Employee Onboarding / Induction Form')}
              </h2>
            </div>
            <div className='grid grid-cols-1 gap-x-6 gap-y-3.5'>

              <div>
                <label className={hdrLbl}>{t('Nama', 'Name')}</label>
                <select value={form.employeeId} onChange={e => handleEmployeeChange(e.target.value)}
                  disabled={isReadOnly} className={hdrFld}>
                  <option value=''>{t('-- Pilih Karyawan --', '-- Select Employee --')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* ── Section builder (only for new/draft records) ── */}
          {!isReadOnly && (!editId || savedStatus === 'Draft') && (() => {
            const activeTemplates = templates.filter(tpl => tpl.active)
            const ALL_SECTION_TYPES = ['Onboarding General', 'Onboarding Teknis', 'Evaluasi Berkala']

            const tplsForType = (type) => {
              if (type === 'Evaluasi Berkala')
                return activeTemplates.filter(tpl => (tpl.reviewItems ?? []).length > 0)
              if (type === 'Onboarding General')
                return activeTemplates.filter(tpl =>
                  (tpl.mainSections ?? []).some(ms => ms.type === 'Onboarding General') ||
                  (tpl.generalItems ?? []).length > 0
                )
              if (type === 'Onboarding Teknis')
                return activeTemplates.filter(tpl =>
                  (tpl.mainSections ?? []).some(ms => ms.type === 'Onboarding Teknis') ||
                  (tpl.technicalItems ?? []).filter(ti => ti.category !== 'review').length > 0
                )
              return []
            }

            const addBlankSection = (type) => {
              const _uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
              if (type === 'Evaluasi Berkala') {
                setForm(f => f.reviewItems !== null ? f : {
                  ...f,
                  reviewItems: [{ id: _uid(), agenda: '', type: '', date: '', reviewerEmpId: '', reviewerName: 'Direct Manager', reviewerPosition: '', completed: false, isDirectManager: true }],
                })
              } else {
                setForm(f => {
                  if ((f.mainSections ?? []).some(ms => ms.type === type)) return f
                  const newMs = { id: `ms_${Date.now()}`, type, sections: [], items: [] }
                  return { ...f, mainSections: [...(f.mainSections ?? []), newMs] }
                })
              }
            }

            return (
              <div className='px-6 py-4 border-b border-gray-100 bg-gray-50'>
                <div className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-3'>
                  {t('Tambah Section', 'Add Section')}
                </div>
                <div className='space-y-2'>
                  {ALL_SECTION_TYPES.map(type => {
                    const alreadyAdded = type === 'Evaluasi Berkala'
                      ? form.reviewItems !== null
                      : (form.mainSections ?? []).some(ms => ms.type === type)
                    const tpls = tplsForType(type)
                    return (
                      <div key={type} className='flex items-center gap-3'>
                        <span className='text-xs font-semibold text-gray-700 w-52 flex-shrink-0'>{type}</span>
                        {alreadyAdded ? (
                          <span className='text-xs text-green-600 font-semibold flex items-center gap-1'>
                            <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Sudah ditambahkan', 'Already added')}
                          </span>
                        ) : (
                          <>
                            {tpls.length > 0 && (
                              <>
                                <select
                                  value={perTypeTplId[type] || ''}
                                  onChange={e => setPerTypeTplId(prev => ({ ...prev, [type]: e.target.value }))}
                                  className='text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white flex-1 max-w-xs'>
                                  <option value=''>{t('-- Pilih Template (opsional) --', '-- Select Template (optional) --')}</option>
                                  {tpls.map(tpl => (
                                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleGenerateByType(type)}
                                  disabled={!perTypeTplId[type]}
                                  className='px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition disabled:opacity-40 disabled:cursor-not-allowed'
                                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                                  + {t('Dari Template', 'From Template')}
                                </button>
                                <span className='text-xs text-gray-300'>atau</span>
                              </>
                            )}
                            <button
                              onClick={() => addBlankSection(type)}
                              className='px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-white transition'>
                              + {t('Kosong', 'Blank')}
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* ── Dynamic Main Sections ─────────────────────────────── */}
          {form.employeeId && (form.mainSections ?? []).length === 0 && form.reviewItems === null && (
            <div className='px-6 py-8 text-center text-gray-400 text-sm'>
              {t('Belum ada agenda. Pilih template per tipe di atas untuk menambahkan section.', 'No agenda yet. Select a template per type above to add sections.')}
            </div>
          )}

          {(form.mainSections ?? []).map(ms => {
            // Onboarding Teknis → render the full induction & training document form.
            if (ms.type === 'Onboarding Teknis') {
              return (
                <div key={ms.id} className='px-6 pt-5 pb-2'>
                  <div className='flex items-center gap-2 mb-3'>
                    <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
                    <h3 className='text-sm font-bold text-gray-800'>{ms.type}</h3>
                  </div>
                  <TechnicalMatrix
                    items={ms.items} isReadOnly={isReadOnly} t={t}
                    onItem={(itemId, patch) => patchMsItem(ms.id, itemId, patch)}
                    onAddItem={() => addMsItem(ms.id, null)}
                    onDelItem={(itemId) => delMsItem(ms.id, itemId)}
                  />
                </div>
              )
            }
            return (
            <div key={ms.id} className='px-6 pt-5 pb-2'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
                  <h3 className='text-sm font-bold text-gray-800'>{ms.type}</h3>
                </div>
                {!isReadOnly && (
                  <div className='flex items-center gap-2'>
                    <button onClick={() => addMsSection(ms.id)}
                      className='px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition'>
                      + {t('Tambah Section','Add Section')}
                    </button>
                    <button
                      onClick={() => { if (confirm(t(`Hapus section "${ms.type}"?`, `Remove "${ms.type}" section?`))) setForm(f => ({ ...f, mainSections: f.mainSections.filter(s => s.id !== ms.id) })) }}
                      className='px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition'>
                      <Icon name='trash' size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className='overflow-x-auto rounded-lg border border-gray-200'>
                {(ms.sections ?? []).length === 0 ? (
                  <div className='px-6 py-6 text-center text-gray-400 text-sm'>
                    {t('Belum ada section. Klik "+ Tambah Section" untuk memulai.', 'No sections yet. Click "+ Add Section" to start.')}
                  </div>
                ) : (ms.sections ?? []).map(sec => {
                  const cls  = SEC_COLORS[sec.colorIdx % SEC_COLORS.length]
                  const rows = ms.items.filter(i => i.category === sec.id)
                  return (
                    <table key={sec.id} className='w-full text-xs border-b border-gray-100 last:border-b-0'>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                          {['NO', t('Tanggal','Date'), t('AGENDA','AGENDA'), 'Type', t('Link / Referensi','Link / Reference'),
                            t('Nama Mentor','Mentor Name'), t('Posisi Mentor','Mentor Position'), t('Assignee','Assignee'),
                            showCompleted ? t('Completed','Completed') : ''].map((h, i) => (
                            <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap'
                              style={{ minWidth: i===2?180 : i===4?160 : i===7?130 : i===8?36 : i===1?110 : 70 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={cls.split(' ').filter(c=>c.startsWith('bg-')).join(' ')}>
                          <td colSpan={colSpanMain} className='px-3 py-2'>
                            <div className='flex items-center justify-between gap-3'>
                              {isReadOnly
                                ? <span className={`text-xs font-semibold ${cls.split(' ').filter(c=>c.startsWith('text-')).join(' ')}`}>{sec.label}</span>
                                : <input value={sec.label} onChange={e => updMsSection(ms.id, sec.id, e.target.value)}
                                    placeholder={t('Nama section…','Section name…')}
                                    className={`text-xs font-semibold bg-transparent border-0 outline-none ${cls.split(' ').filter(c=>c.startsWith('text-')).join(' ')} flex-1 min-w-0`} />
                              }
                              {!isReadOnly && (
                                <div className='flex items-center gap-2 flex-shrink-0'>
                                  <button onClick={() => addMsItem(ms.id, sec.id)}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${cls.split(' ').filter(c=>c.startsWith('text-')||c.startsWith('border-')).join(' ')} hover:bg-white/60`}>
                                    + {t('Tambah','Add')}
                                  </button>
                                  <button onClick={() => delMsSection(ms.id, sec.id)}
                                    className='text-red-400 hover:text-red-600 text-sm font-bold transition leading-none'><Icon name='close' size={15} /></button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {rows.map((item, idx) => (
                          <React.Fragment key={item.id}>
                          <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                            <td className='px-3 py-1.5 text-center text-gray-500 font-medium w-8'>{idx + 1}</td>
                            <td className='px-2 py-1.5 w-32'>
                              <InputCell value={item.date || ''} onChange={v => updateMsItem(ms.id, item.id, 'date', v)} type='date' disabled={isReadOnly} />
                              {isOverdue(item) && <span className='text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block'>Terlambat</span>}
                            </td>
                            <td className='px-2 py-1.5'>
                              <InputCell value={item.module || ''} onChange={v => updateMsItem(ms.id, item.id, 'module', v)} disabled={isReadOnly} />
                              {item.mandatory === false && (
                                <div className='mt-0.5'>
                                  <span className='text-[10px] text-gray-400 italic'>{t('Opsional','Optional')}</span>
                                </div>
                              )}
                            </td>
                            <td className='px-2 py-1.5 w-36'>
                              {isReadOnly
                                ? <span className='text-xs text-gray-600'>{item.type || '—'}</span>
                                : <select value={item.type || ''} onChange={e => patchMsItem(ms.id, item.id, { type: e.target.value, link: '' })}
                                    className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white'>
                                    <option value=''>— Pilih —</option>
                                    {TYPE_LOV.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                              }
                            </td>
                            <td className='px-2 py-1.5'>
                              {isReadOnly
                                ? <span className='text-xs text-gray-600'>{item.link || '—'}</span>
                                : (() => {
                                    if (!item.type) return <span className='text-xs text-gray-300 italic'>{t('— pilih Type dulu —','— select Type first —')}</span>
                                    const cfg = linkModeFor(item.type)
                                    const selCls = 'w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[180px]'
                                    if (cfg.mode === 'none')
                                      return <span className='text-xs text-gray-400 italic'>{t(cfg.hint, cfg.hintEN)}</span>
                                    if (cfg.mode === 'lov-batch')
                                      return (
                                        <select value={item.link || ''} onChange={e => updateMsItem(ms.id, item.id, 'link', e.target.value)} className={selCls}>
                                          <option value=''>— {t('Pilih Batch','Select Batch')} —</option>
                                          {batches.map(b => <option key={b.id} value={b.batch_name}>{b.batch_name}</option>)}
                                        </select>
                                      )
                                    if (cfg.mode === 'lov-form')
                                      return (
                                        <select value={item.link || ''} onChange={e => updateMsItem(ms.id, item.id, 'link', e.target.value)} className={selCls}>
                                          <option value=''>— {t('Pilih Form','Select Form')} —</option>
                                          {masterForms.filter(f => f.active).map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                        </select>
                                      )
                                    return <InputCell value={item.link || ''} onChange={v => updateMsItem(ms.id, item.id, 'link', v)} placeholder={t(cfg.placeholder, cfg.placeholderEN)} />
                                  })()
                              }
                            </td>
                            <td className='px-2 py-1.5 w-36'>
                              {isReadOnly
                                ? <span className='text-xs text-gray-600'>{item.mentorName || '—'}</span>
                                : <select value={item.mentorEmpId || ''} onChange={e => {
                                    const emp = employees.find(em => em.id === Number(e.target.value))
                                    const pos = positions.find(p => p.id === emp?.positionId)
                                    patchMsItem(ms.id, item.id, { mentorEmpId: e.target.value, mentorName: emp?.name ?? '', mentorPosition: pos?.name ?? '' })
                                  }}
                                    className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[130px]'>
                                    <option value=''>— Pilih Mentor —</option>
                                    {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                                  </select>
                              }
                            </td>
                            <td className='px-2 py-1.5 w-28 text-gray-600 text-xs'>{item.mentorPosition || '—'}</td>
                            <td className='px-2 py-1.5 w-36'>
                              {isReadOnly
                                ? <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${assigneeBadgeCls(item.assignedTo)}`}>
                                    {assigneeLabel(item.assignedTo, employees)}
                                  </span>
                                : <select value={item.assignedTo || 'self'}
                                    onChange={e => updateMsItem(ms.id, item.id, 'assignedTo', e.target.value)}
                                    className={`px-2 py-1 text-xs border rounded outline-none focus:border-red-400 w-full font-semibold ${assigneeBadgeCls(item.assignedTo || 'self')}`}>
                                    <option value='self'>Self (Karyawan)</option>
                                    <option value='manager'>Manager Langsung</option>
                                    <option value='hr'>HR / Admin</option>
                                    <option value='assessor'>Assessor</option>
                                    {employees.length > 0 && <option disabled>──────────────</option>}
                                    {employees.map(e => <option key={e.id} value={`emp:${e.id}`}>{e.name}</option>)}
                                  </select>
                              }
                            </td>
                            <td className='px-2 py-1.5 w-9 text-center'>
                              {showCompleted
                                ? <input type='checkbox' checked={!!item.completed} readOnly disabled className='w-4 h-4 accent-red-600 opacity-60 cursor-default' />
                                : !isReadOnly && <button onClick={() => delMsItem(ms.id, item.id)} className='text-red-400 hover:text-red-600 text-sm font-bold transition'><Icon name='close' size={15} /></button>
                              }
                            </td>
                          </tr>
                          {item.type === 'Configurable Form' && !isReadOnly && (
                            <tr>
                              <td colSpan={10} className='px-2 pb-2'>
                                <FormPickerPanel item={item} masterForms={masterForms}
                                  onChange={patch => patchMsItem(ms.id, item.id, patch)} />
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )
                })}
              </div>
            </div>
            )
          })}

          {/* ── Periodic Review (only when added via template) ─────── */}
          {form.reviewItems !== null && (
            <div className='px-6 pt-5 pb-2'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
                  <h3 className='text-sm font-bold text-gray-800'>{t('Evaluasi Berkala', 'Periodic Evaluation')}</h3>
                </div>
                {!isReadOnly && (
                  <div className='flex items-center gap-2'>
                    <button onClick={addReviewItem}
                      className='px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition'>
                      + {t('Tambah','Add')}
                    </button>
                    <button
                      onClick={() => { if (confirm(t('Hapus Evaluasi Berkala?','Remove Periodic Evaluation?'))) setForm(f => ({ ...f, reviewItems: null })) }}
                      className='px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition'>
                      <Icon name='trash' size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className='overflow-x-auto rounded-lg border border-gray-200'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                      {['NO', t('Tanggal','Date'), t('Agenda','Agenda'), t('Form','Form'),
                        t('Evaluators','Evaluators'),
                        showCompleted ? t('Completed','Completed') : ''].map((h, i) => (
                        <th key={i} className='text-left px-3 py-2 text-white font-semibold whitespace-nowrap'
                          style={{ minWidth: i===2?200 : i===5?36 : i===4?200 : i===1?110 : 70 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(form.reviewItems ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className='px-6 py-6 text-center text-gray-400 text-sm'>
                          {t('Belum ada baris. Klik "+ Tambah" untuk menambahkan.', 'No rows yet. Click "+ Add" to start.')}
                        </td>
                      </tr>
                    ) : (form.reviewItems ?? []).map((item, idx) => (
                      <React.Fragment key={item.id}>
                        <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                          <td className='px-3 py-1.5 text-center text-gray-500 font-medium w-8'>{idx + 1}</td>
                          <td className='px-2 py-1.5 w-32'>
                            <InputCell value={item.date || ''} onChange={v => updateReview(item.id, 'date', v)} type='date' disabled={isReadOnly} />
                            {(item.frequency ?? DEFAULT_FREQUENCY) !== 'once' && (
                              <span className='text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block'>
                                <Icon name='repeat' size={14} className='inline align-[-2px]' /> {frequencyLabel(item, t('id','en') === 'en')}
                                {item.nextReviewDate && <span className='text-orange-400 ml-1'><Icon e='→' size={14} className='inline align-[-2px]' /> {item.nextReviewDate}</span>}
                              </span>
                            )}
                            {isOverdue(item) && <span className='text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block'>Terlambat</span>}
                          </td>
                          <td className='px-2 py-1.5'>
                            {isReadOnly
                              ? <span className='text-xs text-gray-600'>{item.agenda || '—'}</span>
                              : <InputCell value={item.agenda || ''} onChange={v => updateReview(item.id, 'agenda', v)} placeholder={t('Agenda…','Agenda…')} />
                            }
                          </td>
                          <td className='px-2 py-1.5 w-44'>
                            {isReadOnly
                              ? <span className='text-xs text-gray-600'>{item.masterFormName || item.type || '—'}</span>
                              : <select value={item.masterFormId ?? ''}
                                  onChange={e => {
                                    const mf = masterForms.find(f => f.id === Number(e.target.value))
                                    if (!mf) patchReview(item.id, { masterFormId: null, masterFormName: '', formSchema: [], formType: null, evalMethod: null, evalTopics: [], ojtParams: [] })
                                    else patchReview(item.id, { masterFormId: mf.id, masterFormName: mf.name, formSchema: mf.fields ?? [], formType: mf.formType ?? 'field', evalMethod: mf.evalMethod ?? 'nilai', evalTopics: mf.evalTopics ?? [], ojtParams: mf.ojtParams ?? [] })
                                  }}
                                  className='w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white min-w-[160px]'>
                                  <option value=''>— Pilih Form —</option>
                                  {masterForms.filter(f => f.active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            }
                          </td>
                          <td className='px-2 py-1.5'>
                            {isReadOnly ? (
                              <div className='flex flex-wrap gap-1'>
                                {(item.evaluators ?? []).length === 0
                                  ? <span className='text-xs text-gray-400'>—</span>
                                  : (item.evaluators ?? []).map(e => (
                                    <span key={e.id} className='text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full'>{e.label}</span>
                                  ))
                                }
                                {(item.formSubmissions ?? []).length > 0 && (
                                  <span className='text-[10px] text-green-600 ml-1'>
                                    <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {(item.formSubmissions ?? []).length}/{(item.evaluators ?? []).length || '?'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <EvaluatorPicker
                                evaluators={item.evaluators ?? []}
                                employees={employees}
                                onChange={v => patchReview(item.id, { evaluators: v })} />
                            )}
                          </td>
                          <td className='px-2 py-1.5 w-9 text-center'>
                            {showCompleted
                              ? <input type='checkbox' checked={!!item.completed} readOnly disabled className='w-4 h-4 accent-red-600 opacity-60 cursor-default' />
                              : !isReadOnly && <button onClick={() => delReviewItem(item.id)} className='text-red-400 hover:text-red-600 text-sm font-bold transition'><Icon name='close' size={15} /></button>
                            }
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Template info (only if created via rule with template versioning) ── */}
          {(form.templateGeneralName || form.templateTekniName || form.templateReviewName) && (
            <div className='px-6 pt-4 pb-2'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-1 h-4 rounded-full flex-shrink-0' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
                <span className='text-xs font-bold text-gray-600 uppercase tracking-wide'>
                  {t('Dibuat dari Template', 'Created from Template')}
                </span>
              </div>
              <div className='flex flex-wrap gap-2 ml-3'>
                {form.templateGeneralName && (
                  <span className='flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-full border border-red-100 font-semibold'>
                    <Icon name='folder' size={13} className='inline align-[-2px]' /> General: {form.templateGeneralName}
                  </span>
                )}
                {form.templateTekniName && (
                  <span className='flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-semibold'>
                    <Icon name='settings' size={13} className='inline align-[-2px]' /> Teknis: {form.templateTekniName}
                  </span>
                )}
                {form.templateReviewName && (
                  <span className='flex items-center gap-1 text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-100 font-semibold'>
                    <Icon name='clipboard' size={13} className='inline align-[-2px]' /> Review: {form.templateReviewName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Assign Buddy ─────────────────────────────────────────── */}
          <div className='px-6 pt-5 pb-4'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-1 h-5 rounded-full' style={{ background: 'linear-gradient(#052B52,#039299)' }} />
              <h3 className='text-sm font-bold text-gray-800'><Icon name='users' size={14} className='inline align-[-2px]' /> {t('Assign Buddy','Assign Buddy')}</h3>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-white rounded-xl border border-gray-200 p-5'>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Buddy Name','Buddy Name')}</label>
                <select
                  value={form.buddyAssignment?.buddyEmpId || ''}
                  onChange={e => {
                    const emp = employees.find(em => em.id === Number(e.target.value))
                    const pos = positions.find(p => p.id === emp?.positionId)
                    patchBuddy({ buddyEmpId: e.target.value, buddyName: emp?.name ?? '', buddyPosition: pos?.name ?? '' })
                  }}
                  disabled={isReadOnly}
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400'>
                  <option value=''>— {t('Pilih Buddy','Select Buddy')} —</option>
                  {employees.map(em => (
                    <option key={em.id} value={em.id}>{em.nik ? em.nik : `#${em.id}`} — {em.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Buddy Program Duration','Buddy Program Duration')}</label>
                <div className='flex gap-2'>
                  <input type='number' min={1}
                    value={form.buddyAssignment?.programDuration || ''}
                    onChange={e => {
                      const dur = e.target.value
                      patchBuddy({ programDuration: dur, programEndDate: calcEndDate(form.buddyAssignment?.programStartDate, dur, form.buddyAssignment?.programDurationUnit || 'Bulan') })
                    }}
                    disabled={isReadOnly}
                    placeholder='e.g. 3'
                    className='w-24 px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none disabled:bg-gray-50' />
                  <select
                    value={form.buddyAssignment?.programDurationUnit || 'Bulan'}
                    onChange={e => {
                      const unit = e.target.value
                      patchBuddy({ programDurationUnit: unit, programEndDate: calcEndDate(form.buddyAssignment?.programStartDate, form.buddyAssignment?.programDuration, unit) })
                    }}
                    disabled={isReadOnly}
                    className='flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-white disabled:bg-gray-50'>
                    <option value='Hari'>{t('Hari','Days')}</option>
                    <option value='Minggu'>{t('Minggu','Weeks')}</option>
                    <option value='Bulan'>{t('Bulan','Months')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Program Start Date','Program Start Date')}</label>
                <input type='date'
                  value={form.buddyAssignment?.programStartDate || ''}
                  onChange={e => {
                    const sd = e.target.value
                    patchBuddy({ programStartDate: sd, programEndDate: calcEndDate(sd, form.buddyAssignment?.programDuration, form.buddyAssignment?.programDurationUnit || 'Bulan') })
                  }}
                  disabled={isReadOnly}
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none disabled:bg-gray-50' />
                <p className='text-[10px] text-gray-400 mt-1'>({t("Auto-defaults to New Hire's Join Date","Auto-defaults to New Hire's Join Date")})</p>
              </div>

              <div>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('Program End Date','Program End Date')}</label>
                <input type='date'
                  value={form.buddyAssignment?.programEndDate || ''}
                  onChange={e => patchBuddy({ programEndDate: e.target.value })}
                  disabled={isReadOnly}
                  className='w-full px-3 py-1.5 text-xs rounded border border-gray-200 focus:border-red-400 outline-none bg-gray-50 disabled:bg-gray-100' />
                <p className='text-[10px] text-gray-400 mt-1'>({t('Auto-Calculates','Auto-Calculates')})</p>
              </div>

              <div className='md:col-span-2'>
                <label className='block text-[11px] font-semibold text-gray-600 mb-1'>{t('HRBP Special Instructions / Notes:','HRBP Special Instructions / Notes:')}</label>
                <textarea rows={3}
                  value={form.buddyAssignment?.hrbpNotes || ''}
                  onChange={e => patchBuddy({ hrbpNotes: e.target.value })}
                  disabled={isReadOnly}
                  placeholder={t('Type here','Type here')}
                  className='w-full px-3 py-2 text-xs rounded border border-gray-200 focus:border-red-400 outline-none resize-none disabled:bg-gray-50' />
              </div>

            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
          {viewOnly ? (
            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => { setViewOnly(false); setIsDirty(false); setView('list') }}
                className='px-5 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition'>
                <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}
              </button>
            </div>
          ) : (
            <div className='px-6 pb-6'>
              {savedStatus === 'Preparation' && (
                <div className='mb-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 text-xs text-indigo-700 flex items-center justify-between gap-3'>
                  <span><Icon name='settings' size={14} className='inline align-[-2px]' /> {t('Fase Persiapan — karyawan belum bisa melihat task. Aktifkan saat join date tiba atau klik tombol di bawah.',
                    'Preparation phase — employee cannot see tasks yet. Activate on join date or click below.')}</span>
                  <button onClick={() => { activateOnboarding(editId, currentUser?.id, currentUser?.name); flash(t('Onboarding diaktifkan.','Onboarding activated.')) }}
                    className='flex-shrink-0 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition'>
                    <Icon name='rocket' size={14} className='inline align-[-2px]' /> {t('Aktifkan Sekarang','Activate Now')}
                  </button>
                </div>
              )}
              {savedStatus === 'Pending' && (
                <div className='mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700'>
                  {t('Form ini sedang dalam proses approval. Perubahan yang Anda simpan akan ikut terlihat oleh approver.',
                     'This form is pending approval. Any changes you save will be visible to the approver.')}
                </div>
              )}
              {savedStatus === 'Active' && (
                <div className='mb-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-700'>
                  <Icon name='rocket' size={14} className='inline align-[-2px]' /> {t('Onboarding sedang berjalan. Karyawan sudah dapat melihat dan mengerjakan task.',
                    'Onboarding is active. Employee can now see and complete their tasks.')}
                </div>
              )}
              {savedStatus === 'Rejected' && (
                <div className='mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700'>
                  <Icon name='close' size={14} className='inline align-[-2px]' /> {t('Ditolak oleh atasan','Rejected by supervisor')}
                  {rejectedStep?.approverName ? ` (${rejectedStep.approverName})` : ''}
                  {rejectedStep?.note ? ` — "${rejectedStep.note}"` : ''}.{' '}
                  {t('Perbaiki lalu ajukan ulang.','Revise then resubmit.')}
                </div>
              )}
              <div className='flex gap-3'>
                <ActionButton variant='secondary' icon='💾' onClick={handleSaveDraft}>
                  {savedStatus === 'Draft' ? t('Simpan Draft', 'Save Draft') : t('Simpan', 'Save')}
                </ActionButton>
                {savedStatus === 'Draft' && (
                  <ActionButton icon='📤' onClick={handleSubmit}>
                    {t('Submit untuk Approval', 'Submit for Approval')}
                  </ActionButton>
                )}
                {savedStatus === 'Rejected' && (
                  <ActionButton icon='🔁' onClick={handleSubmit}>
                    {t('Perbaiki & Ajukan Ulang', 'Revise & Resubmit')}
                  </ActionButton>
                )}
                <button onClick={() => { if (isDirty) setShowLeaveConfirm(true); else setView('list') }}
                  className='px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition ml-auto'>
                  {t('Batal', 'Cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────

  const kpis = {
    total:       onboardings.length,
    preparation: onboardings.filter(o => o.workflowStatus === 'Preparation').length,
    active:      onboardings.filter(o => o.workflowStatus === 'Active').length,
    draft:       onboardings.filter(o => o.workflowStatus === 'Draft').length,
  }

  return (
    <div>
      <PageHeader
        icon='🚀'
        title={t('Employee Onboarding', 'Employee Onboarding')}
        subtitle={t('Kelola dan pantau proses onboarding/induksi karyawan baru.', 'Manage and monitor the onboarding/induction process for new employees.')}
        actions={
          <div className='flex gap-2'>
            <ActionButton variant='secondary' onClick={() => router.push('/hr/onboarding/auto-assign')}>
              {t('Auto Assign', 'Auto Assign')}
            </ActionButton>
            <ActionButton icon='+' onClick={openNew}>
              {t('Onboarding Manual', 'Manual Onboarding')}
            </ActionButton>
          </div>
        }
      />


      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span>{msg.type === 'error' ? <Icon name='warning' size={14} /> : <Icon name='check' size={14} />}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {onboardings.length > 0 && (
        <div className='flex justify-end mb-3'>
          <button
            onClick={() => exportCsv('onboarding-tracker', ['Employee','Department','Employment Status','Probation (mo)','Supervisor','Workflow Status','Source','Created'], onboardings.map(ob => [ob.employeeName || '', ob.department || '', ob.employmentStatus || '', ob.probationPeriod || '', ob.supervisorName || '', ob.workflowStatus || '', ob.createdVia === 'auto-assign' ? 'Auto' : 'Manual', ob.createdAt ? ob.createdAt.slice(0, 10) : '']))}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white rounded-lg ring-1 ring-gray-200 hover:bg-gray-50 transition'>
            <Icon e='↓' size={14} className='inline align-[-2px]' /> {t('Export CSV', 'Export CSV')}
          </button>
        </div>
      )}

      {onboardings.length === 0 ? (
        <EmptyState
          icon='🚀'
          title={t('Belum ada data onboarding.', 'No onboarding records yet.')}
          description={t('Buat onboarding pertama untuk memulai.', 'Create your first onboarding to get started.')}
          action={<ActionButton size='sm' icon='+' onClick={openNew}>{t('Onboarding Manual', 'Manual Onboarding')}</ActionButton>}
        />
      ) : (
        <DataTable
          columns={[
            { label: '' },
            { label: t('Karyawan','Employee') },
            { label: 'Department' },
            { label: t('Status Karyawan','Employment Status') },
            { label: t('Masa Probasi','Probation') },
            { label: t('Tgl Bergabung','Join Date') },
            { label: t('Atasan','Supervisor') },
            { label: t('Status Workflow','Workflow Status') },
            { label: t('Sumber','Source') },
            { label: t('Tanggal Dibuat','Created') },
            { label: t('Aksi','Action'), align: 'right' },
          ]}
          headerExtra={
            <th className='px-3 py-3 text-left text-xs font-semibold text-gray-500 w-8 hidden'>
              <input type='checkbox'
                className='w-4 h-4 accent-red-600 cursor-pointer'
                checked={onboardings.length > 0 && onboardings.every(ob => selected.has(ob.id))}
                onChange={e => {
                  if (e.target.checked) setSelected(new Set(onboardings.map(ob => ob.id)))
                  else setSelected(new Set())
                }} />
            </th>
          }
        >
          {onboardings.map(ob => (
            <Tr key={ob.id}>
              <Td>
                <input type='checkbox'
                  className='w-4 h-4 accent-red-600 cursor-pointer'
                  checked={selected.has(ob.id)}
                  onChange={e => {
                    const next = new Set(selected)
                    if (e.target.checked) next.add(ob.id); else next.delete(ob.id)
                    setSelected(next)
                  }} />
              </Td>
              <Td className='font-medium text-gray-800'>{ob.employeeName || '—'}</Td>
              <Td>{ob.department || '—'}</Td>
              <Td>
                <StatusBadge tone='info'>{ob.employmentStatus}</StatusBadge>
              </Td>
              <Td>{ob.probationPeriod} {t('bln','mo')}</Td>
              <Td className='text-gray-600 text-xs'>{fmtDate(ob.joinDate)}</Td>
              <Td>{ob.supervisorName || '—'}</Td>
              <Td>
                <StatusBadge status={ob.workflowStatus} />
                {(() => {
                  const { total, done } = calcProgress(ob)
                  if (total === 0) return null
                  const pct = Math.round((done/total)*100)
                  return (
                    <div className='flex items-center gap-2 mt-1'>
                      <div className='flex-1 bg-gray-100 rounded-full h-1.5'>
                        <div className='h-1.5 rounded-full bg-green-500 transition-all' style={{width:`${pct}%`}}/>
                      </div>
                      <span className='text-xs text-gray-400 whitespace-nowrap'>{done}/{total}</span>
                    </div>
                  )
                })()}
              </Td>
              <Td>
                {ob.createdVia === 'auto-assign'
                  ? <span className='text-xs bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full'><Icon e='⚡' size={14} className='inline align-[-2px]' /> Auto</span>
                  : <span className='text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full'><Icon e='✏️' size={14} className='inline align-[-2px]' /> Manual</span>
                }
              </Td>
              <Td className='text-gray-500 text-xs'>
                {ob.createdAt ? new Date(ob.createdAt).toLocaleDateString('id-ID') : '—'}
              </Td>
              <Td align='right'>
                <div className='flex gap-2 justify-end flex-wrap'>
                  <button onClick={() => openEdit(ob)}
                    className='px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition'>
                    <Icon e='✏️' size={14} className='inline align-[-2px]' /> {t('Edit','Edit')}
                  </button>
                  {/* Improvement 1 — Quick action: Submit for Preparation */}
                  {ob.workflowStatus === 'Preparation' && (
                    <button onClick={() => {
                        const levels = getLevelsForPage('Employee Onboarding')
                        submitOnboarding(ob.id, currentUser, levels)
                        flash(t('Berhasil disubmit untuk approval', 'Submitted for approval'))
                      }}
                      className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition'>
                      <Icon e='▶' size={14} className='inline align-[-2px]' /> {t('Submit','Submit')}
                    </button>
                  )}
                  {ob.workflowStatus === 'Preparation' && (() => {
                    const emp = employees.find(e => e.id === Number(ob.employeeId))
                    const joinDate = emp?.joinDate ? String(emp.joinDate).slice(0, 10) : null
                    return (
                      <button onClick={() => activateOnboarding(ob.id, currentUser?.id, currentUser?.name)}
                        className='px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition'>
                        <Icon name='rocket' size={14} className='inline align-[-2px]' /> {t('Aktifkan','Activate')}
                        {joinDate && <span className='ml-1 text-indigo-400'>({joinDate})</span>}
                      </button>
                    )
                  })()}
                  {ob.workflowStatus === 'Draft' && (
                    <button onClick={() => handleSubmitExisting(ob)}
                      className='px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition'>
                      <Icon e='▶' size={14} className='inline align-[-2px]' /> {t('Submit','Submit')}
                    </button>
                  )}
                  {/* Improvement 1 — Quick action: Aktifkan for Approved */}
                  {ob.workflowStatus === 'Approved' && (
                    <button onClick={() => {
                        updateOnboarding(ob.id, { workflowStatus: 'Active', activatedAt: new Date().toISOString() })
                        flash(t('Onboarding diaktifkan.', 'Onboarding activated.'))
                      }}
                      className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition'>
                      <Icon name='checkSmall' size={14} className='inline align-[-2px]' /> {t('Aktifkan','Activate')}
                    </button>
                  )}
                  {/* Quick action: Ajukan Ulang for Rejected (regenerates a fresh atasan step) */}
                  {ob.workflowStatus === 'Rejected' && (
                    <button onClick={() => {
                        submitOnboarding(ob.id, currentUser, getLevelsForPage('Employee Onboarding'))
                        flash(t('Onboarding diajukan ulang.', 'Onboarding resubmitted.'))
                      }}
                      className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition'>
                      <Icon e='↺' size={14} className='inline align-[-2px]' /> {t('Ajukan Ulang','Resubmit')}
                    </button>
                  )}
                  {(ob.workflowStatus === 'Draft' || ob.workflowStatus === 'Preparation') && (
                    <button onClick={() => setDelId(ob.id)}
                      className='px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition'>
                      <Icon name='trash' size={14} />
                    </button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {delId && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={() => setDelId(null)}>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-80' onClick={e => e.stopPropagation()}>
            <h3 className='text-base font-bold text-gray-800 mb-2'>{t('Hapus Onboarding?','Delete Onboarding?')}</h3>
            <p className='text-sm text-gray-500 mb-5'>{t('Data ini akan dihapus permanen dan tidak dapat dikembalikan.','This record will be permanently deleted.')}</p>
            <div className='flex gap-3'>
              <button onClick={confirmDelete}
                className='flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 transition'>
                {t('Hapus','Delete')}
              </button>
              <button onClick={() => setDelId(null)}
                className='flex-1 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal','Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 3 — Bulk action floating bar */}
      {selected.size > 0 && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4'>
          <span className='text-sm font-semibold'>{selected.size} {t('dipilih', 'selected')}</span>
          <button onClick={handleBulkSubmit}
            className='px-3 py-1.5 text-xs bg-blue-500 rounded-lg font-semibold hover:bg-blue-600'>
            {t('Submit Semua', 'Submit All')}
          </button>
          <button onClick={() => setSelected(new Set())} className='text-xs text-gray-300 hover:text-white'>
            {t('Batal', 'Cancel')}
          </button>
        </div>
      )}

      {/* ── Auto Assign Modal ── */}
      {autoAssignOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
          onClick={() => setAutoAssignOpen(false)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col'
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0'>
              <div>
                <h2 className='text-base font-bold text-gray-800'><Icon e='⚡' size={14} className='inline align-[-2px]' /> {t('Auto Assign Onboarding','Auto Assign Onboarding')}</h2>
                <p className='text-xs text-gray-400 mt-0.5'>
                  {autoAssignRows.length === 0
                    ? t('Semua karyawan aktif sudah memiliki onboarding atau tidak ada template yang cocok.', 'All active employees already have onboarding or no matching template found.')
                    : t(`${autoAssignRows.length} karyawan akan dibuatkan onboarding secara otomatis.`, `${autoAssignRows.length} employees will be assigned onboarding automatically.`)}
                </p>
              </div>
              <button onClick={() => setAutoAssignOpen(false)} className='text-gray-400 hover:text-gray-600 text-lg'><Icon name='close' size={15} /></button>
            </div>

            {/* Body */}
            <div className='flex-1 overflow-y-auto px-6 py-4'>
              {autoAssignRows.length === 0 ? (
                <div className='text-center py-10 text-gray-400 text-sm'>
                  {t('Tidak ada karyawan yang perlu di-assign.', 'No employees need to be assigned.')}
                </div>
              ) : (
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='border-b border-gray-100'>
                      <th className='text-left py-2 px-2 font-semibold text-gray-500'>Karyawan</th>
                      <th className='text-left py-2 px-2 font-semibold text-gray-500'>Department</th>
                      <th className='text-left py-2 px-2 font-semibold text-gray-500'>{t('Tipe','Type')}</th>
                      <th className='text-left py-2 px-2 font-semibold text-gray-500'>{t('Rule','Rule')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoAssignRows.map(({ emp, dept, template }) => (
                      <tr key={emp.id} className='border-b border-gray-50 hover:bg-gray-50'>
                        <td className='py-2 px-2'>
                          <div className='font-semibold text-gray-800'>{emp.name}</div>
                          <div className='text-gray-400'>{emp.nik}</div>
                        </td>
                        <td className='py-2 px-2 text-gray-600'>{dept?.name || '—'}</td>
                        <td className='py-2 px-2'>
                          <span className='px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs'>{emp.employmentType || '—'}</span>
                        </td>
                        <td className='py-2 px-2'>
                          <span className='px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full'>{template.name}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            {autoAssignRows.length > 0 && (
              <div className='px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0'>
                <button onClick={runAutoAssign}
                  className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  <Icon e='⚡' size={14} className='inline align-[-2px]' /> {t(`Buat ${autoAssignRows.length} Onboarding`, `Create ${autoAssignRows.length} Onboarding Records`)}
                </button>
                <button onClick={() => setAutoAssignOpen(false)}
                  className='px-6 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
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
