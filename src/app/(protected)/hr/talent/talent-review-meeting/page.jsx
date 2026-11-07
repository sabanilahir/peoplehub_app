'use client'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useAuthStore } from '@/store/authStore'
import {
  useTalentReviewStore, BOX_META, boxKey, boxScore, isSuccessorBox, isTalentScore,
} from '@/store/talentReviewStore'
import { useSuccessorReadinessStore } from '@/store/successorReadinessStore'
import { useTalentCycleStore, DOC_STATUS, STATUS_TONE } from '@/store/talentCycleStore'
import { competencyFitOf } from '@/lib/talentSelectors'
import {
  useTrmStore, blankRecord, POTENTIAL_OPTIONS, METHODS,
  ratingFromPK, kinerjaRow, potentialCol, kinerjaLabelFromRow, potentialFromCol,
} from '@/store/trmStore'
import {
  PageHeader, SectionCard, StatusBadge, ActionButton, EmptyState, SearchBar, Select, Input, FormField,
} from '@/components/ui'

const ROWS = [3, 2, 1]
const COLS = [1, 2, 3]
const cellByScore = (score) => BOX_META[Object.keys(BOX_META).find(k => BOX_META[k].score === score)]?.cell || ''
const tbTone = (tb) =>
  tb == null ? 'neutral' : [1,2,3].includes(tb) ? 'success' : tb === 5 ? 'info' : [4,6].includes(tb) ? 'warning' : 'danger'

