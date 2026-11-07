'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { inputClass } from './index'

/**
 * Type-to-search dropdown for long option lists (thousands of positions,
 * employees, etc.) where a native <select> forces users to scroll instead
 * of search. Drop-in for Select when the option list can get large —
 * value/onChange carry the raw string value, not a synthetic event.
 */
export default function SearchableSelect({ value, onChange, options, placeholder = '-- Pilih --', disabled = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = options.find(o => String(o.value) === String(value))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  const select = (val) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className='relative'>
      <input
        type='text'
        disabled={disabled}
        value={open ? query : (selected?.label || '')}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => setQuery('')}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onClick={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setQuery('') }
          if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); select(filtered[0].value) }
        }}
        className={`${inputClass} ${className}`}
      />
      {open && !disabled && (
        <div className='absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg'>
          {filtered.length === 0 ? (
            <p className='px-3 py-2.5 text-xs text-gray-400'>Tidak ada hasil</p>
          ) : filtered.map(o => (
            <button
              key={o.value} type='button' onMouseDown={e => e.preventDefault()} onClick={() => select(o.value)}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                String(o.value) === String(value) ? 'bg-teal-50 font-semibold text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {o.name || o.label}
              {o.badgeText && (
                <span className={`ml-1.5 text-xs font-semibold ${o.badgeTone === 'good' ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {o.badgeText}
                </span>
              )}
              {o.sublabel && <span className='block text-xs text-gray-400'>{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
