'use client'
import { useState, useMemo, useEffect } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useTrmStore, ratingFromPK } from '@/store/trmStore'
import { useTalentReviewStore, BOX_META, boxKey, boxScore } from '@/store/talentReviewStore'
import { useSuccessorReadinessStore } from '@/store/successorReadinessStore'
import { useIdpStore, IDP_STATUS_TONE } from '@/store/idpStore'
import { useKeyPositionStore, isKeyPosition } from '@/store/keyPositionStore'
import { competencyFitOf, successorReadiness, TERM_LABEL } from '@/lib/talentSelectors'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, EmptyState, SearchBar, Select,
} from '@/components/ui'

const PAGE_SIZE = 20
const currentYear = new Date().getFullYear()
const B_ROWS = [3, 2, 1]
const B_COLS = [1, 2, 3]

// Avatar inisial berwarna stabil.
const AV_COLORS = ['bg-red-100 text-red-700','bg-blue-100 text-blue-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-violet-100 text-violet-700','bg-teal-100 text-teal-700','bg-orange-100 text-orange-700']
const initials = (name='') => name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'
const avColor = (name='') => AV_COLORS[[...name].reduce((a,c)=>a+c.charCodeAt(0),0) % AV_COLORS.length]

const yearsBetween = (from, to = new Date()) => {
  if (!from) return null
  const d = new Date(from)
  if (isNaN(d)) return null
  return Math.max(0, (to - d) / (365.25 * 24 * 3600 * 1000))
}
const fmtYears = (y) => y == null ? '—' : `${y.toFixed(1)} thn`