export default function TalentReviewMeetingPage() {
  const positions = useStructureStore(s => s.positions)
  const departments = useStructureStore(s => s.departments)
  const employees = useEmployeeStore(s => s.employees)
  const currentUser = useAuthStore(s => s.currentUser)
  const { placements, setBox, removeFromReview } = useTalentReviewStore()
  const successorsMap = useSuccessorReadinessStore(s => s.successors)
  const { records, saveRecord, removeRecord } = useTrmStore()
  const activeCycle = useTalentCycleStore(s => s.activeCycle)

  const [mgrQuery,    setMgrQuery]    = useState('')
  const [selectedMgr, setSelectedMgr] = useState(null)
  const [dragId,    setDragId]    = useState(null)
  const [overKey,   setOverKey]   = useState(null)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState(blankRecord())
  const [msg,       setMsg]       = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }
  const emp        = (id) => employees.find(e=>e.id===id)
  const empName    = (id) => emp(id)?.name || `#${id}`
  const positionOf = (id) => { const e = emp(id); return positions.find(p=>p.id===e?.positionId)?.name || e?.position || '—' }
  const deptOf     = (id) => { const e = emp(id); return departments.find(d=>d.id===e?.departmentId)?.name || e?.department || '—' }
  const tbOf       = (id) => { const p = placements[id]; return p ? boxScore(p.boxRow, p.boxCol) : null }

  const successorIds = useMemo(() => {
    const set = new Set()
    Object.values(successorsMap || {}).forEach(list => list.forEach(s => set.add(s.employeeId)))
    return set
  }, [successorsMap])

  const reviewed = useMemo(() =>
    Object.keys(placements).map(id => ({ id:+id, p:placements[id], tb: boxScore(placements[id].boxRow, placements[id].boxCol) })),
    [placements])

  const membersInCell = (key) => reviewed.filter(m => boxKey(m.p.boxRow, m.p.boxCol) === key)

  const stats = useMemo(() => {
    let talent=0, successor=0, pool=0
    reviewed.forEach(({ id, p, tb }) => {
      if (isTalentScore(tb)) talent++
      if (records[id]?.isSuccessor) successor++
      if (isSuccessorBox(p.boxRow, p.boxCol)) pool++
    })
    return { total: reviewed.length, talent, successor, pool }
  }, [reviewed, records])

  // ── Add by atasan (manager) ────────────────────────────────────────────────
  // Daftar atasan = karyawan yang menjadi managerId minimal satu karyawan.
  const managers = useMemo(() => {
    const ids = new Set()
    employees.forEach(e => { if (e.managerId) ids.add(e.managerId) })
    return employees.filter(e => ids.has(e.id))
  }, [employees])

  const mgrResults = useMemo(() => {
    const q = mgrQuery.trim().toLowerCase()
    if (!q) return []
    return managers.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8)
  }, [mgrQuery, managers])

  const subordinates = useMemo(() => {
    if (!selectedMgr) return []
    return employees
      .filter(e => e.managerId === selectedMgr.id && e.status === 'Active')
      .sort((a,b) => a.name.localeCompare(b.name))
  }, [selectedMgr, employees])

  const placeEmployee = (e) => {
    setBox(e.id, 2, 2)
    if (successorIds.has(e.id) && !records[e.id]) saveRecord(e.id, { ...blankRecord(), isSuccessor:true })
  }

  const addEmployee = (e) => { placeEmployee(e); flash(`${e.name} ditambahkan ke review (Core Player).`) }

  // Pilih atasan → seluruh bawahannya otomatis ditambahkan ke review.
  const selectManager = (m) => {
    setSelectedMgr(m); setMgrQuery('')
    const subs = employees.filter(e => e.managerId === m.id && e.status === 'Active')
    let added = 0
    subs.forEach(e => { if (!placements[e.id]) { placeEmployee(e); added++ } })
    flash(added
      ? `${added} anggota tim ${m.name} ditambahkan ke review.`
      : `Semua anggota tim ${m.name} sudah ada di review.`, added ? 'success' : 'error')
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDrop = (row, col) => { if (dragId != null) setBox(dragId, row, col); setDragId(null); setOverKey(null) }

  // ── TRM document modal ─────────────────────────────────────────────────────
  const openEdit = (id) => {
    const p = placements[id]
    const rec = records[id] || {}
    const compFit = competencyFitOf(successorsMap, id)   // sumber tunggal: Successor Readiness
    setForm({
      ...blankRecord(), ...rec,
      potential: rec.potential || (p ? potentialFromCol(p.boxCol) : ''),
      fitness: rec.fitness !== '' && rec.fitness != null ? rec.fitness : (compFit != null ? String(compFit) : ''),
    })
    setEditId(id)
  }
  const closeEdit = () => { setEditId(null); setForm(blankRecord()) }

  const formTB = editId != null
    ? (form.pkScore && form.potential
        ? boxScore(kinerjaRow(form.pkScore), potentialCol(form.potential))
        : tbOf(editId))
    : null
  const talent = isTalentScore(formTB)

  const setDev = (key, idx, patch) => setForm(f => ({ ...f, [key]: f[key].map((d,i)=> i===idx ? { ...d, ...patch } : d) }))
  const addDev = (key) => setForm(f => ({ ...f, [key]: [...f[key], { method:'', description:'', month:'' }] }))
  const removeDev = (key, idx) => setForm(f => ({ ...f, [key]: f[key].filter((_,i)=>i!==idx) }))

  const handleSave = () => {
    const p = placements[editId] || {}
    const row = form.pkScore ? kinerjaRow(form.pkScore) : (p.boxRow || 2)
    const col = form.potential ? potentialCol(form.potential) : (p.boxCol || 2)
    setBox(editId, row, col)
    const approved = form.status === 'Approved'
    saveRecord(editId, {
      ...form,
      reviewedBy: form.reviewedBy || currentUser?.name || 'HR',
      cycle: form.cycle || activeCycle,
      approvedBy: approved ? (form.approvedBy || currentUser?.name || 'HR') : '',
      approvedAt: approved ? (form.approvedAt || new Date().toISOString().split('T')[0]) : '',
    })
    closeEdit(); flash(`TRM ${empName(editId)} tersimpan.`)
  }

  const removeAll = (id) => { removeFromReview(id); removeRecord(id); flash(`${empName(id)} dihapus dari review.`) }

  const DevEditor = ({ label, hint, keyName, disabled }) => (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className='mb-1.5 flex items-center justify-between'>
        <span className='text-xs font-semibold text-gray-600'>{label}</span>
        {!disabled && <button onClick={()=>addDev(keyName)} className='text-xs font-semibold text-red-700 hover:underline'>+ Tambah</button>}
      </div>
      {hint && <p className='mb-2 text-[11px] text-gray-400'>{hint}</p>}
      {form[keyName].length === 0 ? (
        <div className='rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400'>Belum ada development plan.</div>
      ) : (
        <div className='space-y-2'>
          {form[keyName].map((d, i) => (
            <div key={i} className='grid grid-cols-12 gap-2'>
              <Select value={d.method} onChange={e=>setDev(keyName,i,{method:e.target.value})} className='col-span-3 py-1.5 text-xs' disabled={disabled}>
                <option value=''>Method</option>
                {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
              </Select>
              <input value={d.description} onChange={e=>setDev(keyName,i,{description:e.target.value})} disabled={disabled}
                placeholder='Deskripsi (nama training / topik / scope project)'
                className='col-span-6 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
              <input value={d.month} onChange={e=>setDev(keyName,i,{month:e.target.value})} disabled={disabled}
                placeholder='Bulan'
                className='col-span-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
              {!disabled && <button onClick={()=>removeDev(keyName,i)} className='col-span-1 text-gray-300 hover:text-red-600'>×</button>}
            </div>
          ))}
        </div>
      )}
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
        title='Talent Review Meeting'
        subtitle='Kalibrasi 9-Box dan dokumen PRP dalam satu tempat. Geser kartu untuk mengubah Talent Box; klik untuk melengkapi dokumen TRM.'
      />

      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {[
            { label:'Total Direview', value:stats.total,     sub:'karyawan' },
            { label:'Talent',         value:stats.talent,    sub:'TB 1,2,3,5', accent:true },
            { label:'Successor Pool', value:stats.pool,      sub:'box 1–3' },
            { label:'Successor',      value:stats.successor, sub:'ditandai' },
          ].map((m,i)=>(
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent?'text-red-700':'text-gray-900'}`}>{m.value}</div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add employee by atasan */}
      <div className='mb-6 max-w-lg'>
        {!selectedMgr ? (
          <div className='relative'>
            <SearchBar value={mgrQuery} onChange={setMgrQuery} placeholder='Pilih atasan: cari nama atasan…' />
            {mgrResults.length > 0 && (
              <div className='absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg'>
                {mgrResults.map(m => {
                  const teamCount = employees.filter(e => e.managerId === m.id && e.status==='Active').length
                  return (
                    <button key={m.id} onClick={()=>selectManager(m)}
                      className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50'>
                      <span className='font-medium text-gray-700'>{m.name}</span>
                      <span className='truncate text-xs text-gray-400'>{positionOf(m.id)} · {teamCount} anggota</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className='overflow-hidden rounded-xl bg-white ring-1 ring-gray-100'>
            <div className='flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-2.5'>
              <div className='text-sm'>
                <span className='text-gray-400'>Tim </span>
                <span className='font-semibold text-gray-800'>{selectedMgr.name}</span>
                <span className='text-xs text-gray-400'> · {positionOf(selectedMgr.id)}</span>
              </div>
              <button onClick={()=>{ setSelectedMgr(null); setMgrQuery('') }}
                className='text-xs font-semibold text-red-700 hover:underline'>Ganti atasan</button>
            </div>
            {subordinates.length === 0 ? (
              <div className='px-4 py-3 text-xs text-gray-400'>Tidak ada bawahan aktif untuk atasan ini.</div>
            ) : (
              <div className='max-h-64 overflow-y-auto divide-y divide-gray-50'>
                {subordinates.map(e => {
                  const inReview = !!placements[e.id]
                  return (
                    <div key={e.id} className='flex items-center justify-between gap-2 px-4 py-2 text-sm'>
                      <div className='min-w-0'>
                        <div className='truncate font-medium text-gray-700'>{e.name}</div>
                        <div className='truncate text-xs text-gray-400'>{positionOf(e.id)}</div>
                      </div>
                      {inReview ? (
                        <span className='shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400'>Sudah di review</span>
                      ) : (
                        <button onClick={()=>addEmployee(e)}
                          className='shrink-0 rounded-lg px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90'
                          style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>+ Tambah</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 9-Box grid */}
      <SectionCard title='Matriks 9-Box' bodyClass='p-5'>
        <div className='flex gap-2'>
          <div className='flex w-6 flex-col items-center justify-center'>
            <span className='text-[11px] font-semibold uppercase tracking-widest text-gray-400' style={{ writingMode:'vertical-rl', transform:'rotate(180deg)' }}>Potensi</span>
          </div>
          <div className='flex-1'>
            <div className='mb-1 grid grid-cols-3 gap-2 pl-14'>
              {['Kinerja Rendah','Kinerja Sedang','Kinerja Tinggi'].map(h => (
                <div key={h} className='py-1 text-center text-[11px] font-medium text-gray-400'>{h}</div>
              ))}
            </div>
            {ROWS.map((row, ri) => (
              <div key={row} className='mb-2 flex gap-2'>
                <div className='flex w-12 items-center justify-end pr-1 text-[11px] font-medium text-gray-400'>{['Tinggi','Sedang','Rendah'][ri]}</div>
                <div className='grid flex-1 grid-cols-3 gap-2'>
                  {COLS.map(col => {
                    const key  = boxKey(row, col)
                    const meta = BOX_META[key]
                    const members = membersInCell(key)
                    const isOver = overKey === key
                    const pool = isSuccessorBox(row, col)
                    return (
                      <div key={key}
                        onDragOver={(e)=>{ e.preventDefault(); setOverKey(key) }}
                        onDragLeave={()=> setOverKey(k => k===key ? null : k)}
                        onDrop={()=>onDrop(row, col)}
                        className={`min-h-[128px] rounded-xl bg-white p-2 ring-1 transition ${isOver ? 'ring-2 ring-gray-800 ring-offset-1' : 'ring-gray-100'}`}>
                        <div className='mb-2 flex items-center justify-between'>
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${meta.cell}`}>
                            <span className='opacity-90'>#{meta.score}</span>{meta.label}
                          </span>
                          {pool && <span className='text-[9px] font-bold uppercase tracking-wide text-emerald-600'>Pool</span>}
                        </div>
                        <div className='space-y-1'>
                          {members.map(m => (
                            <div key={m.id} draggable
                              onDragStart={()=>setDragId(m.id)} onDragEnd={()=>{ setDragId(null); setOverKey(null) }}
                              onClick={()=>openEdit(m.id)}
                              className='group flex cursor-pointer items-center justify-between gap-1 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-100 hover:bg-gray-100'>
                              <span className='truncate'>{empName(m.id)}{records[m.id]?.isSuccessor && <span className='ml-1 text-[9px] font-bold text-blue-500'>S</span>}</span>
                              <button onClick={(e)=>{e.stopPropagation();removeAll(m.id)}}
                                className='shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600'>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className='mt-3 text-xs text-gray-400'>Klik kartu untuk membuka dokumen TRM · geser antar box untuk mengubah Talent Box · <span className='font-bold text-blue-500'>S</span> = successor · box 1–3 = successor pool.</p>
      </SectionCard>

      {/* Table */}
      {reviewed.length > 0 && (
        <div className='mt-6'>
          <SectionCard title='Dokumen TRM' bodyClass='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-100 bg-gray-50/70 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    <th className='px-4 py-3'>Nama</th>
                    <th className='px-4 py-3'>Posisi</th>
                    <th className='px-4 py-3'>PK / Rating</th>
                    <th className='px-4 py-3'>Kinerja / Potensi</th>
                    <th className='px-4 py-3'>Final TB</th>
                    <th className='px-4 py-3'>Flag</th>
                    <th className='px-4 py-3'>Dev Plan</th>
                    <th className='px-4 py-3'>Status</th>
                    <th className='px-4 py-3 text-right'>Aksi</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {reviewed.map(({ id, p, tb }) => {
                    const r = records[id] || {}
                    const nDev = (r.devShort?.length||0) + (r.devLong?.length||0)
                    return (
                      <tr key={id} className='hover:bg-gray-50'>
                        <td className='px-4 py-3 font-medium text-gray-800'>{empName(id)}</td>
                        <td className='px-4 py-3 text-xs text-gray-500'>{positionOf(id)}</td>
                        <td className='px-4 py-3 text-xs text-gray-600'>{r.pkScore ? `${r.pkScore} · ${ratingFromPK(r.pkScore)}` : <span className='text-gray-300'>—</span>}</td>
                        <td className='px-4 py-3 text-xs text-gray-600'>{kinerjaLabelFromRow(p.boxRow)} / {potentialFromCol(p.boxCol)}</td>
                        <td className='px-4 py-3'>
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${cellByScore(tb)}`}>{tb}</span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap gap-1'>
                            {isTalentScore(tb) && <StatusBadge tone='success'>Talent</StatusBadge>}
                            {r.isSuccessor && <StatusBadge tone='info'>Successor</StatusBadge>}
                            {!isTalentScore(tb) && !r.isSuccessor && <span className='text-xs text-gray-300'>—</span>}
                          </div>
                        </td>
                        <td className='px-4 py-3 text-xs text-gray-600'>{nDev ? `${nDev} item` : <span className='text-gray-300'>—</span>}</td>
                        <td className='px-4 py-3'>
                          <StatusBadge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status || 'Draft'}</StatusBadge>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <div className='flex justify-end gap-1.5'>
                            <ActionButton size='sm' variant='secondary' onClick={()=>openEdit(id)}>Lengkapi</ActionButton>
                            <button onClick={()=>removeAll(id)} className='px-2 text-xs font-semibold text-gray-400 hover:text-red-600'>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}


      {/* TRM document modal */}
      {editId != null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeEdit}>
          <div className='max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>TRM · {empName(editId)}</h2>
                <p className='mt-0.5 text-xs text-gray-500'>{positionOf(editId)} · {deptOf(editId)}</p>
              </div>
              <button onClick={closeEdit} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-5 px-6 py-5'>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <FormField label='PK Score (100–400)'>
                  <Input type='number' min={100} max={400} value={form.pkScore}
                    onChange={e=>setForm(f=>({...f,pkScore:e.target.value}))} placeholder='mis. 355' />
                </FormField>
                <FormField label='Rating'>
                  <div className='rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-100'>{ratingFromPK(form.pkScore)}</div>
                </FormField>
                <FormField label='Potensi'>
                  <Select value={form.potential} onChange={e=>setForm(f=>({...f,potential:e.target.value}))}>
                    <option value=''>— Pilih —</option>
                    {POTENTIAL_OPTIONS.map(p=><option key={p.value} value={p.value}>{p.value}</option>)}
                  </Select>
                </FormField>
                <FormField label='Final TB'>
                  <div className='flex items-center gap-2'>
                    {formTB ? <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold ${cellByScore(formTB)}`}>{formTB}</span> : <span className='text-gray-300'>—</span>}
                    {formTB && <StatusBadge tone={tbTone(formTB)}>{talent?'Talent':'—'}</StatusBadge>}
                  </div>
                </FormField>
              </div>

              <div className='flex items-center gap-4'>
                <FormField label='Assessment Fitness (%)' className='w-56'
                  hint={competencyFitOf(successorsMap, editId) != null ? 'Terisi dari Successor Readiness (competency)' : 'Belum ada competency di Successor Readiness'}>
                  <Input type='number' min={0} max={100} value={form.fitness}
                    onChange={e=>setForm(f=>({...f,fitness:e.target.value}))} placeholder='%' />
                </FormField>
                <label className='mt-5 flex items-center gap-2 text-sm text-gray-700'>
                  <input type='checkbox' checked={form.isSuccessor} onChange={e=>setForm(f=>({...f,isSuccessor:e.target.checked}))} />
                  Tandai sebagai Successor
                </label>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <FormField label='Area of Strength'>
                  <textarea value={form.areaStrength} onChange={e=>setForm(f=>({...f,areaStrength:e.target.value}))} rows={2}
                    className='w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' placeholder='Kekuatan (tahun sebelumnya)…' />
                </FormField>
                <FormField label='Area of Improvement'>
                  <textarea value={form.areaImprovement} onChange={e=>setForm(f=>({...f,areaImprovement:e.target.value}))} rows={2}
                    className='w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' placeholder='Area pengembangan…' />
                </FormField>
              </div>

              <div className='rounded-xl bg-gray-50/70 p-4 ring-1 ring-gray-100'>
                <div className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-600'>Development Plan</div>
                <div className='space-y-4'>
                  <DevEditor keyName='devShort' label='Near Future — Short Term (semua employee)'
                    hint='Method: Training / Coaching / Job Assignment / Project · Description · Bulan pelaksanaan.' />
                  <DevEditor keyName='devLong' label='Near Future — Long Term (khusus TB 1, 2, 3, 5)'
                    hint={talent ? 'Untuk talent TB 1, 2, 3, 5.' : 'Aktif jika Final TB termasuk 1, 2, 3, atau 5.'} disabled={!talent} />
                </div>
              </div>

              <FormField label='Personnel Plan — Future (khusus TB 1, 2, 3, 5)'>
                <textarea value={form.personnelPlan} onChange={e=>setForm(f=>({...f,personnelPlan:e.target.value}))} rows={2} disabled={!talent}
                  className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 ${!talent?'bg-gray-50 text-gray-400':''}`}
                  placeholder={talent ? 'Rencana posisi/penempatan ke depan…' : 'Aktif untuk TB 1, 2, 3, 5'} />
              </FormField>

              <FormField label='Career Objective — Long Term (khusus Successor)'>
                <textarea value={form.careerObjective} onChange={e=>setForm(f=>({...f,careerObjective:e.target.value}))} rows={2} disabled={!form.isSuccessor}
                  className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 ${!form.isSuccessor?'bg-gray-50 text-gray-400':''}`}
                  placeholder={form.isSuccessor ? 'Tujuan karir jangka panjang…' : 'Aktif jika ditandai sebagai Successor'} />
              </FormField>

              <div className='grid gap-3 sm:grid-cols-3'>
                <FormField label='Tanggal Meeting'>
                  <Input type='date' value={form.meetingDate} onChange={e=>setForm(f=>({...f,meetingDate:e.target.value}))} />
                </FormField>
                <FormField label='Direview oleh'>
                  <Input value={form.reviewedBy} onChange={e=>setForm(f=>({...f,reviewedBy:e.target.value}))} placeholder='Manager / Head / Direktur' />
                </FormField>
                <FormField label='Status'>
                  <Select value={form.status || 'Draft'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {DOC_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
              </div>
            </div>

            <div className='sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={handleSave}
                className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Simpan Dokumen TRM</button>
              <button onClick={closeEdit}
                className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
