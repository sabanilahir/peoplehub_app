'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useKeyPositionStore, isKeyPosition } from '@/store/keyPositionStore'
import { useTalentReviewStore, boxKey, boxScore, isSuccessorBox, BOX_META } from '@/store/talentReviewStore'
import {
  useSuccessorReadinessStore, READINESS_LEVELS, SCOPE_OPTIONS,
  readinessFromFit, readinessMeta,
} from '@/store/successorReadinessStore'
import {
  PageHeader, SectionCard, DataTable, Tr, Td,
  StatusBadge, ActionButton, EmptyState, Select, SearchBar, Input,
} from '@/components/ui'

export default function ReadinessAssessmentPage() {
  const { positions, departments } = useStructureStore()
  const employees = useEmployeeStore(s => s.employees)
  const keyAssessments = useKeyPositionStore(s => s.assessments)
  const placements = useTalentReviewStore(s => s.placements)
  const { successors, addSuccessor, updateSuccessor, removeSuccessor } = useSuccessorReadinessStore()

  const [query,        setQuery]        = useState('')
  const [showCriteria, setShowCriteria] = useState(false)
  const [manageKp,     setManageKp]     = useState(null)
  const [addQuery,     setAddQuery]     = useState('')
  const [msg,          setMsg]          = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }
  const deptName    = (id) => departments.find(d=>d.id===id)?.name || '—'
  const positionOf  = (id) => positions.find(p=>p.id===id)
  const incumbentOf = (posId) => employees.find(e => e.positionId === posId && e.status === 'Active') || null

  const keyPositions = useMemo(() =>
    positions.filter(p => isKeyPosition(keyAssessments[p.id])),
    [positions, keyAssessments])

  const listFor = (kpId) => successors[kpId] || []
  const readinessCounts = (kpId) => {
    const c = { Short:0, Medium:0, Long:0 }
    listFor(kpId).forEach(s => { c[readinessFromFit(s.competencyFit, s.assessed)]++ })
    return c
  }

  const stats = useMemo(() => {
    let total=0, ready=0, dev=0
    keyPositions.forEach(kp => {
      listFor(kp.id).forEach(s => {
        total++
        const r = readinessFromFit(s.competencyFit, s.assessed)
        if (r==='Short') ready++; if (r==='Long') dev++
      })
    })
    const covered = keyPositions.filter(kp => listFor(kp.id).length > 0).length
    return { positions: keyPositions.length, covered, total, ready, dev }
  }, [keyPositions, successors])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return keyPositions
    return keyPositions.filter(p =>
      `${p.code} ${p.name} ${deptName(p.departmentId)}`.toLowerCase().includes(q))
  }, [keyPositions, query])

  // ── Recommend feeders (same department/job family, lower grade) ─────────────
  const recommend = (kp) => {
    const existing = new Set(listFor(kp.id).map(s=>s.employeeId))
    const cands = employees
      .filter(e => e.status==='Active' && !existing.has(e.id) && e.positionId !== kp.id)
      .map(e => ({ e, pos: positionOf(e.positionId) }))
      .filter(x => x.pos && (x.pos.departmentId===kp.departmentId || x.pos.jobFamilyId===kp.jobFamilyId)
                   && (x.pos.gradeId||0) < (kp.gradeId||0))
      .sort((a,b) => (b.pos.gradeId||0)-(a.pos.gradeId||0))
      .slice(0,5)
    cands.forEach(x => addSuccessor(kp.id, {
      employeeId:x.e.id, employeeName:x.e.name,
      currentPosition: x.pos?.name || x.e.position || '',
      competencyFit:'', scope:'', assessed:false,
    }))
    flash(cands.length
      ? `${cands.length} rekomendasi successor ditambahkan (default Long Term).`
      : 'Tidak ditemukan kandidat feeder yang cocok.', cands.length ? 'success' : 'error')
  }

  const addResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase()
    if (!q || !manageKp) return []
    const existing = new Set(listFor(manageKp.id).map(s=>s.employeeId))
    return employees
      .filter(e => e.status==='Active' && !existing.has(e.id) && e.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [addQuery, manageKp, employees, successors])

  const addManual = (e) => {
    const pos = positionOf(e.positionId)
    addSuccessor(manageKp.id, {
      employeeId:e.id, employeeName:e.name,
      currentPosition: pos?.name || e.position || '',
      competencyFit:'', scope:'', assessed:false,
    })
    setAddQuery('')
  }

  // Successor pool dari Talent Review 9-Box (box 1–3) — otomatis jadi opsi successor.
  const talentPool = useMemo(() => {
    if (!manageKp) return []
    const existing = new Set(listFor(manageKp.id).map(s=>s.employeeId))
    return Object.entries(placements)
      .filter(([id,p]) => isSuccessorBox(p.boxRow, p.boxCol) && !existing.has(+id))
      .map(([id,p]) => {
        const e = employees.find(x=>x.id===+id)
        return { id:+id, name:e?.name || `#${id}`, meta: BOX_META[boxKey(p.boxRow,p.boxCol)], score: boxScore(p.boxRow,p.boxCol) }
      })
      .sort((a,b)=>a.score-b.score)
  }, [manageKp, placements, employees, successors])

  const addFromPool = (empId) => {
    const e = employees.find(x=>x.id===empId); if(!e) return
    const pos = positionOf(e.positionId)
    addSuccessor(manageKp.id, {
      employeeId:e.id, employeeName:e.name,
      currentPosition: pos?.name || e.position || '',
      competencyFit:'', scope:'', assessed:false,
    })
  }

  const kpList = manageKp ? listFor(manageKp.id) : []

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type==='error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {msg.type==='error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        title='Successor Readiness Assessment'
        subtitle='Rekomendasi successor ke key position dengan readiness otomatis berdasarkan kesesuaian kompetensi.'
        actions={
          <ActionButton variant='secondary' size='sm' onClick={()=>setShowCriteria(true)}>
            Lihat kriteria
          </ActionButton>
        }
      />

      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {[
            { label:'Key Position',      value:stats.positions, sub:`${stats.covered} punya successor` },
            { label:'Total Successor',   value:stats.total,     sub:'kandidat terdaftar' },
            { label:'Ready (Short Term)',value:stats.ready,     sub:'siap saat ini', accent:true },
            { label:'Perlu Dev (Long)',  value:stats.dev,       sub:'pengembangan mendalam' },
          ].map((m,i)=>(
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent?'text-red-700':'text-gray-900'}`}>{m.value}</div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard title='Key Position & Rekomendasi Successor' bodyClass='p-0'>
        <div className='border-b border-gray-100 p-4'>
          <SearchBar value={query} onChange={setQuery}
            placeholder='Cari key position…' className='w-full lg:max-w-sm' />
        </div>

        {keyPositions.length === 0 ? (
          <div className='p-6'>
            <EmptyState title='Belum ada Key Position.'
              description='Tetapkan Key Position terlebih dahulu di menu Key Position Assessment.' />
          </div>
        ) : filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada key position yang cocok.' /></div>
        ) : (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={['Key Position','Incumbent','Successor','Distribusi Readiness',{label:'Aksi',align:'right'}]}
          >
            {filtered.map(kp => {
              const inc = incumbentOf(kp.id)
              const list = listFor(kp.id)
              const c = readinessCounts(kp.id)
              return (
                <Tr key={kp.id}>
                  <Td>
                    <div className='font-medium text-gray-800'>{kp.name}</div>
                    <div className='text-xs text-gray-400'>{kp.code} · {deptName(kp.departmentId)}</div>
                  </Td>
                  <Td className='text-xs text-gray-600'>{inc?.name || <span className='text-gray-300'>— kosong —</span>}</Td>
                  <Td className='text-sm font-semibold text-gray-700'>{list.length}</Td>
                  <Td>
                    {list.length ? (
                      <div className='flex flex-wrap gap-1'>
                        {c.Short  ? <StatusBadge tone='success'>{c.Short} Short</StatusBadge> : null}
                        {c.Medium ? <StatusBadge tone='warning'>{c.Medium} Medium</StatusBadge> : null}
                        {c.Long   ? <StatusBadge tone='neutral'>{c.Long} Long</StatusBadge> : null}
                      </div>
                    ) : <span className='text-xs text-gray-300'>belum ada</span>}
                  </Td>
                  <Td align='right'>
                    <ActionButton size='sm' variant='secondary' onClick={()=>{setManageKp(kp);setAddQuery('')}}>
                      Kelola Successor
                    </ActionButton>
                  </Td>
                </Tr>
              )
            })}
          </DataTable>
        )}
      </SectionCard>

      {/* Criteria modal */}
      {showCriteria && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={()=>setShowCriteria(false)}>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
              <h2 className='text-base font-bold text-gray-800'>Kriteria Readiness Successor</h2>
              <button onClick={()=>setShowCriteria(false)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='grid gap-4 px-6 py-5 sm:grid-cols-3'>
              {READINESS_LEVELS.map(l => (
                <div key={l.value} className='rounded-xl border border-gray-100 p-4'>
                  <div className='flex items-center justify-between'>
                    <StatusBadge tone={l.tone}>{l.label}</StatusBadge>
                    <span className='text-xs font-bold text-gray-500'>{l.fitRange}</span>
                  </div>
                  <p className='mt-3 text-xs leading-snug text-gray-600'>{l.definisi}</p>
                  <ul className='mt-3 space-y-1.5'>
                    {l.kriteria.map((k,i)=>(
                      <li key={i} className='flex gap-2 text-xs text-gray-600'>
                        <span className='mt-1 h-1.5 w-1.5 flex-none rounded-full bg-red-400' />
                        <span className='leading-snug'>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className='px-6 pb-5 text-xs text-gray-400'>
              Readiness dihitung otomatis dari kesesuaian kompetensi. Default <b>Long Term</b> apabila belum ada assessment.
            </div>
          </div>
        </div>
      )}

      {/* Manage successors modal */}
      {manageKp && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={()=>setManageKp(null)}>
          <div className='max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div>
                <h2 className='text-base font-bold text-gray-800'>Kelola Successor</h2>
                <p className='mt-0.5 text-xs text-gray-500'>
                  <span className='font-mono'>{manageKp.code}</span> · {manageKp.name} · {deptName(manageKp.departmentId)}
                </p>
              </div>
              <button onClick={()=>setManageKp(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='px-6 py-5'>
              {/* Toolbar */}
              <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <ActionButton size='sm' variant='primary' onClick={()=>recommend(manageKp)}>
                  Rekomendasikan otomatis
                </ActionButton>
                <div className='relative w-full sm:max-w-xs'>
                  <SearchBar value={addQuery} onChange={setAddQuery} placeholder='Tambah successor: cari nama karyawan…' />
                  {addResults.length > 0 && (
                    <div className='absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg'>
                      {addResults.map(e => {
                        const pos = positionOf(e.positionId)
                        return (
                          <button key={e.id} onClick={()=>addManual(e)}
                            className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50'>
                            <span className='font-medium text-gray-700'>{e.name}</span>
                            <span className='truncate text-xs text-gray-400'>{pos?.name || e.position || '—'}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Talent Pool (9-Box 1–3) — opsi successor otomatis */}
              {talentPool.length > 0 && (
                <div className='mb-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3'>
                  <div className='mb-2 text-xs font-semibold text-emerald-700'><Icon e='⭐' size={14} className='inline align-[-2px]' /> Successor Pool dari Talent Review (9-Box 1–3) — klik untuk menambah
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {talentPool.map(m => (
                      <button key={m.id} onClick={()=>addFromPool(m.id)}
                        className='flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100'>
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${m.meta.cell}`}>{m.score}</span>
                        {m.name}
                        <span className='text-emerald-600'>+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {kpList.length === 0 ? (
                <EmptyState title='Belum ada successor.'
                  description='Gunakan "Rekomendasikan otomatis", pilih dari Successor Pool, atau cari karyawan.' />
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-gray-100 bg-gray-50/70 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        <th className='px-3 py-2.5'>Successor</th>
                        <th className='px-3 py-2.5'>Posisi Saat Ini</th>
                        <th className='px-3 py-2.5 w-28'>Fit (%)</th>
                        <th className='px-3 py-2.5 w-40'>Scope</th>
                        <th className='px-3 py-2.5'>Readiness</th>
                        <th className='px-3 py-2.5 w-24 text-center'>Emergency</th>
                        <th className='px-3 py-2.5'></th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {kpList.map(s => {
                        const r = readinessFromFit(s.competencyFit, s.assessed)
                        const meta = readinessMeta(r)
                        return (
                          <tr key={s.id} className='hover:bg-gray-50'>
                            <td className='px-3 py-2.5 font-medium text-gray-800'>{s.employeeName}</td>
                            <td className='px-3 py-2.5 text-xs text-gray-500'>{s.currentPosition || '—'}</td>
                            <td className='px-3 py-2.5'>
                              <Input type='number' min={0} max={100} value={s.competencyFit}
                                onChange={e=>{
                                  const v = e.target.value
                                  updateSuccessor(manageKp.id, s.id, { competencyFit: v, assessed: v!=='' })
                                }}
                                className='py-1.5 text-sm' placeholder='—' />
                            </td>
                            <td className='px-3 py-2.5'>
                              <Select value={s.scope} onChange={e=>updateSuccessor(manageKp.id, s.id, { scope:e.target.value })}
                                className='py-1.5 text-xs'>
                                <option value=''>—</option>
                                {SCOPE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                              </Select>
                            </td>
                            <td className='px-3 py-2.5'>
                              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                              {!s.assessed && <span className='ml-1 text-[10px] text-gray-400'>default</span>}
                            </td>
                            <td className='px-3 py-2.5 text-center'>
                              <input type='checkbox' checked={!!s.emergency}
                                onChange={e=>updateSuccessor(manageKp.id, s.id, { emergency: e.target.checked })}
                                title='Kandidat cover darurat/interim' />
                            </td>
                            <td className='px-3 py-2.5 text-right'>
                              <button onClick={()=>removeSuccessor(manageKp.id, s.id)}
                                className='text-xs font-semibold text-gray-400 hover:text-red-600'>Hapus</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className='mt-4 text-xs text-gray-400'>
                Readiness dihitung otomatis: fit &gt;70% = Short Term, 50–70% = Medium Term, &lt;50% = Long Term. Tanpa nilai fit, default Long Term.
              </p>
            </div>

            <div className='sticky bottom-0 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={()=>setManageKp(null)}
                className='w-full rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
