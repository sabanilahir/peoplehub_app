'use client'
import React, { useState, useMemo } from 'react'
import { useLeaveStore }    from '@/store/leaveStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useAuthStore }     from '@/store/authStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { daysBetween }      from '@/utils/dateUtils'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SearchBar, FilterBar, FilterPill,
  StatusBadge, EmptyState,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'

// ── Shared helpers ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  Approved:  { cls: 'bg-green-100 text-green-700',  icon: '✅' },
  Pending:   { cls: 'bg-amber-100 text-amber-700',  icon: '⏳' },
  Rejected:  { cls: 'bg-red-100 text-red-700',      icon: '❌' },
  Withdrawn: { cls: 'bg-gray-100 text-gray-500',    icon: '↩️' },
  Waiting:   { cls: 'bg-gray-100 text-gray-400',    icon: '⬜' },
}
const STEP_BORDER = {
  Approved: 'border-green-300', Pending: 'border-amber-300',
  Rejected: 'border-red-300',   Waiting: 'border-gray-200', Withdrawn: 'border-gray-200',
}
const txnId = (id) => `TXN-${String(id).padStart(6, '0')}`
const fmtTs = (ts) => {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date(ts))
  } catch { return ts }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TransactionManagerPage() {
  const t = useT()
  const { leaves, approveStep, rejectStep, delegateStep } = useLeaveStore()
  const { employees }   = useEmployeeStore()
  const { currentUser } = useAuthStore()
  const { workflows }   = useWorkflowStore()

  // All unique workflowName values present in leave data
  const leaveWorkflowNames = useMemo(() => {
    const names = new Set(leaves.map(l => l.workflowName).filter(Boolean))
    // Preserve order from workflowStore, then append any unknown names
    const ordered = workflows.map(w => w.name).filter(n => names.has(n))
    names.forEach(n => { if (!ordered.includes(n)) ordered.push(n) })
    return ordered
  }, [leaves, workflows])

  const [selectedWf,   setSelectedWf  ] = useState('') // '' = all
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterQuery,  setFilterQuery ] = useState('')
  const [expandedId,   setExpandedId  ] = useState(null)

  // Delegate modal
  const [dlg,       setDlg      ] = useState(null)
  const [dlgSearch, setDlgSearch] = useState('')
  const [dlgTarget, setDlgTarget] = useState('')

  // Override modal
  const [ovr,     setOvr    ] = useState(null)
  const [ovrNote, setOvrNote] = useState('')

  // ── Filtered data ──────────────────────────────────────────────────────────
  const baseList = useMemo(() => {
    let list = [...leaves].sort((a, b) => b.id - a.id)
    if (selectedWf) list = list.filter(l => l.workflowName === selectedWf)
    return list
  }, [leaves, selectedWf])

  const stats = useMemo(() => ({
    total:     baseList.length,
    pending:   baseList.filter(l => l.status === 'Pending').length,
    approved:  baseList.filter(l => l.status === 'Approved').length,
    rejected:  baseList.filter(l => l.status === 'Rejected').length,
    withdrawn: baseList.filter(l => l.status === 'Withdrawn').length,
  }), [baseList])

  const filtered = useMemo(() => {
    let list = baseList
    if (filterStatus !== 'all') list = list.filter(l => l.status.toLowerCase() === filterStatus)
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase()
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        txnId(l.id).toLowerCase().includes(q) ||
        String(l.id).includes(q)
      )
    }
    return list
  }, [baseList, filterStatus, filterQuery])

  const empOptions = useMemo(() =>
    employees.filter(e =>
      !dlgSearch.trim() || e.name.toLowerCase().includes(dlgSearch.trim().toLowerCase())
    ).slice(0, 30)
  , [employees, dlgSearch])

  const openDelegate = (leaveId, level, label) => {
    setDlg({ leaveId, level, label }); setDlgSearch(''); setDlgTarget('')
  }
  const handleDelegate = () => {
    if (!dlg || !dlgTarget) return
    const emp = employees.find(e => e.id === +dlgTarget)
    if (!emp) return
    delegateStep(dlg.leaveId, dlg.level, emp.id, emp.name)
    setDlg(null)
  }
  const openOverride = (leaveId, level, type) => { setOvr({ leaveId, level, type }); setOvrNote('') }
  const handleOverride = () => {
    if (!ovr) return
    if (ovr.type === 'approve') approveStep(ovr.leaveId, ovr.level, currentUser.id, currentUser.name, ovrNote)
    else                        rejectStep(ovr.leaveId,  ovr.level, currentUser.id, currentUser.name, ovrNote)
    setOvr(null)
  }

  const handleWfChange = (val) => {
    setSelectedWf(val)
    setExpandedId(null)
    setFilterQuery('')
    setFilterStatus('all')
  }

  return (
    <div>
      <PageHeader
        icon={<Icon name='folder' />}
        title='Transaction Manager'
        subtitle='Monitor semua approval flow. Delegasi atau override langsung jika diperlukan.'
      />


      {/* ── Main card ── */}
      <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>

        {/* Filter bar */}
        <div className='flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-wrap'>

          {/* LOV — Workflow Page */}
          <div className='flex items-center gap-2 flex-shrink-0'>
            <label className='text-xs font-semibold text-gray-500 whitespace-nowrap'>Workflow</label>
            <select
              value={selectedWf}
              onChange={e => handleWfChange(e.target.value)}
              className='px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 bg-white text-gray-700 font-medium cursor-pointer'>
              <option value=''>Semua</option>
              {workflows.map(w => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className='w-px h-6 bg-gray-200 flex-shrink-0' />

          {/* Search */}
          <SearchBar
            value={filterQuery}
            onChange={setFilterQuery}
            placeholder='Cari karyawan atau Transaction ID…'
            className='w-64'
          />

          {/* Status filter */}
          <FilterBar>
            {[['all','Semua'],['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['withdrawn','Withdrawn']].map(([v, lbl]) => (
              <FilterPill key={v} active={filterStatus === v} onClick={() => setFilterStatus(v)}>
                {lbl}
              </FilterPill>
            ))}
          </FilterBar>

          <span className='ml-auto text-xs text-gray-400 flex-shrink-0'>{filtered.length} transaksi</span>
        </div>

        {/* ── Transaction table ── */}
        <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-gray-50'>
                  {['TXN ID','Karyawan','Workflow','Jenis Cuti','Periode','Hari','Submitted By','Status','Step Aktif',''].map(h => (
                    <th key={h} className='text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className='px-4 py-8'>
                      <EmptyState title={t('Tidak ada transaksi','No transactions')} description={t('Tidak ada transaksi ditemukan.','No transactions found.')} />
                    </td>
                  </tr>
                )}
                {filtered.map(leave => {
                  const isOpen  = expandedId === leave.id
                  const steps   = leave.steps ?? []
                  const pending = steps.find(s => s.status === 'Pending')
                  const scfg    = STATUS_CFG[leave.status] ?? STATUS_CFG.Pending
                  const days    = daysBetween(leave.start, leave.end)
                  const byHR    = leave.submittedByName && leave.submittedByName !== leave.name

                  return (
                    <React.Fragment key={leave.id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : leave.id)}
                        className={`border-t border-gray-100 cursor-pointer transition ${isOpen ? 'bg-red-50 border-l-2 border-l-red-400' : 'hover:bg-gray-50'}`}>
                        <td className='px-4 py-3 font-mono text-xs text-gray-400'>{txnId(leave.id)}</td>
                        <td className='px-4 py-3 font-semibold text-gray-800'>{leave.name}</td>
                        <td className='px-4 py-3 text-xs text-gray-500 whitespace-nowrap'>{leave.workflowName ?? '—'}</td>
                        <td className='px-4 py-3 text-gray-600'>{leave.type}</td>
                        <td className='px-4 py-3 text-gray-500 text-xs whitespace-nowrap'>{leave.start} <Icon e='→' size={14} className='inline align-[-2px]' /> {leave.end}</td>
                        <td className='px-4 py-3 text-right text-gray-600'>{days}</td>
                        <td className='px-4 py-3 text-xs text-gray-500'>
                          {leave.submittedByName ?? leave.name}
                          {byHR && <span className='ml-1.5 text-xs bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded'>HR</span>}
                        </td>
                        <td className='px-4 py-3'>
                          <StatusBadge status={leave.status}><Icon e={scfg.icon} size={12} className='inline align-[-2px]' /> {leave.status}</StatusBadge>
                        </td>
                        <td className='px-4 py-3'>
                          {pending ? (
                            <span className='flex items-center gap-1.5 text-xs text-amber-600 font-medium'>
                              <span className='w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block' />
                              {pending.delegatedTo
                                ? <span>Delegasi <Icon e='→' size={14} className='inline align-[-2px]' /> <span className='font-semibold'>{pending.delegatedToName?.split(' ')[0]}</span></span>
                                : pending.label}
                            </span>
                          ) : (
                            <span className='text-xs text-gray-300'>—</span>
                          )}
                        </td>
                        <td className='px-4 py-3 text-gray-400 text-xs select-none'><Icon name={isOpen ? 'arrowUp' : 'arrowDown'} size={12} /></td>
                      </tr>

                      {isOpen && (
                        <tr className='bg-gray-50/70'>
                          <td colSpan={10} className='px-6 py-5'>

                            {/* Meta bar */}
                            <div className='flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 text-xs flex-wrap'>
                              <span className='font-mono font-bold text-gray-400'>{txnId(leave.id)}</span>
                              <span className='text-gray-200'>|</span>
                              <span className='text-gray-400 font-medium'>Status:</span>
                              <span className={`font-bold px-2.5 py-1 rounded-full ${scfg.cls}`}>
                                {leave.status === 'Approved' ? <><Icon name='party' size={12} className='inline align-[-2px]' /> Completed</> : leave.status === 'Rejected' ? <><Icon name='ban' size={12} className='inline align-[-2px]' /> Denied</> : leave.status === 'Withdrawn' ? <><Icon name='undo' size={12} className='inline align-[-2px]' /> Withdrawn</> : <><Icon name='refresh' size={12} className='inline align-[-2px]' /> In Progress</>}
                              </span>
                              <span className='text-gray-200'>|</span>
                              <span className='text-gray-500'>
                                <span className='font-semibold text-gray-600'>Catatan:</span> {leave.note || '—'}
                              </span>
                              {byHR && (
                                <>
                                  <span className='text-gray-200'>|</span>
                                  <span className='text-gray-500'>
                                    Diajukan oleh <span className='font-semibold text-blue-600'>{leave.submittedByName}</span> atas nama {leave.name}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Workflow nodes */}
                            <div className='flex items-start gap-0 overflow-x-auto pb-2'>

                              {/* Submitted node */}
                              <div className='flex items-start flex-shrink-0'>
                                <div className='flex flex-col items-center bg-white border-2 border-blue-200 rounded-xl px-4 py-3 w-40 text-center shadow-sm'>
                                  <span className='mb-1 text-gray-500'><Icon name='upload' size={20} /></span>
                                  <span className='text-xs font-bold text-blue-600 mb-1'>Submitted</span>
                                  <span className='text-xs font-semibold text-gray-700 truncate w-full text-center'>
                                    {(leave.submittedByName ?? leave.name).split(' ')[0]}
                                  </span>
                                  {byHR && (
                                    <span className='text-xs text-gray-400 mt-0.5 truncate w-full text-center'>
                                      on behalf of {leave.name.split(' ')[0]}
                                    </span>
                                  )}
                                  <span className='text-xs text-gray-400 font-mono mt-0.5'>
                                    {fmtTs(leave.submittedAt) !== '—' ? fmtTs(leave.submittedAt) : leave.start}
                                  </span>
                                  <span className='mt-2 text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full'><Icon name='check' size={12} className='inline align-[-2px]' /> Done</span>
                                </div>
                                <div className='flex items-center h-[140px] flex-shrink-0'>
                                  <span className='text-gray-300 text-lg mx-2'><Icon e='→' size={15} /></span>
                                </div>
                              </div>

                              {/* Step nodes */}
                              {steps.map((step, i) => {
                                const sc2    = STATUS_CFG[step.status] ?? STATUS_CFG.Waiting
                                const bdr    = STEP_BORDER[step.status] ?? 'border-gray-200'
                                const isPend = step.status === 'Pending'

                                return (
                                  <div key={step.level} className='flex items-start flex-shrink-0'>
                                    <div className={`flex flex-col border-2 ${bdr} ${sc2.cls} rounded-xl px-4 py-3 w-56 shadow-sm relative`}>
                                      {isPend && <span className='absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping' />}

                                      <div className='flex items-center gap-2 mb-1'>
                                        <span className='text-gray-500'><Icon e={sc2.icon} size={15} /></span>
                                        <span className='text-xs font-bold'>Step {step.level} · {step.label}</span>
                                      </div>

                                      {step.delegatedTo && (
                                        <div className='text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full mb-1.5 w-fit'><Icon e='↪' size={14} className='inline align-[-2px]' /> Delegasi: {step.delegatedToName}
                                        </div>
                                      )}

                                      {step.approverName ? (
                                        <div className='text-xs text-gray-600'>
                                          <div className='font-semibold'>{step.approverName}</div>
                                          <div className='font-mono text-gray-400 mt-0.5'>{fmtTs(step.actedAt)}</div>
                                          {step.note && <div className='italic text-gray-500 mt-0.5'>"{step.note}"</div>}
                                        </div>
                                      ) : (
                                        <div className='text-xs text-gray-400 italic'>
                                          {isPend ? 'Menunggu aksi…' : '—'}
                                        </div>
                                      )}

                                      {isPend && (
                                        <div className='flex flex-wrap gap-1.5 mt-3' onClick={e => e.stopPropagation()}>
                                          <button onClick={() => openDelegate(leave.id, step.level, step.label)}
                                            className='px-2.5 py-1 text-xs font-bold bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition'><Icon e='↪' size={14} className='inline align-[-2px]' /> Delegate
                                          </button>
                                          <button onClick={() => openOverride(leave.id, step.level, 'approve')}
                                            className='px-2.5 py-1 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition'><Icon e='✓' size={14} className='inline align-[-2px]' /> Override
                                          </button>
                                          <button onClick={() => openOverride(leave.id, step.level, 'reject')}
                                            className='px-2.5 py-1 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition'>
                                            <Icon name='close' size={12} className='inline align-[-2px]' /> Reject
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {i < steps.length - 1 && (
                                      <div className='flex items-center h-[140px] flex-shrink-0'>
                                        <span className='text-gray-300 text-lg mx-2'><Icon e='→' size={15} /></span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* ── Delegate Modal ── */}
      {dlg && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={() => setDlg(null)}>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-96 max-h-[80vh] flex flex-col'
            onClick={e => e.stopPropagation()}>
            <h3 className='text-base font-bold text-gray-800 mb-0.5'>Delegasi Approval</h3>
            <p className='text-xs text-gray-500 mb-4'>Step: <span className='font-semibold text-gray-700'>{dlg.label}</span></p>
            <input value={dlgSearch} onChange={e => setDlgSearch(e.target.value)}
              placeholder='Cari karyawan…'
              className='px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400 mb-3 flex-shrink-0' />
            <div className='overflow-y-auto flex-1 space-y-1.5 mb-4'>
              {empOptions.map(emp => (
                <label key={emp.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${+dlgTarget === emp.id ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <input type='radio' name='dlgTarget' value={emp.id}
                    checked={+dlgTarget === emp.id} onChange={e => setDlgTarget(e.target.value)}
                    className='accent-red-600' />
                  <div>
                    <div className='text-sm font-semibold text-gray-700'>{emp.name}</div>
                    <div className='text-xs text-gray-400'>{emp.nik} · <span className='capitalize'>{emp.role}</span></div>
                  </div>
                </label>
              ))}
              {empOptions.length === 0 && (
                <div className='text-xs text-gray-400 text-center py-4'>Tidak ada karyawan ditemukan.</div>
              )}
            </div>
            <div className='flex gap-2 flex-shrink-0'>
              <button onClick={handleDelegate} disabled={!dlgTarget}
                className='flex-1 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-40 transition'>
                Delegasi
              </button>
              <button onClick={() => setDlg(null)}
                className='px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Override Modal ── */}
      {ovr && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={() => setOvr(null)}>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-80'
            onClick={e => e.stopPropagation()}>
            <h3 className={`text-base font-bold mb-1 ${ovr.type === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
              {ovr.type === 'approve' ? <><Icon name='checkSmall' size={12} className='inline align-[-2px]' /> Override Approve</> : <><Icon name='close' size={12} className='inline align-[-2px]' /> Override Reject</>}
            </h3>
            <p className='text-xs text-gray-500 mb-4'>
              Tindakan ini direkam atas nama <span className='font-semibold text-gray-700'>{currentUser?.name}</span> sebagai superadmin.
            </p>
            <textarea value={ovrNote} onChange={e => setOvrNote(e.target.value)}
              placeholder='Catatan (opsional)…' rows={3}
              className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-400 resize-none mb-4' />
            <div className='flex gap-2'>
              <button onClick={handleOverride}
                className={`flex-1 py-2 text-sm font-bold text-white rounded-xl transition ${ovr.type === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                Konfirmasi
              </button>
              <button onClick={() => setOvr(null)}
                className='px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
