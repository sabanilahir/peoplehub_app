// src/app/(protected)/ess/overtime/page.jsx
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
  FormField,
  Input,
  EmptyState,
} from '@/components/ui'
import { parseOvertimeDuration, calcHoOvertimeFee, calcWarehouseOvertime } from '@/lib/hoPayrollEngine'
import BpmnViewerComponent from '@/components/workflow/BpmnViewer'
import { OVERTIME_REQUEST_BPMN_XML } from '@/lib/flowable/definitions/overtimeRequestBpmn'

export default function EssOvertimePage() {
  const t = useT()
  const { currentUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [overtimes, setOvertimes] = useState([])
  const [msg, setMsg] = useState(null)

  // State untuk Workflow Modal BPMN
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false)

  // Form pengajuan lembur
  const todayStr = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    date: todayStr,
    startTime: '18:00',
    endTime: '22:00',
    taskNote: '',
  })

  // Flash message helper
  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // Load overtime history for logged in user
  const loadMyOvertimes = async () => {
    const empId = currentUser?.employeeId || currentUser?.id
    if (!empId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/overtime?empId=${empId}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setOvertimes(json.data)
      }
    } catch (err) {
      console.error('Failed to load overtimes:', err)
      flash('Gagal memuat data riwayat lembur.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyOvertimes()
  }, [currentUser?.id, currentUser?.employeeId])

  // Live calculation preview
  const liveCalc = useMemo(() => {
    if (!form.startTime || !form.endTime) {
      return { hours: 0, formattedHours: '0.00', fee: 0, hourlyRate: 0 }
    }
    const dur = parseOvertimeDuration(form.startTime, form.endTime)
    if (dur.hours <= 0) {
      return { hours: 0, formattedHours: '0.00', fee: 0, hourlyRate: 0 }
    }

    const loc = (currentUser?.workLocationCode || currentUser?.location || '').toLowerCase()
    const isGudang = loc === 'gudang' || loc.includes('warehouse') || loc.includes('pack')

    if (isGudang) {
      const calc = calcWarehouseOvertime({ date: form.date, hours: dur.hours })
      return {
        hours: dur.hours,
        formattedHours: dur.formattedHours,
        fee: calc.fee,
        hourlyRate: calc.hourlyRate,
      }
    } else {
      // Standar HO: Gaji Pokok (75% dari gross) / 22 / 8
      const rawSalary = Number(currentUser?.salary || 0) || 7500000 // default fallback
      const basicSalary = Math.round(rawSalary * 0.75)
      const calc = calcHoOvertimeFee(basicSalary, 22, dur.hours)
      return {
        hours: dur.hours,
        formattedHours: dur.formattedHours,
        fee: calc.fee,
        hourlyRate: calc.hourlyRate,
      }
    }
  }, [form.startTime, form.endTime, form.date, currentUser])

  // Handle submit pengajuan lembur
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date || !form.startTime || !form.endTime || !form.taskNote.trim()) {
      flash('Tanggal, Jam Mulai, Jam Selesai, dan Uraian Tugas wajib diisi.', 'error')
      return
    }

    if (liveCalc.hours <= 0) {
      flash('Jam Selesai harus lebih besar dari Jam Mulai.', 'error')
      return
    }

    const empId = currentUser?.employeeId || currentUser?.id
    try {
      setSubmitting(true)
      const res = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: Number(empId),
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          taskNote: form.taskNote,
          status: 'Pending', // Default menunggu persetujuan atasan
        }),
      })
      const json = await res.json()
      if (json.success) {
        flash('Pengajuan lembur berhasil dikirim dan menunggu persetujuan atasan.')
        setForm({
          date: todayStr,
          startTime: '18:00',
          endTime: '22:00',
          taskNote: '',
        })
        await loadMyOvertimes()
      } else {
        flash(json.error || 'Gagal mengirim pengajuan lembur.', 'error')
      }
    } catch (err) {
      console.error('Error submitting overtime:', err)
      flash('Terjadi kesalahan koneksi server.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle pembatalan lembur yang masih Pending
  const handleCancel = async (id) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan lembur ini?')) return
    try {
      const res = await fetch(`/api/overtime?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        flash('Pengajuan lembur berhasil dibatalkan.')
        await loadMyOvertimes()
      } else {
        flash(json.error || 'Gagal membatalkan pengajuan lembur.', 'error')
      }
    } catch (err) {
      flash('Gagal menghapus entri lembur.', 'error')
    }
  }

  // Ringkasan Statistik
  const totalCount = overtimes.length
  const pendingCount = overtimes.filter((o) => o.status === 'Pending').length
  const approvedCount = overtimes.filter((o) => o.status === 'Approved').length
  const approvedFee = overtimes
    .filter((o) => o.status === 'Approved')
    .reduce((sum, o) => sum + (o.totalFee || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Pengajuan Lembur (Overtime ESS)', 'Overtime Request (ESS)')}
        subtitle={t(
          'Ajukan permohonan lembur kerja dan pantau status persetujuan atasan Anda secara real-time.',
          'Submit overtime work requests and monitor manager approval status in real-time.'
        )}
      />

      {/* Alert Notifikasi */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
            msg.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon name={msg.type === 'error' ? 'alert-triangle' : 'check'} size={18} />
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon name="clock" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Total Pengajuan', 'Total Requests')}</p>
            <p className="text-lg font-bold text-gray-900">{totalCount} {t('Kali', 'Times')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon name="clock" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Menunggu Persetujuan', 'Pending Approval')}</p>
            <p className="text-lg font-bold text-amber-600">{pendingCount} {t('Entri', 'Entries')}</p>
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
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Icon name="dollar-sign" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('Kompensasi Disetujui', 'Approved Overtime Fee')}</p>
            <p className="text-lg font-bold text-purple-700">Rp {approvedFee.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Formulir Pengajuan Lembur */}
      <SectionCard
        title={t('Formulir Pengajuan Lembur Baru', 'New Overtime Request Form')}
        action={
          <span className="text-xs text-gray-400">
            {currentUser?.name} ({currentUser?.jobTitle || 'Staff'})
          </span>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label={t('Tanggal Lembur', 'Overtime Date')} required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </FormField>

            <FormField label={t('Jam Mulai', 'Start Time')} required>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </FormField>

            <FormField label={t('Jam Selesai', 'End Time')} required>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label={t('Uraian Tugas / Alasan Lembur', 'Overtime Task / Reason')} required>
            <textarea
              rows={3}
              value={form.taskNote}
              onChange={(e) => setForm({ ...form, taskNote: e.target.value })}
              placeholder={t('Contoh: Menyelesaikan editing video campaign launching produk...', 'Example: Complete video editing for product launch...')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </FormField>

          {/* Live Preview Box */}
          <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Durasi Lembur</p>
                <p className="text-lg font-bold text-teal-900">
                  {liveCalc.formattedHours} <span className="text-xs font-normal text-teal-700">Jam</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Estimasi Rate / Jam</p>
                <p className="text-lg font-bold text-teal-900">
                  Rp {liveCalc.hourlyRate.toLocaleString('id-ID')}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Estimasi Kompensasi</p>
                <p className="text-lg font-bold text-emerald-600">
                  Rp {liveCalc.fee.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <ActionButton
              type="submit"
              variant="primary"
              disabled={submitting}
              className="px-6 py-2.5 font-bold"
            >
              {submitting ? (
                <>
                  <Icon name="clock" size={16} className="animate-spin mr-1" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Icon name="send" size={16} className="mr-1" />
                  {t('Kirim Pengajuan Lembur', 'Submit Overtime Request')}
                </>
              )}
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      {/* Tabel Riwayat Pengajuan Lembur */}
      <SectionCard title={t('Riwayat Pengajuan Lembur Saya', 'My Overtime Request History')}>
        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <Icon name="clock" size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm">Memuat data lembur...</p>
          </div>
        ) : overtimes.length === 0 ? (
          <EmptyState
            title={t('Belum Ada Pengajuan Lembur', 'No Overtime Requests Yet')}
            description={t(
              'Anda belum mengajukan lembur. Gunakan formulir di atas untuk mengajukan lembur baru.',
              'You have not submitted any overtime requests. Use the form above to submit a new one.'
            )}
            icon="clock"
          />
        ) : (
          <DataTable
            headers={[
              t('Tanggal', 'Date'),
              t('Hari', 'Day'),
              t('Jam Lembur', 'Working Hours'),
              t('Durasi', 'Duration'),
              t('Rate / Jam', 'Rate/Hr'),
              t('Estimasi Fee', 'Est. Fee'),
              t('Uraian Tugas', 'Task Note'),
              'Status',
              t('Aksi', 'Action'),
            ]}
          >
            {overtimes.map((ot) => {
              const statusColor =
                ot.status === 'Approved' ? 'success' : ot.status === 'Rejected' ? 'danger' : 'warning'
              return (
                <Tr key={ot.id} className="hover:bg-gray-50/60">
                  <Td className="font-semibold text-gray-800">{ot.date}</Td>
                  <Td className="text-gray-600">{ot.dayName || '-'}</Td>
                  <Td className="font-mono text-xs">
                    {ot.startTime} - {ot.endTime}
                  </Td>
                  <Td className="font-semibold text-gray-700">
                    {ot.totalHours ? `${ot.totalHours} jam` : '-'}
                  </Td>
                  <Td className="text-right text-gray-600">
                    Rp {(ot.hourlyRate || 0).toLocaleString('id-ID')}
                  </Td>
                  <Td className="text-right font-bold text-emerald-600">
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
                  <Td className="text-center">
                    {ot.status === 'Pending' ? (
                      <button
                        onClick={() => handleCancel(ot.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        Batalkan
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>

      {/* Modal Alur Workflow Flowable BPMN */}
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
                    Alur Workflow Persetujuan Lembur (Flowable BPMN 2.0)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Instance ID:{' '}
                    <span className="font-mono text-teal-700 font-semibold">
                      {selectedWorkflow.customData?.flowableProcessInstanceId}
                    </span>{' '}
                    • Penyetuju Atasan:{' '}
                    <strong className="text-gray-800">
                      {selectedWorkflow.customData?.approverName || 'Atasan Langsung'}
                    </strong>
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
                    Status Pengajuan: <strong>{selectedWorkflow.status}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>
                    Durasi: <strong>{selectedWorkflow.totalHours} jam</strong>
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
