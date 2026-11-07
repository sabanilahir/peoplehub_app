'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useLeaveStore }     from '@/store/leaveStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useUserlistStore }  from '@/store/userlistStore'
import { daysBetween }       from '@/utils/dateUtils'
import { useT, useLanguageStore } from '@/store/languageStore'

const STATUS_CFG = {
  Approved:  { label: 'Approved',  color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-300',  icon: '✅' },
  Rejected:  { label: 'Rejected',  color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-300',    icon: '❌' },
  Pending:   { label: 'Pending',   color: 'text-amber-700',  bg: 'bg-amber-100',  border: 'border-amber-300',  icon: '⏳' },
  Waiting:   { label: 'Waiting',   color: 'text-gray-500',   bg: 'bg-gray-100',   border: 'border-gray-200',   icon: '⬜' },
  Withdrawn: { label: 'Withdrawn', color: 'text-gray-400',   bg: 'bg-gray-100',   border: 'border-gray-200',   icon: '↩️' },
}

const OVERALL_CFG = {
  Approved:  { cls: 'bg-green-100 text-green-700'  },
  Rejected:  { cls: 'bg-red-100 text-red-700'      },
  Pending:   { cls: 'bg-amber-100 text-amber-700'  },
  Withdrawn: { cls: 'bg-gray-100 text-gray-500'    },
}

export default function WorkflowMonitor({ leaves, title = 'Workflow Monitor', expandedId = null }) {
  const t = useT()
  const lang = useLanguageStore(s => s.lang)
  const { currentUser }             = useAuthStore()
  const { approveStep, rejectStep } = useLeaveStore()
  const { employees }               = useEmployeeStore()
  const { userlists }               = useUserlistStore()

  const [expanded,      setExpanded     ] = useState(expandedId)
  const [userTimezone,  setUserTimezone  ] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [actionId,      setActionId     ] = useState(null)
  const [actLevel,      setActLevel     ] = useState(null)
  const [actType,       setActType      ] = useState(null)
  const [note,          setNote         ] = useState('')
  const [filter,        setFilter       ] = useState('all')
  const [approverPopup, setApproverPopup] = useState(null)

  useEffect(() => { if (expandedId !== null) setExpanded(expandedId) }, [expandedId])

  // Use system timezone only — no external geolocation API call
  useEffect(() => {
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const formatTimestamp = (actedAt) => {
    if (!actedAt) return null
    try {
      return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
        timeZone: userTimezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(new Date(actedAt))
    } catch {
      return actedAt
    }
  }

  const resolveExpectedApprovers = (step, leave) => {
    const empId = leave.userId
    switch (step.type) {
      case 'supervisor': {
        const supId = getDirectSupervisorId(empId)
        const emp = employees.find(e => e.id === supId)
        return emp ? [emp.name] : []
      }
      case 'indirect_sup': {
        const supId = getIndirectSupervisorId(empId)
        const emp = employees.find(e => e.id === supId)
        return emp ? [emp.name] : []
      }
      case 'role': {
        const roles = step.roles ?? []
        if (!roles.length) return []
        return employees.filter(e => roles.includes(e.role)).map(e => e.name)
      }
      case 'userlist': {
        const ul = userlists.find(u => u.id === step.userlistId)
        if (!ul) return []
        if (ul.type === 'role' && ul.roles?.length)
          return employees.filter(e => ul.roles.includes(e.role)).map(e => e.name)
        if (ul.employeeIds?.length)
          return employees.filter(e => ul.employeeIds.includes(e.id)).map(e => e.name)
        return [ul.name]
      }
      case 'employee': {
        const ids = step.employeeIds ?? []
        return employees.filter(e => ids.includes(e.id)).map(e => e.name)
      }
      case 'auto_approved':
        return ['Auto']
      default:
        return []
    }
  }

  const openAction = (leaveId, level, type) => {
    setActionId(leaveId); setActLevel(level); setActType(type); setNote('')
  }
  const closeAction = () => { setActionId(null); setActLevel(null); setActType(null); setNote('') }

  const confirmAction = () => {
    if (!actionId || !actLevel || !actType) return
    const name = currentUser?.name ?? 'Unknown'
    const id   = currentUser?.id   ?? 0
    if (actType === 'approve') approveStep(actionId, actLevel, id, name, note)
    else                       rejectStep(actionId,  actLevel, id, name, note)
    closeAction()
  }

  const resolveId = (leave) => leave.userId
  const getDirectSupervisorId   = (userId) => employees.find(e => e.id === userId)?.managerId ?? null
  const getIndirectSupervisorId = (userId) => {
    const directId = getDirectSupervisorId(userId)
    return directId ? getDirectSupervisorId(directId) : null
  }

  const canAct = (leave, step) => {
    if (step.status !== 'Pending') return false
    const uid  = currentUser?.id
    const role = currentUser?.role
    if (step.delegatedTo && step.delegatedTo === uid) return true
    const rId  = resolveId(leave)

    switch (step.type) {
      case 'supervisor':
        return getDirectSupervisorId(rId) === uid
      case 'indirect_sup':
        return getIndirectSupervisorId(rId) === uid
      case 'supervisor_pc53':
      case 'indirect_sup_pc53':
        return role === 'manager' || role === 'superadmin'
      case 'role':
        return role === 'hr' || role === 'superadmin'
      case 'userlist':
      case 'employee':
        return role === 'hr' || role === 'superadmin'
      case 'auto_approved':
        return false
      default:
        return role === 'superadmin'
    }
  }

  const sorted = [...leaves].sort((a, b) => b.id - a.id)
  const filtered = filter === 'all' ? sorted : sorted.filter(l => l.status.toLowerCase() === filter)

  const counts = {
    all:      sorted.length,
    pending:  sorted.filter(l => l.status === 'Pending').length,
    approved: sorted.filter(l => l.status === 'Approved').length,
    rejected: sorted.filter(l => l.status === 'Rejected').length,
  }

  const filterTabs = [
    ['all',      t('Semua', 'All')    ],
    ['pending',  'Pending'            ],
    ['approved', 'Approved'           ],
    ['rejected', 'Rejected'           ],
  ]

  return (
    <div className='bg-white rounded-xl shadow-sm'>
      {/* Header */}
      <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
        <div>
          <h2 className='text-sm font-bold text-gray-700'><Icon e='🔀' size={14} className='inline align-[-2px]' /> {title}</h2>
          <p className='text-xs text-gray-400 mt-0.5'>
            {t('Status persetujuan setiap pengajuan cuti', 'Approval status for each leave request')}
            <span className='ml-2 text-gray-300'>·</span>
            <span className='ml-2 font-mono text-gray-400'><Icon e='🌐' size={14} className='inline align-[-2px]' /> {userTimezone}</span>
          </p>
        </div>
        <div className='flex gap-1'>
          {filterTabs.map(([v, lbl]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filter === v ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {lbl} <span className={`ml-1 ${filter === v ? 'text-red-200' : 'text-gray-400'}`}>({counts[v]})</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className='px-6 py-10 text-center text-sm text-gray-400'>
          {t('Tidak ada pengajuan.', 'No submissions.')}
        </div>
      )}

      <div className='divide-y divide-gray-50'>
        {filtered.map(leave => {
          const isOpen  = expanded === leave.id
          const overall = OVERALL_CFG[leave.status] ?? OVERALL_CFG.Pending
          const steps   = leave.steps ?? []
          const days    = daysBetween(leave.start, leave.end)
          const pendingStep = steps.find(s => s.status === 'Pending')

          return (
            <div key={leave.id}>
              <div
                className='flex items-center gap-4 px-6 py-3.5 cursor-pointer hover:bg-gray-50 transition'
                onClick={() => setExpanded(isOpen ? null : leave.id)}>

                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${overall.cls}`}>
                  {leave.status}
                </span>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-semibold text-gray-800'>{leave.name}</span>
                    <span className='text-xs text-gray-400'>·</span>
                    <span className='text-xs text-gray-600'>{leave.type}</span>
                    <span className='text-xs text-gray-400'>·</span>
                    <span className='text-xs text-gray-500'>{days} {t('hari', 'days')}</span>
                  </div>
                  <div className='text-xs text-gray-400 mt-0.5'>{leave.start} — {leave.end}{leave.note && ` · ${leave.note}`}</div>
                </div>

                <div className='flex items-center gap-1.5 flex-shrink-0'>
                  {steps.map((step, i) => {
                    const cfg = STATUS_CFG[step.status] ?? STATUS_CFG.Waiting
                    return (
                      <div key={step.level} className='flex items-center gap-1'>
                        {i > 0 && <span className='text-gray-300 text-xs'><Icon e='→' size={15} /></span>}
                        <span title={`${step.label}: ${step.status}`}
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          {cfg.icon} {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {pendingStep && (
                  <div className='text-xs text-amber-600 font-semibold flex-shrink-0 flex items-center gap-1'>
                    <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block'/>
                    {t('Menunggu', 'Waiting')} {pendingStep.label}
                  </div>
                )}

                <span className='text-gray-300 text-sm flex-shrink-0'>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div className='px-6 pb-5 bg-gray-50/60'>
                  <div className='flex items-center gap-3 pt-3 pb-3 border-b border-gray-100 mb-3'>
                    <span className='text-xs text-gray-400 font-medium'>{t('Transaction ID:', 'Transaction ID:')}</span>
                    <span className='text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded select-all'>
                      TXN-{String(leave.id).padStart(6, '0')}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`TXN-${String(leave.id).padStart(6, '0')}`) }}
                      className='text-xs text-gray-400 hover:text-gray-600 transition'
                      title={t('Salin ID', 'Copy ID')}>
                      📋
                    </button>
                    <span className='text-gray-200'>|</span>
                    <span className='text-xs text-gray-400 font-medium'>{t('Status:', 'Status:')}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${overall.cls}`}>
                      {leave.status === 'Approved'  ? `${t('Selesai', 'Completed')}` :
                       leave.status === 'Rejected'  ? `${t('Ditolak', 'Denied')}` :
                       leave.status === 'Withdrawn' ? `${t('Dibatalkan', 'Withdrawn')}` :
                       `${t('Dalam Proses', 'In Progress')}`}
                    </span>
                  </div>

                  <div className='flex gap-4 overflow-x-auto py-2'>
                    {/* Submitted node */}
                    <div className='flex items-start flex-shrink-0'>
                      <div className='flex flex-col items-center bg-white border-2 border-blue-200 rounded-xl px-4 py-3 w-40 text-center shadow-sm'>
                        <span className='text-xl mb-1'><Icon e='📤' size={15} /></span>
                        <span className='text-xs font-bold text-blue-600 mb-1'>{t('Diajukan', 'Submitted')}</span>
                        <span className='text-xs font-semibold text-gray-700 truncate w-full text-center'>
                          {(leave.submittedByName ?? leave.name).split(' ')[0]}
                        </span>
                        {leave.submittedByName && leave.submittedByName !== leave.name && (
                          <span className='text-xs text-gray-400 mt-0.5 truncate w-full text-center'>
                            {t('atas nama', 'on behalf of')} {leave.name.split(' ')[0]}
                          </span>
                        )}
                        <span className='text-xs text-gray-400 mt-0.5 font-mono'>{formatTimestamp(leave.submittedAt) ?? leave.start}</span>
                        <span className='mt-2 text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full'><Icon e='✅' size={14} className='inline align-[-2px]' /> Done</span>
                      </div>
                      <div className='flex items-center h-[110px]'><span className='text-gray-300 text-lg mx-2'><Icon e='→' size={15} /></span></div>
                    </div>

                    {/* Step nodes */}
                    {steps.map((step, i) => {
                      const cfg    = STATUS_CFG[step.status] ?? STATUS_CFG.Waiting
                      const acting = actionId === leave.id && actLevel === step.level
                      const myTurn = canAct(leave, step)

                      return (
                        <div key={step.level} className='flex items-start flex-shrink-0'>
                          <div className={`flex flex-col items-center border-2 rounded-xl px-4 py-3 w-48 text-center shadow-sm relative ${cfg.bg} ${cfg.border}`}>
                            {step.status === 'Pending' && (
                              <span className='absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping' />
                            )}

                            <span className='text-xl mb-1'><Icon e={cfg.icon} size={16} /></span>
                            <span className={`text-xs font-bold mb-1 ${cfg.color}`}>{t('Step', 'Step')} {step.level}</span>
                            <span className='text-xs font-semibold text-gray-700'>{step.label}</span>
                            {step.delegatedTo && (
                              <span className='mt-1 text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full'>
                                <Icon e='↪' size={14} className='inline align-[-2px]' /> {step.delegatedToName?.split(' ')[0]}
                              </span>
                            )}

                            {step.approverName ? (
                              <div className='mt-2 text-center w-full'>
                                <div className='text-xs text-gray-600 font-semibold truncate'>{step.approverName}</div>
                                <div className='text-xs text-gray-400 font-mono'>{formatTimestamp(step.actedAt)}</div>
                                {step.note && <div className='text-xs text-gray-500 mt-0.5 italic'>"{step.note}"</div>}
                              </div>
                            ) : step.status === 'Pending' ? (() => {
                              const approvers = resolveExpectedApprovers(step, leave)
                              return (
                                <div className='mt-2 text-center w-full'>
                                  {approvers.length === 1 && (
                                    <div className='text-xs text-gray-700 font-semibold truncate'>{approvers[0]}</div>
                                  )}
                                  {approvers.length > 1 && (
                                    <button
                                      onClick={e => { e.stopPropagation(); setApproverPopup(approvers) }}
                                      className='text-xs text-blue-500 hover:text-blue-700 font-semibold underline'>
                                      {approvers.length} {t('orang', 'people')} →
                                    </button>
                                  )}
                                  <div className='text-xs text-amber-600 font-semibold mt-0.5'>{t('Menunggu aksi…', 'Awaiting action…')}</div>
                                </div>
                              )
                            })() : (
                              <div className='mt-1.5 text-xs text-gray-400'>—</div>
                            )}

                            {myTurn && !acting && (
                              <div className='flex gap-1.5 mt-2.5'>
                                <button onClick={e => { e.stopPropagation(); openAction(leave.id, step.level, 'approve') }}
                                  className='px-2.5 py-1 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition'>
                                  <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Setuju', 'Approve')}
                                </button>
                                <button onClick={e => { e.stopPropagation(); openAction(leave.id, step.level, 'reject') }}
                                  className='px-2.5 py-1 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition'>
                                  <Icon e='✕' size={14} className='inline align-[-2px]' /> {t('Tolak', 'Reject')}
                                </button>
                              </div>
                            )}

                            {acting && (
                              <div className='mt-2 w-full' onClick={e => e.stopPropagation()}>
                                <textarea
                                  value={note}
                                  onChange={e => setNote(e.target.value)}
                                  placeholder={t('Catatan (opsional)…', 'Note (optional)…')}
                                  rows={2}
                                  className='w-full text-xs px-2 py-1 border border-gray-200 rounded-lg outline-none focus:border-red-400 resize-none bg-white'
                                />
                                <div className='flex gap-1.5 mt-1.5'>
                                  <button onClick={confirmAction}
                                    className={`flex-1 py-1 text-xs font-bold text-white rounded-lg transition ${actType === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                                    {actType === 'approve' ? `${t('Konfirmasi', 'Confirm')}` : `${t('Tolak', 'Reject')}`}
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); closeAction() }}
                                    className='px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'>
                                    {t('Batal', 'Cancel')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {i < steps.length - 1 && (
                            <div className='flex items-center h-[110px]'><span className='text-gray-300 text-lg mx-2'><Icon e='→' size={15} /></span></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Approver list popup */}
      {approverPopup && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={() => setApproverPopup(null)}>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-72 max-h-[60vh] flex flex-col'
            onClick={e => e.stopPropagation()}>
            <h3 className='text-sm font-bold text-gray-800 mb-3'>{t('Daftar Approver', 'Approver List')}</h3>
            <ul className='space-y-2 overflow-y-auto flex-1 mb-4'>
              {approverPopup.map((name, i) => (
                <li key={i} className='flex items-center gap-2.5 text-sm text-gray-700'>
                  <span className='w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0'>
                    {i + 1}
                  </span>
                  {name}
                </li>
              ))}
            </ul>
            <button onClick={() => setApproverPopup(null)}
              className='w-full py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
              {t('Tutup', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
