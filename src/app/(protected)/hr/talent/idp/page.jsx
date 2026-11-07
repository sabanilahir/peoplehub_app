'use client'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useAuthStore } from '@/store/authStore'
import { useTalentCycleStore } from '@/store/talentCycleStore'
import { useIdpStore, blankIdp, IDP_STATUS_TONE } from '@/store/idpStore'
import { useCompetencyStore, buildIdpCompetencies } from '@/store/competencyStore'
import IdpEditor from '@/components/talent/IdpEditor'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton, EmptyState, SearchBar, Select, FormField,
} from '@/components/ui'

const today = () => new Date().toISOString().split('T')[0]

export default function IdpPage() {
  const positions = useStructureStore(s => s.positions)
  const employees = useEmployeeStore(s => s.employees)
  const currentUser = useAuthStore(s => s.currentUser)
  const activeCycle = useTalentCycleStore(s => s.activeCycle)
  const { records, saveRecord, removeRecord } = useIdpStore()
  const { catalog, positionCompetencies } = useCompetencyStore()
  const posIdOf = (id) => employees.find(e=>e.id===id)?.positionId ?? null

  const [query,    setQuery]    = useState('')
  const [addQuery, setAddQuery] = useState('')
  const [filter,   setFilter]   = useState('')
  const [manageId, setManageId] = useState(null)
  const [form,     setForm]     = useState(blankIdp())
  const [msg,      setMsg]      = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }
  const empName    = (id) => employees.find(e=>e.id===id)?.name || `#${id}`
  const positionOf = (id) => { const e = employees.find(x=>x.id===id); return positions.find(p=>p.id===e?.positionId)?.name || e?.position || '—' }

  const rows = useMemo(() =>
    Object.entries(records).map(([id, r]) => ({ id:+id, r })), [records])

  const stats = useMemo(() => {
    const s = { total: rows.length, submitted:0, approved:0, open:0 }
    rows.forEach(({ r }) => {
      if (r.status === 'Submitted') s.submitted++
      if (r.status === 'Approved') s.approved++
      if (r.status === 'Draft' || r.status === 'Returned') s.open++
    })
    return s
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(({ id, r }) => {
      if (filter && r.status !== filter) return false
      if (q && !`${empName(id)} ${positionOf(id)}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, filter])

  const addResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase()
    if (!q) return []
    return employees.filter(e => e.status==='Active' && !records[e.id] && e.name.toLowerCase().includes(q)).slice(0,6)
  }, [addQuery, employees, records])

  const addEmployee = (e) => {
    saveRecord(e.id, {
      ...blankIdp(), cycle: activeCycle, employeeName: e.name, position: positionOf(e.id),
      competencies: buildIdpCompetencies(e.positionId, catalog, positionCompetencies),
    })
    setAddQuery(''); flash(`IDP ${e.name} dibuat.`)
  }

  // ── Manage modal ────────────────────────────────────────────────────────────
  const openManage = (id) => {
    const rec = records[id] || {}
    const competencies = (rec.competencies && rec.competencies.length)
      ? rec.competencies
      : buildIdpCompetencies(posIdOf(id), catalog, positionCompetencies)
    setForm({ ...blankIdp(), ...rec, competencies }); setManageId(id)
  }
  const closeManage = () => { setManageId(null); setForm(blankIdp()) }

  const persist = (extra={}) => { const data = { ...form, ...extra, cycle: form.cycle || activeCycle }; setForm(data); saveRecord(manageId, data); return data }

  const handleSave    = () => { persist(); flash(`IDP ${empName(manageId)} disimpan.`) }
  const handleSubmit  = () => { persist({ status:'Submitted', submittedBy: currentUser?.name || 'Karyawan', submittedAt: today() }); flash('IDP disubmit untuk persetujuan atasan.') }
  const handleApprove = () => { persist({ status:'Approved', approvedBy: currentUser?.name || 'Atasan', approvedAt: today() }); flash('IDP disetujui.') }
  const handleReturn  = () => { persist({ status:'Returned' }); flash('IDP dikembalikan ke karyawan.', 'error') }

  const canSubmit  = form.status === 'Draft' || form.status === 'Returned'
  const canApprove = form.status === 'Submitted'

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {msg.type==='error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader title='IDP — Individual Development Plan'
        subtitle='IDP per-kompetensi (Mentoring, Education, Training, Project, Other Assignment) dengan alur submit karyawan dan approval atasan.' />

      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {[
            { label:'Total IDP', value:stats.total, sub:'dokumen' },
            { label:'Submitted', value:stats.submitted, sub:'menunggu approval', accent:true },
            { label:'Approved', value:stats.approved, sub:'disetujui atasan' },
            { label:'Draft / Returned', value:stats.open, sub:'belum final' },
          ].map((m,i)=>(
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent?'text-red-700':'text-gray-900'}`}>{m.value}</div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard title='Daftar IDP' bodyClass='p-0'>
        <div className='relative flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='relative w-full lg:max-w-sm'>
            <SearchBar value={addQuery} onChange={setAddQuery} placeholder='Tambah IDP: cari karyawan…' />
            {addResults.length > 0 && (
              <div className='absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg'>
                {addResults.map(e => (
                  <button key={e.id} onClick={()=>addEmployee(e)} className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50'>
                    <span className='font-medium text-gray-700'>{e.name}</span>
                    <span className='truncate text-xs text-gray-400'>{positionOf(e.id)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <div className='hidden sm:block w-44'><SearchBar value={query} onChange={setQuery} placeholder='Cari di daftar…' /></div>
            <Select value={filter} onChange={e=>setFilter(e.target.value)} className='py-2 text-xs w-40'>
              <option value=''>Semua Status</option>
              <option value='Draft'>Draft</option>
              <option value='Submitted'>Submitted</option>
              <option value='Approved'>Approved</option>
              <option value='Returned'>Returned</option>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className='p-6'><EmptyState title='Belum ada IDP.' description='Tambah IDP dengan mencari nama karyawan.' /></div>
        ) : filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada data yang cocok.' /></div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0'
            columns={['Karyawan','Posisi','Kompetensi','Status','Submitted','Approved',{label:'Aksi',align:'right'}]}>
            {filtered.map(({ id, r }) => (
              <Tr key={id}>
                <Td className='font-medium text-gray-800'>{empName(id)}</Td>
                <Td className='text-xs text-gray-500'>{positionOf(id)}</Td>
                <Td className='text-sm font-semibold text-gray-700'>{r.competencies?.length || 0}</Td>
                <Td><StatusBadge tone={IDP_STATUS_TONE[r.status] || 'neutral'}>{r.status}</StatusBadge></Td>
                <Td className='text-xs text-gray-500'>{r.submittedAt ? `${r.submittedBy} · ${r.submittedAt}` : <span className='text-gray-300'>—</span>}</Td>
                <Td className='text-xs text-gray-500'>{r.approvedAt ? `${r.approvedBy} · ${r.approvedAt}` : <span className='text-gray-300'>—</span>}</Td>
                <Td align='right'>
                  <div className='flex justify-end gap-1.5'>
                    <ActionButton size='sm' variant='secondary' onClick={()=>openManage(id)}>Kelola</ActionButton>
                    <button onClick={()=>{removeRecord(id);flash(`IDP ${empName(id)} dihapus.`)}} className='px-2 text-xs font-semibold text-gray-400 hover:text-red-600'>Hapus</button>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Manage modal */}
      {manageId != null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeManage}>
          <div className='max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>IDP · {empName(manageId)}</h2>
                <p className='mt-0.5 text-xs text-gray-500'>{positionOf(manageId)} · Cycle {form.cycle || activeCycle}</p>
              </div>
              <div className='flex items-center gap-2'>
                <StatusBadge tone={IDP_STATUS_TONE[form.status] || 'neutral'}>{form.status}</StatusBadge>
                <button onClick={closeManage} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              </div>
            </div>

            <div className='space-y-4 px-6 py-5'>
              <div className='text-xs font-bold uppercase tracking-wide text-gray-600'>Kompetensi (otomatis dari Position Profile)</div>
              <IdpEditor competencies={form.competencies} onChange={(competencies)=>setForm(f=>({...f, competencies}))} />

              <FormField label='Catatan Atasan'>
                <textarea value={form.managerNote} onChange={e=>setForm(f=>({...f,managerNote:e.target.value}))} rows={2}
                  className='w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100'
                  placeholder='Feedback/catatan approval…' />
              </FormField>
            </div>

            <div className='sticky bottom-0 flex flex-wrap gap-2 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={handleSave} className='rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200'>Simpan</button>
              {canSubmit && (
                <button onClick={handleSubmit} className='rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Submit (Karyawan)</button>
              )}
              {canApprove && (
                <>
                  <button onClick={handleApprove} className='rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700'>Approve (Atasan)</button>
                  <button onClick={handleReturn} className='rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50'>Return</button>
                </>
              )}
              <button onClick={closeManage} className='ml-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50'>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
