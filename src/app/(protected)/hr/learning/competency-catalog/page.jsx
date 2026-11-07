'use client'
import { useState, useMemo } from 'react'
import {
  useCompetencyStore, COMPETENCY_DOMAINS, DOMAIN_TO_CATEGORY,
  blankScopeRow, blankAlignments,
} from '@/store/competencyStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton, EmptyState,
  Select, SearchBar, Input, FormField,
} from '@/components/ui'

const DOMAIN_TONE = {
  'Core Competencies':'info', 'Strategic Competencies':'danger',
  'Soft Competencies':'warning', 'Functional Competencies':'success',
}

const BLANK = {
  domain:'', name:'', definitionId:'', definitionEn:'',
  scope:[blankScopeRow(), blankScopeRow(), blankScopeRow()],
  alignments: blankAlignments(),
}

const taClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100'

export default function CompetencyCatalogPage() {
  const { catalog, addCompetency, updateCompetency, deleteCompetency } = useCompetencyStore()

  const [view,   setView]   = useState('list')   // 'list' | 'form'
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(BLANK)
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('')
  const [msg,    setMsg]    = useState(null)
  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const domainOf = (c) => c.domain || '—'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter(c =>
      (!filter || domainOf(c) === filter) &&
      (!q || `${c.code} ${c.name} ${c.description}`.toLowerCase().includes(q)))
  }, [catalog, query, filter])

  // ─── Form helpers ───────────────────────────────────────────────────────────
  const openNew  = () => { setForm(BLANK); setEditId(null); setView('form') }
  const openEdit = (c) => {
    setForm({
      domain: c.domain || '',
      name: c.name || '',
      definitionId: c.definitionId || c.description || '',
      definitionEn: c.definitionEn || '',
      scope: c.scope?.length ? c.scope.map(s=>({...s})) : [blankScopeRow(), blankScopeRow(), blankScopeRow()],
      alignments: c.alignments?.length ? c.alignments.map(a=>({...a, behaviors:a.behaviors.map(b=>({...b}))})) : blankAlignments(),
    })
    setEditId(c.id); setView('form')
  }
  const cancel = () => { setView('list'); setEditId(null); setForm(BLANK) }

  const setScope = (i, key, val) => setForm(f => ({ ...f, scope: f.scope.map((s,idx)=>idx===i?{...s,[key]:val}:s) }))
  const addScope = () => setForm(f => ({ ...f, scope:[...f.scope, blankScopeRow()] }))
  const delScope = (i) => setForm(f => ({ ...f, scope: f.scope.filter((_,idx)=>idx!==i) }))
  const setBeh = (ai, bi, key, val) => setForm(f => ({
    ...f,
    alignments: f.alignments.map((a,idx)=> idx!==ai ? a : {
      ...a, behaviors: a.behaviors.map((b,j)=> j===bi ? {...b,[key]:val} : b),
    }),
  }))

  const save = () => {
    if (!form.domain)       return flash('Domain wajib dipilih.', 'error')
    if (!form.name.trim())  return flash('Competency Name wajib diisi.', 'error')
    if (form.scope.every(s => !s.descId.trim() && !s.descEn.trim()))
      return flash('Minimal satu baris Scope wajib diisi.', 'error')

    const payload = {
      domain: form.domain,
      category: DOMAIN_TO_CATEGORY[form.domain] || 'Core',
      name: form.name.trim(),
      definitionId: form.definitionId.trim(),
      definitionEn: form.definitionEn.trim(),
      description: form.definitionId.trim() || form.definitionEn.trim(),
      scope: form.scope,
      alignments: form.alignments,
    }
    if (editId) {
      updateCompetency(editId, payload); flash('Kompetensi diperbarui.')
    } else {
      // Auto-generate kode dari domain (mis. COR14).
      const prefix = (DOMAIN_TO_CATEGORY[form.domain] || 'CMP').slice(0,3).toUpperCase()
      const seq = String(catalog.length + 1).padStart(2, '0')
      addCompetency({ code:`${prefix}${seq}`, ...payload }); flash('Kompetensi ditambahkan.')
    }
    cancel()
  }

  // ─── List view ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        {msg && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${msg.type==='error'?'bg-red-600 text-white':'bg-gray-900 text-white'}`}>
            {msg.type==='error'?'⚠':'✓'} {msg.text}
          </div>
        )}

        <PageHeader title='Competency Catalog'
          subtitle='Kamus kompetensi (Competency Dictionary) — Domain, definisi dwibahasa, Scope, dan Proficiency Alignment (Key Behavior).' />

        <SectionCard title={`Daftar Kompetensi (${catalog.length})`} bodyClass='p-0'
          actions={
            <div className='flex items-center gap-2'>
              <div className='hidden sm:block w-52'><SearchBar value={query} onChange={setQuery} placeholder='Cari kompetensi…' /></div>
              <Select value={filter} onChange={e=>setFilter(e.target.value)} className='py-2 text-xs w-48'>
                <option value=''>Semua Domain</option>
                {COMPETENCY_DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
              </Select>
              <button onClick={openNew} className='whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>+ Add Competency</button>
            </div>
          }>
          {filtered.length === 0 ? (
            <div className='p-6'><EmptyState title='Tidak ada kompetensi.' /></div>
          ) : (
            <DataTable className='rounded-none shadow-none ring-0'
              columns={['Kode','Competency Name','Domain','Definisi',{label:'Aksi',align:'right'}]}>
              {filtered.map(c => (
                <Tr key={c.id}>
                  <Td className='font-mono text-xs text-gray-500'>{c.code}</Td>
                  <Td className='font-medium text-gray-800'>{c.name}</Td>
                  <Td><StatusBadge tone={DOMAIN_TONE[domainOf(c)]||'neutral'}>{domainOf(c)}</StatusBadge></Td>
                  <Td className='max-w-md text-xs text-gray-500'>{c.definitionId || c.description || '—'}</Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-1.5'>
                      <ActionButton size='sm' variant='secondary' onClick={()=>openEdit(c)}>Edit</ActionButton>
                      <button onClick={()=>{deleteCompetency(c.id);flash('Kompetensi dihapus.')}} className='px-2 text-xs font-semibold text-gray-400 hover:text-red-600'>Hapus</button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>
    )
  }

  // ─── Add / Edit form view ─────────────────────────────────────────────────────
  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${msg.type==='error'?'bg-red-600 text-white':'bg-gray-900 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      {/* Breadcrumb */}
      <div className='mb-5 flex items-center gap-2 text-lg font-bold'>
        <button onClick={cancel} className='text-red-700 hover:underline'>Competency</button>
        <span className='text-gray-400'>›</span>
        <span className='text-gray-900'>{editId ? 'Edit Competency' : 'Add Competency'}</span>
      </div>

      <div className='space-y-6'>
        {/* ── Identitas ── */}
        <SectionCard>
          <div className='space-y-5'>
            <FormField label='Domain' required>
              <Select value={form.domain} onChange={e=>setForm(f=>({...f,domain:e.target.value}))}>
                <option value=''>Select Domain</option>
                {COMPETENCY_DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
              </Select>
            </FormField>

            <FormField label='Competency Name' required>
              <Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Enter Competency Name' />
            </FormField>

            <div className='grid gap-4 md:grid-cols-2'>
              <FormField label='Definition (ID)'>
                <textarea rows={4} value={form.definitionId} onChange={e=>setForm(f=>({...f,definitionId:e.target.value}))} placeholder='Enter Definition (ID)' className={taClass} />
              </FormField>
              <FormField label='Definition (EN)'>
                <textarea rows={4} value={form.definitionEn} onChange={e=>setForm(f=>({...f,definitionEn:e.target.value}))} placeholder='Enter Definition (EN)' className={taClass} />
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* ── Scope ── */}
        <SectionCard title='Scope'
          actions={<button onClick={addScope} className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50'>+ Tambah Scope</button>}
          bodyClass='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  <th className='w-16 px-4 py-3 text-center'>Scope</th>
                  <th className='px-4 py-3'>Description (ID) <span className='text-red-500'>*</span></th>
                  <th className='px-4 py-3'>Description (EN) <span className='text-red-500'>*</span></th>
                  <th className='w-12 px-2 py-3'></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {form.scope.map((s,i) => (
                  <tr key={i}>
                    <td className='bg-gray-50/40 px-4 py-3 text-center font-semibold text-gray-700'>{i+1}</td>
                    <td className='px-4 py-3'><textarea rows={2} value={s.descId} onChange={e=>setScope(i,'descId',e.target.value)} placeholder='Enter Description (ID)' className={taClass} /></td>
                    <td className='px-4 py-3'><textarea rows={2} value={s.descEn} onChange={e=>setScope(i,'descEn',e.target.value)} placeholder='Enter Description (EN)' className={taClass} /></td>
                    <td className='px-2 py-3 text-center'>
                      {form.scope.length > 1 && (
                        <button onClick={()=>delScope(i)} title='Hapus baris' className='text-gray-300 hover:text-red-600'>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ── Proficiency Alignment - Key Behavior ── */}
        <SectionCard title='Proficiency Alignment - Key Behavior' bodyClass='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  <th className='w-48 px-4 py-3'>Proficiency Alignment</th>
                  <th className='w-24 px-4 py-3 text-center'>Key Behavior</th>
                  <th className='px-4 py-3'>Description (ID) <span className='text-red-500'>*</span></th>
                  <th className='px-4 py-3'>Description (EN) <span className='text-red-500'>*</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {form.alignments.map((a,ai) => (
                  a.behaviors.map((b,bi) => (
                    <tr key={`${ai}-${bi}`}>
                      {bi === 0 && (
                        <td rowSpan={a.behaviors.length} className='border-r border-gray-100 px-4 py-3 align-middle font-semibold text-gray-800'>
                          Alignment {a.level} ({a.label})
                        </td>
                      )}
                      <td className={`px-4 py-3 text-center font-semibold text-gray-600 ${bi%2?'bg-gray-50/40':''}`}>{b.key}</td>
                      <td className={`px-4 py-3 ${bi%2?'bg-gray-50/40':''}`}><textarea rows={2} value={b.descId} onChange={e=>setBeh(ai,bi,'descId',e.target.value)} placeholder='Enter Description (ID)' className={taClass} /></td>
                      <td className={`px-4 py-3 ${bi%2?'bg-gray-50/40':''}`}><textarea rows={2} value={b.descEn} onChange={e=>setBeh(ai,bi,'descEn',e.target.value)} placeholder='Enter Description (EN)' className={taClass} /></td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ── Actions ── */}
        <div className='flex justify-end gap-3'>
          <button onClick={cancel} className='rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>Batal</button>
          <button onClick={save} className='rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{editId ? 'Simpan Perubahan' : 'Simpan Competency'}</button>
        </div>
      </div>
    </div>
  )
}
