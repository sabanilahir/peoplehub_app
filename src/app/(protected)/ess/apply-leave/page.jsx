// src/app/(protected)/ess/apply-leave/page.jsx
'use client'

import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLeaveStore } from '@/store/leaveStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { daysBetween } from '@/utils/dateUtils'
import WorkflowMonitor from '@/components/WorkflowMonitor'
import DynamicFormRenderer from '@/components/forms/DynamicFormRenderer'
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
  Select,
  EmptyState,
} from '@/components/ui'

export default function ApplyLeavePage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { leaves, leaveTypes: fallbackTypes, submitLeave, withdrawLeave } = useLeaveStore()
  const { getLevelsForPage } = useWorkflowStore()

  // Real-time leave types from DB
  const [types, setTypes] = useState([])
  const [loadingTypes, setLoadingTypes] = useState(true)

  const [form, setForm] = useState({ type: '', start: '', end: '', note: '' })
  const [customData, setCustomData] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  // Fetch live leave types
  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoadingTypes(true)
        const res = await fetch('/api/leave/types')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setTypes(json.data)
            return
          }
        }
      } catch (err) {
        console.error('Failed to load leave types:', err)
      } finally {
        setLoadingTypes(false)
      }
      setTypes(fallbackTypes)
    }
    loadTypes()
  }, [])

  const activeTypes = types.filter((lt) => lt.active)
  const selectedTypeObj = activeTypes.find((lt) => lt.name === form.type)

  // Reset customData saat jenis cuti berganti
  const handleTypeChange = (typeName) => {
    setForm((f) => ({ ...f, type: typeName }))
    setCustomData({})
  }

  const myLeaves = leaves.filter((l) => l.userId === currentUser?.id)
  const [selectedLeaveId, setSelectedLeaveId] = useState(() => myLeaves[0]?.id ?? null)

  const leaveUsed = (typeName) =>
    myLeaves
      .filter((l) => l.type === typeName && l.status === 'Approved')
      .reduce((sum, l) => sum + daysBetween(l.start, l.end), 0)

  const handleSubmit = async () => {
    if (!form.type || !form.start || !form.end) {
      setMsg({
        type: 'error',
        text: t('Jenis cuti, tanggal mulai dan selesai wajib diisi.', 'Leave type, start and end date are required.'),
      })
      return
    }
    if (form.end < form.start) {
      setMsg({
        type: 'error',
        text: t('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'End date cannot be before start date.'),
      })
      return
    }

    const lt = selectedTypeObj
    const used = leaveUsed(form.type)
    const reqDays = daysBetween(form.start, form.end)

    if (lt && used + reqDays > lt.maxDays) {
      setMsg({ type: 'error', text: `Saldo ${form.type} tidak cukup! Sisa kuota: ${lt.maxDays - used} hari.` })
      return
    }

    // Validasi field dinamis wajib
    const fields = Array.isArray(lt?.formFields) ? lt.formFields : []
    for (const f of fields) {
      if (f.required) {
        const val = customData[f.id]
        if (val === undefined || val === null || val === '') {
          setMsg({ type: 'error', text: `Kolom wajib '${f.label}' belum diisi!` })
          return
        }
      }
    }

    try {
      setSubmitting(true)
      setMsg(null)

      // 1. Simpan ke Database PostgreSQL melalui API
      const payload = {
        userId: currentUser.id,
        typeId: lt?.id || 1,
        startDate: form.start,
        endDate: form.end,
        note: form.note,
        customData,
        attachment: customData.f_doctor_note?.name || customData.f_maternity_cert?.name || null,
      }

      const res = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      // 2. Simpan juga ke local leaveStore untuk sinkronisasi instan
      submitLeave(
        {
          userId: currentUser.id,
          name: currentUser.name,
          workflowName: 'Apply Leave',
          ...form,
          customData,
          steps: json.data?.steps,
        },
        getLevelsForPage('Apply Leave')
      )

      setForm({ type: '', start: '', end: '', note: '' })
      setCustomData({})
      setMsg({
        type: 'success',
        text: t('Pengajuan cuti berhasil dikirim ke database & diteruskan ke atasan!', 'Leave request submitted successfully!'),
      })

      setTimeout(() => setMsg(null), 4000)

      setTimeout(() => {
        const latest = useLeaveStore.getState().leaves.filter((l) => l.userId === currentUser.id).at(-1)
        if (latest) setSelectedLeaveId(latest.id)
      }, 50)
    } catch (err) {
      setMsg({ type: 'error', text: 'Terjadi kendala saat mengirim permohonan ke database.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Can withdraw
  const canWithdraw = (l) => {
    if (l.status !== 'Pending') return false
    return !(l.steps || []).some((s) => s.status === 'Approved' || s.status === 'Rejected')
  }

  const handleWithdraw = (l) => {
    if (!confirm(`Withdraw pengajuan cuti "${l.type}" (${l.start} — ${l.end})?`)) return
    withdrawLeave(l.id)
    setMsg({ type: 'success', text: t('Pengajuan cuti berhasil di-withdraw.', 'Leave request withdrawn successfully.') })
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div className="pb-12">
      <PageHeader
        icon="📝"
        title="Apply Leave"
        subtitle={t('Ajukan cuti dan lihat riwayat pengajuanmu.', 'Submit leave and view your submission history.')}
      />

      {/* Saldo Cuti */}
      <SectionCard icon="📊" title={t('Saldo Cuti', 'Leave Balance')} className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeTypes.map((lt) => {
            const used = leaveUsed(lt.name)
            const sisa = lt.maxDays - used
            const pct = Math.round((used / lt.maxDays) * 100)
            return (
              <div key={lt.id} className="rounded-xl bg-gray-50/70 p-4 ring-1 ring-gray-100">
                <div className="text-xs font-semibold text-gray-500 mb-1">{lt.name}</div>
                <div className="text-2xl font-bold text-gray-900">
                  {sisa}
                  <span className="text-sm font-normal text-gray-400"> / {lt.maxDays}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {t('Terpakai', 'Used')}: {used} {t('hari', 'days')}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Form Pengajuan Cuti dengan Dynamic Form Renderer */}
      <SectionCard icon="📝" title={t('Formulir Pengajuan Cuti', 'Submit Leave Form')} className="mb-6">
        {msg && (
          <div
            className={`text-xs px-4 py-2.5 rounded-xl mb-4 font-semibold ${
              msg.type === 'error'
                ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('Jenis Cuti', 'Leave Type')}>
            <Select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
              <option value="">{t('-- Pilih Jenis Cuti --', '-- Select Leave Type --')}</option>
              {activeTypes.map((lt) => (
                <option key={lt.id} value={lt.name}>
                  {lt.name} ({t('sisa', 'remaining')}: {lt.maxDays - leaveUsed(lt.name)} {t('hari', 'days')})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('Alasan / Catatan Utama', 'Note')}>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={t('Contoh: Urusan keluarga mendesak', 'Optional note')}
            />
          </FormField>

          <FormField label={t('Tanggal Mulai', 'Start Date')}>
            <Input
              type="date"
              value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
            />
          </FormField>

          <FormField label={t('Tanggal Selesai', 'End Date')}>
            <Input
              type="date"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
            />
          </FormField>
        </div>

        {/* Dynamic Form Builder Fields */}
        {selectedTypeObj && Array.isArray(selectedTypeObj.formFields) && selectedTypeObj.formFields.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl">
            <DynamicFormRenderer
              fields={selectedTypeObj.formFields}
              values={customData}
              onChange={setCustomData}
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-xs text-gray-500">
            {form.start && form.end && form.end >= form.start && (
              <span className="font-semibold text-teal-700">
                Total durasi: {daysBetween(form.start, form.end)} hari kerja
              </span>
            )}
          </span>
          <ActionButton
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2"
          >
            {submitting ? 'Mengirim ke Database...' : t('Kirim Pengajuan Cuti', 'Submit Leave')}
          </ActionButton>
        </div>
      </SectionCard>

      {/* History */}
      <SectionCard icon="📄" title={t('Riwayat Pengajuan', 'Submission History')} bodyClass="p-0">
        {myLeaves.length ? (
          <DataTable
            columns={[
              { label: t('Jenis', 'Type') },
              { label: t('Mulai', 'Start') },
              { label: t('Selesai', 'End') },
              { label: t('Hari', 'Days') },
              { label: t('Keterangan & Rincian Form', 'Details') },
              { label: 'Status' },
              { label: '' },
            ]}
          >
            {myLeaves.map((l) => {
              const hasCustom = l.customData && Object.keys(l.customData).length > 0
              return (
                <Tr key={l.id} onClick={() => setSelectedLeaveId(l.id)} active={selectedLeaveId === l.id}>
                  <Td className="font-medium text-gray-800">{l.type}</Td>
                  <Td>{l.start}</Td>
                  <Td>{l.end}</Td>
                  <Td>{daysBetween(l.start, l.end)}</Td>
                  <Td className="text-gray-600 max-w-xs">
                    <div>{l.note || '-'}</div>
                    {hasCustom && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(l.customData).map(([k, v]) => {
                          if (!v) return null
                          const displayVal = typeof v === 'object' ? v.name : String(v)
                          return (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 text-teal-800 border border-teal-200 truncate max-w-[180px]"
                            >
                              {displayVal}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td>
                    {canWithdraw(l) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleWithdraw(l)
                        }}
                        className="text-xs font-semibold text-orange-500 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-2.5 py-1 rounded-lg hover:bg-orange-50 transition"
                      >
                        <Icon e="↩" size={14} className="inline align-[-2px]" /> Withdraw
                      </button>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        ) : (
          <div className="p-5">
            <EmptyState icon="🗓️" title={t('Belum ada pengajuan.', 'No submissions yet.')} />
          </div>
        )}
      </SectionCard>

      {/* Workflow Monitor */}
      {selectedLeaveId &&
        (() => {
          const selected = myLeaves.find((l) => l.id === selectedLeaveId)
          return selected ? (
            <div className="mt-6">
              <WorkflowMonitor leaves={[selected]} title="Workflow Monitor" expandedId={selectedLeaveId} />
            </div>
          ) : null
        })()}
    </div>
  )
}
