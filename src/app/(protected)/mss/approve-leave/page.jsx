'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect }  from 'react'
import { useAuthStore }          from '@/store/authStore'
import { useLeaveStore }         from '@/store/leaveStore'
import { useEmployeeStore }      from '@/store/employeeStore'
import { daysBetween }           from '@/utils/dateUtils'
import WorkflowMonitor           from '@/components/WorkflowMonitor'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton, EmptyState, Input } from '@/components/ui'

// Resolve supervisor chain
function getDirectSupervisorId(userId, employees) {
  return employees.find(e => e.id === userId)?.managerId ?? null
}
function getIndirectSupervisorId(userId, employees) {
  const directId = getDirectSupervisorId(userId, employees)
  return directId ? getDirectSupervisorId(directId, employees) : null
}

function canActOnStep(step, leave, currentUser, employees) {
  if (step.status !== 'Pending') return false
  const uid  = currentUser?.id
  const role = currentUser?.role
  if (role === 'superadmin') return true

  // Check explicit approverId on step
  if (step.approverId && (step.approverId === uid || step.approverId === currentUser?.employeeId)) {
    return true
  }

  if (step.delegatedTo && step.delegatedTo === uid) return true
  const rId  = leave.userId   // approval chain based on the employee, not who submitted
  const targetEmp = employees.find(e => e.id === rId)

  // Check 2-tier approval matrix from employee
  if (step.tier === 'approval_1' && targetEmp?.approver1Id === uid) return true
  if (step.tier === 'approval_2' && targetEmp?.approver2Id === uid) return true

  switch (step.type) {
    case 'coordinator':       return targetEmp?.approver1Id === uid || getDirectSupervisorId(rId, employees) === uid
    case 'manager':           return targetEmp?.approver2Id === uid || role === 'manager' || role === 'hr_manager'
    case 'supervisor':        return getDirectSupervisorId(rId, employees)   === uid
    case 'indirect_sup':      return getIndirectSupervisorId(rId, employees) === uid
    case 'supervisor_pc53':
    case 'indirect_sup_pc53': return role === 'manager' || role === 'superadmin'
    case 'role':              return role === 'hr'       || role === 'hr_manager' || role === 'superadmin'
    case 'userlist':
    case 'employee':          return role === 'hr'       || role === 'hr_manager' || role === 'superadmin'
    default:                  return role === 'superadmin' || role === 'hr_manager'
  }
}

const statusTone = (s) => ({
  Approved:  'success',
  Pending:   'warning',
  Rejected:  'danger',
  Withdrawn: 'neutral',
}[s] || 'neutral')

