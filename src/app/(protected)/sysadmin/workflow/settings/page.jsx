'use client'
import { useState }         from 'react'
import { useUserlistStore }  from '@/store/userlistStore'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useWorkflowStore }  from '@/store/workflowStore'
import { useT } from '@/store/languageStore'
import { PageHeader, StatCard, ActionButton } from '@/components/ui'
import Icon from '@/components/ui/Icon'

// ── Approval-level types (same base as submitter + dynamic + userlist) ─────────
const LEVEL_TYPES = [
  // Criteria — same as submitter condition types
  { value: 'role',               label: 'Role',                         icon: '🎭', group: 'Criteria' },
  { value: 'position',           label: 'Position',                     icon: '📌', group: 'Criteria' },
  { value: 'company',            label: 'Company',                      icon: '🏢', group: 'Criteria' },
  { value: 'pc',                 label: 'PC (range)',                   icon: '🎯', group: 'Criteria' },
  { value: 'department',         label: 'Department',                   icon: '🗂️', group: 'Criteria' },
  { value: 'employee',           label: 'Employee ID',                  icon: '👤', group: 'Criteria' },
  // Dynamic — resolved at runtime from org hierarchy
  { value: 'supervisor',         label: 'Supervisor',                   icon: '⬆️',    group: 'Dynamic' },
  { value: 'indirect_sup',       label: 'Indirect Supervisor',          icon: '⬆️⬆️',  group: 'Dynamic' },
  { value: 'supervisor_pc53',    label: 'Supervisor (PC 53+)',          icon: '🎯⬆️',  group: 'Dynamic',
    hint: 'Eskalasi ke atas hingga supervisor dengan PC ≥ 53 ditemukan' },
  { value: 'indirect_sup_pc53',  label: 'Indirect Supervisor (PC 53+)', icon: '🎯⬆️⬆️', group: 'Dynamic',
    hint: 'Eskalasi indirect ke atas hingga supervisor dengan PC ≥ 53 ditemukan' },
  // Userlist
  { value: 'userlist',           label: 'Userlist',                     icon: '📋', group: 'Userlist' },
  // Auto
  { value: 'auto_approved',      label: 'Auto Approved',                icon: '✅', group: 'Auto',
    hint: 'Step ini disetujui otomatis tanpa menunggu approver manapun' },
]

const DYNAMIC_TYPES = ['supervisor','indirect_sup','supervisor_pc53','indirect_sup_pc53','auto_approved']

const SYSTEM_ROLES = [
  { value: 'employee',   label: 'Employee',   icon: '👤' },
  { value: 'manager',    label: 'Manager',    icon: '👥' },
  { value: 'hr',         label: 'HR',         icon: '🗂️' },
  { value: 'superadmin', label: 'Superadmin', icon: '⚙️' },
]

const COND_TYPES = [
  { value: 'role',       label: 'Role',        icon: '🎭' },
  { value: 'position',   label: 'Position',    icon: '📌' },
  { value: 'company',    label: 'Company',     icon: '🏢' },
  { value: 'pc',         label: 'PC (range)',  icon: '🎯' },
  { value: 'department', label: 'Department',  icon: '🗂️' },
  { value: 'employee',   label: 'Employee ID', icon: '👤' },
  { value: 'userlist',   label: 'Userlists',   icon: '📋' },
]

// ── factories ─────────────────────────────────────────────────────────────────
const makeCondition = (type) => ({
  id: Date.now() + Math.random(), type,
  roles: [], positionIds: [], companyIds: [],
  pcFrom: '', pcTo: '',
  departmentIds: [], empMode: 'manual', employeeIds: [], userlistId: null,
})

const makeLevel = (type = 'role') => ({
  id: Date.now() + Math.random(), type,
  required: false,
  // shared sub-fields
  roles: [], positionIds: [], companyIds: [],
  pcFrom: '', pcTo: '',
  departmentIds: [], empMode: 'manual', employeeIds: [], userlistId: null,
})

const makeSubmitterRow = () => ({
  id:                 Date.now() + Math.random(),
  description:        '',
  conditions:         [],
  employeeConditions: [],
  levels:             [makeLevel('role')],
})

const makeNotifRow = () => ({
  id:         Date.now() + Math.random(),
  conditions: [],
})

const makeElseRow = () => ({
  id:          Date.now() + Math.random(),
  description: '',
  levels:      [makeLevel('role')],
})

