'use client'
import { useState, useEffect } from 'react'
import { useEmployeeStore }              from '@/store/employeeStore'
import { useStructureStore }             from '@/store/structureStore'
import { useWorkflowStore, getLevelLabel } from '@/store/workflowStore'
import { PA_ACTION_ICON }                from '@/store/personnelActionStore'
import Icon from '@/components/ui/Icon'
import { useT }                          from '@/store/languageStore'

const STEP = {
  done:    { icon: '✅', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  pending: { icon: '⏳', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  waiting: { icon: '⬜', color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200'  },
  rejected:{ icon: '❌', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300'   },
}

const OVERALL = {
  Draft:    { cls: 'bg-gray-100 text-gray-600',      label: 'Draft' },
  Submitted:{ cls: 'bg-yellow-100 text-yellow-700',  label: 'Menunggu Approval' },
  Approved: { cls: 'bg-blue-100 text-blue-700',      label: 'Disetujui' },
  Rejected: { cls: 'bg-red-100 text-red-700',        label: 'Ditolak' },
  Applied:  { cls: 'bg-green-100 text-green-700',    label: 'Applied' },
}

const LEVEL_ICON = {
  supervisor:        '⬆️',
  indirect_sup:      '⬆️⬆️',
  supervisor_pc53:   '🎯⬆️',
  indirect_sup_pc53: '🎯⬆️⬆️',
  role:              '🎭',
  department:        '🗂️',
  position:          '📌',
  employee:          '👤',
  userlist:          '📋',
  auto_approved:     '✅',
}

// ── Condition evaluation ─────────────────────────────────────────────────────
function evalCond(cond, emp) {
  if (!emp) return false
  switch (cond.type) {
    case 'department':
      return (cond.departmentIds || []).map(Number).includes(Number(emp.departmentId))
    case 'position':
      return (cond.positionIds || []).map(Number).includes(Number(emp.positionId))
    case 'employee':
      return (cond.employeeIds || []).map(Number).includes(Number(emp.id))
    case 'pc': {
      const pc = Number(emp.payClass || 0)
      return pc >= Number(cond.pcFrom || 0) && pc <= Number(cond.pcTo || 999)
    }
    default:
      return true
  }
}

function findMatchingRow(workflow, emp) {
  if (!workflow?.submitters?.length) return null
  for (const row of workflow.submitters) {
    const conds = row.employeeConditions || []
    if (conds.length === 0 || conds.every(c => evalCond(c, emp))) return row
  }
  return workflow.elseRow || null
}

// ── Step building ────────────────────────────────────────────────────────────
function buildStepsFromLevels(pa, levels) {
  const s = pa.status
  const isDone     = s === 'Approved' || s === 'Applied'
  const isRejected = s === 'Rejected'

  const steps = [{
    key: 'submit', label: 'HR Submit', icon: '📤',
    status: s === 'Draft' ? 'waiting' : 'done',
    date: pa.createdAt, note: null,
  }]

  levels.forEach((lv, i) => {
    let status
    if (s === 'Draft')    status = 'waiting'
    else if (isDone)      status = 'done'
    else if (isRejected)  status = i === 0 ? 'rejected' : 'waiting'
    else                  status = i === 0 ? 'pending'  : 'waiting'

    steps.push({
      key:       `lvl_${i}`,
      label:     getLevelLabel(lv),
      icon:      LEVEL_ICON[lv.type] || '👥',
      status,
      date:      (isDone || (isRejected && i === 0)) ? (pa.approvedAt || null) : null,
      note:      (isRejected && i === 0) ? (pa.rejectNote || null) : null,
      levelType: lv.type,
    })
  })

  if (s === 'Applied') {
    steps.push({ key: 'applied', label: 'Applied', icon: '🎯', status: 'done', date: pa.appliedAt || null, note: null })
  }

  return steps
}

function buildStepsFallback(pa) {
  const s = pa.status
  return [
    { key: 'submit', label: 'HR Submit', icon: '📤',
      status: s === 'Draft' ? 'waiting' : 'done',
      date: pa.createdAt, note: null },
    { key: 'manager', label: 'Manager Review', icon: '👥',
      status: s === 'Submitted' ? 'pending' : s === 'Approved' ? 'done' : s === 'Rejected' ? 'rejected' : s === 'Applied' ? 'done' : 'waiting',
      date: (s === 'Approved' || s === 'Rejected' || s === 'Applied') ? (pa.approvedAt || null) : null,
      note: pa.rejectNote || null },
    ...(s === 'Applied' ? [{ key: 'applied', label: 'Applied', icon: '🎯', status: 'done', date: pa.appliedAt || null, note: null }] : []),
  ]
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PAWorkflowMonitor({ pas, title = 'Workflow Monitor', action, pageName, onView }) {
  const t = useT()
  const { employees }              = useEmployeeStore()
  const { positions, departments } = useStructureStore()
  const { workflows }              = useWorkflowStore()

  const [filter, setFilter] = useState('all')

  const empData  = id => employees.find(e => e.id === Number(id))
  const posLabel = id => positions.find(p => p.id === Number(id))?.name || '—'
  const deptName = id => departments.find(d => d.id === Number(id))?.name || '—'
  const managerOf = empId => {
    const e = empData(empId)
    if (!e?.managerId) return null
    return employees.find(m => m.id === e.managerId)
  }

  const workflow = pageName ? workflows.find(w => w.name === pageName && w.active) : null

  const sorted   = [...pas].sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || 0)
  const counts   = {
    all:       sorted.length,
    pending:   sorted.filter(p => p.status === 'Submitted').length,
    approved:  sorted.filter(p => p.status === 'Approved').length,
    rejected:  sorted.filter(p => p.status === 'Rejected').length,
  }
  const filtered = filter === 'all'      ? sorted
                 : filter === 'pending'  ? sorted.filter(p => p.status === 'Submitted')
                 : filter === 'approved' ? sorted.filter(p => p.status === 'Approved')
                 : filter === 'rejected' ? sorted.filter(p => p.status === 'Rejected')
                 : sorted

  // Default: first (topmost) row selected
  const [selectedId, setSelectedId] = useState(() => filtered[0]?.id ?? null)

  // Auto-select first when filter changes and current selection leaves the list
  useEffect(() => {
    if (filtered.length > 0 && !filtered.find(p => p.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPa = filtered.find(p => p.id === selectedId) ?? null

  // Pre-compute workflow data for selected PA
  const selEmp        = selectedPa ? empData(selectedPa.employeeId) : null
  const selMgr        = selectedPa ? managerOf(selectedPa.employeeId) : null
  const selMatchedRow = findMatchingRow(workflow, selEmp)
  const selLevels     = selMatchedRow?.levels || []
  const selSteps      = selectedPa
    ? (selLevels.length > 0 ? buildStepsFromLevels(selectedPa, selLevels) : buildStepsFallback(selectedPa))
    : []

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>

      {/* Header */}
      <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
        <div>
          <h2 className='text-sm font-bold text-gray-700'><Icon name='shuffle' size={14} className='inline align-[-2px]' /> {title}</h2>
          <p className='text-xs text-gray-400 mt-0.5'>
            {t('Status persetujuan setiap PA', 'Approval status for each PA')}
            {action && <span className='ml-2 font-semibold text-red-600'>{action}</span>}
          </p>
        </div>
        <div className='flex gap-1'>
          {[['all','Semua'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([v, lbl]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filter === v ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {lbl} <span className={`ml-1 ${filter === v ? 'text-red-200' : 'text-gray-400'}`}>({counts[v] ?? sorted.length})</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className='px-6 py-10 text-center text-sm text-gray-400'>
          {t('Tidak ada PA.', 'No PA records.')}
        </div>
      )}

      {/* ── Compact row list (selectable) ──────────────────────────────────── */}
      <div className='divide-y divide-gray-50'>
        {filtered.map(pa => {
          const isSelected = pa.id === selectedId
          const e          = empData(pa.employeeId)
          const overall    = OVERALL[pa.status] ?? OVERALL.Draft

          // Mini step pills for the row
          const rowEmp        = empData(pa.employeeId)
          const rowMatchedRow = findMatchingRow(workflow, rowEmp)
          const rowLevels     = rowMatchedRow?.levels || []
          const rowSteps      = rowLevels.length > 0 ? buildStepsFromLevels(pa, rowLevels) : buildStepsFallback(pa)
          const pendingStep   = rowSteps.find(s => s.status === 'pending')

          return (
            <div key={pa.id}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition border-l-2 ${
                isSelected
                  ? 'bg-red-50/70 border-l-red-500'
                  : 'hover:bg-gray-50/80 border-l-transparent'
              }`}
              onClick={() => setSelectedId(pa.id)}>

              {/* Selection dot */}
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-red-500' : 'bg-gray-200'}`} />

              {/* Overall status badge */}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${overall.cls}`}>
                {overall.label}
              </span>

              {/* PA info */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded'>
                    {pa.paNumber}
                  </span>
                  <span className='text-sm font-semibold text-gray-800 truncate'>{e?.name || '—'}</span>
                  <span className='text-xs text-gray-300'>·</span>
                  <span className='text-xs text-gray-400 truncate'>{deptName(pa.fromDepartmentId)}</span>
                </div>
                <div className='text-xs text-gray-400 mt-0.5 truncate'>
                  {posLabel(pa.fromPositionId)}
                  {pa.toPositionId !== pa.fromPositionId && (
                    <span className='text-red-500 font-semibold'> <Icon e='→' size={14} className='inline align-[-2px]' /> {posLabel(pa.toPositionId)}</span>
                  )}
                  {pa.effectiveDate && <span className='ml-1.5'>· {pa.effectiveDate}</span>}
                  {rowMatchedRow?.description && (
                    <span className='ml-1.5 text-red-400 italic'>· {rowMatchedRow.description}</span>
                  )}
                </div>
              </div>

              {/* Mini step pills */}
              <div className='flex items-center gap-1 flex-shrink-0'>
                {rowSteps.map((step, i) => {
                  const cfg = STEP[step.status]
                  return (
                    <div key={step.key} className='flex items-center gap-0.5'>
                      {i > 0 && <span className='text-gray-200 text-xs'><Icon e='→' size={15} /></span>}
                      <span title={`${step.label}: ${step.status}`}
                        className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        <Icon e={cfg.icon} size={13} />
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Pending indicator */}
              {pendingStep && (
                <span className='text-xs text-amber-600 font-semibold flex-shrink-0 flex items-center gap-1'>
                  <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block' />
                  {pendingStep.label}
                </span>
              )}

              {/* View/Edit button */}
              {onView && (
                <button
                  onClick={ev => { ev.stopPropagation(); onView(pa) }}
                  className='flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition'>
                  {pa.status === 'Applied' ? t('View','View') : t('View / Edit','View / Edit')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Single workflow detail panel for selected PA ────────────────────── */}
      {selectedPa && (
        <div className='border-t border-gray-100 bg-gray-50/50 px-6 py-5'>

          {/* Selected PA label */}
          <div className='flex items-center gap-2 mb-4'>
            <span className='font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded'>
              {selectedPa.paNumber}
            </span>
            <span className='text-xs font-semibold text-gray-700'>{selEmp?.name || '—'}</span>
            <span className='text-gray-200 text-xs'>·</span>
            <span className='text-xs text-gray-400'>{deptName(selectedPa.fromDepartmentId)}</span>
            <span className='ml-auto'>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${(OVERALL[selectedPa.status] ?? OVERALL.Draft).cls}`}>
                {selectedPa.status === 'Submitted' ? <><Icon name='refresh' size={12} className='inline align-[-2px]' /> In Progress</>
                 : selectedPa.status === 'Approved' ? <><Icon name='party' size={12} className='inline align-[-2px]' /> Approved</>
                 : selectedPa.status === 'Rejected' ? <><Icon name='ban' size={12} className='inline align-[-2px]' /> Rejected</>
                 : selectedPa.status === 'Applied'  ? <><Icon name='check' size={12} className='inline align-[-2px]' /> Applied</>
                 : <><Icon name='edit' size={12} className='inline align-[-2px]' /> Draft</>}
              </span>
            </span>
          </div>

          {/* Workflow rule banner */}
          {workflow ? (
            <div className='mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5'>
              <span className='flex-shrink-0 text-gray-500'><Icon name='shuffle' size={16} /></span>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-1.5 flex-wrap'>
                  <span className='text-xs font-bold text-red-700'>{workflow.name}</span>
                  {selMatchedRow?.description ? (
                    <>
                      <span className='text-red-300 text-xs'>·</span>
                      <span className='text-xs font-semibold text-red-600 italic'>"{selMatchedRow.description}"</span>
                    </>
                  ) : (
                    <span className='text-xs text-red-400 italic'>— (rule tanpa deskripsi)</span>
                  )}
                </div>
                <div className='text-xs text-red-400 mt-0.5'>
                  {selLevels.length > 0
                    ? `${selLevels.length} level approval: ${selLevels.map(lv => getLevelLabel(lv)).join(' → ')}`
                    : 'Tidak ada level approval terkonfigurasi'}
                </div>
              </div>
            </div>
          ) : (
            <div className='mb-4 flex items-center gap-2 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400'>
              <span className='text-amber-500'><Icon name='warning' size={14} /></span>
              <span>
                {pageName
                  ? `Workflow "${pageName}" belum dikonfigurasi di Workflow Settings.`
                  : 'Workflow belum dikonfigurasi untuk halaman ini.'}
              </span>
            </div>
          )}

          {/* Step nodes */}
          <div className='flex items-start gap-0 overflow-x-auto py-2'>
            {selSteps.map((step, i) => {
              const cfg = STEP[step.status]
              const isManagerFallback = step.key === 'manager'

              return (
                <div key={step.key} className='flex items-start flex-shrink-0'>
                  <div className={`flex flex-col items-center border-2 rounded-xl px-4 py-3 w-44 text-center shadow-sm relative ${cfg.bg} ${cfg.border}`}>
                    {step.status === 'pending' && (
                      <span className='absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping' />
                    )}
                    <span className='mb-1 text-gray-500'><Icon e={step.icon} size={22} /></span>
                    <span className={`text-xs font-bold mb-1 ${cfg.color}`}>Step {i + 1}</span>
                    <span className='text-xs font-semibold text-gray-700'>{step.label}</span>

                    {isManagerFallback && selMgr && (
                      <div className='mt-2 text-center w-full'>
                        <div className='text-xs text-gray-600 font-semibold truncate'>{selMgr.name}</div>
                        <div className='text-xs text-gray-400'>Manager</div>
                      </div>
                    )}

                    {!isManagerFallback && step.status === 'done' && step.key !== 'submit' && (
                      <div className='mt-1 text-xs text-green-600 font-semibold'>Done</div>
                    )}

                    {step.date && (
                      <div className='mt-1 text-xs text-gray-400 font-mono'>{step.date}</div>
                    )}

                    {step.status === 'pending' && (
                      <div className='mt-1.5 text-xs text-amber-600 font-semibold'>
                        {t('Menunggu aksi…', 'Waiting for action…')}
                      </div>
                    )}

                    {step.note && (
                      <div className='mt-2 bg-red-100 rounded-lg px-2 py-1 w-full'>
                        <p className='text-xs text-red-600 italic break-words'>"{step.note}"</p>
                      </div>
                    )}
                  </div>

                  {i < selSteps.length - 1 && (
                    <div className='flex items-center h-[130px] flex-shrink-0'>
                      <span className='text-gray-300 text-lg mx-2'><Icon e='→' size={15} /></span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* PA note */}
            {selectedPa.note && (
              <>
                <div className='flex items-center h-[130px] flex-shrink-0'>
                  <span className='text-gray-300 text-lg mx-2'>|</span>
                </div>
                <div className='flex-shrink-0 self-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-w-xs shadow-sm'>
                  <p className='text-xs font-bold text-gray-400 uppercase mb-1'>Note</p>
                  <p className='text-xs text-gray-600'>{selectedPa.note}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
