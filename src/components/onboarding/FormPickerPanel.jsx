'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { FIELD_TYPES, newField } from '@/utils/formBuilderUtils'

// ── FormPickerPanel — shared between master/page.jsx and tracker/page.jsx ──────
// Props:
//   row / item  — the agenda row (either name works; row takes priority)
//   masterForms — array of master form objects from useMasterFormStore
//   onChange    — (patch: object) => void  — spread-patches the row
export default function FormPickerPanel({ row: rowProp, item: itemProp, masterForms, onChange }) {
  const row = rowProp ?? itemProp
  const [mode, setMode] = useState(row.masterFormId ? 'library' : (row.formSchema?.length > 0 ? 'custom' : 'library'))
  const activeForms = masterForms.filter(f => f.active)

  const pickLibrary = (formId) => {
    const mf = masterForms.find(f => f.id === Number(formId))
    if (!mf) {
      onChange({ masterFormId: null, formSchema: [], formType: null, evalMethod: null, evalTopics: [], ojtParams: [] })
      return
    }
    onChange({
      masterFormId: mf.id,
      formSchema:   mf.fields     ?? [],
      formType:     mf.formType   ?? 'field',
      evalMethod:   mf.evalMethod ?? 'nilai',
      evalTopics:   mf.evalTopics ?? [],
      ojtParams:    mf.ojtParams  ?? [],
    })
  }

  const addField  = ()          => onChange({ formSchema: [...(row.formSchema ?? []), newField()] })
  const delField  = (id)        => onChange({ formSchema: (row.formSchema ?? []).filter(f => f.id !== id) })
  const updField  = (id, k, v)  => onChange({ formSchema: (row.formSchema ?? []).map(f => f.id === id ? { ...f, [k]: v } : f) })
  const moveField = (idx, dir)  => {
    const arr = [...(row.formSchema ?? [])]; const swp = idx + dir
    if (swp < 0 || swp >= arr.length) return
    ;[arr[idx], arr[swp]] = [arr[swp], arr[idx]]; onChange({ formSchema: arr })
  }

  return (
    <div className='mt-2 mb-1 ml-8 mr-2 rounded-lg border border-dashed border-red-200 bg-red-50/40 p-3'>
      <div className='flex items-center gap-3 mb-3'>
        <span className='text-xs font-bold text-red-700'><Icon e='⚙' size={14} className='inline align-[-2px]' /> Form Fields</span>
        <div className='flex rounded-lg overflow-hidden border border-red-200 text-xs'>
          <button onClick={() => setMode('library')}
            className={`px-2.5 py-1 font-semibold transition ${mode === 'library' ? 'bg-red-600 text-white' : 'bg-white text-red-600 hover:bg-red-50'}`}>
            Dari Library
          </button>
          <button onClick={() => setMode('custom')}
            className={`px-2.5 py-1 font-semibold transition ${mode === 'custom' ? 'bg-red-600 text-white' : 'bg-white text-red-600 hover:bg-red-50'}`}>
            Custom
          </button>
        </div>
      </div>

      {mode === 'library' ? (
        <div>
          {activeForms.length === 0
            ? <p className='text-xs text-gray-400 italic'>Belum ada form di library. Buat di menu <strong>Master Form</strong>.</p>
            : <select value={row.masterFormId ?? ''}
                onChange={e => pickLibrary(e.target.value)}
                className='w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white'>
                <option value=''>— Pilih Form dari Library —</option>
                {activeForms.map(f => {
                  const ft = f.formType ?? 'field'
                  const suffix = ft === 'field'    ? `${(f.fields ?? []).length} field`
                    : ft === 'evaluasi' ? `Evaluasi · ${f.evalMethod ?? 'nilai'}`
                    : ft === 'ojt'      ? `OJT · ${(f.ojtParams ?? []).length} param`
                    : 'Summary'
                  return <option key={f.id} value={f.id}>{f.name} ({suffix})</option>
                })}
              </select>
          }
          {row.masterFormId && (() => {
            const ft = row.formType ?? 'field'
            if (ft === 'summary') return (
              <p className='mt-1 text-[10px] text-teal-600 italic'>Form Summary: ringkasan otomatis task selesai.</p>
            )
            if (ft === 'evaluasi') return (
              <p className='mt-1 text-[10px] text-amber-600 italic'>
                Form Evaluasi · metode: {row.evalMethod ?? 'nilai'} · {(row.evalTopics ?? []).length} topik
              </p>
            )
            if (ft === 'ojt') return (
              <p className='mt-1 text-[10px] text-violet-600 italic'>
                Form OJT · {(row.ojtParams ?? []).length} parameter · {(row.ojtParams ?? []).reduce((s, p) => s + (p.activities ?? []).length, 0)} aktivitas
              </p>
            )
            return (
              <div className='mt-2 flex flex-wrap gap-1'>
                {(row.formSchema ?? []).map(f => (
                  <span key={f.id} className='text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600'>
                    {f.label || f.type}{f.required ? ' *' : ''}
                  </span>
                ))}
              </div>
            )
          })()}
        </div>
      ) : (
        <div>
          <div className='flex justify-end mb-2'>
            <button onClick={addField}
              className='text-xs px-2.5 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 font-semibold transition'>
              + Tambah Field
            </button>
          </div>
          {(row.formSchema ?? []).length === 0 && (
            <p className='text-xs text-gray-400 italic text-center py-2'>Belum ada field.</p>
          )}
          <div className='space-y-2'>
            {(row.formSchema ?? []).map((f, idx) => (
              <div key={f.id} className='flex items-start gap-2 bg-white rounded border border-gray-200 px-2 py-1.5'>
                <div className='flex flex-col gap-0.5 pt-0.5'>
                  <button onClick={() => moveField(idx, -1)} disabled={idx === 0}
                    className='text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 leading-none'><Icon e='▲' size={15} /></button>
                  <button onClick={() => moveField(idx, 1)} disabled={idx === (row.formSchema ?? []).length - 1}
                    className='text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 leading-none'><Icon e='▼' size={15} /></button>
                </div>
                <div className='flex-1 grid grid-cols-1 md:grid-cols-4 gap-1.5'>
                  <input value={f.label} onChange={e => updField(f.id, 'label', e.target.value)}
                    placeholder='Label field…'
                    className='px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 md:col-span-2' />
                  <select value={f.type} onChange={e => updField(f.id, 'type', e.target.value)}
                    className='px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 bg-white'>
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className='flex items-center gap-2'>
                    <label className='flex items-center gap-1 text-xs text-gray-600 cursor-pointer'>
                      <input type='checkbox' checked={!!f.required}
                        onChange={e => updField(f.id, 'required', e.target.checked)}
                        className='w-3 h-3 accent-red-600' />Wajib
                    </label>
                    <button onClick={() => delField(f.id)}
                      className='ml-auto text-red-400 hover:text-red-600 text-sm font-bold'><Icon e='✕' size={15} /></button>
                  </div>
                  {(f.type === 'dropdown' || f.type === 'radio') && (
                    <input value={f.options || ''} onChange={e => updField(f.id, 'options', e.target.value)}
                      placeholder='Opsi dipisah koma: A, B, C'
                      className='px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-red-400 md:col-span-4' />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
