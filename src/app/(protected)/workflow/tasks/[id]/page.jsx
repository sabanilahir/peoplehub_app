'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params?.id
  const { currentUser } = useAuthStore()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Decision Form State
  const [action, setAction] = useState('approve') // 'approve' | 'reject'
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (taskId) fetchTaskDetail()
  }, [taskId])

  const fetchTaskDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workflow/tasks/${taskId}`)
      const result = await res.json()
      if (result.success) {
        setTask(result.data)
      } else {
        setError(result.error || 'Tugas tidak ditemukan')
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat detail tugas')
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/workflow/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approverId: currentUser?.id,
          approverName: currentUser?.name || 'Approver',
          note: comment.trim() || (action === 'approve' ? 'Disetujui' : 'Ditolak'),
        }),
      })

      const result = await res.json()
      if (result.success) {
        setSuccessMsg(result.message || 'Keputusan berhasil disimpan!')
        setTimeout(() => {
          router.push('/workflow/tasks')
        }, 1500)
      } else {
        setError(result.error || 'Gagal memproses keputusan')
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-gray-500">
        <div className="animate-spin text-4xl mb-3">⏳</div>
        <p className="font-semibold text-sm">Memuat detail tugas persetujuan...</p>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-sm">
          {error || 'Tugas tidak ditemukan'}
        </div>
        <Link href="/workflow/tasks" className="inline-block text-blue-600 hover:underline text-sm font-semibold">
          ← Kembali ke Task Inbox
        </Link>
      </div>
    )
  }

  const isLeave = task.category === 'leave'
  const isApproved = task.status === 'Approved'
  const isRejected = task.status === 'Rejected'
  const isPending = task.status === 'Pending'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/workflow/tasks"
          className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <span>←</span> Kembali ke Task Inbox
        </Link>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isApproved
              ? 'bg-emerald-100 text-emerald-800'
              : isRejected
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          Status: {task.status}
        </span>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <span>🎉</span> {successMsg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isLeave ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isLeave ? '🏖️ Cuti / Izin' : '⚡ Lembur'}
              </span>
              <span className="text-xs text-gray-400">ID: {task.id}</span>
            </div>
            <h1 className="text-xl font-extrabold text-gray-900">{task.title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Diajukan pada {new Date(task.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Info + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Stepper */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee & Request Info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <span>👤</span> Informasi Pemohon &amp; Pengajuan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Nama Lengkap</span>
                <span className="font-bold text-gray-800 text-sm">{task.applicantName}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Nomor Induk Karyawan (NIK)</span>
                <span className="font-semibold text-gray-800">{task.applicantNik}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Departemen</span>
                <span className="font-semibold text-gray-800">{task.applicantDept}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Jabatan</span>
                <span className="font-semibold text-gray-800">{task.applicantPosition}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Jenis Pengajuan</span>
                <span className="font-bold text-blue-700">{task.leaveType}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Durasi Waktu</span>
                <span className="font-bold text-gray-900">{task.durationText}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-400 block mb-0.5">Rentang Tanggal</span>
                <span className="font-semibold text-gray-800">
                  {task.startDate} {task.startDate !== task.endDate ? `sampai ${task.endDate}` : ''}
                </span>
              </div>
            </div>

            {/* Note */}
            <div>
              <span className="text-xs text-gray-400 block mb-1">Catatan / Alasan:</span>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 italic">
                {task.note || 'Tidak ada catatan'}
              </div>
            </div>

            {/* Attachment preview / download if any */}
            {task.attachment && (
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
                <span className="text-xs font-bold text-indigo-900 block mb-2">📎 Dokumen Lampiran (Surat Dokter / Pendukung)</span>
                {typeof task.attachment === 'string' && (task.attachment.startsWith('data:image') || task.attachment.startsWith('http') || task.attachment.startsWith('/')) ? (
                  <div className="space-y-2">
                    <img
                      src={task.attachment}
                      alt="Lampiran Dokumen"
                      className="max-h-64 rounded-lg border object-contain bg-white"
                    />
                    <a
                      href={task.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 font-semibold hover:underline inline-block"
                    >
                      Buka Dokumen Ukuran Penuh ↗
                    </a>
                  </div>
                ) : (
                  <div className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border">
                    {String(task.attachment)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stepper Approval Matrix */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <span>🪜</span> Alur Persetujuan Bertingkat (Workflow Steps)
            </h3>

            <div className="space-y-3">
              {(task.steps || []).map((s, idx) => {
                const isStepApproved = s.status === 'Approved'
                const isStepPending = s.status === 'Pending'
                const isStepRejected = s.status === 'Rejected'

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
                      isStepApproved
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                        : isStepRejected
                        ? 'border-rose-200 bg-rose-50/50 text-rose-900'
                        : isStepPending
                        ? 'border-amber-300 bg-amber-50/60 text-amber-900 font-semibold shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                          isStepApproved
                            ? 'bg-emerald-600 text-white'
                            : isStepRejected
                            ? 'bg-rose-600 text-white'
                            : isStepPending
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {isStepApproved ? '✓' : isStepRejected ? '✕' : s.level || idx + 1}
                      </div>
                      <div>
                        <div className="font-bold">{s.label || `Approval Level ${s.level || idx + 1}`}</div>
                        <div className="text-[11px] opacity-80">
                          Approver: {s.approverName || 'Ditugaskan ke Role/Atasan'}
                        </div>
                        {s.note && <div className="text-[11px] italic mt-0.5">&ldquo;{s.note}&rdquo;</div>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isStepApproved
                            ? 'bg-emerald-200 text-emerald-800'
                            : isStepRejected
                            ? 'bg-rose-200 text-rose-800'
                            : isStepPending
                            ? 'bg-amber-200 text-amber-900 animate-pulse'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {s.status || 'Waiting'}
                      </span>
                      {s.actedAt && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date(s.actedAt).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Decision Action Form & HO Calculator Banner */}
        <div className="space-y-6">
          {/* Payroll HO Calculator Preview Banner */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-purple-500/10 border border-blue-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h4 className="text-sm font-bold text-gray-900">Integrasi HO Calculator</h4>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Jika disetujui penuh, sistem secara otomatis memasukkan entri ini ke perhitungan payroll Head Office:
            </p>
            <div className="p-3 bg-white/80 backdrop-blur-sm border border-blue-100 rounded-xl text-xs font-semibold text-blue-900">
              💡 {task.payrollImpact}
            </div>
          </div>

          {/* Decision Form (Only if Pending) */}
          {isPending ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <span>⚖️</span> Form Keputusan Approver
              </h3>

              <form onSubmit={handleDecision} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Pilih Keputusan:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAction('approve')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        action === 'approve'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>✓</span> Setujui (Approve)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction('reject')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        action === 'reject'
                          ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-400'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>✕</span> Tolak (Reject)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Catatan Approval (Opsional):
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      action === 'approve'
                        ? 'Catatan persetujuan...'
                        : 'Alasan penolakan pengajuan...'
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                    action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <span>{action === 'approve' ? '✓' : '✕'}</span>
                      <span>{action === 'approve' ? 'Kirim Persetujuan' : 'Kirim Penolakan'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-500 space-y-2">
              <div className="text-2xl">{isApproved ? '✅' : '❌'}</div>
              <p className="font-bold text-gray-800">
                Tugas ini telah {isApproved ? 'disetujui' : 'ditolak'}
              </p>
              <p>Tidak ada tindakan approval yang dapat dilakukan lagi.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
