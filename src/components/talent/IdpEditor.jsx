'use client'
import Link from 'next/link'
import { IDP_METHODS, LMS_METHODS, ITEM_STATUS, competencyGap } from '@/store/idpStore'
import { LEVEL_LABELS } from '@/store/competencyStore'
import { Select, StatusBadge } from '@/components/ui'

// Editor IDP position-driven: kompetensi otomatis dari profil posisi.
// Karyawan mengisi current level + rencana pengembangan (5 metode).
export default function IdpEditor({ competencies, onChange, readOnly = false }) {
  const setComp = (id, patch) => onChange(competencies.map(c => c.id === id ? { ...c, ...patch } : c))
  const setItem = (id, method, patch) =>
    onChange(competencies.map(c => c.id === id ? { ...c, items: { ...c.items, [method]: { ...c.items[method], ...patch } } } : c))

  if (!competencies || competencies.length === 0) {
    return (
      <div className='rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400'>
        Posisi ini belum memiliki profil kompetensi. Atur di menu <b>Position Profile</b> terlebih dahulu.
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {competencies.map(c => {
        const gap = competencyGap(c)
        return (
          <div key={c.id} className='rounded-xl border border-gray-100 p-3.5'>
            {/* Competency header (from position profile) */}
            <div className='mb-3 flex flex-wrap items-center gap-2'>
              <span className='text-sm font-semibold text-gray-800'>{c.name}</span>
              {c.category && <StatusBadge tone='neutral'>{c.category}</StatusBadge>}
              <span className='text-xs text-gray-400'>Expected: <b className='text-gray-600'>L{c.expected}{LEVEL_LABELS[c.expected] ? ` · ${LEVEL_LABELS[c.expected]}` : ''}</b></span>
              <div className='ml-auto flex items-center gap-2'>
                <label className='text-xs text-gray-500'>Current</label>
                <Select value={c.current} disabled={readOnly} onChange={e=>setComp(c.id,{current:e.target.value})} className='w-28 py-1 text-xs'>
                  <option value=''>—</option>
                  {[1,2,3,4,5].map(lv=><option key={lv} value={lv}>L{lv}</option>)}
                </Select>
                {gap != null && (gap > 0 ? <StatusBadge tone='warning'>Gap {gap}</StatusBadge> : <StatusBadge tone='success'>On Target</StatusBadge>)}
              </div>
            </div>

            {/* Development plan per method */}
            <div className='space-y-1.5'>
              {IDP_METHODS.map(method => {
                const it = c.items?.[method] || { description:'', timeline:'', status:'Planned' }
                return (
                  <div key={method} className='grid grid-cols-12 items-center gap-2'>
                    <div className='col-span-3 text-xs font-medium text-gray-600'>
                      {method}
                      {LMS_METHODS.includes(method) && it.description && (
                        <Link href='/ess/learning/catalog' className='ml-1 text-[10px] text-red-600 hover:underline'>LMS↗</Link>
                      )}
                    </div>
                    <input value={it.description} disabled={readOnly} onChange={e=>setItem(c.id,method,{description:e.target.value})}
                      placeholder='Deskripsi rencana…'
                      className='col-span-5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-500' />
                    <input value={it.timeline} disabled={readOnly} onChange={e=>setItem(c.id,method,{timeline:e.target.value})}
                      placeholder='Timeline'
                      className='col-span-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-500' />
                    <Select value={it.status} disabled={readOnly} onChange={e=>setItem(c.id,method,{status:e.target.value})} className='col-span-2 py-1.5 text-xs'>
                      {ITEM_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
