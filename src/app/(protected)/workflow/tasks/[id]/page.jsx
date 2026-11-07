'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DynamicFormRenderer from '@/components/forms/DynamicFormRenderer'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params?.id

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form State
  const [approved, setApproved] = useState(true)
  const [comment, setComment] = useState('')
  const [customFields, setCustomFields] = useState({})

  useEffect(() => {
    if (taskId) fetchTaskDetail()
  }, [taskId])

  const fetchTaskDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/flowable/tasks/${taskId}`)
      const result = await res.json()
      if (result.success) {
        setTask(result.data)
      } else {
        setError(result.error || 'Task tidak ditemukan')
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat task')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Build variables to send to Flowable
      const variables = [
        { name: 'completedAt', value: new Date().toISOString(), type: 'string' },
      ]

      // Add approval decision if applicable
      const isApproval = !task?.formSchema || task.formSchema.decisionType !== 'none'
      if (isApproval) {
        variables.push({ name: 'approved', value: approved, type: 'boolean' })
        variables.push({
          name: 'approvalComment',
          value: comment || (approved ? 'Disetujui' : 'Ditolak'),
          type: 'string',
        })
      }

      // Append custom form fields from Form Builder
      Object.entries(customFields).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) {
          let val = v
          let type = 'string'
          if (typeof v === 'boolean') {
            type = 'boolean'
          } else if (typeof v === 'number') {
            type = 'long'
          } else if (typeof v === 'object') {
            val = JSON.stringify(v)
            type = 'string'
          }
          variables.push({ name: k, value: val, type })
        }
      })

      const res = await fetch(`/api/flowable/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          variables,
        }),
      })

      const result = await res.json()
      if (result.success) {
        setSuccessMsg('🎉 Task berhasil diselesaikan! Alur kerja telah diteruskan ke node berikutnya.')
        setTimeout(() => {
          router.push('/workflow/tasks')
        }, 1800)
      } else {
        setError(result.error || 'Gagal menyelesaikan task di Flowable')
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat submit task')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-500 gap-2">
        <div className="text-3xl animate-spin">⏳</div>
        <p className="text-sm font-medium">Memuat detail formulir task dari Flowable...</p>
      </div>
    )
  }

  if (error && !task) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
          <p className="font-semibold">Terjadi Kesalahan:</p>
          <p>{error}</p>
        </div>
        <Link href="/workflow/tasks" className="text-blue-600 hover:underline text-sm">
          ← Kembali ke Task Inbox
        </Link>
      </div>
    )
  }

  const formKey = task?.formKey || 'approval-form'
  const processVars = task?.variables || []
  const formSchema = task?.formSchema || null
  const isApprovalDecision = !formSchema || formSchema.decisionType !== 'none'

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Task ID: {task?.id}
            </span>
            {task?.formKey && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-100 text-purple-800 border border-purple-200">
                Form: {task.formKey}
              </span>
            )}
            {formSchema && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                🎨 Form Builder Active ({formSchema.fields?.length || 0} Kolom)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{formSchema?.title || task?.name || 'Tinjauan Tugas'}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Proses: <span className="font-mono text-gray-700">{task?.processDefinitionId || 'Flowable Process'}</span>
          </p>
        </div>
        <Link
          href="/workflow/tasks"
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition self-start"
        >
          ← Task Inbox
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-xs animate-fade-in">
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context & Variables */}
        <div className="lg:col-span-1 space-y-4">
          {/* Metadata Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-1.5">
              <span>📋</span> Informasi Task
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-gray-500 block">Pelaksana (Assignee):</span>
                <span className="font-medium text-gray-800">{task?.assignee || 'Belum di-assign (Claimed)'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Dibuat Pada:</span>
                <span className="font-medium text-gray-800">
                  {task?.created ? new Date(task.created).toLocaleString('id-ID') : '-'}
                </span>
              </div>
              {task?.dueDate && (
                <div>
                  <span className="text-gray-500 block">Batas Waktu (Due Date):</span>
                  <span className="font-medium text-amber-700">
                    {new Date(task.dueDate).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              {(formSchema?.description || task?.description) && (
                <div>
                  <span className="text-gray-500 block">Keterangan:</span>
                  <p className="text-gray-700 mt-0.5">{formSchema?.description || task.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Incoming Process Variables (Data Pengajuan Sebelumnya) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📑</span> Data Pengajuan
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Process Variables</span>
            </h3>

            {processVars.length === 0 ? (
              <p className="text-gray-400 italic text-[11px]">
                Belum ada variabel data tambahan pada proses ini.
              </p>
            ) : (
              <div className="space-y-2">
                {processVars.map((v) => (
                  <div key={v.name} className="p-2 bg-gray-50 rounded border border-gray-100">
                    <span className="text-[10px] text-gray-500 font-mono block">{v.name}</span>
                    <span className="font-semibold text-gray-800 text-xs break-words">
                      {typeof v.value === 'boolean'
                        ? v.value ? 'Ya (True)' : 'Tidak (False)'
                        : String(v.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Form Task */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleCompleteTask}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6"
          >
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>✍️</span> {formSchema?.title || 'Formulir Tindakan Approver'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {formSchema?.description || 'Isi keputusan persetujuan atau data yang diperlukan untuk menyelesaikan task ini.'}
              </p>
            </div>

            {/* Approval Decision Buttons if applicable */}
            {isApprovalDecision && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Keputusan Persetujuan *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApproved(true)}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-semibold text-sm transition ${
                      approved
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">✅</span>
                    <span>Setujui (Approve)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApproved(false)}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-semibold text-sm transition ${
                      !approved
                        ? 'border-red-600 bg-red-50 text-red-800 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">❌</span>
                    <span>Tolak (Reject)</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Keputusan ini akan mengisi variabel <code className="font-mono text-purple-700 font-bold">approved = {String(approved)}</code> yang diteruskan ke Gateway alur kerja.
                </p>
              </div>
            )}

            {/* Catatan / Reviewer Comment */}
            {isApprovalDecision && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan / Alasan {approved ? 'Persetujuan' : 'Penolakan'}
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    approved
                      ? 'Contoh: Disetujui sesuai dengan kuota cuti tahunan karyawan.'
                      : 'Contoh: Mohon maaf, jadwal berbenturan dengan agenda prioritas internal.'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* DYNAMIC FORM RENDERER (FROM FORM BUILDER) */}
            {formSchema?.fields && formSchema.fields.length > 0 && (
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                <DynamicFormRenderer
                  fields={formSchema.fields}
                  values={customFields}
                  onChange={setCustomFields}
                />
              </div>
            )}

            {/* Legacy fallback if custom fields not yet in builder */}
            {(!formSchema || !formSchema.fields || formSchema.fields.length === 0) && formKey.includes('reimbursement') && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="font-semibold text-xs text-blue-900">
                  Rincian Verifikasi Keuangan (Reimbursement)
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Nominal Disetujui (Disbursement Amount)
                  </label>
                  <input
                    type="number"
                    value={customFields.disbursedAmount || ''}
                    onChange={(e) =>
                      setCustomFields({ ...customFields, disbursedAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Rp"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Alur akan langsung dieksekusi di Flowable Engine lokal.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin text-base">⏳</span>
                    <span>Menyimpan ke Flowable...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Selesaikan &amp; Teruskan Alur</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
