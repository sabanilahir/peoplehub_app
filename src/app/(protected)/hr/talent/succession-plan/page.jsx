'use client'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useKeyPositionStore, isKeyPosition } from '@/store/keyPositionStore'
import { useSuccessorReadinessStore } from '@/store/successorReadinessStore'
import {
  useSuccessionPlanStore, blankPlan, PREPARATION_ITEMS, DEVELOPMENT_ITEMS,
} from '@/store/successionPlanStore'
import { useTalentCycleStore, DOC_STATUS, STATUS_TONE } from '@/store/talentCycleStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td,
  StatusBadge, ActionButton, EmptyState, SearchBar, Select, Input, FormField,
} from '@/components/ui'

export default function SuccessionPlanPage() {
  const { positions, departments, businessUnits, companies, grades } = useStructureStore()
  const employees = useEmployeeStore(s => s.employees)
  const keyAssessments = useKeyPositionStore(s => s.assessments)
  const successorsMap = useSuccessorReadinessStore(s => s.successors)
  const { plans, addPlan, updatePlan, removePlan } = useSuccessionPlanStore()
  const activeCycle = useTalentCycleStore(s => s.activeCycle)

  const [query,   setQuery]   = useState('')
  const [modal,   setModal]   = useState(false)
  const [editId,  setEditId]  = useState(null)
  const [form,    setForm]    = useState(blankPlan())
  const [succQuery, setSuccQuery] = useState('')
  const [msg,     setMsg]     = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  // ── Derivations ─────────────────────────────────────────────────────────────
  const posInfo = (positionId) => {
    const p = positions.find(x => x.id === +positionId)
    if (!p) return null
    const dept = departments.find(d => d.id === p.departmentId)
    const bu = businessUnits.find(b => b.id === dept?.businessUnitId)
    const company = companies.find(c => c.id === bu?.companyId)
    const grade = grades.find(g => g.id === p.gradeId)
    const incumbent = employees.find(e => e.positionId === p.id && e.status === 'Active')
    return {
      title: p.name, dept: dept?.name || '—',
      pt: company?.name || '—', class: grade?.code || '—',
      incumbent: incumbent?.name || '—',
    }
  }

  const succInfo = (employeeId) => {
    const e = employees.find(x => x.id === +employeeId)
    if (!e) return null
    const pos = positions.find(p => p.id === e.positionId)
    const grade = grades.find(g => g.id === pos?.gradeId)
    return { name: e.name, title: pos?.name || e.position || '—', class: grade?.code || '—' }
  }

  const keyPositions = useMemo(() =>
    positions.filter(p => isKeyPosition(keyAssessments[p.id])),
    [positions, keyAssessments])

  // Successor kandidat dari readiness untuk posisi terpilih.
  const posSuccessors = useMemo(() =>
    form.positionId ? (successorsMap[form.positionId] || []) : [],
    [form.positionId, successorsMap])

  const succResults = useMemo(() => {
    const q = succQuery.trim().toLowerCase()
    if (!q) return []
    return employees.filter(e => e.status==='Active' && e.name.toLowerCase().includes(q)).slice(0,6)
  }, [succQuery, employees])

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openNew  = () => { setForm(blankPlan()); setEditId(null); setSuccQuery(''); setModal(true) }
  const openEdit = (p) => { setForm({ ...blankPlan(), ...p }); setEditId(p.id); setSuccQuery(''); setModal(true) }
  const closeModal = () => { setModal(false); setEditId(null); setForm(blankPlan()) }

  const setAction = (key, field, val) => setForm(f => ({ ...f, [key]: { ...f[key], [field]: val } }))

  const handleSave = () => {
    if (!form.positionId) return flash('Projected Position wajib dipilih.', 'error')
    if (!form.successorId) return flash('Successor wajib dipilih.', 'error')
    const approved = form.status === 'Approved'
    const data = {
      ...form,
      cycle: form.cycle || activeCycle,
      approvedBy: approved ? (form.approvedBy || 'HR') : '',
      approvedAt: approved ? (form.approvedAt || new Date().toISOString().split('T')[0]) : '',
    }
    if (editId) { updatePlan(editId, data); flash('Succession Plan diperbarui.') }
    else        { addPlan(data); flash('Succession Plan dibuat.') }
    closeModal()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plans
    return plans.filter(p => {
      const pi = posInfo(p.positionId), si = succInfo(p.successorId)
      return `${pi?.title} ${pi?.incumbent} ${si?.name}`.toLowerCase().includes(q)
    })
  }, [plans, query])

  const pInfo = posInfo(form.positionId)
  const sInfo = succInfo(form.successorId)

  const ActionRow = ({ label, by, k }) => (
    <div className='grid grid-cols-12 items-start gap-2 py-1.5'>
      <div className='col-span-12 sm:col-span-3'>
        <div className='text-sm font-medium text-gray-700'>{label}</div>
        {by && <div className='text-[11px] text-gray-400'>{by}</div>}
      </div>
      <input value={form[k].description} onChange={e=>setAction(k,'description',e.target.value)}
        placeholder='Deskripsi…'
        className='col-span-8 sm:col-span-6 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
      <input value={form[k].period} onChange={e=>setAction(k,'period',e.target.value)}
        placeholder='Period…'
        className='col-span-4 sm:col-span-3 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
    </div>
  )

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {msg.type==='error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        title='Succession Plan'
        subtitle='Dokumen rencana suksesi: projected position, successor, promotion plan, dan action plan.'
      />

      <SectionCard title='Daftar Succession Plan' bodyClass='p-0'
        actions={
          <div className='flex items-center gap-3'>
            <div className='hidden sm:block w-56'><SearchBar value={query} onChange={setQuery} placeholder='Cari posisi / successor…' /></div>
            <button onClick={openNew}
              className='whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>+ Buat Succession Plan</button>
          </div>
        }>
        {plans.length === 0 ? (
          <div className='p-6'>
            <EmptyState title='Belum ada Succession Plan.'
              description='Buat succession plan untuk Key Position beserta successor-nya.' />
          </div>
        ) : filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada data yang cocok.' /></div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0'
            columns={['Projected Position','Incumbent','Successor','Planned Promotion','Status','Dibuat',{label:'Aksi',align:'right'}]}>
            {filtered.map(p => {
              const pi = posInfo(p.positionId), si = succInfo(p.successorId)
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className='font-medium text-gray-800'>{pi?.title || '—'}</div>
                    <div className='text-xs text-gray-400'>{pi?.pt} · {pi?.dept} · {pi?.class}</div>
                  </Td>
                  <Td className='text-xs text-gray-600'>{pi?.incumbent || '—'}</Td>
                  <Td>
                    <div className='text-sm text-gray-700'>{si?.name || '—'}</div>
                    <div className='text-xs text-gray-400'>{si?.title} · {si?.class}</div>
                  </Td>
                  <Td className='text-xs text-gray-600'>{p.plannedPromotionDate || <span className='text-gray-300'>—</span>}</Td>
                  <Td><StatusBadge tone={STATUS_TONE[p.status] || 'neutral'}>{p.status || 'Draft'}</StatusBadge></Td>
                  <Td className='text-xs text-gray-400'>{p.createdAt}</Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-1.5'>
                      <ActionButton size='sm' variant='secondary' onClick={()=>openEdit(p)}>Edit</ActionButton>
                      <button onClick={()=>{removePlan(p.id);flash('Succession Plan dihapus.')}} className='px-2 text-xs font-semibold text-gray-400 hover:text-red-600'>Hapus</button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>

      {/* Form modal */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeModal}>
          <div className='max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <h2 className='text-base font-bold text-gray-800'>{editId ? 'Edit Succession Plan' : 'Buat Succession Plan'}</h2>
              <button onClick={closeModal} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-6 px-6 py-5'>
              {/* Projected Position */}
              <section>
                <div className='mb-2 text-xs font-bold uppercase tracking-wide text-red-700'>Projected Position</div>
                <FormField label='Pilih Key Position' required>
                  <Select value={form.positionId} onChange={e=>setForm(f=>({...f,positionId:e.target.value,successorId:''}))}>
                    <option value=''>— Pilih Key Position —</option>
                    {keyPositions.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                  </Select>
                </FormField>
                {pInfo && (
                  <div className='mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-gray-50 p-3 text-sm sm:grid-cols-3'>
                    <div><div className='text-[11px] text-gray-400'>PT</div><div className='font-medium text-gray-700'>{pInfo.pt}</div></div>
                    <div><div className='text-[11px] text-gray-400'>Department</div><div className='font-medium text-gray-700'>{pInfo.dept}</div></div>
                    <div><div className='text-[11px] text-gray-400'>Position Class</div><div className='font-medium text-gray-700'>{pInfo.class}</div></div>
                    <div className='sm:col-span-2'><div className='text-[11px] text-gray-400'>Position Title</div><div className='font-medium text-gray-700'>{pInfo.title}</div></div>
                    <div><div className='text-[11px] text-gray-400'>Current Incumbent</div><div className='font-medium text-gray-700'>{pInfo.incumbent}</div></div>
                  </div>
                )}
              </section>

              {/* Successor */}
              <section>
                <div className='mb-2 text-xs font-bold uppercase tracking-wide text-red-700'>Successor</div>
                {posSuccessors.length > 0 && (
                  <div className='mb-2 flex flex-wrap gap-1.5'>
                    <span className='text-[11px] text-gray-400 mr-1 mt-1'>Dari readiness:</span>
                    {posSuccessors.map(s => (
                      <button key={s.employeeId} onClick={()=>setForm(f=>({...f,successorId:s.employeeId}))}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${
                          form.successorId===s.employeeId ? 'bg-red-600 text-white ring-red-600' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                        }`}>{s.employeeName}</button>
                    ))}
                  </div>
                )}
                <div className='relative'>
                  <SearchBar value={succQuery} onChange={setSuccQuery} placeholder='Cari successor lain…' />
                  {succResults.length > 0 && (
                    <div className='absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg'>
                      {succResults.map(e => (
                        <button key={e.id} onClick={()=>{setForm(f=>({...f,successorId:e.id}));setSuccQuery('')}}
                          className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50'>
                          <span className='font-medium text-gray-700'>{e.name}</span>
                          <span className='truncate text-xs text-gray-400'>{succInfo(e.id)?.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {sInfo && (
                  <div className='mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-gray-50 p-3 text-sm sm:grid-cols-3'>
                    <div><div className='text-[11px] text-gray-400'>Successor Name</div><div className='font-medium text-gray-700'>{sInfo.name}</div></div>
                    <div><div className='text-[11px] text-gray-400'>Position Title</div><div className='font-medium text-gray-700'>{sInfo.title}</div></div>
                    <div><div className='text-[11px] text-gray-400'>Position Class</div><div className='font-medium text-gray-700'>{sInfo.class}</div></div>
                    <div>
                      <div className='text-[11px] text-gray-400'>Individual Class</div>
                      <input value={form.successorIndividualClass} onChange={e=>setForm(f=>({...f,successorIndividualClass:e.target.value}))}
                        placeholder='mis. PC20'
                        className='mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
                    </div>
                  </div>
                )}
              </section>

              {/* Promotion Plan */}
              <section>
                <div className='mb-2 text-xs font-bold uppercase tracking-wide text-red-700'>Promotion Plan</div>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <FormField label='Planned Promotion Date'>
                    <Input type='date' value={form.plannedPromotionDate} onChange={e=>setForm(f=>({...f,plannedPromotionDate:e.target.value}))} />
                  </FormField>
                  <FormField label='Reason of Promotion'>
                    <Input value={form.reasonOfPromotion} onChange={e=>setForm(f=>({...f,reasonOfPromotion:e.target.value}))} placeholder='Alasan promosi…' />
                  </FormField>
                  <FormField label='Status'>
                    <Select value={form.status || 'Draft'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                      {DOC_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </FormField>
                </div>
              </section>

              {/* Action Plan */}
              <section>
                <div className='mb-2 text-xs font-bold uppercase tracking-wide text-red-700'>Action Plan</div>

                <div className='rounded-xl border border-gray-100 p-3'>
                  <div className='mb-1 text-sm font-semibold text-gray-700'>Preparation for Promotion <span className='text-xs font-normal text-gray-400'>(3–12 bulan sebelum)</span></div>
                  {PREPARATION_ITEMS.map(it => <ActionRow key={it.key} label={it.label} by={it.by} k={it.key} />)}
                </div>

                <div className='mt-3 rounded-xl border border-gray-100 p-3'>
                  <div className='mb-1 text-sm font-semibold text-gray-700'>Development Plan <span className='text-xs font-normal text-gray-400'>(0–5 tahun sebelum)</span></div>
                  {DEVELOPMENT_ITEMS.map(it => <ActionRow key={it.key} label={it.label} by={it.by} k={it.key} />)}
                </div>

                <div className='mt-3 rounded-xl border border-gray-100 p-3'>
                  <ActionRow label='Career Plan' by='' k='careerPlan' />
                </div>
              </section>
            </div>

            <div className='sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={handleSave}
                className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{editId ? 'Simpan Perubahan' : 'Buat Succession Plan'}</button>
              <button onClick={closeModal}
                className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
