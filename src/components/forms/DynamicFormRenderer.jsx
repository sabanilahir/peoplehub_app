// src/components/forms/DynamicFormRenderer.jsx
'use client'

import React from 'react'

export default function DynamicFormRenderer({ fields = [], values = {}, onChange }) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return null
  }

  const handleFieldChange = (fieldId, val) => {
    onChange({
      ...values,
      [fieldId]: val,
    })
  }

  const handleFileChange = (fieldId, file) => {
    if (!file) {
      handleFieldChange(fieldId, null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      handleFieldChange(fieldId, {
        name: file.name,
        size: file.size,
        type: file.type,
        data: reader.result, // Data URL
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1 border-b border-gray-100 flex items-center gap-1.5">
        <span>📋</span> Informasi Tambahan Formulir (Form Builder)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => {
          const val = values[f.id] ?? ''
          const isFullWidth = f.type === 'textarea' || f.type === 'file'

          return (
            <div key={f.id} className={isFullWidth ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {f.label} {f.required && <span className="text-rose-500">*</span>}
              </label>

              {/* TIPE: TEXT */}
              {f.type === 'text' && (
                <input
                  type="text"
                  required={f.required}
                  value={val}
                  placeholder={f.placeholder || `Masukkan ${f.label.toLowerCase()}`}
                  onChange={(e) => handleFieldChange(f.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-teal-600 focus:bg-white bg-gray-50/50 transition"
                />
              )}

              {/* TIPE: NUMBER */}
              {f.type === 'number' && (
                <input
                  type="number"
                  required={f.required}
                  value={val}
                  placeholder={f.placeholder || '0'}
                  onChange={(e) => handleFieldChange(f.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-teal-600 focus:bg-white bg-gray-50/50 transition font-mono"
                />
              )}

              {/* TIPE: DATE */}
              {f.type === 'date' && (
                <input
                  type="date"
                  required={f.required}
                  value={val}
                  onChange={(e) => handleFieldChange(f.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-teal-600 focus:bg-white bg-gray-50/50 transition"
                />
              )}

              {/* TIPE: TEXTAREA */}
              {f.type === 'textarea' && (
                <textarea
                  rows={2}
                  required={f.required}
                  value={val}
                  placeholder={f.placeholder || `Tulis ${f.label.toLowerCase()} secara rinci...`}
                  onChange={(e) => handleFieldChange(f.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-teal-600 focus:bg-white bg-gray-50/50 transition"
                />
              )}

              {/* TIPE: DROPDOWN */}
              {f.type === 'dropdown' && (
                <select
                  required={f.required}
                  value={val}
                  onChange={(e) => handleFieldChange(f.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-teal-600 focus:bg-white bg-gray-50/50 transition"
                >
                  <option value="">-- Pilih {f.label} --</option>
                  {(f.options || '')
                    .split(',')
                    .map((opt) => opt.trim())
                    .filter(Boolean)
                    .map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                </select>
              )}

              {/* TIPE: CHECKBOX */}
              {f.type === 'checkbox' && (
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => handleFieldChange(f.id, e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                  />
                  <span>{f.placeholder || 'Ya, konfirmasi isian ini'}</span>
                </label>
              )}

              {/* TIPE: FILE UPLOAD */}
              {f.type === 'file' && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition bg-white">
                  <input
                    type="file"
                    id={`file_${f.id}`}
                    required={f.required && !val}
                    onChange={(e) => handleFileChange(f.id, e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor={`file_${f.id}`} className="cursor-pointer block">
                    <div className="text-xl mb-1">📁</div>
                    <div className="text-xs font-semibold text-teal-700 hover:underline">
                      {val?.name ? `File Terpilih: ${val.name}` : 'Pilih Berkas Lampiran'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Format didukung: PDF, PNG, JPG (Maks. 5MB)
                    </div>
                  </label>
                  {val?.name && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-[11px] text-emerald-600 font-semibold">✓ Siap diunggah</span>
                      <button
                        type="button"
                        onClick={() => handleFieldChange(f.id, null)}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Hapus Berkas
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

