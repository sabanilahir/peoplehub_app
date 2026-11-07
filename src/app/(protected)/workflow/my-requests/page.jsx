'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([])
  const [definitions, setDefinitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [startingProcess, setStartingProcess] = useState(false)
  const [selectedKey, setSelectedKey] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchMyRequests()
    fetchDefinitions()
  }, [])

  const fetchMyRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/flowable/processes?size=50')
      const result = await res.json()
      if (result.success) {
        const list = result.data?.data || result.data || []
        setRequests(Array.isArray(list) ? list : [])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDefinitions = async () => {
    try {
      const res = await fetch('/api/flowable/process-definitions')
      const result = await res.json()
      if (result.success) {
        const defs = result.data?.data || result.data || []
        setDefinitions(Array.isArray(defs) ? defs : [])
        if (defs.length > 0 && !selectedKey) {
          setSelectedKey(defs[0].key)
        }
      }
    } catch (err) {
      console.error('Failed to fetch definitions:', err)
    }
  }

  const handleStartProcess = async (e) => {
    e.preventDefault()
    if (!selectedKey) return
    setStartingProcess(true)
    setMessage(null)
    try {
      const res = await fetch('/api/flowable/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processDefinitionKey: selectedKey,
          variables: [
            { name: 'reason', value: reason || 'Pengajuan Workflow' },
            { name: 'initiator', value: 'admin' },
          ],
        }),
      })
      const result = await res.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Permohonan alur proses berhasil diajukan!' })
        setShowModal(false)
        setReason('')
        fetchMyRequests()
      } else {
        setMessage({ type: 'error', text: result.error || 'Gagal mengajukan proses' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setStartingProcess(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'suspended':
        return 'bg-amber-100 text-amber-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permohonan Saya (My Requests)</h1>
          <p className="text-sm text-gray-600 mt-1">Lacak status dan progres permohonan alur kerja yang Anda ajukan</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMyRequests}
            className="px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 transition"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
          >
            ➕ Ajukan Permohonan Baru
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
            message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <p className="text-gray-500 font-medium text-sm">Memuat daftar permohonan...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
          <div className="text-5xl">📋</div>
          <h3 className="text-lg font-semibold text-gray-800">Belum ada permohonan</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Anda belum memiliki pengajuan alur kerja aktif di Flowable Engine.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
          >
            Mulai Ajukan Sekarang
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-xs uppercase">
              <tr>
                <th className="px-5 py-3.5">Nama Alur Kerja</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Diajukan</th>
                <th className="px-4 py-3.5">Selesai</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((req) => {
                const status = req.status || (req.ended ? 'Completed' : req.suspended ? 'Suspended' : 'Active')
                const start = req.startTime || req.startedAt
                const end = req.endTime || req.endedAt

                return (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        {req.processDefinitionName || req.processDefinitionKey || 'Permohonan Workflow'}
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {req.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-xs">
                      {start ? new Date(start).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-xs">
                      {end ? new Date(end).toLocaleString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/workflow/tasks?process=${req.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Lihat Task Approval →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajukan Permohonan Baru */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Ajukan Permohonan Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleStartProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Alur Kerja *</label>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  {definitions.length === 0 ? (
                    <option value="leave-test-process">Pengajuan Cuti (Demo Process)</option>
                  ) : (
                    definitions.map((def) => (
                      <option key={def.key || def.id} value={def.key}>
                        {def.name || def.key} ({def.key})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Keterangan / Keperluan</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Pengajuan cuti tahunan selama 3 hari"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={startingProcess}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {startingProcess ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link href="/workflow" className="text-sm font-medium text-gray-600 hover:text-gray-900">
          ← Kembali ke Portal Workflow
        </Link>
      </div>
    </div>
  )
}
