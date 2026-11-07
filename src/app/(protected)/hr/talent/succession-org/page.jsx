'use client'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useKeyPositionStore } from '@/store/keyPositionStore'
import { useVacancyRiskStore } from '@/store/vacancyRiskStore'
import { useSuccessorReadinessStore } from '@/store/successorReadinessStore'
import {
  listKeyPositions, incumbentOf, vacancyUrgency, successorsOf,
  successorReadiness, computeGap, GAP_TONE, TERM_LABEL, TERM_RANK,
} from '@/lib/talentSelectors'
import { PageHeader, SectionCard, StatusBadge, EmptyState, Select, SearchBar } from '@/components/ui'

// Avatar inisial dengan warna stabil dari nama.
const AV_COLORS = ['bg-red-100 text-red-700','bg-blue-100 text-blue-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-violet-100 text-violet-700','bg-teal-100 text-teal-700','bg-orange-100 text-orange-700']
const initials = (name='') => name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'
const avColor = (name='') => AV_COLORS[[...name].reduce((a,c)=>a+c.charCodeAt(0),0) % AV_COLORS.length]
const Avatar = ({ name }) => (
  <span className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold ${avColor(name)}`}>{initials(name)}</span>
)
const READ_TONE = { Short:'success', Medium:'warning', Long:'neutral' }
const URG_TONE  = { Short:'danger', Medium:'warning', Long:'success' }

export default function SuccessionOrgPage() {
  const { positions, departments, grades } = useStructureStore()
  const employees = useEmployeeStore(s => s.employees)
  const keyAssessments = useKeyPositionStore(s => s.assessments)
  const vacancyAssessments = useVacancyRiskStore(s => s.assessments)
  const successorsMap = useSuccessorReadinessStore(s => s.successors)

  const [query, setQuery] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterGap, setFilterGap] = useState('')

  const deptName  = (id) => departments.find(d => d.id === id)?.name || '—'
  const gradeCode = (posId) => grades.find(g => g.id === positions.find(p=>p.id===posId)?.gradeId)?.code || '—'
  const managerName = (emp) => employees.find(e => e.id === emp?.managerId)?.name || null

  const rows = useMemo(() => {
    return listKeyPositions(positions, keyAssessments).map(p => {
      const inc = incumbentOf(employees, p.id)
      const urgency = vacancyUrgency(vacancyAssessments, p.id)
      const succ = successorsOf(successorsMap, p.id)
        .map(s => ({ ...s, readiness: successorReadiness(s) }))
        .sort((a,b) => TERM_RANK[a.readiness] - TERM_RANK[b.readiness])
      const { level } = computeGap({ urgency, successors: succ })
      return { p, inc, urgency, succ, level }
    })
  }, [positions, keyAssessments, employees, vacancyAssessments, successorsMap])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (filterDept && r.p.departmentId !== +filterDept) return false
      if (filterGap && r.level !== filterGap) return false
      if (q && !`${r.p.code} ${r.p.name} ${deptName(r.p.departmentId)} ${r.inc?.name||''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, filterDept, filterGap])

  const summary = useMemo(() => ({
    positions: rows.length,
    noSucc: rows.filter(r => r.succ.length === 0).length,
    critical: rows.filter(r => r.level === 'Critical' || r.level === 'No Successor').length,
  }), [rows])

  return (
    <div>
      <PageHeader title='Succession Org / Lineage'
        subtitle='Peta suksesi per key position: incumbent, jalur pelaporan, dan pipeline successor beserta kesiapannya.' />

      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <SearchBar value={query} onChange={setQuery} placeholder='Cari posisi / incumbent…' className='w-full sm:max-w-xs' />
        <Select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className='py-2 text-xs sm:w-48'>
          <option value=''>Semua Department</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={filterGap} onChange={e=>setFilterGap(e.target.value)} className='py-2 text-xs sm:w-44'>
          <option value=''>Semua Gap</option>
          <option value='No Successor'>Tanpa Successor</option>
          <option value='Critical'>Critical</option>
          <option value='High'>High</option>
          <option value='Medium'>Medium</option>
          <option value='Ready'>Ready</option>
        </Select>
        <div className='ml-auto text-xs text-gray-500'>
          <span className='font-semibold text-gray-700'>{summary.positions}</span> posisi ·
          <span className='ml-1 font-semibold text-red-700'>{summary.critical}</span> kritikal ·
          <span className='ml-1 font-semibold text-gray-700'>{summary.noSucc}</span> tanpa successor
        </div>
      </div>

      {rows.length === 0 ? (
        <SectionCard bodyClass='p-6'>
          <EmptyState title='Belum ada Key Position.' description='Tetapkan Key Position untuk melihat peta suksesi.' />
        </SectionCard>
      ) : filtered.length === 0 ? (
        <SectionCard bodyClass='p-6'><EmptyState title='Tidak ada posisi yang cocok.' /></SectionCard>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {filtered.map(r => (
            <div key={r.p.id} className='flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
              {/* Position header */}
              <div className='flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-bold text-gray-800'>{r.p.name}</div>
                  <div className='truncate text-[11px] text-gray-400'>{r.p.code} · {deptName(r.p.departmentId)} · {gradeCode(r.p.id)}</div>
                </div>
                <StatusBadge tone={GAP_TONE[r.level] || 'neutral'}>{r.level}</StatusBadge>
              </div>

              {/* Incumbent */}
              <div className='bg-gray-50/70 px-4 py-3'>
                <div className='mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400'>Incumbent</div>
                {r.inc ? (
                  <div className='flex items-center gap-2.5'>
                    <Avatar name={r.inc.name} />
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold text-gray-800'>{r.inc.name}</div>
                      <div className='truncate text-[11px] text-gray-400'>{managerName(r.inc) ? `Reports to ${managerName(r.inc)}` : 'Top of line'}</div>
                    </div>
                    {r.urgency && <StatusBadge tone={URG_TONE[r.urgency]}>{TERM_LABEL[r.urgency]}</StatusBadge>}
                  </div>
                ) : (
                  <div className='text-xs italic text-gray-400'>Posisi kosong (vacant)</div>
                )}
              </div>

              {/* Successors pipeline */}
              <div className='flex-1 px-4 py-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-[10px] font-bold uppercase tracking-wide text-gray-400'>Successor Pipeline</span>
                  <span className='text-[11px] text-gray-400'>{r.succ.length} kandidat</span>
                </div>
                {r.succ.length === 0 ? (
                  <div className='rounded-lg border border-dashed border-red-200 bg-red-50/50 px-3 py-2 text-xs font-medium text-red-600'>
                    Tidak ada successor — single point of failure
                  </div>
                ) : (
                  <div className='space-y-1.5'>
                    {r.succ.map((s, i) => (
                      <div key={s.id} className='flex items-center gap-2.5 rounded-lg px-1 py-1'>
                        <span className='w-4 text-center text-[11px] font-bold text-gray-300'>{i+1}</span>
                        <Avatar name={s.employeeName} />
                        <div className='min-w-0 flex-1'>
                          <div className='truncate text-xs font-medium text-gray-700'>
                            {s.employeeName}
                            {s.emergency && <span className='ml-1 text-[9px] font-bold text-blue-500' title='Emergency cover'>EMG</span>}
                          </div>
                          <div className='truncate text-[10px] text-gray-400'>{s.currentPosition || '—'}</div>
                        </div>
                        <StatusBadge tone={READ_TONE[s.readiness] || 'neutral'}>{TERM_LABEL[s.readiness]}</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
        <span>Readiness:</span>
        <span className='inline-flex items-center gap-1'><StatusBadge tone='success'>Short</StatusBadge> siap</span>
        <span className='inline-flex items-center gap-1'><StatusBadge tone='warning'>Medium</StatusBadge> 1–3 thn</span>
        <span className='inline-flex items-center gap-1'><StatusBadge tone='neutral'>Long</StatusBadge> 3–5 thn</span>
        <span className='ml-2'>EMG = emergency cover</span>
      </div>
    </div>
  )
}