// ── LOV: pages that can have a workflow ──────────────────────────────────────
const PAGE_LOV = [
  // ── ESS ──────────────────────────────────────────────────────────────────
  { name: 'Apply Leave',                        icon: '📅', section: 'ESS · Leave' },
  { name: 'My Onboarding',                      icon: '🎯', section: 'ESS · Onboarding' },
  { name: 'Request External Training (ESS)',    icon: '🌍', section: 'ESS · Learning' },
  { name: 'Record External Training (ESS)',     icon: '📂', section: 'ESS · Learning' },

  // ── MSS · Leave ──────────────────────────────────────────────────────────
  { name: 'Apply Leave (My Team)',              icon: '👥', section: 'MSS · Leave' },
  { name: 'Approve Leave',                      icon: '✅', section: 'MSS · Leave' },

  // ── MSS · Onboarding ─────────────────────────────────────────────────────
  { name: 'Approve Onboarding',                 icon: '🎯', section: 'MSS · Onboarding' },

  // ── MSS · Evaluation ─────────────────────────────────────────────────────
  { name: 'Form Evaluation (MSS)',              icon: '📊', section: 'MSS · Evaluation' },
  { name: 'Form Evaluation Contract (MSS)',     icon: '📋', section: 'MSS · Evaluation' },

  // ── MSS · Personnel Action ───────────────────────────────────────────────
  { name: 'PA Approval — Promote',              icon: '⬆️', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Transfer',             icon: '↔️', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Demote',               icon: '⬇️', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Transfer Across Co.', icon: '🏢', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Terminate',            icon: '🚪', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Rehire',               icon: '🔄', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Change Emp. Type',     icon: '📋', section: 'MSS · Personnel Action' },
  { name: 'PA Approval — Extend Contract',      icon: '📅', section: 'MSS · Personnel Action' },

  // ── MSS · Learning ───────────────────────────────────────────────────────
  { name: 'Training Approval (MSS)',            icon: '✅', section: 'MSS · Learning' },
  { name: 'Cert Approval (MSS)',                icon: '🏆', section: 'MSS · Learning' },
  { name: 'Request External (MSS)',             icon: '🌐', section: 'MSS · Learning' },
  { name: 'Behavior Evaluation (MSS)',          icon: '🧠', section: 'MSS · Learning' },

  // ── HR · Leave ───────────────────────────────────────────────────────────
  { name: 'Apply Leave (HR)',                   icon: '🗂️', section: 'HR · Leave' },

  // ── HR · Onboarding ──────────────────────────────────────────────────────
  { name: 'Employee Onboarding',                 icon: '📋', section: 'HR · Onboarding' },
  { name: 'Master Employee Onboarding',           icon: '📄', section: 'HR · Onboarding' },

  // ── HR · Evaluation ──────────────────────────────────────────────────────
  { name: 'Form Evaluation',                    icon: '📊', section: 'HR · Evaluation' },
  { name: 'Form Evaluation (Contract)',         icon: '📋', section: 'HR · Evaluation' },

  // ── HR · Employee ────────────────────────────────────────────────────────
  { name: 'Employee Data',                      icon: '👤', section: 'HR · Employee' },

  // ── HR · Personnel Action ────────────────────────────────────────────────
  { name: 'PA — Promote',                       icon: '⬆️', section: 'HR · Personnel Action' },
  { name: 'PA — Transfer',                      icon: '↔️', section: 'HR · Personnel Action' },
  { name: 'PA — Demote',                        icon: '⬇️', section: 'HR · Personnel Action' },
  { name: 'PA — Transfer Across Company',       icon: '🏢', section: 'HR · Personnel Action' },
  { name: 'PA — Terminate',                     icon: '🚪', section: 'HR · Personnel Action' },
  { name: 'PA — Rehire',                        icon: '🔄', section: 'HR · Personnel Action' },
  { name: 'PA — Change Employment Type',        icon: '📋', section: 'HR · Personnel Action' },
  { name: 'PA — Extend Contract',               icon: '📅', section: 'HR · Personnel Action' },

  // ── HR · Time & Labour ───────────────────────────────────────────────────
  { name: 'Shift Setting',                      icon: '🕐', section: 'HR · Time & Labor' },
  { name: 'Shift Pattern',                      icon: '🔄', section: 'HR · Time & Labor' },
  { name: 'Work Schedule',                      icon: '📆', section: 'HR · Time & Labor' },
  { name: 'Schedule Assignment',                icon: '🔗', section: 'HR · Time & Labor' },

  // ── HR · Absence ─────────────────────────────────────────────────────────
  { name: 'Holiday Calendar',                   icon: '📅', section: 'HR · Absence' },

  // ── HR · Payroll ─────────────────────────────────────────────────────────
  { name: 'Payroll Run',                        icon: '💼', section: 'HR · Payroll' },

  // ── HR · Learning ────────────────────────────────────────────────────────
  { name: 'Learning Planning',                  icon: '📋', section: 'HR · Learning' },
  { name: 'Course',                             icon: '🎓', section: 'HR · Learning' },
  { name: 'Course Batch',                       icon: '📦', section: 'HR · Learning' },
  { name: 'Approval Workflow (Learning)',       icon: '🔀', section: 'HR · Learning' },
  { name: 'Certificate (Learning)',             icon: '🏆', section: 'HR · Learning' },

  // ── Sysadmin ─────────────────────────────────────────────────────────────
  { name: 'Leave Workflow Config',              icon: '🔀', section: 'Sysadmin · Settings' },
  { name: 'User Management',                   icon: '👥', section: 'Sysadmin · Settings' },
]

// Unique section order — derived from PAGE_LOV so dropdown groups stay in sync
const PAGE_LOV_SECTIONS = [...new Set(PAGE_LOV.map(p => p.section))]

// ── seed data ─────────────────────────────────────────────────────────────────
const seedLevel = (type, patch = {}) => ({ ...makeLevel(type), id: Math.random(), ...patch })

const INITIAL_WORKFLOWS = [
  {
    id: 1, name: 'Apply Leave',           icon: '📅', active: true,
    notifications: [], elseRow: null,
    submitters: [{
      id: 101, description: '', conditions: [],
      levels: [
        seedLevel('supervisor'),
        seedLevel('role', { roles: ['hr'] }),
      ],
    }],
  },
  {
    id: 2, name: 'Apply Leave (My Team)', icon: '👥', active: true,
    notifications: [], elseRow: null,
    submitters: [{
      id: 201, description: '', conditions: [],
      levels: [seedLevel('supervisor')],
    }],
  },
  {
    id: 3, name: 'Apply Leave (HR)',      icon: '🗂️', active: true,
    notifications: [], elseRow: null,
    submitters: [{
      id: 301, description: '', conditions: [],
      levels: [
        seedLevel('supervisor'),
        seedLevel('role', { roles: ['hr'] }),
        seedLevel('supervisor_pc53'),
      ],
    }],
  },
  {
    id: 4, name: 'Approve Leave',         icon: '✅', active: true,
    notifications: [], elseRow: null,
    submitters: [{
      id: 401, conditions: [],
      levels: [seedLevel('supervisor')],
    }],
  },
]

// ── helpers ───────────────────────────────────────────────────────────────────
function toggleItem(arr, val) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

