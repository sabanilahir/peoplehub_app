// src/components/workflow/TaskFormBuilderModal.jsx
'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import DynamicFormRenderer from '@/components/forms/DynamicFormRenderer'

export const FIELD_TYPES = [
  { value: 'text', label: 'Teks Singkat (Text)', icon: '✏️' },
  { value: 'textarea', label: 'Teks Panjang (Textarea)', icon: '📝' },
  { value: 'number', label: 'Angka / Nominal (Number)', icon: '🔢' },
  { value: 'date', label: 'Tanggal (Date)', icon: '📅' },
  { value: 'dropdown', label: 'Pilihan Menu (Dropdown)', icon: '🔽' },
  { value: 'checkbox', label: 'Centang Konfirmasi (Checkbox)', icon: '☑️' },
  { value: 'file', label: 'Unggah Berkas / Dokumen (File)', icon: '📎' },
]

export const QUICK_TEMPLATES = {
  leave: [
    { label: 'Tipe Cuti', type: 'dropdown', required: true, options: 'Tahunan, Sakit, Melahirkan, Menikah, Izin Khusus' },
    { label: 'Tanggal Mulai Cuti', type: 'date', required: true },
    { label: 'Tanggal Selesai Cuti', type: 'date', required: true },
    { label: 'Alasan Cuti', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan cuti...' },
    { label: 'Dokumen / Surat Dokter', type: 'file', required: false },
  ],
  reimbursement: [
    { label: 'Kategori Pengeluaran', type: 'dropdown', required: true, options: 'Transportasi, Operasional, Medis, Hotel, Konsumsi' },
    { label: 'Nominal Klaim (Rp)', type: 'number', required: true, placeholder: '500000' },
    { label: 'No. Kuitansi / Bukti', type: 'text', required: true, placeholder: 'INV-2026-...' },
    { label: 'Keterangan Pengeluaran', type: 'textarea', required: true },
    { label: 'Foto / File Nota Pembayaran', type: 'file', required: true },
  ],
  approval: [
    { label: 'Catatan Reviewer', type: 'textarea', required: false, placeholder: 'Catatan atau alasan keputusan persetujuan...' },
    { label: 'Nominal Disetujui (Rp)', type: 'number', required: false },
    { label: 'Lampiran Evaluasi', type: 'file', required: false },
  ],
}

export default function TaskFormBuilderModal({
  elementId,
  elementName,
  elementType,
  initialSchema = {},
  onClose,
  onSave,
}) {
  const isStartEvent = elementType?.includes('Start') || elementId?.toLowerCase().includes('start')
  
  const [title, setTitle] = useState(
    initialSchema?.title || (isStartEvent ? `Formulir Inisiasi (${elementName || 'Pengajuan'})` : `Formulir ${elementName || 'Task'}`)
  )
  const [description, setDescription] = useState(
    initialSchema?.description || (isStartEvent ? 'Formulir input awal oleh pemohon' : 'Diisi / ditinjau oleh reviewer')
  )
  const [decisionType, setDecisionType] = useState(
    initialSchema?.decisionType || (isStartEvent ? 'none' : 'approval') // 'approval' (setuju/tolak) | 'none' (hanya data)
  )
  const [fields, setFields] = useState(
    Array.isArray(initialSchema?.fields) ? initialSchema.fields : []
  )
  
  // Preview interactive state
  const [previewValues, setPreviewValues] = useState({})
  const [activeTab, setActiveTab] = useState('editor') // 'editor' | 'preview' on small screens
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Sembunyikan floating context-pad dari BPMN.js saat modal terbuka
    const pads = document.querySelectorAll('.djs-context-pad')
    pads.forEach((p) => {
      p.style.display = 'none'
    })
    return () => {
      pads.forEach((p) => {
        p.style.display = ''
      })
    }
  }, [])

  // Add a new empty field
  const handleAddField = (fieldDef = null) => {
    const fieldId = `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newField = fieldDef
      ? {
          id: fieldId,
          label: fieldDef.label || 'Kolom Baru',
          type: fieldDef.type || 'text',
          required: Boolean(fieldDef.required),
          placeholder: fieldDef.placeholder || '',
          options: fieldDef.options || '',
        }
      : {
          id: fieldId,
          label: 'Kolom Baru',
          type: 'text',
          required: false,
          placeholder: '',
          options: '',
        }

    setFields([...fields, newField])
  }

  // Apply template
  const handleApplyTemplate = (tmplKey) => {
    const tmplFields = QUICK_TEMPLATES[tmplKey]
    if (!tmplFields) return

    const newFields = tmplFields.map((f) => ({
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: f.label,
      type: f.type,
      required: Boolean(f.required),
      placeholder: f.placeholder || '',
      options: f.options || '',
    }))

    setFields([...fields, ...newFields])
  }

  // Update a field
  const handleUpdateField = (id, key, value) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)))
  }

  // Delete a field
  const handleDeleteField = (id) => {
    setFields(fields.filter((f) => f.id !== id))
    setPreviewValues((prev) => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  // Move up/down
  const handleMoveField = (index, direction) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= fields.length) return
    const updated = [...fields]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setFields(updated)
  }

  // Save handler
  const handleSaveForm = () => {
    const formSchema = {
      elementId,
      elementName,
      elementType,
      title: title.trim() || elementName || 'Formulir Task',
      description: description.trim(),
      decisionType,
      fields,
      updatedAt: new Date().toISOString(),
    }
    onSave(formSchema)
    onClose()
  }

  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-md">
              🎨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Visual Form Builder</h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {elementId}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-gray-700 text-gray-300">
                  {isStartEvent ? 'Start Event' : 'User Task'}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Rancang formulir interaktif untuk langkah: <strong className="text-white">{elementName || elementId}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition"
            title="Tutup Modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls for Mobile */}
        <div className="sm:hidden flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 ${
              activeTab === 'editor' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600'
            }`}
          >
            ✏️ Desain Kolom ({fields.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 ${
              activeTab === 'preview' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600'
            }`}
          >
            👁️ Live Preview
          </button>
        </div>

        {/* Main Body (Split 2-Columns on Desktop) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          
          {/* LEFT: Builder Panel (7 Columns) */}
          <div className={`lg:col-span-7 flex flex-col h-full overflow-hidden ${activeTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* Form Meta Header */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-200 space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Judul Formulir *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Formulir Pengajuan Cuti"
                    className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Tipe Keputusan
                  </label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    disabled={isStartEvent}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                  >
                    <option value="approval">✅ Persetujuan (Approve/Reject)</option>
                    <option value="none">📝 Hanya Input Data Form</option>
                  </select>
                </div>
              </div>

              {/* Quick Template Inserter */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-gray-500">Sisipkan Preset:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('approval')}
                    className="text-[10px] px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium transition"
                  >
                    + Form Approval Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('leave')}
                    className="text-[10px] px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium transition"
                  >
                    + Form Cuti Lengkap
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('reimbursement')}
                    className="text-[10px] px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium transition"
                  >
                    + Form Klaim Biaya
                  </button>
                </div>
              </div>
            </div>

            {/* Field List Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
              {fields.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-white flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">Belum Ada Kolom Input</h4>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Klik tombol di bawah atau pilih preset di atas untuk mulai menambahkan kolom isian formulir.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAddField()}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    + Tambah Kolom Pertama
                  </button>
                </div>
              ) : (
                fields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="bg-white border border-gray-200 hover:border-blue-300 rounded-xl p-3.5 shadow-xs transition space-y-3"
                  >
                    {/* Top Row: Index, Move, Type, Required, Delete */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded hover:bg-gray-100 text-xs"
                            title="Pindah Ke Atas"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, 1)}
                            disabled={idx === fields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded hover:bg-gray-100 text-xs"
                            title="Pindah Ke Bawah"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => handleUpdateField(f.id, 'required', e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="font-semibold text-[11px] text-gray-700">Wajib Diisi</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(f.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 text-xs transition"
                          title="Hapus Kolom"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Label & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-7">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          Label Kolom Input *
                        </label>
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => handleUpdateField(f.id, 'label', e.target.value)}
                          placeholder="Misal: Alasan Cuti"
                          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          Tipe Input
                        </label>
                        <select
                          value={f.type}
                          onChange={(e) => handleUpdateField(f.id, 'type', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-gray-800"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Optional: Placeholder */}
                    {f.type !== 'file' && f.type !== 'checkbox' && (
                      <div>
                        <input
                          type="text"
                          value={f.placeholder || ''}
                          onChange={(e) => handleUpdateField(f.id, 'placeholder', e.target.value)}
                          placeholder="Petunjuk placeholder (opsional)..."
                          className="w-full text-[11px] text-gray-600 border border-gray-200 rounded px-2.5 py-1 bg-gray-50/60 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Dropdown Options */}
                    {f.type === 'dropdown' && (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1">
                        <label className="block text-[10px] font-bold text-blue-900 uppercase">
                          Daftar Opsi Pilihan (Pisahkan dengan koma)
                        </label>
                        <input
                          type="text"
                          value={f.options || ''}
                          onChange={(e) => handleUpdateField(f.id, 'options', e.target.value)}
                          placeholder="Contoh: Pilihan A, Pilihan B, Pilihan C"
                          className="w-full text-xs border border-blue-200 rounded px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}

              {fields.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleAddField()}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 transition flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Tambah Kolom Input Lagi
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Live Preview Panel (5 Columns) */}
          <div className={`lg:col-span-5 flex flex-col h-full bg-slate-50/60 overflow-hidden ${activeTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <span>👁️</span> Live Preview Pengguna
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                Interactive Preview
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                {/* Header Simulated */}
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900">{title || 'Formulir Task'}</h3>
                  {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                </div>

                {/* Dynamic Fields Live Renderer */}
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic">
                    Formulir masih kosong. Tambahkan kolom di panel kiri untuk melihat pratinjau.
                  </div>
                ) : (
                  <DynamicFormRenderer
                    fields={fields}
                    values={previewValues}
                    onChange={setPreviewValues}
                  />
                )}

                {/* Simulated Decision Buttons if User Task Approval */}
                {decisionType === 'approval' && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Aksi Keputusan Approver:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled
                        className="py-2 px-3 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 opacity-90 cursor-default"
                      >
                        ✓ Setujui (Approve)
                      </button>
                      <button
                        type="button"
                        disabled
                        className="py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 opacity-90 cursor-default"
                      >
                        ✕ Tolak (Reject)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Total <strong>{fields.length}</strong> kolom dikonfigurasi untuk task ini.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition shadow-xs"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <span>💾</span> Terapkan Form ke Task Ini
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