export default function ApproveLeavePage() {
  const t = useT()
  const { currentUser }              = useAuthStore()
  const { leaves, approveStep, rejectStep } = useLeaveStore()
  const { employees }                = useEmployeeStore()

  const [selectedLeaveId, setSelectedLeaveId] = useState(null)
  const [noteMap,  setNoteMap  ] = useState({})   // { [leaveId]: note }
  const [rejectId, setRejectId ] = useState(null) // leaveId being rejected (show note input)

  // ── Flowable Tasks State ──────────────────────────────────────────────
  const [flowableTasks, setFlowableTasks] = useState([])
  const [loadingFlowable, setLoadingFlowable] = useState(true)
  const [flowableActionId, setFlowableActionId] = useState(null) // taskId being acted upon
  const [flowableRejectId, setFlowableRejectId] = useState(null) // taskId being rejected
  const [flowableRejectNote, setFlowableRejectNote] = useState('')
  const [toastMsg, setToastMsg] = useState(null)

  const flashToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load Flowable tasks for current user
  const loadFlowableTasks = async () => {
    if (!currentUser) return
    try {
      setLoadingFlowable(true)
      const username = currentUser.username || currentUser.nik || ''
      const res = await fetch(`/api/flowable/tasks?candidateOrAssigned=${encodeURIComponent(username)}`)
      if (res.ok) {
        const json = await res.json()
        const tasks = json.data?.data || []
        setFlowableTasks(tasks)
      }
    } catch (err) {
      console.error('[Flowable Tasks] Load error:', err)
    } finally {
      setLoadingFlowable(false)
    }
  }

  useEffect(() => {
    loadFlowableTasks()
  }, [currentUser])

  // Helper to extract process variable from Flowable task
  const getTaskVar = (task, name, fallback = '—') => {
    const v = (task.variables || []).find(x => x.name === name)
    return v ? (v.value ?? fallback) : fallback
  }

  // Approve Flowable Task
  const handleFlowableApprove = async (task) => {
    try {
      setFlowableActionId(task.id)
      const res = await fetch(`/api/flowable/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          variables: [
            { name: 'approved', value: true, type: 'boolean' },
            { name: 'approverUsername', value: currentUser.username || '', type: 'string' },
            { name: 'approverName', value: currentUser.name || '', type: 'string' },
            { name: 'actedAt', value: new Date().toISOString(), type: 'string' },
            { name: 'approvalNote', value: 'Disetujui oleh Supervisor', type: 'string' },
          ]
        })
      })

      const data = await res.json()
      if (data.success) {
        flashToast(`Permohonan cuti ${getTaskVar(task, 'employeeName')} berhasil disetujui via Flowable!`, 'success')
        await loadFlowableTasks()
      } else {
        flashToast(data.error || 'Gagal menyetujui tugas Flowable', 'error')
      }
    } catch (err) {
      flashToast('Error: ' + err.message, 'error')
    } finally {
      setFlowableActionId(null)
    }
  }

  // Reject Flowable Task
  const handleFlowableReject = async (task) => {
    try {
      setFlowableActionId(task.id)
      const res = await fetch(`/api/flowable/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          variables: [
            { name: 'approved', value: false, type: 'boolean' },
            { name: 'approverUsername', value: currentUser.username || '', type: 'string' },
            { name: 'approverName', value: currentUser.name || '', type: 'string' },
            { name: 'actedAt', value: new Date().toISOString(), type: 'string' },
            { name: 'approvalNote', value: flowableRejectNote || 'Ditolak oleh Supervisor', type: 'string' },
          ]
        })
      })

      const data = await res.json()
      if (data.success) {
        flashToast(`Permohonan cuti ${getTaskVar(task, 'employeeName')} ditolak via Flowable.`, 'warning')
        setFlowableRejectId(null)
        setFlowableRejectNote('')
        await loadFlowableTasks()
      } else {
        flashToast(data.error || 'Gagal menolak tugas Flowable', 'error')
      }
    } catch (err) {
      flashToast('Error: ' + err.message, 'error')
    } finally {
      setFlowableActionId(null)
    }
  }

  // Leaves where current user can act on the current pending step
  const actionable = leaves.filter(l => {
    const pendingStep = (l.steps || []).find(s => s.status === 'Pending')
    return pendingStep && canActOnStep(pendingStep, l, currentUser, employees)
  })

  // Leaves where current user has already acted on any step
  const acted = leaves.filter(l =>
    (l.steps || []).some(s => s.approverId === currentUser?.id) &&
    !actionable.find(a => a.id === l.id)
  )

  // Auto-select first actionable, or first acted
  useEffect(() => {
    const first = actionable[0] ?? acted[0]
    if (first && !selectedLeaveId) setSelectedLeaveId(first.id)
  }, [leaves])

  const handleApprove = async (l) => {
    const step = (l.steps || []).find(s => s.status === 'Pending')
    if (!step) return
    const note = noteMap[l.id] || ''
    approveStep(l.id, step.level, currentUser.id, currentUser.name, note)
    setNoteMap(m => ({ ...m, [l.id]: '' }))
    flashToast(`Permohonan cuti ${l.name} disetujui.`, 'success')

    // Sinkronisasi ke DB PostgreSQL jika ada id numerik
    try {
      await fetch(`/api/leave/requests/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          approverId: currentUser.id,
          approverName: currentUser.name,
          note,
        }),
      })
    } catch (e) {}
  }

  const handleReject = async (l) => {
    const step = (l.steps || []).find(s => s.status === 'Pending')
    if (!step) return
    const note = noteMap[l.id] || ''
    rejectStep(l.id, step.level, currentUser.id, currentUser.name, note)
    setNoteMap(m => ({ ...m, [l.id]: '' }))
    setRejectId(null)
    flashToast(`Permohonan cuti ${l.name} ditolak.`, 'warning')

    // Sinkronisasi ke DB PostgreSQL jika ada id numerik
    try {
      await fetch(`/api/leave/requests/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          approverId: currentUser.id,
          approverName: currentUser.name,
          note,
        }),
      })
    } catch (e) {}
  }

  const selectedLeave = [...actionable, ...acted].find(l => l.id === selectedLeaveId) ?? null

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        icon='✅'
        title='Approve Leave'
        subtitle={t('Review dan setujui pengajuan cuti tim sesuai level approval Anda.', 'Review and approve leave requests at your approval level.')}
      />

      {/* ── Toast Alert ── */}
      {toastMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
          toastMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          toastMsg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-teal-50 border-teal-200 text-teal-800'
        }`}>
          <div className='flex items-center gap-2'>
            <span>{toastMsg.type === 'error' ? '⚠️' : '🎉'}</span>
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className='text-gray-400 hover:text-gray-600 text-sm font-bold'>×</button>
        </div>
      )}

      {/* ── FLOWABLE BPMN TASK INBOX ── */}
      <SectionCard
        title='Inbox Persetujuan Flowable BPMN'
        icon='⚡'
        actions={
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md'>
              <span className='w-2 h-2 rounded-full bg-teal-500 animate-pulse' />
              Flowable Engine
            </span>
            <StatusBadge tone={flowableTasks.length > 0 ? 'warning' : 'neutral'}>
              {flowableTasks.length} {t('Tugas', 'Tasks')}
            </StatusBadge>
            <button
              onClick={loadFlowableTasks}
              disabled={loadingFlowable}
              className='p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition'
              title='Muat ulang tugas Flowable'
            >
              <Icon e={loadingFlowable ? '⌛' : '🔄'} size={14} className={loadingFlowable ? 'animate-spin' : ''} />
            </button>
          </div>
        }
        bodyClass='p-0'
      >
        <DataTable
          columns={[
            { label: t('Karyawan Pemohon', 'Employee') },
            { label: t('Departemen / Jabatan', 'Dept / Role') },
            { label: t('Jenis Cuti', 'Leave Type') },
            { label: t('Periode & Durasi', 'Dates') },
            { label: t('Alasan Cuti', 'Reason') },
            { label: 'Status BPMN' },
            { label: t('Aksi Persetujuan', 'Action'), align: 'right' },
          ]}
          className='ring-0 shadow-none rounded-none'
        >
          {loadingFlowable ? (
            <tr>
              <td colSpan={7} className='px-4 py-8 text-center text-xs text-gray-400'>
                <div className='inline-flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin' />
                  <span>Memeriksa task Flowable engine...</span>
                </div>
              </td>
            </tr>
          ) : flowableTasks.length ? (
            flowableTasks.map(task => {
              const empName = getTaskVar(task, 'employeeName', 'Karyawan')
              const empNik = getTaskVar(task, 'employeeNik', '')
              const dept = getTaskVar(task, 'employeeDept', '')
              const pos = getTaskVar(task, 'employeePosition', '')
              const lType = getTaskVar(task, 'leaveType', 'Cuti Tahunan')
              const start = getTaskVar(task, 'startDate', '')
              const end = getTaskVar(task, 'endDate', '')
              const days = getTaskVar(task, 'days', '1')
              const reason = getTaskVar(task, 'reason', '')
              const isRejecting = flowableRejectId === task.id
              const isActioning = flowableActionId === task.id

              return (
                <Tr key={task.id} className='bg-white hover:bg-teal-50/30 transition'>
                  <Td>
                    <div className='font-bold text-gray-900'>{empName}</div>
                    <div className='text-[11px] text-gray-500 font-mono'>{empNik}</div>
                  </Td>
                  <Td>
                    <div className='text-xs font-semibold text-gray-700'>{dept || '—'}</div>
                    <div className='text-[11px] text-gray-400 truncate max-w-[180px]'>{pos || '—'}</div>
                  </Td>
                  <Td>
                    <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100'>
                      {lType}
                    </span>
                  </Td>
                  <Td>
                    <div className='text-xs font-medium text-gray-800'>{start} <Icon e='→' size={12} className='inline' /> {end}</div>
                    <div className='text-[11px] text-teal-700 font-semibold'>{days} hari kerja</div>
                  </Td>
                  <Td className='max-w-[200px]'>
                    <div className='text-xs text-gray-600 italic truncate' title={reason}>
                      "{reason || 'Tidak ada catatan'}"
                    </div>
                  </Td>
                  <Td>
                    <div className='flex flex-col gap-0.5'>
                      <StatusBadge tone='warning'>
                        {task.name || 'Supervisor Approval'}
                      </StatusBadge>
                      <span className='text-[10px] text-gray-400 font-mono'>ID: {task.id.slice(0, 8)}…</span>
                    </div>
                  </Td>
                  <Td align='right' className='whitespace-nowrap'>
                    {isRejecting ? (
                      <div className='flex items-center justify-end gap-1.5'>
                        <input
                          type='text'
                          value={flowableRejectNote}
                          onChange={e => setFlowableRejectNote(e.target.value)}
                          placeholder='Alasan penolakan…'
                          className='px-2.5 py-1 text-xs border border-red-300 rounded-lg outline-none focus:ring-1 focus:ring-red-400 w-36 bg-white'
                          autoFocus
                        />
                        <button
                          onClick={() => handleFlowableReject(task)}
                          disabled={isActioning}
                          className='px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition'
                        >
                          {isActioning ? '...' : 'Tolak'}
                        </button>
                        <button
                          onClick={() => { setFlowableRejectId(null); setFlowableRejectNote('') }}
                          className='px-2 py-1 text-xs text-gray-600 hover:text-gray-800'
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className='flex items-center justify-end gap-1.5'>
                        <button
                          onClick={() => handleFlowableApprove(task)}
                          disabled={isActioning}
                          className='inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 transition disabled:opacity-50'
                          style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                          title='Setujui permohonan melalui Flowable Engine'
                        >
                          <Icon e='✓' size={12} className='inline' />
                          {isActioning ? 'Memproses...' : 'Setujui'}
                        </button>
                        <button
                          onClick={() => { setFlowableRejectId(task.id); setFlowableRejectNote('') }}
                          disabled={isActioning}
                          className='inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition'
                          title='Tolak permohonan'
                        >
                          <Icon e='✗' size={12} className='inline' />
                          Tolak
                        </button>
                      </div>
                    )}
                  </Td>
                </Tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={7} className='px-4 py-8'>
                <EmptyState icon='🎉' title={t('Semua tugas Flowable selesai.', 'No pending Flowable tasks.')} subtitle='Tidak ada pengajuan cuti bawahan yang perlu disetujui saat ini.' />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>

      {/* ── Pending Approval ── */}
      <SectionCard
        title={t('Menunggu Persetujuan', 'Pending Approval')}
        icon='⏳'
        actions={<StatusBadge tone='warning'>{actionable.length}</StatusBadge>}
        bodyClass='p-0'
      >
        <DataTable
          columns={[
            { label: t('Karyawan', 'Employee') },
            { label: t('Jenis', 'Type') },
            { label: t('Mulai', 'Start') },
            { label: t('Selesai', 'End') },
            { label: t('Hari', 'Days'), align: 'right' },
            { label: t('Keterangan', 'Note') },
            { label: 'Step' },
            { label: t('Aksi', 'Action'), align: 'right' },
          ]}
          className='ring-0 shadow-none rounded-none'
        >
          {actionable.length ? actionable.map(l => {
            const pendingStep = (l.steps || []).find(s => s.status === 'Pending')
            const isRejecting = rejectId === l.id
            return (
              <Tr key={l.id} onClick={() => setSelectedLeaveId(l.id)} active={selectedLeaveId === l.id}>
                <Td className='font-medium text-gray-800'>{l.name}</Td>
                <Td>{l.type}</Td>
                <Td>{l.start}</Td>
                <Td>{l.end}</Td>
                <Td align='right' className='tabular-nums'>{daysBetween(l.start, l.end)}</Td>
                <Td className='text-gray-500'>{l.note || '—'}</Td>
                <Td>
                  {pendingStep && (
                    <StatusBadge tone='warning'>
                      Step {pendingStep.level} · {pendingStep.label}
                    </StatusBadge>
                  )}
                </Td>
                <Td align='right' className='whitespace-nowrap' >
                  <div onClick={e => e.stopPropagation()}>
                    {isRejecting ? (
                      <div className='flex items-center justify-end gap-2'>
                        <Input
                          value={noteMap[l.id] || ''}
                          onChange={e => setNoteMap(m => ({ ...m, [l.id]: e.target.value }))}
                          placeholder={t('Alasan penolakan…', 'Rejection reason…')}
                          className='w-40 py-1.5'
                        />
                        <ActionButton size='sm' variant='danger' onClick={() => handleReject(l)}>
                          {t('Tolak', 'Reject')}
                        </ActionButton>
                        <ActionButton size='sm' variant='secondary' onClick={() => setRejectId(null)}>
                          {t('Batal', 'Cancel')}
                        </ActionButton>
                      </div>
                    ) : (
                      <div className='flex justify-end gap-2'>
                        <ActionButton size='sm' variant='primary' icon='✓' onClick={() => handleApprove(l)}>
                          {t('Setujui', 'Approve')}
                        </ActionButton>
                        <ActionButton
                          size='sm'
                          variant='secondary'
                          className='!bg-red-50 !text-red-600 !border-red-100 hover:!bg-red-100'
                          icon='✗'
                          onClick={() => { setRejectId(l.id); setNoteMap(m => ({ ...m, [l.id]: '' })) }}
                        >
                          {t('Tolak', 'Reject')}
                        </ActionButton>
                      </div>
                    )}
                  </div>
                </Td>
              </Tr>
            )
          }) : (
            <tr>
              <td colSpan={8} className='px-4 py-10'>
                <EmptyState icon='🎉' title={t('Tidak ada pengajuan pending.', 'No pending approvals.')} />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>

      {/* ── Decision History ── */}
      <SectionCard
        title={t('Riwayat Keputusan', 'Decision History')}
        icon='📋'
        actions={<StatusBadge tone='neutral'>{acted.length}</StatusBadge>}
        bodyClass='p-0'
      >
        <DataTable
          columns={[
            { label: t('Karyawan', 'Employee') },
            { label: t('Jenis', 'Type') },
            { label: t('Tanggal', 'Date') },
            { label: t('Hari', 'Days'), align: 'right' },
            { label: t('Status Keseluruhan', 'Overall Status') },
          ]}
          className='ring-0 shadow-none rounded-none'
        >
          {acted.length ? acted.map(l => (
            <Tr key={l.id} onClick={() => setSelectedLeaveId(l.id)} active={selectedLeaveId === l.id}>
              <Td className='font-medium text-gray-800'>{l.name}</Td>
              <Td>{l.type}</Td>
              <Td>{l.start} <Icon e='→' size={14} className='inline align-[-2px]' /> {l.end}</Td>
              <Td align='right' className='tabular-nums'>{daysBetween(l.start, l.end)}</Td>
              <Td>
                <div className='flex items-center gap-2'>
                  <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                  {l.status === 'Pending' && (
                    <span className='text-xs text-amber-600 font-medium'>
                      {t('Menunggu approver berikutnya', 'Waiting for next approver')}
                    </span>
                  )}
                </div>
              </Td>
            </Tr>
          )) : (
            <tr>
              <td colSpan={5} className='px-4 py-10'>
                <EmptyState icon='📭' title={t('Belum ada riwayat.', 'No history yet.')} />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>

      {/* ── Dynamic Form Data Preview (Form Builder) ── */}
      {selectedLeave && selectedLeave.customData && Object.keys(selectedLeave.customData).length > 0 && (
        <SectionCard
          title={`Rincian Isian Formulir (${selectedLeave.name} - ${selectedLeave.type})`}
          icon='📋'
        >
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 text-xs'>
            {Object.entries(selectedLeave.customData).map(([key, val]) => {
              if (!val) return null
              const isFile = typeof val === 'object' && val.name
              return (
                <div key={key} className='p-3 bg-gray-50 border border-gray-100 rounded-xl'>
                  <span className='text-[10px] text-gray-400 font-semibold uppercase block mb-1'>
                    {key.replace(/^f_/, '').replace(/_/g, ' ')}
                  </span>
                  {isFile ? (
                    <div className='flex items-center gap-2'>
                      <span>📎</span>
                      <a
                        href={val.data || '#'}
                        download={val.name}
                        target='_blank'
                        rel='noreferrer'
                        className='font-bold text-teal-700 hover:underline truncate'
                      >
                        {val.name}
                      </a>
                    </div>
                  ) : (
                    <span className='font-bold text-gray-800 break-words'>{String(val)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Workflow Monitor ── */}
      {selectedLeave && (
        <WorkflowMonitor
          leaves={[selectedLeave]}
          title='Workflow Monitor'
          expandedId={selectedLeaveId}
        />
      )}
    </div>
  )
}
