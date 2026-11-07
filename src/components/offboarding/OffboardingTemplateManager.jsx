'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useOffboardingTemplateStore, TEMPLATE_ACTIVITY } from '@/store/offboardingTemplateStore'
import { OFFBOARDING_CATEGORIES } from '@/store/offboardingChecklistStore'
import { useT } from '@/store/languageStore'

// ─── Inline line icons ───────────────────────────────────────────────────────
const svg = (children, size = 16) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcPlus   = svg(<><line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' /></>)
const IcEdit   = svg(<><path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' /><path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' /></>)
const IcTrash  = svg(<><polyline points='3 6 5 6 21 6' /><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' /></>)
const IcCopy   = svg(<><rect x='9' y='9' width='13' height='13' rx='2' /><path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' /></>)
const IcBack   = svg(<><line x1='19' y1='12' x2='5' y2='12' /><polyline points='12 19 5 12 12 5' /></>)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white'

function F({ label, children }) {
  return <div><p className='text-sm font-semibold text-gray-800 mb-1.5'>{label}</p>{children}</div>
}
function dueLabel(offset, t) {
  const n = Number(offset) || 0
  if (n === 0) return t('Pada LWD', 'On LWD')
  if (n > 0) return `H-${n}`
  return `H+${Math.abs(n)}`
}

/**
 * Inline template manager: create / edit / delete reusable offboarding checklist
 * templates. Rendered as an in-page panel (no outer overlay) so it can live under
 * a tab beside the auto-assign rules. The activity editor and delete confirm stay
 * as modal dialogs.
 */
export default function OffboardingTemplateManager() {
  const t = useT()
  const { templates = [], addTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useOffboardingTemplateStore()
  const [draft, setDraft]     = useState(null)   // template being edited (list view when null)
  const [actEdit, setActEdit] = useState(null)   // { index, data } | null
  const [delTpl, setDelTpl]   = useState(null)   // template pending delete
  const [msg, setMsg]         = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const startNew  = () => setDraft({ id: null, name: '', description: '', activities: [] })
  const startEdit = (tp) => setDraft({ ...tp, activities: tp.activities.map(a => ({ ...a })) })

  const saveDraft = () => {
    if (!asText(draft.name).trim()) return flash(t('Nama template wajib diisi.', 'Template name is required.'), 'error')
    if (draft.id == null) { addTemplate(draft); flash(t('Template dibuat.', 'Template created.')) }
    else { updateTemplate(draft.id, { name: draft.name, description: draft.description, activities: draft.activities }); flash(t('Template diperbarui.', 'Template updated.')) }
    setDraft(null)
  }

  const saveActivity = () => {
    if (!asText(actEdit.data.title).trim()) return flash(t('Nama aktivitas wajib diisi.', 'Activity name is required.'), 'error')
    setDraft(d => {
      const acts = [...d.activities]
      if (actEdit.index < 0) acts.push(actEdit.data)
      else acts[actEdit.index] = actEdit.data
      return { ...d, activities: acts }
    })
    setActEdit(null)
  }
  const removeActivity = (i) => setDraft(d => ({ ...d, activities: d.activities.filter((_, idx) => idx !== i) }))

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-6 py-4 border-b border-gray-50'>
        <div className='flex items-center gap-2'>
          {draft && <button onClick={() => setDraft(null)} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500'><IcBack /></button>}
          <h2 className='font-bold text-gray-900'>
            {draft ? (draft.id == null ? t('Template Baru', 'New Template') : t('Edit Template', 'Edit Template')) : t('Kelola Template Checklist', 'Manage Checklist Templates')}
          </h2>
        </div>
        {draft && (
          <button onClick={saveDraft} className='px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow'>{t('Simpan Template', 'Save Template')}</button>
        )}
      </div>

      {/* Body */}
      <div className='px-6 py-5'>
        {!draft ? (
          /* ── List view ─────────────────────────────────────────────── */
          <div className='space-y-3'>
            {templates.length === 0 ? (
              <p className='text-center py-10 text-gray-400 text-sm'>{t('Belum ada template. Buat yang pertama.', 'No templates yet. Create your first one.')}</p>
            ) : templates.map(tp => (
              <div key={tp.id} className='border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gray-200'>
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-gray-800 truncate'>{tp.name}</p>
                  <p className='text-xs text-gray-400 truncate'>{tp.description || t('Tanpa deskripsi', 'No description')}</p>
                  <p className='text-[11px] text-gray-400 mt-1'>{tp.activities.length} {t('aktivitas', 'activities')} · {tp.activities.filter(a => a.category === 'HR').length} HR · {tp.activities.filter(a => a.category !== 'HR').length} {t('Atasan', 'Manager')}</p>
                </div>
                <div className='flex items-center gap-1 flex-shrink-0'>
                  <button onClick={() => startEdit(tp)} title={t('Edit', 'Edit')} className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcEdit /></button>
                  <button onClick={() => { duplicateTemplate(tp.id); flash(t('Template diduplikasi.', 'Template duplicated.')) }} title={t('Duplikat', 'Duplicate')} className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcCopy /></button>
                  <button onClick={() => setDelTpl(tp)} title={t('Hapus', 'Delete')} className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcTrash /></button>
                </div>
              </div>
            ))}
            <button onClick={startNew} className='w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-500 hover:border-red-300 hover:text-red-600 transition'>
              <IcPlus /> {t('Buat Template Baru', 'Create New Template')}
            </button>
          </div>
        ) : (
          /* ── Editor view ───────────────────────────────────────────── */
          <div className='space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <F label={t('Nama Template', 'Template Name')}>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder={t('cth: Offboarding Standar', 'e.g. Standard Offboarding')} className={inputCls} />
              </F>
              <F label={t('Deskripsi', 'Description')}>
                <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder={t('Keterangan singkat', 'Short description')} className={inputCls} />
              </F>
            </div>

            <div className='flex items-center justify-between'>
              <p className='text-sm font-semibold text-gray-800'>{t('Aktivitas', 'Activities')} ({draft.activities.length})</p>
              <button onClick={() => setActEdit({ index: -1, data: { ...TEMPLATE_ACTIVITY } })}
                className='flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800'><IcPlus /> {t('Tambah', 'Add')}</button>
            </div>

            <div className='border border-gray-100 rounded-xl divide-y divide-gray-50'>
              {draft.activities.length === 0 ? (
                <p className='text-center py-8 text-gray-400 text-sm'>{t('Belum ada aktivitas', 'No activities yet')}</p>
              ) : draft.activities.map((a, i) => (
                <div key={i} className='px-4 py-2.5 flex items-center gap-3'>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${a.category === 'HR' ? 'bg-red-100 text-red-700' : 'bg-rose-100 text-rose-700'}`}>{a.category === 'HR' ? 'HR' : t('Atasan', 'Manager')}</span>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-semibold text-gray-800 truncate'>{asText(a.title)}</p>
                    {a.description && <p className='text-xs text-gray-400 truncate'>{asText(a.description)}</p>}
                  </div>
                  <span className='text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap'>{dueLabel(a.dueOffset, t)}</span>
                  <div className='flex items-center gap-1 flex-shrink-0'>
                    <button onClick={() => setActEdit({ index: i, data: { ...TEMPLATE_ACTIVITY, ...a } })} className='w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcEdit /></button>
                    <button onClick={() => removeActivity(i)} className='w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50'><IcTrash /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className='flex items-center justify-end gap-2 pt-2'>
              <button onClick={() => setDraft(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Kembali', 'Back')}</button>
              <button onClick={saveDraft} className='px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow'>{t('Simpan Template', 'Save Template')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Activity editor (modal) */}
      {actEdit && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b'>
              <h3 className='font-bold text-gray-900'>{actEdit.index < 0 ? t('Tambah Aktivitas', 'Add Activity') : t('Edit Aktivitas', 'Edit Activity')}</h3>
              <button onClick={() => setActEdit(null)} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <F label={t('Kategori', 'Category')}>
                  <select value={actEdit.data.category} onChange={e => setActEdit(s => ({ ...s, data: { ...s.data, category: e.target.value } }))} className={inputCls}>
                    {OFFBOARDING_CATEGORIES.map(c => <option key={c} value={c}>{c === 'HR' ? 'HR' : t('Atasan Langsung', 'Direct Manager')}</option>)}
                  </select>
                </F>
                <F label={t('Deadline (hari thd LWD)', 'Deadline (days vs LWD)')}>
                  <input type='number' value={actEdit.data.dueOffset}
                    onChange={e => setActEdit(s => ({ ...s, data: { ...s.data, dueOffset: Number(e.target.value) } }))} className={inputCls} />
                </F>
              </div>
              <F label={t('Aktivitas', 'Activity')}>
                <input value={actEdit.data.title} onChange={e => setActEdit(s => ({ ...s, data: { ...s.data, title: e.target.value } }))}
                  placeholder={t('Nama aktivitas', 'Activity name')} className={inputCls} />
              </F>
              <F label={t('Deskripsi', 'Description')}>
                <input value={actEdit.data.description} onChange={e => setActEdit(s => ({ ...s, data: { ...s.data, description: e.target.value } }))}
                  placeholder={t('Keterangan singkat', 'Short description')} className={inputCls} />
              </F>
              <div className='grid grid-cols-1 gap-4'>
                <F label='PIC Name'>
                  <input value={actEdit.data.picName} onChange={e => setActEdit(s => ({ ...s, data: { ...s.data, picName: e.target.value } }))}
                    placeholder='PIC' className={inputCls} />
                </F>
                <F label='Remark'>
                  <input value={actEdit.data.remark} onChange={e => setActEdit(s => ({ ...s, data: { ...s.data, remark: e.target.value } }))}
                    placeholder={t('Catatan tambahan', 'Additional notes')} className={inputCls} />
                </F>
              </div>
              <p className='text-xs text-gray-400'>{t('Deadline dihitung otomatis dari Last Working Day karyawan saat template disebarkan. Positif = sebelum LWD, negatif = sesudah.', 'The deadline is computed from the employee’s Last Working Day when the template is distributed. Positive = before LWD, negative = after.')}</p>
            </div>
            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50'>
              <button onClick={() => setActEdit(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
              <button onClick={saveActivity} className='px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow'>{t('Simpan', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete template confirm (modal) */}
      {delTpl && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl p-6 shadow-2xl w-80'>
            <p className='font-bold text-gray-900 mb-2'>{t('Hapus template ini?', 'Delete this template?')}</p>
            <p className='text-sm text-gray-500 mb-5'>&ldquo;{delTpl.name}&rdquo; {t('akan dihapus permanen.', 'will be permanently removed.')}</p>
            <div className='flex gap-2 justify-end'>
              <button onClick={() => setDelTpl(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal', 'Cancel')}</button>
              <button onClick={() => { deleteTemplate(delTpl.id); setDelTpl(null); flash(t('Template dihapus.', 'Template deleted.')) }}
                className='px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.text}
        </div>
      )}
    </div>
  )
}
