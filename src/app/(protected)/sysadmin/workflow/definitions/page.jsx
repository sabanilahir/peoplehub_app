'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function WorkflowDefinitionsPage() {
  const [definitions, setDefinitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDefinitions()
  }, [])

  const fetchDefinitions = async () => {
    try {
      const res = await fetch('/api/workflow/definitions')
      const result = await res.json()
      if (result.success) setDefinitions(result.data)
    } catch (error) {
      console.error('Failed to fetch definitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus definisi workflow ini?')) return
    try {
      const res = await fetch(`/api/workflow/definitions/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) fetchDefinitions()
      else alert(result.error)
    } catch (error) {
      alert('Gagal menghapus workflow')
    }
  }

  const handleToggleActive = async (id, currentActive) => {
    try {
      const res = await fetch(`/api/workflow/definitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      })
      const result = await res.json()
      if (result.success) fetchDefinitions()
    } catch (error) {
      console.error('Failed to toggle:', error)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Workflows &amp; Forms</h1>
          <p className="text-sm text-gray-600 mt-0.5">Kelola dan edit definisi proses BPMN serta skema formulir task.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sysadmin/workflow/designer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <span>+</span> Desain Workflow Baru
          </Link>
          <Link
            href="/sysadmin/workflow"
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition"
          >
            ← Kembali
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-2">
          <div className="animate-spin text-3xl">⏳</div>
          <p className="text-sm">Memuat daftar definisi workflow...</p>
        </div>
      ) : definitions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-8 shadow-xs space-y-3">
          <div className="text-4xl">📋</div>
          <p className="text-gray-600 font-medium">Belum ada definisi workflow yang tersimpan</p>
          <Link
            href="/sysadmin/workflow/designer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            Buat Alur Kerja Pertama
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama Workflow</th>
                <th className="px-5 py-3.5">Process Key</th>
                <th className="px-5 py-3.5">Form Builder Tasks</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Tanggal Dibuat</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {definitions.map((def) => {
                const formsObj = def.forms || {}
                const formCount = Object.keys(formsObj).length

                return (
                  <tr key={def.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-5 py-4 font-semibold text-gray-900">{def.name}</td>
                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                      <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {def.key}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {formCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span>📝</span> {formCount} Form Task
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Form Standar</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(def.id, def.active)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                          def.active
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {def.active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {new Date(def.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Link
                        href={`/sysadmin/workflow/designer?id=${def.id}`}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <span>✏️</span> Edit di Designer
                      </Link>
                      <button
                        onClick={() => handleDelete(def.id)}
                        className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
