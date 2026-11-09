'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

export default function MyRequestsPage() {
  const { currentUser } = useAuthStore()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all') // all, leave, overtime
  const [filterStatus, setFilterStatus] = useState('all') // all, Pending, Approved, Rejected

  const fetchMyRequests = async () => {
    if (!currentUser?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workflow/my-requests?userId=${currentUser.id}`)
      const result = await res.json()
      if (result.success) {
        setRequests(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyRequests()
  }, [currentUser])

  const filtered = requests.filter((r) => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📤</span>
            <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Tracking status, alur approval, dan riwayat permohonan yang Anda ajukan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/mss/apply-leave-team"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <span>+</span> Ajukan Cuti Tim
          </Link>
          <Link
            href="/workflow"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
          >
            ← Kembali
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Category Filters */}
        <div className="flex items-center gap-2">
          {['all', 'leave', 'overtime'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat === 'leave' ? 'Cuti / Izin' : 'Lembur'}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {['all', 'Pending', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterStatus === st
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm font-semibold">Memuat permohonan Anda...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-bold text-gray-900">Belum ada pengajuan</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Anda belum memiliki riwayat pengajuan cuti atau lembur pada filter yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((req) => {
            const isApproved = req.status === 'Approved'
            const isRejected = req.status === 'Rejected'
            const isPending = req.status === 'Pending'

            return (
              <div
                key={req.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        req.category === 'leave' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {req.category === 'leave' ? '🏖️ Cuti' : '⚡ Lembur'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{req.title}</h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-block self-start sm:self-auto ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-800'
                        : isRejected
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Rentang Tanggal</span>
                    <span className="font-semibold text-gray-800">
                      {req.startDate} {req.startDate !== req.endDate ? `s/d ${req.endDate}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Durasi</span>
                    <span className="font-bold text-gray-900">{req.duration}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Waktu Pengajuan</span>
                    <span className="text-gray-600">
                      {new Date(req.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {req.note && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl italic">
                    &ldquo;{req.note}&rdquo;
                  </div>
                )}

                {/* Progress Stepper Mini */}
                {req.steps && req.steps.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-[11px] font-bold text-gray-400 block mb-2 uppercase tracking-wider">
                      Status Tahapan Persetujuan
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {req.steps.map((st, i) => {
                        const isStApproved = st.status === 'Approved'
                        const isStPending = st.status === 'Pending'
                        const isStRejected = st.status === 'Rejected'

                        return (
                          <div
                            key={i}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isStApproved
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : isStRejected
                                ? 'bg-rose-50 border-rose-200 text-rose-900'
                                : isStPending
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-300'
                                : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}
                          >
                            <span>{isStApproved ? '✓' : isStRejected ? '✕' : `${i + 1}`}</span>
                            <span>{st.label || `Level ${i + 1}`}</span>
                            <span className="text-[10px] opacity-75">({st.status || 'Waiting'})</span>
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
      )}
    </div>
  )
}
