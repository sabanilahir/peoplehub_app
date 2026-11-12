// src/app/(protected)/mss/approve-overtime/page.jsx
'use client'

import Icon from '@/components/ui/Icon'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader,
  SectionCard,
  DataTable,
  Tr,
  Td,
  StatusBadge,
  ActionButton,
  EmptyState,
} from '@/components/ui'
import BpmnViewerComponent from '@/components/workflow/BpmnViewer'
import { OVERTIME_REQUEST_BPMN_XML } from '@/lib/flowable/definitions/overtimeRequestBpmn'

export default function ApproveOvertimePage() {
  const t = useT()
  const { currentUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [overtimes, setOvertimes] = useState([])
  const [filterTab, setFilterTab] = useState('pending') // 'pending' | 'all' | 'approved' | 'rejected'
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  // State untuk Workflow Modal BPMN
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false)

  // Modal Penolakan
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const flashToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load team overtimes
  const loadTeamOvertimes = async () => {
    if (!currentUser) return
    try {
      setLoading(true)
      const isHrOrAdmin = ['superadmin', 'admin', 'hr', 'hr_manager', 'director'].includes(currentUser.role)
      const approverId = currentUser.employeeId || currentUser.id

      const url = isHrOrAdmin
        ? '/api/overtime'
        : `/api/overtime?approverId=${approverId}`

      const res = await fetch(url)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setOvertimes(json.data)
      } else {
        setOvertimes([])
      }
    } catch (err) {
      console.error('[ApproveOvertime] Load error:', err)
      flashToast('Gagal memuat data pengajuan lembur tim.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeamOvertimes()
  }, [currentUser?.id, currentUser?.employeeId, currentUser?.role])

  // Handle Approve
  const handleApprove = async (ot) => {
    try {
      setActionLoadingId(ot.id)
      const approverId = currentUser.employeeId || currentUser.id
      const res = await fetch('/api/overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ot.id,
          status: 'Approved',
          approvedById: Number(approverId),
        }),
      })
      const json = await res.json()
      if (json.success) {
        flashToast(`Lembur ${ot.employee?.name || 'karyawan'} tanggal ${ot.date} berhasil disetujui!`)
        // Trigger event notification update
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('overtime-status-updated', { detail: { id: ot.id, status: 'Approved' } }))
        }
        await loadTeamOvertimes()
      } else {
        flashToast(json.error || 'Gagal menyetujui pengajuan lembur.', 'error')
      }
    } catch (err) {
      flashToast('Terjadi kesalahan koneksi server.', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Reject Modal Open
  const openRejectModal = (ot) => {
    setRejectTarget(ot)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  // Handle Reject Submit
  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      flashToast('Alasan penolakan wajib diisi.', 'error')
      return
    }

    try {
      setActionLoadingId(rejectTarget.id)
      const approverId = currentUser.employeeId || currentUser.id
      const res = await fetch('/api/overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectTarget.id,
          status: 'Rejected',
          approvedById: Number(approverId),
          rejectReason: rejectReason.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        flashToast(`Lembur ${rejectTarget.employee?.name || 'karyawan'} telah ditolak.`)
        setRejectModalOpen(false)
        setRejectTarget(null)
        setRejectReason('')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('overtime-status-updated', { detail: { id: rejectTarget.id, status: 'Rejected' } }))
        }
        await loadTeamOvertimes()
      } else {
        flashToast(json.error || 'Gagal menolak pengajuan lembur.', 'error')
      }
    } catch (err) {
      flashToast('Terjadi kesalahan saat memproses penolakan.', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filter Data Sesuai Tab
  const filteredOvertimes = useMemo(() => {
    if (filterTab === 'pending') return overtimes.filter((o) => o.status === 'Pending')
    if (filterTab === 'approved') return overtimes.filter((o) => o.status === 'Approved')
    if (filterTab === 'rejected') return overtimes.filter((o) => o.status === 'Rejected')
    return overtimes
  }, [overtimes, filterTab])

  // Hitung Metrik
  const pendingCount = overtimes.filter((o) => o.status === 'Pending').length
  const approvedCount = overtimes.filter((o) => o.status === 'Approved').length
  const rejectedCount = overtimes.filter((o) => o.status === 'Rejected').length
  const totalApprovedFee = overtimes
    .filter((o) => o.status === 'Approved')
    .reduce((sum, o) => sum + (o.totalFee || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Persetujuan Lembur (MSS Overtime Approval)', 'Overtime Approval (MSS)')}
        subtitle={t(
          'Tinjau, setujui, atau tolak permohonan lembur bawahan Anda sebelum diproses ke perhitungan payroll dan Odoo.',
          'Review, approve, or reject team overtime requests before they are computed in payroll and synced to Odoo.'
        )}
      />

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
            toastMsg.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon name={toastMsg.type === 'error' ? 'alert-triangle' : 'check'} size={18} />
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-gray-600">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon name="clock" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Menunggu Persetujuan', 'Pending Approval')}</p>
            <p className="text-lg font-bold text-amber-600">{pendingCount} {t('Pengajuan', 'Requests')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="check-circle" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Disetujui', 'Approved')}</p>
            <p className="text-lg font-bold text-emerald-600">{approvedCount} {t('Entri', 'Entries')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Icon name="x-circle" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Ditolak', 'Rejected')}</p>
            <p className="text-lg font-bold text-red-600">{rejectedCount} {t('Entri', 'Entries')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Icon name="dollar-sign" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Total Biaya Disetujui', 'Total Approved Cost')}</p>
            <p className="text-lg font-bold text-purple-700">Rp {totalApprovedFee.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <SectionCard
        title={t('Daftar Pengajuan Lembur Tim', 'Team Overtime Requests')}
        action={
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{t('Menunggu Persetujuan', 'Pending')}</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('approved')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'approved'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('Disetujui', 'Approved')} ({approvedCount})
            </button>

            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'rejected'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('Ditolak', 'Rejected')} ({rejectedCount})
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('Semua', 'All')} ({overtimes.length})
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <Icon name="clock" size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm">Memuat pengajuan lembur tim...</p>
          </div>
        ) : filteredOvertimes.length === 0 ? (
          <EmptyState
            title={
              filterTab === 'pending'
                ? t('Tidak Ada Lembur Menunggu Persetujuan', 'No Pending Overtime Requests')
                : t('Tidak Ada Data Lembur', 'No Overtime Data')
            }
            description={
              filterTab === 'pending'
                ? t(
                    'Semua pengajuan lembur dari tim Anda telah selesai ditinjau.',
                    'All overtime requests from your team have been reviewed.'
                  )
                : t(
                    'Belum ada riwayat lembur yang sesuai dengan filter yang dipilih.',
                    'No overtime history matches the selected filter.'
                  )
            }
            icon="check-circle"
          />
        ) : (
          <DataTable
            headers={[
              t('Karyawan', 'Employee'),
              t('Tanggal & Hari', 'Date & Day'),
              t('Jam Lembur', 'Time'),
              t('Durasi', 'Duration'),
              t('Estimasi Fee', 'Est. Fee'),
              t('Uraian Tugas', 'Task Note'),
              'Status',
              t('Tindakan', 'Action'),
            ]}
          >
            {filteredOvertimes.map((ot) => {
              const isActing = actionLoadingId === ot.id
              const statusColor =
                ot.status === 'Approved' ? 'success' : ot.status === 'Rejected' ? 'danger' : 'warning'

              return (
                <Tr key={ot.id} className="hover:bg-gray-50/60">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs uppercase">
                        {(ot.employee?.name || 'K').charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">
                          {ot.employee?.name || `Karyawan #${ot.empId}`}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {ot.employee?.nik || '-'} • {ot.employee?.dept || ot.employee?.jobTitle || 'Staff'}
                        </p>
                      </div>
                    </div>
                  </Td>

                  <Td>
                    <div className="font-semibold text-gray-800 text-sm">{ot.date}</div>
                    <div className="text-xs text-gray-400">{ot.dayName || '-'}</div>
                  </Td>

                  <Td className="font-mono text-xs text-gray-700">
                    {ot.startTime} - {ot.endTime}
                  </Td>

                  <Td className="font-semibold text-gray-800">
                    {ot.totalHours ? `${ot.totalHours} jam` : '-'}
                  </Td>

                  <Td className="font-bold text-emerald-600">
                    Rp {(ot.totalFee || 0).toLocaleString('id-ID')}
                  </Td>

                  <Td className="text-xs text-gray-600 max-w-xs truncate" title={ot.taskNote || ''}>
                    {ot.taskNote || '-'}
                  </Td>

                  <Td>
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={statusColor}>
                        {ot.status || 'Pending'}
                      </StatusBadge>
                      {ot.customData?.flowableProcessInstanceId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWorkflow(ot)
                            setIsWorkflowModalOpen(true)
                          }}
                          className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-1.5 py-0.5 rounded transition flex items-center gap-1"
                          title="Lihat Alur Workflow BPMN Flowable"
                        >
                          <span>⚡</span> Workflow
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-gray-400">Standard</span>
                      )}
                    </div>
                  </Td>

                  <Td className="text-right">
                    {ot.status === 'Pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <ActionButton
                          size="sm"
                          variant="primary"
                          disabled={isActing}
                          onClick={() => handleApprove(ot)}
                          className="!px-3 !py-1 text-xs !bg-emerald-600 hover:!bg-emerald-700"
                        >
                          <Icon name="check" size={13} className="mr-1" />
                          {t('Setujui', 'Approve')}
                        </ActionButton>

                        <button
                          disabled={isActing}
                          onClick={() => openRejectModal(ot)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 border border-red-200 transition"
                        >
                          <Icon name="x" size={13} className="inline mr-0.5" />
                          {t('Tolak', 'Reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">
                        {ot.status === 'Approved' ? 'Telah Disetujui' : 'Telah Ditolak'}
                      </span>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>

      {/* Modal Penolakan */}
      {rejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Icon name="alert-triangle" size={20} />
                <h3 className="font-bold text-gray-900 text-base">
                  {t('Tolak Pengajuan Lembur', 'Reject Overtime Request')}
                </h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Anda akan menolak pengajuan lembur dari{' '}
                <strong className="text-gray-900">{rejectTarget.employee?.name}</strong> pada tanggal{' '}
                <strong className="text-gray-900">{rejectTarget.date}</strong> ({rejectTarget.totalHours} jam).
              </p>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('Alasan Penolakan (Wajib Diisi)', 'Rejection Reason (Required)')}
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t(
                    'Contoh: Pekerjaan tidak mendesak dan dapat dilanjutkan besok...',
                    'Example: Task is not urgent and can be completed tomorrow...'
                  )}
                  className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                {t('Batal', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={!rejectReason.trim() || actionLoadingId === rejectTarget.id}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition shadow-sm"
              >
                {actionLoadingId === rejectTarget.id ? 'Memproses...' : t('Konfirmasi Tolak', 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alur Workflow Flowable BPMN (MSS Review) */}
      {isWorkflowModalOpen && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Diagram Alur BPMN Lembur: {selectedWorkflow.employee?.name || 'Karyawan'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Process Instance ID:{' '}
                    <span className="font-mono text-teal-700 font-semibold">
                      {selectedWorkflow.customData?.flowableProcessInstanceId}
                    </span>{' '}
                    • Tanggal: <strong className="text-gray-800">{selectedWorkflow.date}</strong> ({selectedWorkflow.totalHours} jam)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsWorkflowModalOpen(false)
                  setSelectedWorkflow(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50 rounded-xl p-2 border border-gray-200">
              <BpmnViewerComponent xml={OVERTIME_REQUEST_BPMN_XML} height="360px" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>
                    Status Alur: <strong>{selectedWorkflow.status}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span>
                    Kompensasi: <strong>Rp {(selectedWorkflow.totalFee || 0).toLocaleString('id-ID')}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWorkflowModalOpen(false)
                  setSelectedWorkflow(null)
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
