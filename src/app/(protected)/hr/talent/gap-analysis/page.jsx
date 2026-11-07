'use client'
import { useState, useMemo } from 'react'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useKeyPositionStore } from '@/store/keyPositionStore'
import { useVacancyRiskStore } from '@/store/vacancyRiskStore'
import { useSuccessorReadinessStore } from '@/store/successorReadinessStore'
import {
  listKeyPositions, incumbentOf, vacancyUrgency, successorsOf,
  bestReadiness, hasEmergency, computeGap, GAP_TONE, TERM_LABEL,
} from '@/lib/talentSelectors'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, EmptyState, Select, SearchBar,
} from '@/components/ui'

const GAP_ORDER = { 'No Successor':0, Critical:1, High:2, Unassessed:3, Medium:4, Ready:5, Low:5 }

export default function GapAnalysisPage() {
  const { positions, departments } = useStructureStore()
  const employees = useEmployeeStore(s => s.employees)
  const keyAssessments = useKeyPositionStore(s => s.assessments)
  const vacancyAssessments = useVacancyRiskStore(s => s.assessments)
  const successorsMap = useSuccessorReadinessStore(s => s.successors)

  const [query, setQuery] = useState('')
  const [filterGap, setFilterGap] = useState('')

  const deptName = (id) => departments.find(d => d.id === id)?.name || '—'

  const rows = useMemo(() => {
    return listKeyPositions(positions, keyAssessments).map(p => {
      const inc = incumbentOf(employees, p.id)
      const urgency = vacancyUrgency(vacancyAssessments, p.id)
      const succ = successorsOf(successorsMap, p.id)
      const { level, best } = computeGap({ urgency, successors: succ })
      return { p, inc, urgency, succ, best, level, emergency: hasEmergency(succ) }
    }).sort((a, b) => (GAP_ORDER[a.level] ?? 9) - (GAP_ORDER[b.level] ?? 9))
  }, [positions, keyAssessments, employees, vacancyAssessments, successorsMap])

  const stats = useMemo(() => {
    const s = { critical: 0, high: 0, noSucc: 0, ready: 0 }
    rows.forEach(r => {
      if (r.level === 'Critical') s.critical++
      if (r.level === 'High') s.high++
      if (r.level === 'No Successor') s.noSucc++
      if (r.level === 'Ready' || r.level === 'Low') s.ready++
    })
    return s
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (filterGap && r.level !== filterGap) return false
      if (q && !`${r.p.code} ${r.p.name} ${deptName(r.p.departmentId)} ${r.inc?.name || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, filterGap])

  return (
    <div>
      <PageHeader
        title='Succession Gap Analysis'
        subtitle='Pertemukan Vacancy Urgency (kapan posisi kosong) dengan Successor Readiness (kapan successor siap) untuk menyorot risiko suksesi.'
      />

      <div className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100'>
        <div className='grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x'>
          {[
            { label:'Critical Gap',  value:stats.critical, sub:'kosong ≫ siap', accent:true },
            { label:'High Gap',      value:stats.high,     sub:'perlu percepatan' },
            { label:'Tanpa Successor',value:stats.noSucc,  sub:'single point of failure' },
            { label:'Ter-cover',     value:stats.ready,    sub:'successor siap tepat waktu' },
          ].map((m,i)=>(
            <div key={i} className='px-5 py-4'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400'>{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent?'text-red-700':'text-gray-900'}`}>{m.value}</div>
              <div className='mt-0.5 text-xs text-gray-400'>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard title='Gap per Key Position' bodyClass='p-0'>
        <div className='flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between'>
          <SearchBar value={query} onChange={setQuery} placeholder='Cari posisi / incumbent…' className='w-full lg:max-w-sm' />
          <Select value={filterGap} onChange={e=>setFilterGap(e.target.value)} className='py-2 text-xs lg:w-52'>
            <option value=''>Semua Gap</option>
            <option value='No Successor'>Tanpa Successor</option>
            <option value='Critical'>Critical</option>
            <option value='High'>High</option>
            <option value='Medium'>Medium</option>
            <option value='Ready'>Ready</option>
            <option value='Unassessed'>Belum dinilai</option>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className='p-6'>
            <EmptyState title='Belum ada Key Position.'
              description='Tetapkan Key Position dan nilai Vacancy Risk serta Successor Readiness untuk melihat gap.' />
          </div>
        ) : filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada data yang cocok.' /></div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0'
            columns={['Key Position','Incumbent','Vacancy Urgency','Successor','Best Readiness','Emergency','Gap Risk']}>
            {filtered.map(r => (
              <Tr key={r.p.id}>
                <Td>
                  <div className='font-medium text-gray-800'>{r.p.name}</div>
                  <div className='text-xs text-gray-400'>{r.p.code} · {deptName(r.p.departmentId)}</div>
                </Td>
                <Td className='text-xs text-gray-600'>{r.inc?.name || <span className='text-gray-300'>— kosong —</span>}</Td>
                <Td className='text-xs'>
                  {r.urgency ? <StatusBadge tone={r.urgency==='Short'?'danger':r.urgency==='Medium'?'warning':'success'}>{TERM_LABEL[r.urgency]}</StatusBadge> : <span className='text-gray-300'>belum dinilai</span>}
                </Td>
                <Td className='text-sm font-semibold text-gray-700'>{r.succ.length}</Td>
                <Td className='text-xs'>
                  {r.best ? <StatusBadge tone={r.best==='Short'?'success':r.best==='Medium'?'warning':'neutral'}>{TERM_LABEL[r.best]}</StatusBadge> : <span className='text-gray-300'>—</span>}
                </Td>
                <Td className='text-center'>{r.emergency ? <StatusBadge tone='info'>Ada</StatusBadge> : <span className='text-xs text-gray-300'>—</span>}</Td>
                <Td><StatusBadge tone={GAP_TONE[r.level] || 'neutral'}>{r.level}</StatusBadge></Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <p className='mt-4 text-xs text-gray-400'>
        Gap Risk = perbandingan waktu: <b>Critical</b> bila posisi berpotensi kosong jauh lebih cepat daripada kesiapan successor;
        <b> No Successor</b> bila belum ada kandidat. Adanya emergency successor menurunkan satu tingkat risiko.
      </p>
    </div>
  )
}
