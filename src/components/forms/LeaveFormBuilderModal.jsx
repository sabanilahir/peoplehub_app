// src/components/forms/LeaveFormBuilderModal.jsx
'use client'

import React, { useState } from 'react'
import Icon from '@/components/ui/Icon'

const AVAILABLE_FIELD_TYPES = [
  { value: 'text', label: 'Teks Singkat (Text)' },
  { value: 'textarea', label: 'Teks Panjang (Textarea)' },
  { value: 'number', label: 'Angka (Number)' },
  { value: 'date', label: 'Tanggal (Date)' },
  { value: 'dropdown', label: 'Pilihan Menu (Dropdown)' },
  { value: 'checkbox', label: 'Centang Konfirmasi (Checkbox)' },
  { value: 'file', label: 'Unggah Berkas / Dokumen (File)' },
]

export default function LeaveFormBuilderModal({ leaveType, onClose, onSaved }) {
  const [name, setName] = useState(leaveType.name || '')
  const [maxDays, setMaxDays] = useState(leaveType.maxDays || 12)
  const [autoApprove, setAutoApprove] = useState(Boolean(leaveType.autoApprove))
  const [requireDoc, setRequireDoc] = useState(Boolean(leaveType.requireDoc))

  // Parse approval levels
  let initLevels = ['supervisor']
  try {
    if (leaveType.levels) {
      initLevels = typeof leaveType.levels === 'string' ? JSON.parse(leaveType.levels) : leaveType.levels
    }
  } catch (e) {}
  const [levels, setLevels] = useState(initLevels)

  // Fields array
  const [fields, setFields] = useState(Array.isArray(leaveType.formFields) ? leaveType.formFields : [])
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // Add new field
  const handleAddField = () => {
    const newF = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: 'Kolom Baru',
      type: 'text',
      required: false,
      placeholder: '',
      options: '',
    }
    setFields([...fields, newF])
  }

  // Update field
  const handleUpdateField = (id, key, val) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, [key]: val } : f)))
  }

  // Delete field
  const handleDeleteField = (id) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  // Move field up/down
  const handleMoveField = (idx, direction) => {
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= fields.length) return
    const updated = [...fields]
    const temp = updated[idx]
    updated[idx] = updated[nextIdx]
    updated[nextIdx] = temp
    setFields(updated)
  }

  // Toggle approval level
  const handleToggleLevel = (lvlKey) => {
    if (levels.includes(lvlKey)) {
      if (levels.length === 1) return // minimal 1 level
      setLevels(levels.filter((l) => l !== lvlKey))
    } else {
      setLevels([...levels, lvlKey])
    }
  }

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true)
      setErrorMsg(null)

      const payload = {
        id: leaveType.id,
        name,
        maxDays: Number(maxDays),
        autoApprove,
        requireDoc,
        levels,
        formFields: fields,
      }

      const res = await fetch('/api/leave/types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (json.success) {
        onSaved(json.data)
        onClose()
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan konfigurasi form')
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-950 text-white flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🛠️</span>
              <h3 className="text-base font-bold">Visual Form Builder &amp; Alur Approval</h3>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Atur kolom formulir dinamis dan tingkatan atasan penyetuju untuk: <span className="font-semibold text-teal-300">{leaveType.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold leading-none">
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Konfigurasi Dasar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nama Jenis Cuti</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-semibold focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Maks. Kuota (Hari)</label>
              <input
                type="number"
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-teal-600"
              />
            </div>
            <div className="flex flex-col justify-center gap-1 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-gray-700">Otomatis Disetujui Sistem</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireDoc}
                  onChange={(e) => setRequireDoc(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-gray-700">Wajib Lampirkan Dokumen</span>
              </label>
            </div>
          </div>

          {/* Alur Persetujuan Bertingkat (Approval Flow) */}
          <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <span>👥</span> Tingkatan Atasan Penyetuju (Multi-Level Approval)
                </h4>
                <p className="text-[11px] text-gray-500">Pilih siapa saja atasan yang wajib memberikan persetujuan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { key: 'supervisor', label: '1. Atasan Langsung', desc: 'Direct Supervisor karyawan' },
                { key: 'indirect_sup', label: '2. Manager Departemen', desc: 'Head / Atasan tidak langsung' },
                { key: 'hr_manager', label: '3. HR Manager / HR Dept', desc: 'Validasi departemen HR' },
              ].map((lvl) => {
                const isSelected = levels.includes(lvl.key)
                return (
                  <div
                    key={lvl.key}
                    onClick={() => handleToggleLevel(lvl.key)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{lvl.label}</span>
                      <span className="text-sm">{isSelected ? '✅' : '⚪'}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{lvl.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form Builder Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <span>📝</span> Desain Kolom Formulir (Dynamic Form Fields)
                </h4>
                <p className="text-[11px] text-gray-500">
                  Tambahkan pertanyaan atau dokumen pendukung khusus untuk jenis cuti ini
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddField}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
              >
                <span>➕</span>
                <span>Tambah Kolom</span>
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <span className="text-2xl block mb-1">📋</span>
                <p className="text-gray-500 font-semibold text-xs">Belum ada kolom kustom tambahan.</p>
                <p className="text-gray-400 text-[11px]">
                  Formulir hanya akan meminta tanggal mulai, tanggal selesai, dan catatan standar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs flex items-start gap-3 hover:border-teal-300 transition"
                  >
                    {/* Urutan & Move buttons */}
                    <div className="flex flex-col items-center gap-1 pt-1 text-gray-400">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, -1)}
                        className="hover:text-teal-700 disabled:opacity-20 text-xs"
                        title="Geser ke atas"
                      >
                        ▲
                      </button>
                      <span className="font-bold text-[10px] text-gray-500">{idx + 1}</span>
                      <button
                        type="button"
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMoveField(idx, 1)}
                        className="hover:text-teal-700 disabled:opacity-20 text-xs"
                        title="Geser ke bawah"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Field Editor Inputs */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-gray-500 mb-0.5 font-semibold">
                          Label Pertanyaan *
                        </label>
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => handleUpdateField(f.id, 'label', e.target.value)}
                          placeholder="Contoh: Surat Keterangan Dokter"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-teal-600"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-gray-500 mb-0.5 font-semibold">Tipe Input</label>
                        <select
                          value={f.type}
                          onChange={(e) => handleUpdateField(f.id, 'type', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-teal-600"
                        >
                          {AVAILABLE_FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-center gap-3 pt-4">
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(f.required)}
                            onChange={(e) => handleUpdateField(f.id, 'required', e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                          />
                          <span className="font-semibold text-[11px]">Wajib</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleDeleteField(f.id)}
                          className="text-rose-500 hover:text-rose-700 text-sm font-bold p-1"
                          title="Hapus Kolom"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Dropdown Options */}
                      {f.type === 'dropdown' && (
                        <div className="sm:col-span-12">
                          <label className="block text-[10px] text-gray-500 mb-0.5 font-semibold">
                            Pilihan Menu (Pisahkan dengan tanda koma)
                          </label>
                          <input
                            type="text"
                            value={f.options || ''}
                            onChange={(e) => handleUpdateField(f.id, 'options', e.target.value)}
                            placeholder="Contoh: Dalam Kota, Luar Kota, Luar Negeri"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-teal-600"
                          />
                        </div>
                      )}

                      {/* Placeholder Text */}
                      {['text', 'textarea', 'number', 'file'].includes(f.type) && (
                        <div className="sm:col-span-12">
                          <label className="block text-[10px] text-gray-500 mb-0.5 font-semibold">
                            Petunjuk Pengisian / Placeholder
                          </label>
                          <input
                            type="text"
                            value={f.placeholder || ''}
                            onChange={(e) => handleUpdateField(f.id, 'placeholder', e.target.value)}
                            placeholder="Teks petunjuk yang terlihat di dalam kotak isian..."
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-teal-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <span className="text-[11px] text-gray-400">
            Perubahan langsung tersimpan ke database PostgreSQL dan langsung aktif di formulir ESS.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #052B52, #039299)' }}
            >
              {saving ? 'Menyimpan...' : '💾 Simpan Konfigurasi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

