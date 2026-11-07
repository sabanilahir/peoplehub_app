// src/app/api/leave/types/page.jsx -> sysadmin/leave-workflow/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/store/languageStore'
import {
  PageHeader,
  StatCard,
  SectionCard,
  DataTable,
  Tr,
  Td,
  StatusBadge,
  ActionButton,
  EmptyState,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'
import LeaveFormBuilderModal from '@/components/forms/LeaveFormBuilderModal'

const LEVEL_SHORT_LABELS = {
  supervisor: '1. Atasan Langsung',
  indirect_sup: '2. Manager Dept',
  hr_manager: '3. HR Manager',
  auto_approved: 'Auto-Approve',
}

export default function LeaveWorkflowPage() {
  const t = useT()
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)

  // Modal Form Builder State
  const [activeBuilderType, setActiveBuilderType] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDays, setNewTypeDays] = useState(12)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3500)
  }

  // Fetch real-time leave types from DB
  const fetchTypes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/leave/types')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setTypes(json.data)
        }
      }
    } catch (err) {
      console.error('Failed to load leave types:', err)
      flash('Gagal memuat jenis cuti dari database', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTypes()
  }, [])

  // Create new Leave Type
  const handleCreateType = async () => {
    if (!newTypeName.trim()) return
    try {
      const res = await fetch('/api/leave/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTypeName.trim(),
          maxDays: Number(newTypeDays) || 12,
          levels: ['supervisor'],
          formFields: [],
        }),
      })
      const json = await res.json()
      if (json.success) {
        flash(`Jenis cuti '${newTypeName}' berhasil dibuat!`)
        setShowAddModal(false)
        setNewTypeName('')
        setNewTypeDays(12)
        fetchTypes()
      } else {
        flash(json.error || 'Gagal membuat jenis cuti', 'error')
      }
    } catch (e) {
      flash('Terjadi kesalahan sistem saat membuat jenis cuti', 'error')
    }
  }

  // Toggle active status
  const handleToggleActive = async (lt) => {
    try {
      const res = await fetch('/api/leave/types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lt.id,
          active: !lt.active,
        }),
      })
      if (res.ok) {
        setTypes(types.map((t) => (t.id === lt.id ? { ...t, active: !t.active } : t)))
        flash(`Status jenis cuti '${lt.name}' diperbarui.`)
      }
    } catch (err) {
      flash('Gagal memperbarui status', 'error')
    }
  }

  const activeCount = types.filter((t) => t.active).length
  const totalDays = types.reduce((s, t) => s + (Number(t.maxDays) || 0), 0)

  return (
    <div className="pb-12">
      <PageHeader
        icon="📋"
        title="Leave Workflow &amp; Form Builder"
        subtitle="Rancang formulir cuti dinamis (dynamic fields) dan konfigurasi alur persetujuan bertingkat (multi-level approvers) tanpa hardcode."
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition"
            style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
          >
            <span>➕</span>
            <span>Tambah Jenis Cuti</span>
          </button>
        }
      />

      {msg && (
        <div
          className={`text-xs px-4 py-2.5 rounded-lg mb-5 font-semibold flex items-center justify-between shadow-xs ${
            msg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Jenis Cuti" value={types.length} icon="📅" tone="brand" />
        <StatCard
          label="Jenis Cuti Aktif"
          value={activeCount}
          icon="✅"
          tone="green"
          hint={`${types.length - activeCount} nonaktif`}
        />
        <StatCard
          label="Total Alokasi Kuota"
          value={`${totalDays} Hari`}
          icon="📊"
          tone="blue"
          hint="Gabungan seluruh jenis cuti"
        />
      </div>

      {/* Main Table: Leave Types with Form Builder Action */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>🛠️</span> Konfigurasi Formulir &amp; Alur Persetujuan Tiap Jenis Cuti
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Klik <strong>"⚙️ Desain Form &amp; Approval"</strong> untuk menambah pertanyaan kustom, upload surat dokter, atau mengatur level persetujuan.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat data jenis cuti dari PostgreSQL...
          </div>
        ) : types.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Belum ada jenis cuti"
              description="Tambahkan jenis cuti untuk mulai merancang formulir dan alur approval."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-600">
                  <th className="px-4 py-3 font-semibold">Nama Jenis Cuti</th>
                  <th className="px-4 py-3 font-semibold text-center">Batas Kuota</th>
                  <th className="px-4 py-3 font-semibold">Alur Persetujuan (Approval Levels)</th>
                  <th className="px-4 py-3 font-semibold text-center">Kolom Dinamis (Form Builder)</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {types.map((lt) => {
                  let parsedLevels = ['supervisor']
                  try {
                    if (lt.levels) {
                      parsedLevels = typeof lt.levels === 'string' ? JSON.parse(lt.levels) : lt.levels
                    }
                  } catch (e) {}

                  const formFieldsCount = Array.isArray(lt.formFields) ? lt.formFields.length : 0

                  return (
                    <tr key={lt.id} className="hover:bg-gray-50/70 transition">
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900 text-xs">{lt.name}</div>
                        {lt.requireDoc && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 mt-1 font-medium">
                            📎 Wajib Dokumen
                          </span>
                        )}
                        {lt.autoApprove && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1 ml-1 font-medium">
                            ⚡ Auto-Approve
                          </span>
                        )}
                      </td>

                      {/* Quota */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-800">
                        {lt.maxDays} Hari
                      </td>

                      {/* Approval Levels */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {parsedLevels.map((lvl, idx) => (
                            <span
                              key={lvl}
                              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200"
                            >
                              {LEVEL_SHORT_LABELS[lvl] || lvl}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Dynamic Form Fields */}
                      <td className="px-4 py-3.5 text-center">
                        {formFieldsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <span>📝</span> {formFieldsCount} Kolom Kustom
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Standar (Default)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(lt.active)}
                            onChange={() => handleToggleActive(lt)}
                            className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              lt.active ? 'text-emerald-700' : 'text-gray-400'
                            }`}
                          >
                            {lt.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </label>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveBuilderType(lt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition shadow-xs"
                        >
                          <Icon e="⚙️" size={13} />
                          <span>Desain Form &amp; Approval</span>
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

      {/* Visual Alur Proses Cuti */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🔄</span> Alur Kerja Cuti Otomatis Terintegrasi
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <span className="text-xl block mb-1">👤</span>
            <div className="font-bold text-xs text-blue-900">1. Pengajuan Karyawan</div>
            <p className="text-[10px] text-blue-700 mt-0.5">
              Karyawan mengisi form dinamis &amp; upload berkas di menu ESS (/ess/apply-leave).
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
            <span className="text-xl block mb-1">👔</span>
            <div className="font-bold text-xs text-amber-900">2. Review Atasan (MSS)</div>
            <p className="text-[10px] text-amber-700 mt-0.5">
              Atasan langsung meninjau data kustom &amp; berkas surat dokter di menu MSS (/mss/approve-leave).
            </p>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
            <span className="text-xl block mb-1">🗂️</span>
            <div className="font-bold text-xs text-purple-900">3. Validasi HR (Jika Berlaku)</div>
            <p className="text-[10px] text-purple-700 mt-0.5">
              Jenis cuti yang membutuhkan HR Manager otomatis diarahkan ke task approval HR.
            </p>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <span className="text-xl block mb-1">✅</span>
            <div className="font-bold text-xs text-emerald-900">4. Kuota Terpotong &amp; Terarsip</div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Permohonan status Approved, kuota berkurang, dan terhitung pada engine presensi &amp; payroll.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Tambah Jenis Cuti Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-xs">Tambah Jenis Cuti Baru</h4>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white text-lg font-bold">
                ×
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Nama Jenis Cuti *</label>
                <input
                  type="text"
                  placeholder="Contoh: Cuti Ibadah / Umroh"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-teal-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Maks. Kuota (Hari) *</label>
                <input
                  type="number"
                  value={newTypeDays}
                  onChange={(e) => setNewTypeDays(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-teal-600 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateType}
                  className="px-4 py-1.5 text-white font-semibold rounded-lg shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
                >
                  Simpan Jenis Cuti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visual Form Builder */}
      {activeBuilderType && (
        <LeaveFormBuilderModal
          leaveType={activeBuilderType}
          onClose={() => setActiveBuilderType(null)}
          onSaved={(updated) => {
            flash(`Formulir & alur approval '${updated.name}' berhasil disimpan!`)
            fetchTypes()
          }}
        />
      )}
    </div>
  )
}
