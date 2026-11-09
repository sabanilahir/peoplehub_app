'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { daysBetween } from '@/utils/dateUtils'
import WorkflowMonitor from '@/components/WorkflowMonitor'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton, EmptyState } from '@/components/ui'

const statusTone = (s) => ({
  Approved: 'success',
  Pending: 'warning',
  Rejected: 'danger',
  Withdrawn: 'neutral',
}[s] || 'neutral')

export default function ApproveLeavePage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees } = useEmployeeStore()

  // ── Database Leaves State (untuk Riwayat Keputusan & Workflow Monitor) ──
  const [dbLeaves, setDbLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLeaveId, setSelectedLeaveId] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  // ── Flowable BPMN Tasks State ──
  const [flowableTasks, setFlowableTasks] = useState([])
  const [loadingFlowable, setLoadingFlowable] = useState(true)
  const [flowableActionId, setFlowableActionId] = useState(null)
  const [flowableRejectId, setFlowableRejectId] = useState(null)
  const [flowableRejectNote, setFlowableRejectNote] = useState('')

  const flashToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // 1. Load Flowable tasks via Smart Identity Resolver
  const loadFlowableTasks = async () => {
    if (!currentUser) return
    try {
      setLoadingFlowable(true)
      const username = currentUser.username || ''
      const uid = currentUser.id || ''
      const res = await fetch(
        `/api/flowable/tasks?candidateOrAssigned=${encodeURIComponent(username)}&userId=${encodeURIComponent(uid)}&status=open`
      )
      const json = await res.json()
      if (json.success && Array.isArray(json.data?.data)) {
        setFlowableTasks(json.data.data)
      } else {
        setFlowableTasks([])
      }
    } catch (err) {
      console.error('[Flowable Tasks Load Error]:', err)
    } finally {
      setLoadingFlowable(false)
    }
  }

  // 2. Load real leave requests from PostgreSQL
  const loadLeaves = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const isHrOrAdmin = ['superadmin', 'admin', 'hr', 'hr_manager', 'director'].includes(currentUser.role)
      const url = isHrOrAdmin
        ? '/api/leave/requests'
        : `/api/leave/requests?supervisorId=${currentUser.id}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        const mapped = (json.data || []).map((l) => ({
          id: l.id,
          userId: l.userId,
          name: l.user?.name || `Karyawan #${l.userId}`,
          type: l.typeName || l.leaveType?.name || 'Cuti',
          start: l.startDate,
          end: l.endDate,
          note: l.note || '',
          status: l.status,
          steps: Array.isArray(l.steps) ? l.steps : [],
          customData: l.customData || {},
          attachment: l.attachment || null,
          user: l.user,
        }))
        setDbLeaves(mapped)
      } else {
        flashToast(json.error || 'Gagal memuat pengajuan cuti', 'error')
      }
    } catch (err) {
      console.error('[ApproveLeave] Fetch error:', err)
      flashToast('Gagal terhubung ke database', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadFlowableTasks()
      loadLeaves()
    }
  }, [currentUser])

  // Helper untuk membaca variabel proses Flowable
  const getTaskVar = (task, name, fallback = '—') => {
    if (task.parsedVariables && task.parsedVariables[name]) {
      return task.parsedVariables[name]
    }
    const v = (task.variables || []).find((x) => x.name === name)
    return v ? (v.value ?? fallback) : fallback
  }

  // Action: Setujui Flowable Task
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
          ],
        }),
      })

      const data = await res.json()
      if (data.success) {
        flashToast(
          `Permohonan cuti ${task.applicantName || getTaskVar(task, 'employeeName')} berhasil disetujui via Flowable & otomatis masuk ke HO Calculator!`,
          'success'
        )
        await Promise.all([loadFlowableTasks(), loadLeaves()])
      } else {
        flashToast(data.error || 'Gagal menyetujui tugas Flowable', 'error')
      }
    } catch (err) {
      flashToast('Error: ' + err.message, 'error')
    } finally {
      setFlowableActionId(null)
    }
  }

  // Action: Tolak Flowable Task
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
          ],
        }),
      })

      const data = await res.json()
      if (data.success) {
        flashToast(`Permohonan cuti ${task.applicantName || getTaskVar(task, 'employeeName')} ditolak via Flowable.`, 'warning')
        setFlowableRejectId(null)
        setFlowableRejectNote('')
        await Promise.all([loadFlowableTasks(), loadLeaves()])
      } else {
        flashToast(data.error || 'Gagal menolak tugas Flowable', 'error')
      }
    } catch (err) {
      flashToast('Error: ' + err.message, 'error')
    } finally {
      setFlowableActionId(null)
    }
  }

  // Saring permohonan yang telah diputuskan untuk Riwayat Keputusan
  const acted = dbLeaves.filter((l) => l.status === 'Approved' || l.status === 'Rejected')

  useEffect(() => {
    if (acted[0] && !selectedLeaveId) setSelectedLeaveId(acted[0].id)
  }, [dbLeaves])

  const selectedLeave = dbLeaves.find((l) => l.id === selectedLeaveId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon="✅"
        title="Approve Leave"
        subtitle={t(
          'Review dan setujui pengajuan cuti tim melalui Flowable BPMN Engine.',
          'Review and approve leave requests powered by Flowable BPMN Engine.'
        )}
      />

      {/* ── Toast Alert ── */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
            toastMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : toastMsg.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-teal-50 border-teal-200 text-teal-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toastMsg.type === 'error' ? '⚠️' : '🎉'}</span>
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
            ×
          </button>
        </div>
      )}

      {/* ── FLOWABLE BPMN TASK INBOX (PRIORITAS UTAMA) ── */}
      <SectionCard
        title={t('Inbox Persetujuan Cuti (Flowable BPMN Engine)', 'Leave Approval Inbox (Flowable BPMN Engine)')}
        icon="⚡"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Flowable Engine (Online)
            </span>
            <StatusBadge tone={flowableTasks.length > 0 ? 'warning' : 'neutral'}>
              {flowableTasks.length} {t('Tugas', 'Tasks')}
            </StatusBadge>
            <button
              onClick={loadFlowableTasks}
              disabled={loadingFlowable}
              className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
              title="Muat ulang tugas Flowable"
            >
              <Icon e={loadingFlowable ? '⌛' : '🔄'} size={14} className={loadingFlowable ? 'animate-spin' : ''} />
            </button>
          </div>
        }
        bodyClass="p-0"
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
          className="ring-0 shadow-none rounded-none"
        >
          {loadingFlowable ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span>Memeriksa task Flowable engine...</span>
                </div>
              </td>
            </tr>
          ) : flowableTasks.length ? (
            flowableTasks.map((task) => {
              const empName = task.applicantName || getTaskVar(task, 'employeeName', 'Karyawan')
              const empNik = task.applicantNik || getTaskVar(task, 'employeeNik', '')
              const dept = task.applicantDept || getTaskVar(task, 'employeeDept', '')
              const pos = task.applicantPosition || getTaskVar(task, 'employeePosition', '')
              const lType = task.leaveType || getTaskVar(task, 'leaveType', 'Cuti Tahunan')
              const start = task.startDate || getTaskVar(task, 'startDate', '')
              const end = task.endDate || getTaskVar(task, 'endDate', '')
              const days = task.days || getTaskVar(task, 'days', '1')
              const reason = task.reason || getTaskVar(task, 'reason', '')
              const isRejecting = flowableRejectId === task.id
              const isActioning = flowableActionId === task.id

              return (
                <Tr key={task.id} className="bg-white hover:bg-teal-50/30 transition">
                  <Td>
                    <div className="font-bold text-gray-900">{empName}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{empNik || '—'}</div>
                  </Td>
                  <Td>
                    <div className="text-xs font-semibold text-gray-700">{dept || '—'}</div>
                    <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{pos || '—'}</div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {lType}
                    </span>
                  </Td>
                  <Td>
                    <div className="text-xs font-medium text-gray-800">
                      {start} <Icon e="→" size={12} className="inline" /> {end}
                    </div>
                    <div className="text-[11px] text-teal-700 font-semibold">{days} hari kerja</div>
                  </Td>
                  <Td className="max-w-[200px]">
                    <div className="text-xs text-gray-600 italic truncate" title={reason}>
                      &ldquo;{reason || 'Tidak ada catatan'}&rdquo;
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <StatusBadge tone="warning">{task.name || 'Supervisor Approval'}</StatusBadge>
                      {task.candidateGroupDisplay && (
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-medium inline-flex items-center gap-1 w-fit">
                          <span>👥</span> {task.candidateGroupDisplay}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono">ID: {task.id.slice(0, 8)}…</span>
                    </div>
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    {isRejecting ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="text"
                          value={flowableRejectNote}
                          onChange={(e) => setFlowableRejectNote(e.target.value)}
                          placeholder="Alasan penolakan…"
                          className="px-2.5 py-1 text-xs border border-red-300 rounded-lg outline-none focus:ring-1 focus:ring-red-400 w-36 bg-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleFlowableReject(task)}
                          disabled={isActioning}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                        >
                          {isActioning ? '...' : 'Tolak'}
                        </button>
                        <button
                          onClick={() => {
                            setFlowableRejectId(null)
                            setFlowableRejectNote('')
                          }}
                          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleFlowableApprove(task)}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 transition disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                          title="Setujui permohonan melalui Flowable Engine"
                        >
                          <Icon e="✓" size={12} className="inline" />
                          {isActioning ? 'Memproses...' : 'Setujui'}
                        </button>
                        <button
                          onClick={() => {
                            setFlowableRejectId(task.id)
                            setFlowableRejectNote('')
                          }}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                          title="Tolak permohonan"
                        >
                          <Icon e="✗" size={12} className="inline" />
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
              <td colSpan={7} className="px-4 py-8">
                <EmptyState
                  icon="🎉"
                  title={t('Semua tugas Flowable selesai.', 'No pending Flowable tasks.')}
                  subtitle="Tidak ada pengajuan cuti bawahan di Flowable yang perlu disetujui saat ini."
                />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>

      {/* ── Riwayat Keputusan ── */}
      <SectionCard
        title={t('Riwayat Keputusan', 'Decision History')}
        icon="📋"
        actions={<StatusBadge tone="neutral">{acted.length}</StatusBadge>}
        bodyClass="p-0"
      >
        <DataTable
          columns={[
            { label: t('Karyawan', 'Employee') },
            { label: t('Jenis', 'Type') },
            { label: t('Tanggal', 'Date') },
            { label: t('Hari', 'Days'), align: 'right' },
            { label: t('Status Keseluruhan', 'Overall Status') },
          ]}
          className="ring-0 shadow-none rounded-none"
        >
          {acted.length ? (
            acted.map((l) => (
              <Tr key={l.id} onClick={() => setSelectedLeaveId(l.id)} active={selectedLeaveId === l.id}>
                <Td className="font-medium text-gray-800">{l.name}</Td>
                <Td>{l.type}</Td>
                <Td>
                  {l.start} <Icon e="→" size={14} className="inline align-[-2px]" /> {l.end}
                </Td>
                <Td align="right" className="tabular-nums">
                  {daysBetween(l.start, l.end)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                  </div>
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-8">
                <EmptyState icon="📭" title={t('Belum ada riwayat.', 'No history yet.')} />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>

      {/* ── Workflow Monitor jika memilih baris ── */}
      {selectedLeave && (
        <WorkflowMonitor
          leaves={[selectedLeave]}
          title="Workflow Monitor"
          expandedId={selectedLeaveId}
        />
      )}
    </div>
  )
}
