'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

export default function TaskInboxPage() {
  const { currentUser } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({ totalPending: 0, pendingLeaves: 0, pendingOvertimes: 0, completedTotal: 0 })
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all') // 'all' | 'leave' | 'overtime'
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  // Modal quick action state
  const [actionModal, setActionModal] = useState({ open: false, task: null, action: 'approve', note: '' })

  const flashToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const userIdParam = currentUser?.id ? `&userId=${currentUser.id}` : ''
      const res = await fetch(`/api/workflow/tasks?category=${category}${userIdParam}`)
      const result = await res.json()
      if (result.success) {
        setTasks(result.data || [])
        if (result.stats) setStats(result.stats)
      } else {
        flashToast(result.error || 'Gagal memuat daftar tugas', 'error')
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      flashToast('Terjadi kesalahan koneksi saat memuat tugas', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [category, currentUser])

  const handleOpenActionModal = (task, action) => {
    setActionModal({
      open: true,
      task,
      action,
      note: action === 'approve' ? 'Disetujui' : '',
    })
  }

  const handleConfirmAction = async () => {
    const { task, action, note } = actionModal
    if (!task) return

    setActionLoading(task.id)
    try {
      const res = await fetch(`/api/workflow/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approverId: currentUser?.id,
          approverName: currentUser?.name || 'Approver',
          note: note.trim() || (action === 'approve' ? 'Disetujui' : 'Ditolak'),
        }),
      })

      const result = await res.json()
      if (result.success) {
        flashToast(result.message || `Tugas berhasil di-${action === 'approve' ? 'setujui' : 'tolak'}!`, 'success')
        setActionModal({ open: false, task: null, action: 'approve', note: '' })
        fetchTasks()
      } else {
        flashToast(result.error || `Gagal memproses aksi ${action}`, 'error')
      }
    } catch (err) {
      console.error(err)
      flashToast('Terjadi kesalahan saat memproses keputusan approval', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.applicantName?.toLowerCase().includes(q) ||
      t.applicantNik?.toLowerCase().includes(q) ||
      t.applicantDept?.toLowerCase().includes(q) ||
      t.leaveType?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📥</span>
            <h1 className="text-2xl font-bold text-gray-900">Task Inbox</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Daftar tugas persetujuan (Cuti &amp; Lembur) yang menunggu review Anda sebelum masuk ke kalkulasi payroll
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            href="/workflow"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
          >
            ← Kembali ke Portal
          </Link>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between animate-fadeIn ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menunggu Persetujuan</span>
            <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
              ⏳
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{stats.totalPending}</span>
            <span className="text-xs text-gray-500">tugas pending</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Permohonan Cuti</span>
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
              🏖️
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{stats.pendingLeaves}</span>
            <span className="text-xs text-gray-500">perlu review</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Permohonan Lembur</span>
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
              ⚡
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{stats.pendingOvertimes}</span>
            <span className="text-xs text-gray-500">perlu review</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selesai Diproses</span>
            <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
              ✅
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600">{stats.completedTotal}</span>
            <span className="text-xs text-gray-500">diarsipkan</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua Tugas', count: stats.totalPending },
            { id: 'leave', label: 'Cuti & Izin', count: stats.pendingLeaves },
            { id: 'overtime', label: 'Lembur', count: stats.pendingOvertimes },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                category === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  category === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Cari pemohon, NIK, jenis cuti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm font-semibold">Memuat tugas persetujuan...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-lg font-bold text-gray-900">Tidak ada tugas persetujuan</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Semua permohonan telah selesai direview atau belum ada pengajuan baru dari anggota tim.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((t) => {
            const isActing = actionLoading === t.id
            const isLeave = t.category === 'leave'
            const toneBorder =
              t.payrollTone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                : t.payrollTone === 'amber'
                ? 'border-amber-200 bg-amber-50/40 text-amber-800'
                : t.payrollTone === 'red'
                ? 'border-rose-200 bg-rose-50/40 text-rose-800'
                : 'border-blue-200 bg-blue-50/40 text-blue-800'

            return (
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left Section: Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isLeave ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLeave ? '🏖️ Cuti / Izin' : '⚡ Lembur'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                      Menunggu Approval
                    </span>
                    {t.attachment && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                        📎 Ada Dokumen
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      Diajukan {new Date(t.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900">{t.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                      <span>
                        👤 <strong>{t.applicantName}</strong> ({t.applicantNik})
                      </span>
                      <span>🏢 {t.applicantDept}</span>
                      <span>💼 {t.applicantPosition}</span>
                      <span>
                        📅 {t.startDate} {t.startDate !== t.endDate ? `s/d ${t.endDate}` : ''} ({t.durationText})
                      </span>
                    </div>
                  </div>

                  {t.note && (
                    <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-2.5 italic">
                      &ldquo;{t.note}&rdquo;
                    </div>
                  )}

                  {/* HO Calculator Payroll Integration Badge */}
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${toneBorder}`}>
                    <span className="text-base">💡</span>
                    <div>
                      <strong className="font-bold">Dampak HO Calculator: </strong>
                      <span>{t.payrollImpact}</span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Action Buttons */}
                <div className="flex flex-row lg:flex-col items-center justify-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0">
                  <div className="flex items-center gap-2 w-full lg:w-48">
                    <button
                      onClick={() => handleOpenActionModal(t, 'approve')}
                      disabled={isActing}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <span>✓</span> Setujui
                    </button>
                    <button
                      onClick={() => handleOpenActionModal(t, 'reject')}
                      disabled={isActing}
                      className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <span>✕</span> Tolak
                    </button>
                  </div>
                  <Link
                    href={`/workflow/tasks/${t.id}`}
                    className="w-full lg:w-48 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition text-center"
                  >
                    🔍 Detail &amp; Dokumen
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {actionModal.action === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
              </h3>
              <button
                onClick={() => setActionModal({ open: false, task: null, action: 'approve', note: '' })}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Anda akan {actionModal.action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan{' '}
              <strong>{actionModal.task?.title}</strong> dari{' '}
              <strong>{actionModal.task?.applicantName}</strong>.
            </p>

            {actionModal.action === 'approve' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                ✨ Setelah disetujui penuh, pengajuan ini akan otomatis masuk ke formula pemotongan/penambahan di{' '}
                <strong>HO Payroll Calculator</strong>.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Catatan Persetujuan / Alasan (Opsional):
              </label>
              <textarea
                rows={3}
                value={actionModal.note}
                onChange={(e) => setActionModal((prev) => ({ ...prev, note: e.target.value }))}
                placeholder={
                  actionModal.action === 'approve'
                    ? 'Catatan untuk pemohon (misal: Disetujui, jaga kesehatan)...'
                    : 'Alasan penolakan pengajuan...'
                }
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal({ open: false, task: null, action: 'approve', note: '' })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm ${
                  actionModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionModal.action === 'approve' ? 'Ya, Setujui Permohonan' : 'Ya, Tolak Permohonan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