// ── Shared sub-selector body (used by both ConditionRow & LevelRow) ───────────
function SubSelector({ item, onChange, positions, companies, departments, employees, userlists, compact = false }) {
  const [empSearch, setEmpSearch] = useState('')
  const upd = (key, val) => onChange({ ...item, [key]: val })
  const tog = (key, val) => upd(key, toggleItem(item[key], val))

  const filteredEmps = employees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.nik.toLowerCase().includes(empSearch.toLowerCase())
  ).slice(0, 40)

  const maxH = compact ? 'max-h-28' : 'max-h-36'

  if (item.type === 'role') return (
    <div className='flex flex-wrap gap-1.5'>
      {SYSTEM_ROLES.map(r => (
        <button key={r.value} onClick={() => tog('roles', r.value)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${item.roles.includes(r.value) ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600 hover:border-red-200'}`}>
          <Icon e={r.icon} size={13} /> {r.label}{item.roles.includes(r.value) && <Icon name='checkSmall' size={12} className='ml-0.5' />}
        </button>
      ))}
    </div>
  )

  if (item.type === 'position') return (
    <div className={`grid grid-cols-2 gap-1 ${maxH} overflow-y-auto`}>
      {positions.map(p => (
        <label key={p.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${item.positionIds.includes(p.id) ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
          <input type='checkbox' checked={item.positionIds.includes(p.id)} onChange={() => tog('positionIds', p.id)} className='w-3 h-3 accent-red-600 flex-shrink-0' />
          <span className='truncate font-medium'>{p.name}</span>
        </label>
      ))}
    </div>
  )

  if (item.type === 'company') return (
    <div className='flex flex-wrap gap-1.5'>
      {companies.map(c => (
        <button key={c.id} onClick={() => tog('companyIds', c.id)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${item.companyIds.includes(c.id) ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600 hover:border-teal-200'}`}>
          <Icon name='company' size={13} /> {c.name}{item.companyIds.includes(c.id) && <Icon name='checkSmall' size={12} className='ml-0.5' />}
        </button>
      ))}
    </div>
  )

  if (item.type === 'pc') return (
    <div className='flex items-center gap-3'>
      <div>
        <label className='block text-xs text-gray-400 mb-1'>PC From</label>
        <input type='number' min={1} max={99} value={item.pcFrom} onChange={e => upd('pcFrom', e.target.value)} placeholder='40'
          className='w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
      </div>
      <span className='text-gray-300 mt-4'>—</span>
      <div>
        <label className='block text-xs text-gray-400 mb-1'>PC To</label>
        <input type='number' min={1} max={99} value={item.pcTo} onChange={e => upd('pcTo', e.target.value)} placeholder='60'
          className='w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
      </div>
      {item.pcFrom && item.pcTo && (
        <span className='mt-4 px-2.5 py-1 bg-red-50 border border-red-200 rounded text-xs font-semibold text-red-700'>PC {item.pcFrom}–{item.pcTo}</span>
      )}
    </div>
  )

  if (item.type === 'department') return (
    <div className={`grid grid-cols-2 gap-1 ${maxH} overflow-y-auto`}>
      {departments.map(d => (
        <label key={d.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${item.departmentIds.includes(d.id) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
          <input type='checkbox' checked={item.departmentIds.includes(d.id)} onChange={() => tog('departmentIds', d.id)} className='w-3 h-3 accent-blue-600 flex-shrink-0' />
          <span className='truncate font-medium'>{d.name}</span>
        </label>
      ))}
    </div>
  )

  if (item.type === 'employee') return (
    <div>
      <div className='flex gap-1.5 mb-2'>
        {[['manual','Manual','user'],['userlist','Userlist','clipboard']].map(([m,lbl,ic]) => (
          <button key={m} onClick={() => upd('empMode', m)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${item.empMode===m ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-200'}`}>
            <Icon name={ic} size={13} /> {lbl}
          </button>
        ))}
      </div>
      {item.empMode === 'manual' && (
        <>
          <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder='Cari nama / NIK…'
            className='w-full px-2.5 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-400 mb-1.5' />
          <div className={`space-y-1 ${maxH} overflow-y-auto`}>
            {filteredEmps.map(e => (
              <label key={e.id} className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border cursor-pointer text-xs transition ${item.employeeIds.includes(e.id) ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type='checkbox' checked={item.employeeIds.includes(e.id)} onChange={() => tog('employeeIds', e.id)} className='w-3 h-3 accent-red-600 flex-shrink-0' />
                <span className='font-semibold text-gray-700 truncate'>{e.name}</span>
                <span className='text-gray-400 flex-shrink-0'>{e.nik}</span>
              </label>
            ))}
          </div>
          {item.employeeIds.length > 0 && <p className='text-xs text-gray-400 mt-1'>{item.employeeIds.length} dipilih</p>}
        </>
      )}
      {item.empMode === 'userlist' && (
        <select value={item.userlistId ?? ''} onChange={e => upd('userlistId', e.target.value ? +e.target.value : null)}
          className={`w-full max-w-xs px-2.5 py-1.5 border rounded-lg text-sm outline-none focus:border-red-400 ${!item.userlistId ? 'border-amber-300 text-amber-600' : 'border-red-300 text-gray-700'}`}>
          <option value=''>— pilih userlist —</option>
          {userlists.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
    </div>
  )

  if (item.type === 'userlist') return (
    <select value={item.userlistId ?? ''} onChange={e => upd('userlistId', e.target.value ? +e.target.value : null)}
      className={`w-full max-w-xs px-2.5 py-1.5 border rounded-lg text-sm outline-none focus:border-red-400 ${!item.userlistId ? 'border-amber-300 text-amber-600' : 'border-red-300 text-gray-700'}`}>
      <option value=''>— pilih userlist —</option>
      {userlists.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  )

  return null
}

// ── ConditionRow ──────────────────────────────────────────────────────────────
function ConditionRow({ cond, onChange, onRemove, ...rest }) {
  const meta = COND_TYPES.find(c => c.value === cond.type)
  return (
    <div className='border border-gray-200 rounded-lg overflow-hidden'>
      <div className='flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200'>
        <span className='text-gray-500'><Icon e={meta?.icon} size={15} /></span>
        <span className='text-xs font-bold text-gray-700'>{meta?.label}</span>
        <select value={cond.type}
          onChange={e => onChange({ ...makeCondition(e.target.value), id: cond.id })}
          className='ml-auto text-xs text-gray-600 bg-white border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-red-400'>
          {COND_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button onClick={onRemove}
          className='w-5 h-5 bg-red-100 text-red-500 rounded flex items-center justify-center text-xs hover:bg-red-200 flex-shrink-0'>×</button>
      </div>
      <div className='px-3 py-2.5'>
        <SubSelector item={cond} onChange={onChange} compact {...rest} />
      </div>
    </div>
  )
}

// ── LevelRow (vertical list item for approval chain) ─────────────────────────
function LevelRow({ level, idx, total, onMove, onRemove, onChange, sharedProps, canRemove }) {
  const meta      = LEVEL_TYPES.find(t => t.value === level.type)
  const isDynamic = DYNAMIC_TYPES.includes(level.type)

  const accentCls = isDynamic
    ? 'border-emerald-300 bg-emerald-50'
    : 'border-gray-200 bg-white'

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${accentCls}`}>
      {/* Header */}
      <div className='flex items-center gap-2 px-4 py-2.5 border-b border-gray-100'>
        {/* Step badge */}
        <div className='w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center flex-shrink-0'>
          {idx + 2}
        </div>

        {/* Type selector — grouped */}
        <select value={level.type}
          onChange={e => onChange({ ...makeLevel(e.target.value), id: level.id })}
          className='text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-red-400 min-w-0 w-40 flex-shrink'>
          {['Criteria','Dynamic','Userlist','Auto'].map(g => (
            <optgroup key={g} label={`── ${g} ──`}>
              {LEVEL_TYPES.filter(t => t.group === g).map(t =>
                <option key={t.value} value={t.value}>{t.label}</option>
              )}
            </optgroup>
          ))}
        </select>

        {isDynamic && (
          <span className='text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0'>Dynamic</span>
        )}


        {/* Reorder */}
        <div className='flex gap-0.5 flex-shrink-0 ml-auto'>
          <button onClick={() => onMove('up')} disabled={idx === 0}
            className='w-5 h-5 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs flex items-center justify-center'><Icon name='arrowUp' size={12} /></button>
          <button onClick={() => onMove('down')} disabled={idx === total - 1}
            className='w-5 h-5 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs flex items-center justify-center'><Icon name='arrowDown' size={12} /></button>
        </div>

        <button onClick={onRemove} disabled={!canRemove}
          title={canRemove ? 'Hapus level ini' : 'Minimal 1 level approval'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0 transition ${
            canRemove
              ? 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 cursor-pointer'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}>
          <Icon name='trash' size={13} />
        </button>
      </div>

      {/* Body — dynamic types show hint only, others show sub-selector */}
      {isDynamic ? (
        meta?.hint && (
          <div className='px-4 py-2.5 text-xs text-emerald-700 bg-emerald-50/50 flex items-start gap-2'>
            <span className='flex-shrink-0 text-gray-400'><Icon name='info' size={16} /></span>
            <span>{meta.hint}</span>
          </div>
        )
      ) : (
        <div className='px-4 py-3'>
          <SubSelector item={level} onChange={onChange} compact {...sharedProps} />
        </div>
      )}
    </div>
  )
}

// ── ApprovalChain ─────────────────────────────────────────────────────────────
function ApprovalChain({ levels, onUpdateLevels, sharedProps }) {
  const [addType, setAddType] = useState('role')

  const addLevel    = ()        => onUpdateLevels([...levels, makeLevel(addType)])
  const removeLevel = (id)      => { if (levels.length > 1) onUpdateLevels(levels.filter(l => l.id !== id)) }
  const moveLevel   = (idx, dir) => {
    const n = [...levels]
    if (dir === 'up' && idx > 0)               { [n[idx-1],n[idx]]=[n[idx],n[idx-1]] }
    else if (dir === 'down' && idx < n.length-1){ [n[idx],n[idx+1]]=[n[idx+1],n[idx]] }
    onUpdateLevels(n)
  }
  const updateLevel = (id, next) => onUpdateLevels(levels.map(l => l.id === id ? next : l))

  return (
    <div>
      {/* Submitter node */}
      <div className='flex items-center gap-3 mb-3'>
        <div className='flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl'>
          <span className='text-gray-500'><Icon name='user' size={16} /></span>
          <div>
            <div className='text-xs font-bold text-gray-500'>Step 1 — Employee</div>
            <div className='text-xs text-gray-400'>Submitter · Fixed</div>
          </div>
        </div>
        <span className='text-gray-300'><Icon name='arrowDown' size={16} /></span>
      </div>

      {/* Level rows */}
      <div className='space-y-2 mb-3'>
        {levels.map((lv, idx) => (
          <div key={lv.id}>
            <LevelRow
              level={lv} idx={idx} total={levels.length}
              onMove={(dir) => moveLevel(idx, dir)}
              onRemove={() => removeLevel(lv.id)}
              onChange={(next) => updateLevel(lv.id, next)}
              sharedProps={sharedProps}
              canRemove={levels.length > 1}
            />
            {idx < levels.length - 1 && <div className='flex items-center justify-center py-1'><span className='text-gray-300'><Icon name='arrowDown' size={15} /></span></div>}
          </div>
        ))}
      </div>

      {/* Add level row */}
      <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
        <span className='text-xs text-gray-400 font-semibold flex-shrink-0'>+ level:</span>
        <select value={addType} onChange={e => setAddType(e.target.value)}
          className='text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-red-400'>
          {['Criteria','Dynamic','Userlist','Auto'].map(g => (
            <optgroup key={g} label={`── ${g} ──`}>
              {LEVEL_TYPES.filter(t => t.group === g).map(t =>
                <option key={t.value} value={t.value}>{t.label}</option>
              )}
            </optgroup>
          ))}
        </select>
        <button onClick={addLevel}
          className='px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition'>
          + Add Level
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkflowSettingsPage() {
  const t = useT()
  const { userlists }                              = useUserlistStore()
  const { positions, companies, departments }      = useStructureStore()
  const { employees }                              = useEmployeeStore()
  const { workflows, updateWorkflow, addWorkflow,
          deleteWorkflow }                         = useWorkflowStore()

  const [selected,        setSelected       ] = useState(workflows[0]?.id ?? 1)
  const [rowCondTypes,    setRowCondTypes   ] = useState({})
  const [rowEmpCondTypes, setRowEmpCondTypes] = useState({})
  const [showAddPage,     setShowAddPage    ] = useState(false)
  const [addPageName,     setAddPageName    ] = useState('')
  const [pageSearch,      setPageSearch     ] = useState('')
  const [notifCondTypes,  setNotifCondTypes ] = useState({})
  const [msg,             setMsg            ] = useState(null)

  // Pages already in the list (by name)
  const usedNames = workflows.map(w => w.name)
  const availablePages = PAGE_LOV.filter(p => !usedNames.includes(p.name))

  const handleAddPage = () => {
    const page = PAGE_LOV.find(p => p.name === addPageName)
    if (!page) return
    const newWf = {
      id: Date.now(), name: page.name, icon: page.icon, active: true,
      notifications: [], elseRow: null,
      submitters: [makeSubmitterRow()],
    }
    addWorkflow(newWf)
    setSelected(newWf.id)
    setShowAddPage(false)
    setAddPageName('')
  }

  const handleDeleteWorkflow = (id) => {
    if (workflows.length <= 1) return
    const remaining = workflows.filter(w => w.id !== id)
    deleteWorkflow(id)
    if (selected === id) setSelected(remaining[0]?.id ?? null)
  }

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const wf       = workflows.find(w => w.id === selected)
  const updateWf = (key, val) => updateWorkflow(selected, { [key]: val })

  const updateSubmitters   = (rows)         => updateWf('submitters', rows)
  const addSubmitterRow    = ()             => updateSubmitters([...(wf.submitters||[]), makeSubmitterRow()])
  const removeSubmitterRow = (rowId)        => updateSubmitters((wf.submitters||[]).filter(r => r.id !== rowId))
  const updateRow          = (rowId, patch) => updateSubmitters((wf.submitters||[]).map(r => r.id===rowId ? {...r,...patch} : r))

  const getRowCondType = (rowId) => rowCondTypes[rowId] ?? 'role'
  const setRowCondType = (rowId, type) => setRowCondTypes(p => ({ ...p, [rowId]: type }))

  const addCondToRow    = (rowId) => {
    const row = (wf.submitters||[]).find(r => r.id===rowId)
    if (row) updateRow(rowId, { conditions: [...row.conditions, makeCondition(getRowCondType(rowId))] })
  }
  const removeCondFromRow = (rowId, condId) => {
    const row = (wf.submitters||[]).find(r => r.id===rowId)
    if (row) updateRow(rowId, { conditions: row.conditions.filter(c => c.id!==condId) })
  }
  const updateCondInRow = (rowId, condId, next) => {
    const row = (wf.submitters||[]).find(r => r.id===rowId)
    if (row) updateRow(rowId, { conditions: row.conditions.map(c => c.id===condId ? next : c) })
  }

  // ── employee conditions ──
  const getRowEmpCondType = (rowId) => rowEmpCondTypes[rowId] ?? 'department'
  const setRowEmpCondType = (rowId, type) => setRowEmpCondTypes(p => ({ ...p, [rowId]: type }))

  const addEmpCondToRow = (rowId) => {
    const row = (wf.submitters||[]).find(r => r.id===rowId)
    if (row) updateRow(rowId, { employeeConditions: [...(row.employeeConditions||[]), makeCondition(getRowEmpCondType(rowId))] })
  }
  const removeEmpCondFromRow = (rowId, condId) => {
    const row = (wf.submitters||[]).find(r => r.id===rowId)
    if (row) updateRow(rowId, { employeeConditions: (row.employeeConditions||[]).filter(c => c.id!==condId) })
  }
  const updateEmpCondInRow = (rowId, condId, next) => {
    const row = (wf.submitters||[]).find(r => r.id===rowId)
    if (row) updateRow(rowId, { employeeConditions: (row.employeeConditions||[]).map(c => c.id===condId ? next : c) })
  }

  // ── else row ──
  const enableElse  = () => updateWf('elseRow', makeElseRow())
  const disableElse = () => updateWf('elseRow', null)
  const updateElse  = (patch) => updateWf('elseRow', { ...wf.elseRow, ...patch })

  // ── notifications ──
  const updateNotifs        = (rows)            => updateWf('notifications', rows)
  const addNotifRow         = ()                => updateNotifs([...(wf.notifications||[]), makeNotifRow()])
  const removeNotifRow      = (rowId)           => updateNotifs((wf.notifications||[]).filter(r => r.id !== rowId))
  const updateNotifRow      = (rowId, patch)    => updateNotifs((wf.notifications||[]).map(r => r.id===rowId ? {...r,...patch} : r))
  const getNotifCondType    = (rowId)           => notifCondTypes[rowId] ?? 'role'
  const setNotifCondType    = (rowId, type)     => setNotifCondTypes(p => ({ ...p, [rowId]: type }))
  const addCondToNotif      = (rowId)           => {
    const row = (wf.notifications||[]).find(r => r.id===rowId)
    if (row) updateNotifRow(rowId, { conditions: [...row.conditions, makeCondition(getNotifCondType(rowId))] })
  }
  const removeCondFromNotif = (rowId, condId)   => {
    const row = (wf.notifications||[]).find(r => r.id===rowId)
    if (row) updateNotifRow(rowId, { conditions: row.conditions.filter(c => c.id!==condId) })
  }
  const updateCondInNotif   = (rowId, condId, next) => {
    const row = (wf.notifications||[]).find(r => r.id===rowId)
    if (row) updateNotifRow(rowId, { conditions: row.conditions.map(c => c.id===condId ? next : c) })
  }

  const handleSave = () => flash('Konfigurasi workflow disimpan dan aktif untuk semua page terkait.')

  const sharedProps = { positions, companies, departments, employees, userlists }

  return (
    <div>
      <PageHeader
        icon={<Icon name='shuffle' />}
        title='Workflow Settings'
        subtitle='Konfigurasi alur persetujuan per page. Setiap page memiliki workflow uniknya sendiri.'
      />

      {msg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg mb-4 inline-block ${msg.type==='error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {msg.text}
        </div>
      )}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6'>
        <StatCard label='Total Page' value={workflows.length} icon={<Icon name='file' />} tone='brand' />
        <StatCard label='Aktif'      value={workflows.filter(w => w.active).length} icon={<Icon name='check' />} tone='green' />
        <StatCard label='Tersedia'   value={availablePages.length} icon={<Icon name='plus' />} tone='blue' hint='page belum dikonfigurasi' />
      </div>

      <div className='flex gap-6'>

        {/* Left — page list */}
        <div className='w-60 flex-shrink-0'>
          <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
            <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between'>
              <p className='text-xs font-bold text-gray-500 uppercase tracking-wide'>Page</p>
              <button onClick={() => { setShowAddPage(v => !v); setAddPageName(availablePages[0]?.name ?? '') }}
                className='w-6 h-6 bg-red-100 text-red-700 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-red-200 transition'>
                +
              </button>
            </div>

            {/* Search */}
            <div className='px-3 py-2 border-b border-gray-100'>
              <div className='flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-red-400 transition'>
                <span className='text-gray-400'><Icon name='search' size={14} /></span>
                <input
                  value={pageSearch}
                  onChange={e => setPageSearch(e.target.value)}
                  placeholder='Cari page…'
                  className='flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none'
                />
                {pageSearch && (
                  <button onClick={() => setPageSearch('')} className='text-gray-400 hover:text-gray-600 text-xs leading-none'><Icon name='close' size={13} /></button>
                )}
              </div>
            </div>

            {/* Add page dropdown */}
            {showAddPage && (
              <div className='px-3 py-3 border-b border-gray-100 bg-red-50 space-y-2'>
                <p className='text-xs font-semibold text-red-700'>Tambah Page:</p>
                {availablePages.length === 0 ? (
                  <p className='text-xs text-gray-400'>Semua page sudah ditambahkan.</p>
                ) : (
                  <>
                    <select value={addPageName} onChange={e => setAddPageName(e.target.value)}
                      className='w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-red-400'>
                      {PAGE_LOV_SECTIONS.map(section => {
                        const opts = availablePages.filter(p => p.section === section)
                        if (!opts.length) return null
                        return (
                          <optgroup key={section} label={section}>
                            {opts.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                          </optgroup>
                        )
                      })}
                    </select>
                    <div className='flex gap-2'>
                      <button onClick={handleAddPage}
                        className='flex-1 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition'>
                        Add
                      </button>
                      <button onClick={() => setShowAddPage(false)}
                        className='flex-1 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition'>
                        Batal
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {(() => {
              const filtered = workflows.filter(w => !pageSearch || w.name.toLowerCase().includes(pageSearch.toLowerCase()))
              if (filtered.length === 0) return (
                <div className='px-4 py-6 text-center text-xs text-gray-400'>
                  Tidak ada page cocok dengan <span className='font-semibold text-gray-600'>"{pageSearch}"</span>
                </div>
              )
              return filtered.map(w => (
              <div key={w.id}
                className={`group flex items-center gap-2 px-3 py-3 cursor-pointer transition border-l-2 ${selected===w.id ? 'border-red-500 bg-red-50' : 'border-transparent hover:bg-gray-50'}`}
                onClick={() => setSelected(w.id)}>
                <span className='flex-shrink-0 text-gray-500'><Icon e={w.icon} size={18} /></span>
                <div className='flex-1 min-w-0'>
                  <div className={`text-xs font-semibold truncate ${selected===w.id ? 'text-red-700' : 'text-gray-700'}`}>{w.name}</div>
                  <div className={`text-xs mt-0.5 font-medium ${w.active ? 'text-green-500' : 'text-gray-400'}`}>{w.active ? <span className='inline-flex items-center gap-1'><span className='w-1.5 h-1.5 rounded-full bg-green-500' />Aktif</span> : <span className='inline-flex items-center gap-1'><span className='w-1.5 h-1.5 rounded-full bg-gray-300' />Nonaktif</span>}</div>
                </div>
                {workflows.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteWorkflow(w.id) }}
                    className='opacity-0 group-hover:opacity-100 w-5 h-5 bg-red-100 text-red-400 rounded flex items-center justify-center text-xs hover:bg-red-200 flex-shrink-0 transition'>
                    <Icon name='trash' size={13} />
                  </button>
                )}
              </div>
            ))
            })()}
          </div>
        </div>

        {/* Right */}
        {wf && (
          <div className='flex-1 space-y-5 min-w-0'>

            {/* Header */}
            <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 flex items-center gap-4'>
              <span className='text-gray-500'><Icon e={wf.icon} size={30} /></span>
              <div className='flex-1'>
                <h2 className='text-lg font-bold text-gray-800'>{wf.name}</h2>
                <p className='text-xs text-gray-400 mt-0.5'>{(wf.submitters||[]).length} submitter row</p>
              </div>
              <div className='relative' onClick={() => updateWf('active', !wf.active)}>
                <div className={`w-11 h-6 rounded-full transition cursor-pointer ${wf.active ? 'bg-red-600' : 'bg-gray-300'}`} />
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${wf.active ? 'left-6' : 'left-1'}`} />
              </div>
            </div>

            {/* Submitter rows */}
            <div className='space-y-4'>
              {(wf.submitters||[]).map((row, rowIdx) => (
                <div key={row.id}>
                  {rowIdx > 0 && (
                    <div className='flex items-center gap-3 mb-4'>
                      <div className='flex-1 h-px bg-gray-200' />
                      <span className='text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full'>OR</span>
                      <div className='flex-1 h-px bg-gray-200' />
                    </div>
                  )}
                  <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
                    {/* Row header */}
                    <div className='flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100'>
                      <div className='w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center flex-shrink-0'>{rowIdx+1}</div>
                      <span className='text-sm font-bold text-gray-700'>Submitter #{rowIdx+1}</span>
                      <span className='text-xs text-gray-400'>
                        {row.conditions.length === 0 ? 'semua submitter' : `${row.conditions.length} submitter cond`}
                        {(row.employeeConditions||[]).length > 0 && ` · ${row.employeeConditions.length} employee cond`}
                        {' · '}{row.levels.length} level approval
                      </span>
                      <button onClick={() => removeSubmitterRow(row.id)}
                        className='ml-auto text-xs text-red-400 hover:text-red-600 font-semibold transition flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-50'>
                        <Icon name='trash' size={13} className='inline align-[-2px]' /> Hapus
                      </button>
                    </div>

                    {/* Description */}
                    <div className='px-5 pt-4 pb-0'>
                      <label className='block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5'>Description</label>
                      <input
                        value={row.description ?? ''}
                        onChange={e => updateRow(row.id, { description: e.target.value })}
                        placeholder='Deskripsi singkat untuk submitter rule ini…'
                        className='w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 text-gray-700'
                      />
                    </div>

                    <div className='p-5 grid grid-cols-2 gap-6'>

                      {/* Left: Submitter Conditions + Employee Conditions */}
                      <div className='space-y-5'>

                        {/* Submitter Conditions */}
                        <div>
                          <div className='flex items-center gap-2 mb-3'>
                            <p className='text-xs font-bold text-gray-500 uppercase tracking-wide'><Icon name='search' size={13} className='inline align-[-2px]' /> Submitter Conditions</p>
                            <span className='text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded'>Siapa yang submit</span>
                          </div>
                          <div className='space-y-2'>
                            {row.conditions.map((cond, condIdx) => (
                              <div key={cond.id} className='flex gap-2 items-start'>
                                {condIdx > 0 && (
                                  <div className='flex-shrink-0 pt-2.5'>
                                    <span className='text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded'>AND</span>
                                  </div>
                                )}
                                <div className='flex-1'>
                                  <ConditionRow
                                    cond={cond}
                                    onChange={(next) => updateCondInRow(row.id, cond.id, next)}
                                    onRemove={() => removeCondFromRow(row.id, cond.id)}
                                    {...sharedProps}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={`flex items-center gap-2 ${row.conditions.length > 0 ? 'mt-2 pt-2 border-t border-gray-100' : ''}`}>
                            <span className='text-xs text-gray-400 font-semibold flex-shrink-0'>+ kondisi:</span>
                            <select value={getRowCondType(row.id)} onChange={e => setRowCondType(row.id, e.target.value)}
                              className='text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-red-400'>
                              {COND_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <button onClick={() => addCondToRow(row.id)}
                              className='px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-red-100 hover:text-red-700 transition'>Add</button>
                          </div>
                          {row.conditions.length === 0 && <p className='text-xs text-gray-400 mt-1'>Tidak ada kondisi = semua karyawan.</p>}
                        </div>

                        {/* AND connector between the two condition blocks */}
                        {((row.employeeConditions||[]).length > 0 || true) && (
                          <div className='flex items-center gap-2'>
                            <div className='flex-1 h-px bg-gray-200' />
                            <span className='text-xs font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full'>AND</span>
                            <div className='flex-1 h-px bg-gray-200' />
                          </div>
                        )}

                        {/* Employee Conditions */}
                        <div className='bg-blue-50/50 border border-blue-100 rounded-xl p-3'>
                          <div className='flex items-center gap-2 mb-3'>
                            <p className='text-xs font-bold text-blue-600 uppercase tracking-wide'><Icon name='user' size={13} className='inline align-[-2px]' /> Employee Conditions</p>
                            <span className='text-xs text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded'>Karyawan yang diproses</span>
                          </div>
                          <div className='space-y-2'>
                            {(row.employeeConditions||[]).map((cond, condIdx) => (
                              <div key={cond.id} className='flex gap-2 items-start'>
                                {condIdx > 0 && (
                                  <div className='flex-shrink-0 pt-2.5'>
                                    <span className='text-xs font-bold text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded'>AND</span>
                                  </div>
                                )}
                                <div className='flex-1'>
                                  <ConditionRow
                                    cond={cond}
                                    onChange={(next) => updateEmpCondInRow(row.id, cond.id, next)}
                                    onRemove={() => removeEmpCondFromRow(row.id, cond.id)}
                                    {...sharedProps}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={`flex items-center gap-2 ${(row.employeeConditions||[]).length > 0 ? 'mt-2 pt-2 border-t border-blue-100' : ''}`}>
                            <span className='text-xs text-blue-400 font-semibold flex-shrink-0'>+ kondisi:</span>
                            <select value={getRowEmpCondType(row.id)} onChange={e => setRowEmpCondType(row.id, e.target.value)}
                              className='text-xs text-gray-600 bg-white border border-blue-200 rounded px-2 py-1 outline-none focus:border-blue-400'>
                              {COND_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <button onClick={() => addEmpCondToRow(row.id)}
                              className='px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition'>Add</button>
                          </div>
                          {(row.employeeConditions||[]).length === 0 && (
                            <p className='text-xs text-blue-400 mt-1'>Tidak ada kondisi = berlaku untuk semua karyawan.</p>
                          )}
                        </div>

                      </div>

                      {/* Right: Approval Levels */}
                      <div>
                        <p className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-3'><Icon name='shuffle' size={13} className='inline align-[-2px]' /> Approval Levels</p>
                        <ApprovalChain
                          levels={row.levels}
                          onUpdateLevels={(levels) => updateRow(row.id, { levels })}
                          sharedProps={sharedProps}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addSubmitterRow}
              className='w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-2'>
              <Icon name='plus' size={14} className='inline align-[-2px]' /> Tambah Submitter Row
            </button>
            {(wf.submitters||[]).length === 0 && (
              <p className='text-xs text-gray-400 text-center -mt-3'>Tidak ada submitter row — semua karyawan dapat mengajukan.</p>
            )}

            {/* ── ELSE block ── */}
            {(wf.submitters||[]).length > 0 && (
              <>
                {wf.elseRow ? (
                  <div>
                    {/* ELSE separator */}
                    <div className='flex items-center gap-3 my-4'>
                      <div className='flex-1 h-px bg-gray-200' />
                      <span className='text-xs font-bold text-gray-500 bg-gray-100 border border-gray-300 px-3 py-1 rounded-full'>ELSE</span>
                      <div className='flex-1 h-px bg-gray-200' />
                    </div>

                    <div className='bg-white rounded-xl shadow-sm overflow-hidden border-2 border-dashed border-gray-300'>
                      {/* Header */}
                      <div className='flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100'>
                        <span className='text-xs font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full'>ELSE</span>
                        <span className='text-xs text-gray-400'>Dijalankan jika tidak ada Submitter di atas yang match</span>
                        <button onClick={disableElse}
                          className='ml-auto text-xs text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-50 transition'>
                          <Icon name='trash' size={13} className='inline align-[-2px]' /> Hapus
                        </button>
                      </div>

                      <div className='p-5 space-y-4'>
                        {/* Description */}
                        <div>
                          <label className='block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5'>Description</label>
                          <input
                            value={wf.elseRow.description}
                            onChange={e => updateElse({ description: e.target.value })}
                            placeholder='Deskripsi untuk kondisi else ini…'
                            className='w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 text-gray-700'
                          />
                        </div>

                        {/* Approval Levels */}
                        <div>
                          <p className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-3'><Icon name='shuffle' size={13} className='inline align-[-2px]' /> Approval Levels</p>
                          <ApprovalChain
                            levels={wf.elseRow.levels}
                            onUpdateLevels={(levels) => updateElse({ levels })}
                            sharedProps={sharedProps}
                          />
                          <div className='flex items-center gap-3 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100 flex-wrap'>
                            <span className='flex items-center gap-1'><span className='w-2.5 h-2.5 rounded-full bg-emerald-200 border border-emerald-400 inline-block'/>Dynamic (resolved at runtime)</span>
                            <span className='ml-auto'>reorder · hapus</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className='flex items-center gap-3 my-4'>
                      <div className='flex-1 h-px bg-gray-200' />
                      <span className='text-xs font-bold text-gray-400'>ELSE</span>
                      <div className='flex-1 h-px bg-gray-200' />
                    </div>
                    <button onClick={enableElse}
                      className='w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2'>
                      <Icon name='plus' size={14} className='inline align-[-2px]' /> Tambah kondisi Else
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Notification */}
            <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <h3 className='text-sm font-bold text-gray-700'><Icon name='bell' size={14} className='inline align-[-2px]' /> Notification</h3>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    Definisikan siapa yang mendapat notifikasi email. Setiap baris dievaluasi <span className='font-semibold text-gray-600'>OR</span>, kondisi dalam baris dievaluasi <span className='font-semibold text-gray-600'>AND</span>.
                    Tanpa baris = tidak ada notifikasi.
                  </p>
                  <div className='flex items-start gap-1.5 mt-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg'>
                    <span className='text-amber-500 flex-shrink-0 mt-0.5'><Icon name='warning' size={13} /></span>
                    <p className='text-xs text-amber-700'>
                      Notifikasi hanya dikirim ketika approval workflow telah selesai sampai ujung —
                      status <span className='font-bold'>Completed</span> (semua level disetujui) atau <span className='font-bold'>Denied</span> (ditolak di salah satu level).
                    </p>
                  </div>
                </div>
                {(wf.notifications||[]).length > 0 && (
                  <span className='text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-3'>
                    {wf.notifications.length} row
                  </span>
                )}
              </div>

              <div className='space-y-3'>
                {(wf.notifications||[]).map((row, rowIdx) => (
                  <div key={row.id}>
                    {rowIdx > 0 && (
                      <div className='flex items-center gap-3 my-3'>
                        <div className='flex-1 h-px bg-gray-200' />
                        <span className='text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full'>OR</span>
                        <div className='flex-1 h-px bg-gray-200' />
                      </div>
                    )}
                    <div className='border border-gray-200 rounded-xl overflow-hidden'>
                      <div className='flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100'>
                        <span className='text-xs font-bold text-gray-500'>Notif #{rowIdx + 1}</span>
                        <span className='text-xs text-gray-400'>
                          {row.conditions.length === 0 ? '— semua user' : `${row.conditions.length} kondisi`}
                        </span>
                        <button onClick={() => removeNotifRow(row.id)}
                          className='ml-auto text-xs text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 px-2 py-0.5 rounded hover:bg-red-50 transition'>
                          <Icon name='trash' size={13} className='inline align-[-2px]' /> Hapus
                        </button>
                      </div>
                      <div className='p-3 space-y-2'>
                        {row.conditions.map((cond, condIdx) => (
                          <div key={cond.id} className='flex gap-2 items-start'>
                            {condIdx > 0 && (
                              <div className='flex-shrink-0 pt-2.5'>
                                <span className='text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded'>AND</span>
                              </div>
                            )}
                            <div className='flex-1'>
                              <ConditionRow
                                cond={cond}
                                onChange={(next) => updateCondInNotif(row.id, cond.id, next)}
                                onRemove={() => removeCondFromNotif(row.id, cond.id)}
                                {...sharedProps}
                              />
                            </div>
                          </div>
                        ))}
                        <div className={`flex items-center gap-2 ${row.conditions.length > 0 ? 'pt-2 border-t border-gray-100' : ''}`}>
                          <span className='text-xs text-gray-400 font-semibold flex-shrink-0'>+ kondisi:</span>
                          <select value={getNotifCondType(row.id)} onChange={e => setNotifCondType(row.id, e.target.value)}
                            className='text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-red-400'>
                            {COND_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          <button onClick={() => addCondToNotif(row.id)}
                            className='px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition'>Add</button>
                          {row.conditions.length === 0 && <span className='text-xs text-gray-400'>Tidak ada kondisi = semua user.</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addNotifRow}
                className='mt-3 w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2'>
                <Icon name='plus' size={14} className='inline align-[-2px]' /> Tambah Notification Row
              </button>
              {(wf.notifications||[]).length === 0 && (
                <p className='text-xs text-gray-400 text-center mt-2'>Tidak ada row — tidak ada notifikasi yang dikirim.</p>
              )}
            </div>

            <div className='flex justify-end'>
              <ActionButton onClick={handleSave}><Icon name='save' size={14} className='inline align-[-2px]' /> Simpan Perubahan</ActionButton>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
