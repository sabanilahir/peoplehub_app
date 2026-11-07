'use client'
import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useIdpStore, blankIdp, IDP_STATUS_TONE } from '@/store/idpStore'
import IdpEditor from '@/components/talent/IdpEditor'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton, EmptyState, Select, SearchBar,
} from '@/components/ui'

const today = () => new Date().toISOString().split('T')[0]

export default function MssIdpReviewPage() {
  const currentUser = useAuthStore(s => s.currentUser)
  const { records, saveRecord } = useIdpStore()

  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('')
  const [openId, setOpenId] = useState(null)
  const [form,   setForm]   = useState(blankIdp())
  const [msg,    setMsg]    = useState(null)
  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  // Inbox atasan: IDP yang sudah keluar dari Draft (disubmit karyawan).
  const rows = useMemo(() =>
    Object.entries(records)
      .filter(([, r]) => r.status && r.status !== 'Draft')
      .map(([id, r]) => ({ id, r })), [records])

  const stats = useMemo(() => ({
    submitted: rows.filter(x => x.r.status === 'Submitted').length,
    approved:  rows.filter(x => x.r.status === 'Approved').length,
    returned:  rows.filter(x => x.r.status === 'Returned').length,
    total:     rows.length,
  }), [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(({ r }) => {
      if (filter && r.status !== filter) return false
      if (q && !`${r.employeeName} ${r.position} ${r.department}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, filter])

  const open = (id) => { setForm({ ...blankIdp(), ...records[id] }); setOpenId(id) }
  const close = () => { setOpenId(null); setForm(blankIdp()) }

  const persist = (extra={}) => { const data = { ...form, ...extra }; setForm(data); saveRecord(openId, data) }
  const handleSave    = () => { persist(); flash('Perubahan IDP disimpan.') }
  const handleApprove = () => { persist({ status:'Approved', approvedBy: currentUser?.name || 'Atasan', approvedAt: today() }); flash('IDP disetujui.'); close() }
  const handleReturn  = () => {
    if (!form.managerNote?.trim()) return flash('Isi catatan pengembalian untuk karyawan.', 'error')
    persist({ status:'Returned' }); flash('IDP dikembalikan ke karyawan.', 'error'); close()
  }

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-[70] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${msg.type==='error'?'bg-red-600 text-white':'bg-gray-900 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader title='IDP Review Tim'
        subtitle='Tinjau, edit, dan setujui IDP yang disubmit anggota tim Anda.' />

      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {[
            { label:'Menunggu Approval', value:stats.submitted, sub:'perlu ditinjau', accent:true },
            { label:'Disetujui',         value:stats.approved,  sub:'approved' },
            { label:'Dikembalikan',      value:stats.returned,  sub:'returned' },
            { label:'Total',             value:stats.total,     sub:'IDP masuk' },
          ].map((m,i)=>(
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent?'text-red-700':'text-gray-900'}`}>{m.value}</div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard title='IDP Masuk' bodyClass='p-0'>
        <div className='flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between'>
          <SearchBar value={query} onChange={setQuery} placeholder='Cari nama / posisi…' className='w-full lg:max-w-sm' />
          <Select value={filter} onChange={e=>setFilter(e.target.value)} className='py-2 text-xs lg:w-48'>
            <option value=''>Semua Status</option>
            <option value='Submitted'>Menunggu Approval</option>
            <option value='Approved'>Disetujui</option>
            <option value='Returned'>Dikembalikan</option>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className='p-6'><EmptyState title='Belum ada IDP yang disubmit.' description='IDP akan muncul di sini setelah karyawan submit dari menu My IDP.' /></div>
        ) : filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada data yang cocok.' /></div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0'
            columns={['Karyawan','Posisi','Kompetensi','Disubmit','Status',{label:'Aksi',align:'right'}]}>
            {filtered.map(({ id, r }) => (
              <Tr key={id}>
                <Td className='font-medium text-gray-800'>{r.employeeName || `#${id}`}</Td>
                <Td className='text-xs text-gray-500'>{r.position || '—'}{r.department ? ` · ${r.department}` : ''}</Td>
                <Td className='text-sm font-semibold text-gray-700'>{r.competencies?.length || 0}</Td>
                <Td className='text-xs text-gray-500'>{r.submittedAt ? `${r.submittedBy} · ${r.submittedAt}` : <span className='text-gray-300'>—</span>}</Td>
                <Td><StatusBadge tone={IDP_STATUS_TONE[r.status] || 'neutral'}>{r.status}</StatusBadge></Td>
                <Td align='right'>
                  <ActionButton size='sm' variant='secondary' onClick={()=>open(id)}>
                    {r.status === 'Submitted' ? 'Tinjau' : 'Lihat'}
                  </ActionButton>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Review modal */}
      {openId != null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>IDP · {form.employeeName || `#${openId}`}</h2>
                <p className='mt-0.5 text-xs text-gray-500'>{form.position || '—'}{form.department ? ` · ${form.department}` : ''} · Cycle {form.cycle || '—'}</p>
              </div>
              <div className='flex items-center gap-2'>
                <StatusBadge tone={IDP_STATUS_TONE[form.status] || 'neutral'}>{form.status}</StatusBadge>
                <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
              </div>
            </div>

            <div className='space-y-4 px-6 py-5'>
              <IdpEditor competencies={form.competencies}
                onChange={(competencies)=>setForm(f=>({...f, competencies}))} />

              <div>
                <span className='mb-1.5 block text-xs font-semibold text-gray-600'>Catatan Atasan</span>
                <textarea value={form.managerNote} onChange={e=>setForm(f=>({...f,managerNote:e.target.value}))} rows={2}
                  className='w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100'
                  placeholder='Feedback untuk karyawan (wajib bila dikembalikan)…' />
              </div>
            </div>

            <div className='sticky bottom-0 flex flex-wrap gap-2 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={handleSave} className='rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200'>Simpan Edit</button>
              <button onClick={handleApprove} className='rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700'>Approve</button>
              <button onClick={handleReturn} className='rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50'>Kembalikan</button>
              <button onClick={close} className='ml-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50'>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
