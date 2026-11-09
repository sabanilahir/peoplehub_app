'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function WorkflowHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all') // all, leave, overtime
  const [status, setStatus] = useState('all') // all, Approved, Rejected
  const [search, setSearch] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (category !== 'all') q.set('category', category)
      if (status !== 'all') q.set('status', status)
      if (search.trim()) q.set('search', search.trim())

      const res = await fetch(`/api/workflow/history?${q.toString()}`)
      const result = await res.json()
      if (result.success) {
        setHistory(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [category, status])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchHistory()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📜</span>
            <h1 className="text-2xl font-bold text-gray-900">Workflow History</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Arsip jejak audit seluruh alur proses cuti &amp; lembur yang telah selesai diputuskan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            href="/workflow"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
          >
            ← Kembali ke Portal
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'leave', label: 'Cuti / Izin' },
              { id: 'overtime', label: 'Lembur' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  category === c.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'Approved', label: 'Disetujui' },
              { id: 'Rejected', label: 'Ditolak' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  status === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-72 flex items-center gap-2">
          <input
            type="text"
            placeholder="Cari nama, NIK, jenis cuti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition"
          >
            Cari
          </button>
        </form>
      </div>

      {/* History Items */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm font-semibold">Memuat riwayat audit workflow...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">📜</div>
          <h3 className="text-lg font-bold text-gray-900">Belum ada riwayat persetujuan</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Tidak ada permohonan yang berstatus selesai (Approved/Rejected) sesuai filter pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => {
            const isApproved = item.status === 'Approved'
            const isLeave = item.category === 'leave'

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isLeave ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isLeave ? '🏖️ Cuti' : '⚡ Lembur'}
                      </span>
                      <span className="text-xs text-gray-400">ID: {item.id}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-block self-start sm:self-auto ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isApproved ? '✓ Disetujui' : '✕ Ditolak'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Pemohon</span>
                    <span className="font-semibold text-gray-800">
                      {item.applicantName} ({item.applicantNik}) · {item.applicantDept}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Waktu Pelaksanaan</span>
                    <span className="font-semibold text-gray-800">
                      {item.startDate} {item.startDate !== item.endDate ? `s/d ${item.endDate}` : ''} ({item.durationText})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Waktu Selesai Diputuskan</span>
                    <span className="text-gray-600">
                      {new Date(item.completedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Approver & Final Note */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-gray-500 font-medium">Diputuskan oleh: </span>
                    <span className="font-bold text-gray-800">{item.finalDecisionBy}</span>
                    {item.finalDecisionNote && item.finalDecisionNote !== '-' && (
                      <span className="italic text-gray-600 ml-2">&ldquo;{item.finalDecisionNote}&rdquo;</span>
                    )}
                  </div>

                  <div className="text-[11px] font-semibold text-blue-700">
                    💡 {item.payrollImpact}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
