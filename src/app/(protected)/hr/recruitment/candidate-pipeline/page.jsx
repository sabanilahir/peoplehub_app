'use client'
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRecruitmentStore, ACTIVE_STAGES, STAGES } from '@/store/recruitmentStore'
import { useStructureStore } from '@/store/structureStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'
import { PageHeader, Select, SearchBar, StatusBadge, EmptyState } from '@/components/ui'

// Caps a column's height so hundreds of candidates in one stage scroll
// within their own column instead of stretching the whole page.
const COLUMN_MAX_H = 'max-h-[calc(100vh-320px)]'

const STAGE_COLOR = {
  Applied:   { bar: '#9ca3af', bg: 'bg-gray-50',    text: 'text-gray-600' },
  Screening: { bar: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-600' },
  Interview: { bar: '#8b5cf6', bg: 'bg-violet-50',  text: 'text-violet-600' },
  Offer:     { bar: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-600' },
  'Pending Employee': { bar: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Rejected:  { bar: '#ef4444', bg: 'bg-red-50',     text: 'text-red-600' },
}

const Stars = ({ n }) => (
  <span className='text-[11px] text-amber-400'>{'★'.repeat(n)}<span className='text-gray-200'>{'★'.repeat(5 - n)}</span></span>
)

// A rejection caused by voiding a mistaken hire carries a
// "[Employment dibatalkan: <reason>]" / "[Employment cancelled: <reason>]"
// marker appended to notes (see hr/employee/[id] saveRecord cascade) — pull
// it out so the card can call it out distinctly instead of burying it in a
// line-clamped notes blob.
const CANCEL_NOTE_RE = /\s*\[(?:Employment dibatalkan|Employment cancelled): ([^\]]+)\]/

function CandidateCard({ c, onMove, onReject, employee, headcount, companyName, t }) {
  const idx = ACTIVE_STAGES.indexOf(c.stage)
  const next = c.stage === 'Rejected' ? null : ACTIVE_STAGES[idx + 1]
  // Rejected has no recorded prior stage (any active stage can reject), so
  // "back" reopens it at Applied; from an active stage it just steps back
  // one column.
  const prev = c.stage === 'Rejected' ? 'Applied' : (idx > 0 ? ACTIVE_STAGES[idx - 1] : null)
  const cancelMatch = c.notes && c.notes.match(CANCEL_NOTE_RE)
  const notesWithoutCancel = c.notes ? c.notes.replace(CANCEL_NOTE_RE, '').trim() : ''
  return (
    <div className='rounded-xl border border-gray-100 bg-white p-3 shadow-sm'>
      <p className='text-sm font-semibold text-gray-800'>{c.name}</p>
      <p className='mt-0.5 text-[11px] text-gray-400'>{c.source} · {c.appliedDate}</p>
      {c.rating > 0 && <div className='mt-1'><Stars n={c.rating} /></div>}
      {notesWithoutCancel && <p className='mt-1.5 line-clamp-2 text-[11px] text-gray-500'>{notesWithoutCancel}</p>}
      {cancelMatch && (
        <div className='mt-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600'>
          <p className='font-bold text-gray-700'>⚠️ {t('Cancel Employment', 'Cancel Employment')}</p>
          <p>{t('Sempat diterima, lalu dibatalkan.', 'Was hired, then the employment was cancelled.')}</p>
          <p>{t('Alasan', 'Reason')}: {cancelMatch[1]}</p>
        </div>
      )}
      {employee && (
        <div className='mt-2 space-y-0.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-800'>
          <p className='font-bold'>✅ {t('Sudah Jadi Karyawan', 'Converted to Employee')}</p>
          <p>{t('No. Karyawan', 'Employee No.')}: <span className='font-mono font-semibold'>{employee.nik || '—'}</span></p>
          <p>{t('Perusahaan', 'Company')}: {companyName}</p>
          {headcount && <p>{t('Headcount', 'Headcount')}: {headcount.code} — {headcount.name}</p>}
        </div>
      )}
      <div className='mt-2.5 flex items-center gap-1.5'>
        {prev && (
          <button onClick={() => onMove(c, prev)} title={`${t('Kembali ke', 'Back to')} ${prev}`}
            className='shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-400 hover:bg-gray-100 hover:text-gray-600'>
            ←
          </button>
        )}
        {next && (
          <button onClick={() => onMove(c, next)}
            className='flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-200'>
            {next} →
          </button>
        )}
        {c.stage !== 'Rejected' && c.stage !== 'Pending Employee' && (
          <button onClick={() => onReject(c)}
            className='shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50'>
            {t('Tolak', 'Reject')}
          </button>
        )}
      </div>
    </div>
  )
}

function PipelineBody() {
  const t = useT()
  const params = useSearchParams()
  const { requisitions, candidates, updateCandidate } = useRecruitmentStore()
  const { headcounts, companies } = useStructureStore()
  const { employees } = useEmployeeStore()

  const [reqId, setReqId] = useState(params.get('requisitionId') || 'all')
  const [q, setQ] = useState('')

  const byReq = reqId === 'all' ? candidates : candidates.filter(c => c.requisitionId === Number(reqId))
  const needle = q.trim().toLowerCase()
  const filtered = needle ? byReq.filter(c => c.name.toLowerCase().includes(needle)) : byReq
  const byStage = (stage) => filtered.filter(c => c.stage === stage)

  const companyName = (id) => companies.find(co => co.id === id)?.companyCode || companies.find(co => co.id === id)?.name || '—'

  const move = (c, stage) => updateCandidate(c.id, { stage })
  const reject = (c) => updateCandidate(c.id, { stage: 'Rejected' })

  const activeReqs = requisitions.filter(r => r.status !== 'Closed')

  return (
    <div>
      <PageHeader
        icon='🔀'
        title='Candidate Pipeline'
        subtitle={t('Pantau tahapan kandidat dari lamaran sampai diterima.', 'Track candidates from application through hire.')}
        actions={
          <Select value={reqId} onChange={e => setReqId(e.target.value)} className='min-w-[220px]'>
            <option value='all'>{t('Semua Lowongan', 'All Requisitions')}</option>
            {requisitions.map(r => (
              <option key={r.id} value={r.id}>{r.positionTitle}{r.status === 'Closed' ? ` (${t('Ditutup', 'Closed')})` : ''}</option>
            ))}
          </Select>
        }
      />

      {activeReqs.length === 0 && requisitions.length === 0 ? (
        <EmptyState icon='🔀' title={t('Belum ada lowongan.', 'No requisitions yet.')}
          description={t('Buat Job Requisition terlebih dahulu.', 'Create a Job Requisition first.')} />
      ) : byReq.length === 0 ? (
        <EmptyState icon='🔀' title={t('Belum ada kandidat.', 'No candidates yet.')}
          description={t('Tambah kandidat lewat Candidate Database.', 'Add candidates from Candidate Database.')} />
      ) : (
      <>
        <div className='mb-4 max-w-sm'>
          <SearchBar value={q} onChange={setQ} placeholder={t('Cari nama kandidat…', 'Search candidate name…')} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon='🔀' title={t('Tidak ada kandidat cocok.', 'No matching candidates.')} />
        ) : (
        <div className='grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-6'>
          {STAGES.map(stage => {
            const col = byStage(stage)
            const c = STAGE_COLOR[stage]
            return (
              <div key={stage} className='min-w-[220px] rounded-2xl bg-gray-50/70 p-3'>
                <div className='mb-3 flex items-center justify-between px-1'>
                  <div className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full' style={{ background: c.bar }} />
                    <span className='text-xs font-bold uppercase tracking-wide text-gray-600'>{stage}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${c.bg} ${c.text}`}>{col.length}</span>
                </div>
                <div className={`space-y-2.5 overflow-y-auto pr-1 ${COLUMN_MAX_H}`}>
                  {col.map(cand => {
                    const employee = cand.employeeId ? employees.find(e => e.id === cand.employeeId) : null
                    const req = employee ? requisitions.find(r => r.id === cand.requisitionId) : null
                    const headcount = req?.headcountId ? headcounts.find(h => h.id === req.headcountId) : null
                    return (
                      <CandidateCard key={cand.id} c={cand} onMove={move} onReject={reject} t={t}
                        employee={employee} headcount={headcount}
                        companyName={employee ? companyName(employee.companyId) : null} />
                    )
                  })}
                  {col.length === 0 && <p className='py-6 text-center text-[11px] text-gray-300'>—</p>}
                </div>
              </div>
            )
          })}
        </div>
        )}
      </>
      )}
    </div>
  )
}

export default function CandidatePipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelineBody />
    </Suspense>
  )
}