export default function TalentProfilePage() {
  const { positions, departments, grades } = useStructureStore()
  const employees = useEmployeeStore(s => s.employees)
  const records = useTrmStore(s => s.records)
  const placements = useTalentReviewStore(s => s.placements)
  const successorsMap = useSuccessorReadinessStore(s => s.successors)
  const idpRecords = useIdpStore(s => s.records)
  const keyAssessments = useKeyPositionStore(s => s.assessments)

  const [query, setQuery] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(null)

  const posOf   = (posId) => positions.find(p => p.id === posId)
  const posName = (posId) => posOf(posId)?.name || '—'
  const deptName= (id) => departments.find(d => d.id === id)?.name || '—'
  const gradeOfPos = (posId) => grades.find(g => g.id === posOf(posId)?.gradeId)
  const levelOfPos = (posId) => gradeOfPos(posId)?.category || null
  const levelOfGrade = (gradeId) => grades.find(g => g.id === gradeId)?.category || null

  // Year in current position — sejak transisi terakhir ke posisi saat ini.
  const positionStart = (emp) => {
    const hist = (emp.history || []).filter(h => h.effectiveDate).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate))
    if (!hist.length) return emp.joinDate
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].positionId !== emp.positionId) return hist[i+1]?.effectiveDate || emp.joinDate
    }
    return hist[0].effectiveDate || emp.joinDate
  }

  // Lama di tiap job level (kategori grade) dari timeline history.
  const jobLevelYears = (emp) => {
    const res = {}
    const hist = (emp.history || []).filter(h => h.effectiveDate).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate))
    if (!hist.length) {
      const lvl = levelOfPos(emp.positionId)
      if (lvl) res[lvl] = yearsBetween(emp.joinDate) || 0
      return res
    }
    for (let i = 0; i < hist.length; i++) {
      const start = new Date(hist[i].effectiveDate)
      const end = i < hist.length - 1 ? new Date(hist[i+1].effectiveDate) : new Date()
      const lvl = levelOfGrade(hist[i].gradeId) || levelOfPos(hist[i].positionId)
      if (lvl) res[lvl] = (res[lvl] || 0) + Math.max(0, (end - start) / (365.25*24*3600*1000))
    }
    return res
  }

  const boxOf = (empId) => {
    const p = placements[empId]
    return p ? { score: boxScore(p.boxRow, p.boxCol), meta: BOX_META[boxKey(p.boxRow, p.boxCol)] } : null
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees.filter(e => {
      if (filterDept && e.departmentId !== +filterDept) return false
      if (q && !`${e.name} ${posName(e.positionId)} ${deptName(e.departmentId)}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [employees, query, filterDept])

  useEffect(() => { setPage(1) }, [query, filterDept])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE)

  const emp = detailId != null ? employees.find(e => e.id === detailId) : null

  return (
    <div>
      <PageHeader title='Talent Profile'
        subtitle='Profil talent seluruh karyawan: posisi, performa, 9-Box, riwayat level, dan aspirasi karir.' />

      <SectionCard title={`Karyawan (${filtered.length.toLocaleString('id-ID')})`} bodyClass='p-0'>
        <div className='flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between'>
          <SearchBar value={query} onChange={setQuery} placeholder='Cari nama, posisi, department…' className='w-full lg:max-w-sm' />
          <Select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className='py-2 text-xs lg:w-56'>
            <option value=''>Semua Department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>

        {pageRows.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada karyawan yang cocok.' /></div>
        ) : (
          <>
            <DataTable className='rounded-none shadow-none ring-0'
              columns={['Nama','Current Position','Department','Year in Position','Job Level','Talent Box','Perf (thn ini)',{label:'',align:'right'}]}>
              {pageRows.map(e => {
                const box = boxOf(e.id)
                const rec = records[e.id]
                return (
                  <Tr key={e.id} onClick={()=>setDetailId(e.id)}>
                    <Td className='font-medium text-gray-800'>
                      <span className='flex items-center gap-2'>
                        <span className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold ${avColor(e.name)}`}>{initials(e.name)}</span>
                        {e.name}
                      </span>
                    </Td>
                    <Td className='text-xs text-gray-600'>{posName(e.positionId)}</Td>
                    <Td className='text-xs text-gray-500'>{deptName(e.departmentId)}</Td>
                    <Td className='text-xs text-gray-600'>{fmtYears(yearsBetween(positionStart(e)))}</Td>
                    <Td className='text-xs text-gray-600'>{levelOfPos(e.positionId) || '—'}</Td>
                    <Td>{box ? <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${box.meta.cell}`}>{box.score}</span> : <span className='text-gray-300'>—</span>}</Td>
                    <Td className='text-xs text-gray-600'>{rec?.pkScore ? `${rec.pkScore} · ${ratingFromPK(rec.pkScore)}` : <span className='text-gray-300'>—</span>}</Td>
                    <Td align='right'><span className='text-xs font-semibold text-red-700'>Lihat →</span></Td>
                  </Tr>
                )
              })}
            </DataTable>

            <div className='flex items-center justify-between border-t border-gray-100 p-4 text-xs text-gray-500'>
              <span>Halaman {safePage} / {totalPages}</span>
              <div className='flex gap-1.5'>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage<=1}
                  className='rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40'>Sebelumnya</button>
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages}
                  className='rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40'>Berikutnya</button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Detail talent card modal */}
      {emp && (() => {
        const rec = records[emp.id] || {}
        const box = boxOf(emp.id)
        const levels = jobLevelYears(emp)
        const hist = (emp.history || []).filter(h=>h.effectiveDate).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate))
        const perfYears = [currentYear, currentYear-1, currentYear-2]
        // Sinyal talent lintas-modul
        const compFit = competencyFitOf(successorsMap, emp.id)
        const pipelines = Object.entries(successorsMap || {}).flatMap(([posId, list]) =>
          list.filter(s => s.employeeId === emp.id).map(s => ({ posId:+posId, readiness: successorReadiness(s), emergency: s.emergency })))
        const isKeyInc = isKeyPosition(keyAssessments[emp.positionId])
        const idpRec = idpRecords[emp.id]
        return (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={()=>setDetailId(null)}>
            <div className='max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
              {/* Card header */}
              <div className='sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <span className={`inline-flex h-12 w-12 flex-none items-center justify-center rounded-full text-base font-bold ${avColor(emp.name)}`}>{initials(emp.name)}</span>
                    <div>
                      <h2 className='text-lg font-bold text-gray-800'>{emp.name}</h2>
                      <p className='mt-0.5 text-xs text-gray-500'>{posName(emp.positionId)} · {deptName(emp.departmentId)}</p>
                    </div>
                  </div>
                  <button onClick={()=>setDetailId(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
                </div>
                {/* Chips */}
                <div className='mt-3 flex flex-wrap gap-1.5'>
                  {box && <StatusBadge tone='info'>9-Box #{box.score} {box.meta.label}</StatusBadge>}
                  {rec.pkScore && <StatusBadge tone='neutral'>Rating {ratingFromPK(rec.pkScore)}</StatusBadge>}
                  {isKeyInc && <StatusBadge tone='danger'>Key Position Incumbent</StatusBadge>}
                  {pipelines.length > 0 && <StatusBadge tone='success'>Successor ×{pipelines.length}</StatusBadge>}
                  {idpRec && <StatusBadge tone={IDP_STATUS_TONE[idpRec.status]||'neutral'}>IDP {idpRec.status}</StatusBadge>}
                </div>
              </div>

              <div className='space-y-5 px-6 py-5'>
                {/* Talent signals + mini 9-box */}
                <div className='grid gap-4 sm:grid-cols-3'>
                  <div className='sm:col-span-2 grid grid-cols-2 gap-2'>
                    {[
                      ['Competency Fit', compFit != null ? `${compFit}%` : '—'],
                      ['Successor untuk', pipelines.length ? `${pipelines.length} posisi` : '—'],
                      ['IDP', idpRec ? idpRec.status : 'Belum ada'],
                      ['Key Incumbent', isKeyInc ? 'Ya' : 'Tidak'],
                    ].map(([k,v]) => (
                      <div key={k} className='rounded-xl bg-gray-50 p-3'>
                        <div className='text-[11px] text-gray-400'>{k}</div>
                        <div className='mt-0.5 text-sm font-semibold text-gray-800'>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini 9-box */}
                  <div>
                    <div className='mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400'>Posisi 9-Box</div>
                    <div className='space-y-1'>
                      {B_ROWS.map(row => (
                        <div key={row} className='grid grid-cols-3 gap-1'>
                          {B_COLS.map(col => {
                            const meta = BOX_META[boxKey(row, col)]
                            const here = box && box.score === meta.score
                            return (
                              <div key={col} title={`#${meta.score} ${meta.label}`}
                                className={`flex h-7 items-center justify-center rounded text-[10px] font-bold ${here ? meta.cell : 'bg-gray-100 text-gray-300'}`}>
                                {here ? initials(emp.name) : meta.score}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {pipelines.length > 0 && (
                  <div className='rounded-xl bg-emerald-50/50 p-3 ring-1 ring-emerald-100'>
                    <div className='mb-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700'>Successor Pipeline</div>
                    <div className='flex flex-wrap gap-1.5'>
                      {pipelines.map((pl,i) => (
                        <span key={i} className='inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs ring-1 ring-emerald-100'>
                          <span className='font-medium text-gray-700'>{posName(pl.posId)}</span>
                          <StatusBadge tone={pl.readiness==='Short'?'success':pl.readiness==='Medium'?'warning':'neutral'}>{TERM_LABEL[pl.readiness]}</StatusBadge>
                          {pl.emergency && <span className='text-[9px] font-bold text-blue-500'>EMG</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  {[
                    ['Current Position', posName(emp.positionId)],
                    ['Year in Position', fmtYears(yearsBetween(positionStart(emp)))],
                    ['Job Level', levelOfPos(emp.positionId) || '—'],
                    ['Talent Box', box ? `#${box.score} ${box.meta.label}` : '—'],
                  ].map(([k,v]) => (
                    <div key={k} className='rounded-xl bg-gray-50 p-3'>
                      <div className='text-[11px] text-gray-400'>{k}</div>
                      <div className='mt-0.5 text-sm font-semibold text-gray-800'>{v}</div>
                    </div>
                  ))}
                </div>

                {/* History Performance & Talent Box (3 yr) */}
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <div className='mb-2 text-xs font-bold uppercase tracking-wide text-gray-600'>History Performance (3 thn)</div>
                    <div className='grid grid-cols-3 gap-2'>
                      {perfYears.map(y => {
                        const has = String(rec.cycle || currentYear) === String(y) && rec.pkScore
                        return (
                          <div key={y} className='rounded-lg p-2 text-center ring-1 ring-gray-100'>
                            <div className='text-[10px] text-gray-400'>{y}</div>
                            <div className='mt-0.5 text-sm font-bold text-gray-800'>{has ? rec.pkScore : '—'}</div>
                            <div className='text-[10px] text-gray-400'>{has ? `Rating ${ratingFromPK(rec.pkScore)}` : ''}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div className='mb-2 text-xs font-bold uppercase tracking-wide text-gray-600'>History Talent Box (3 thn)</div>
                    <div className='grid grid-cols-3 gap-2'>
                      {perfYears.map(y => {
                        const has = y === currentYear && box
                        return (
                          <div key={y} className='rounded-lg p-2 text-center ring-1 ring-gray-100'>
                            <div className='text-[10px] text-gray-400'>{y}</div>
                            {has ? <div className={`mx-auto mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${box.meta.cell}`}>{box.score}</div>
                                 : <div className='mt-1 text-sm font-bold text-gray-300'>—</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Year in Job Level */}
                <div>
                  <div className='mb-2 text-xs font-bold uppercase tracking-wide text-gray-600'>Year in Job Level</div>
                  {Object.keys(levels).length === 0 ? (
                    <div className='text-xs text-gray-400'>Belum ada riwayat level.</div>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {Object.entries(levels).sort((a,b)=>b[1]-a[1]).map(([lvl, y]) => (
                        <div key={lvl} className='rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-gray-100'>
                          <span className='font-medium text-gray-700'>{lvl}</span>
                          <span className='ml-2 text-xs text-gray-400'>{y.toFixed(1)} thn</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Internal Group (history) */}
                <div>
                  <div className='mb-2 text-xs font-bold uppercase tracking-wide text-gray-600'>Internal Group — Riwayat Posisi Internal</div>
                  {hist.length === 0 ? (
                    <div className='text-xs text-gray-400'>Belum ada riwayat posisi internal.</div>
                  ) : (
                    <div className='space-y-1.5'>
                      {hist.map(h => (
                        <div key={h.id} className='flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm'>
                          <div>
                            <span className='font-medium text-gray-700'>{posName(h.positionId)}</span>
                            {h.action && <span className='ml-2 text-[11px] text-gray-400'>{h.action}</span>}
                          </div>
                          <span className='text-xs text-gray-400'>{h.effectiveDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* External experience & aspiration */}
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <div className='mb-1 text-xs font-bold uppercase tracking-wide text-gray-600'>External Working Experience</div>
                    <div className='text-sm text-gray-600'>{emp.externalExperience || <span className='text-gray-400'>Belum tercatat</span>}</div>
                  </div>
                  <div>
                    <div className='mb-1 text-xs font-bold uppercase tracking-wide text-gray-600'>Career Aspiration</div>
                    <div className='text-sm text-gray-600'>{rec.careerObjective || emp.careerAspiration || <span className='text-gray-400'>Belum tercatat</span>}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
