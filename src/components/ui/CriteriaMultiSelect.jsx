'use client'
import { useState, useMemo } from 'react'

const svg = (children, size = 15) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcSearch = svg(<><circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' /></>)
const IcCheck  = svg(<><polyline points='20 6 9 17 4 12' /></>)
const IcX      = svg(<><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></>, 12)

const asText = (v) => (v === null || v === undefined) ? '' : String(v)

/**
 * Professional searchable multi-select for auto-assign criteria (employment
 * type, company, department, position). Replaces the flat pill-soup with a
 * searchable checkbox list, selected-chip summary, and select-all / clear —
 * shared by both onboarding and offboarding auto-assign policies.
 */
export default function CriteriaMultiSelect({ label, items = [], selected = [], onToggle, onSelectAll, t }) {
  const [query, setQuery] = useState('')
  const nameOf = (id) => items.find(i => String(i.id) === String(id))?.name ?? id
  const allSel = items.length > 0 && items.every(i => selected.includes(i.id))
  const showSearch = items.length > 8

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => asText(i.name).toLowerCase().includes(q))
  }, [items, query])

  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <p className='text-xs font-bold text-gray-500 uppercase tracking-wide'>
          {label}
          {selected.length > 0
            ? <span className='ml-1.5 text-red-600'>({selected.length})</span>
            : <span className='ml-1.5 font-medium normal-case text-gray-400'>· {t('semua', 'all')}</span>}
        </p>
        <button type='button' onClick={() => onSelectAll(allSel)}
          className='text-[11px] font-bold text-red-500 hover:text-red-700'>
          {allSel ? t('Hapus Semua', 'Clear All') : t('Pilih Semua', 'Select All')}
        </button>
      </div>

      {/* Selected summary — compact: all-selected collapses to one chip; long
          selections cap the visible chips with a "+N more" overflow. */}
      {selected.length > 0 && (
        allSel ? (
          <div className='flex items-center gap-2 mb-2'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-red-50 text-red-700 rounded-full'>
              {t('Semua dipilih', 'All selected')} ({selected.length})
            </span>
            <button type='button' onClick={() => onSelectAll(true)} className='text-[11px] font-bold text-gray-400 hover:text-red-600'>{t('Kosongkan', 'Clear')}</button>
          </div>
        ) : (
          <div className='flex flex-wrap gap-1.5 mb-2 max-h-16 overflow-y-auto'>
            {selected.slice(0, 8).map(id => (
              <span key={id} className='inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold bg-red-50 text-red-700 rounded-full'>
                {nameOf(id)}
                <button type='button' onClick={() => onToggle(id)} className='w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-200/70'>
                  <IcX />
                </button>
              </span>
            ))}
            {selected.length > 8 && (
              <span className='inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-gray-500'>+{selected.length - 8} {t('lainnya', 'more')}</span>
            )}
          </div>
        )
      )}

      <div className='border border-gray-200 rounded-xl bg-white overflow-hidden'>
        {showSearch && (
          <div className='flex items-center gap-2 px-3 py-2 border-b border-gray-100'>
            <span className='text-gray-400'><IcSearch /></span>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder={t('Cari…', 'Search…')}
              className='w-full text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400' />
            {query && (
              <button type='button' onClick={() => setQuery('')} className='text-gray-300 hover:text-gray-500'><IcX /></button>
            )}
          </div>
        )}
        <div className='max-h-44 overflow-y-auto p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1'>
          {filtered.length === 0 ? (
            <p className='col-span-full text-center py-6 text-xs text-gray-400'>{t('Tidak ada hasil', 'No results')}</p>
          ) : filtered.map(item => {
            const active = selected.includes(item.id)
            return (
              <button key={item.id} type='button' onClick={() => onToggle(item.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm transition ${
                  active ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                  active ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 text-transparent'}`}>
                  <IcCheck size={12} />
                </span>
                <span className='truncate'>{item.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
