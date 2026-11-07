'use client'
import { useState } from 'react'
import { usePsychotestAttemptStore } from '@/store/psychotestAttemptStore'
import { usePsychotestStore, LIKERT_SCALE } from '@/store/psychotestStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, FilterBar, FilterPill,
  StatusBadge, EmptyState, ActionButton,
} from '@/components/ui'

const STATUS_TONE = { Assigned: 'warning', 'In Progress': 'info', Completed: 'success' }

const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

export default function PsychotestResultsPage() {
  const t = useT()
  const { attempts, deleteAttempt } = usePsychotestAttemptStore()
  const { questions } = usePsychotestStore()

  const [status, setStatus] = useState('all')
  const [detail, setDetail] = useState(null)
  const [copied, setCopied] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { imageDataUrl, at }

  const rows = attempts
    .filter(a => status === 'all' || a.status === status)
    .sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''))

  const counts = {
    all: attempts.length,
    Assigned: attempts.filter(a => a.status === 'Assigned').length,
    'In Progress': attempts.filter(a => a.status === 'In Progress').length,
    Completed: attempts.filter(a => a.status === 'Completed').length,
  }

  const linkFor = (token) => `${typeof window !== 'undefined' ? window.location.origin : ''}/psychotest/${token}`

  const copyLink = async (token) => {
    try { await navigator.clipboard.writeText(linkFor(token)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const del = (a) => {
    if (!window.confirm(t(`Hapus penugasan tes untuk "${a.candidateName}"?`, `Delete test assignment for "${a.candidateName}"?`))) return
    deleteAttempt(a.id)
    setDetail(null)
  }

  return (
    <div>
      <PageHeader
        icon='📊'
        title={t('Hasil Psychotest', 'Psychotest Results')}
        subtitle={t('Status dan skor psikotes yang ditugaskan ke kandidat.', 'Status and scores for psychotests assigned to candidates.')}
      />

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <StatCard icon='📊' tone='brand' label={t('Total', 'Total')} value={String(counts.all)} />
        <StatCard icon='⏳' tone='orange' label={t('Ditugaskan', 'Assigned')} value={String(counts.Assigned)} />
        <StatCard icon='✍️' tone='blue' label={t('Sedang Dikerjakan', 'In Progress')} value={String(counts['In Progress'])} />
        <StatCard icon='✅' tone='green' label={t('Selesai', 'Completed')} value={String(counts.Completed)} />
      </div>

      <div className='mb-4'>
        <FilterBar>
          <FilterPill active={status === 'all'} onClick={() => setStatus('all')}>{t('Semua', 'All')}</FilterPill>
          <FilterPill active={status === 'Assigned'} onClick={() => setStatus('Assigned')}>{t('Ditugaskan', 'Assigned')}</FilterPill>
          <FilterPill active={status === 'In Progress'} onClick={() => setStatus('In Progress')}>{t('Sedang Dikerjakan', 'In Progress')}</FilterPill>
          <FilterPill active={status === 'Completed'} onClick={() => setStatus('Completed')}>{t('Selesai', 'Completed')}</FilterPill>
        </FilterBar>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon='📊' title={t('Belum ada psikotes ditugaskan.', 'No psychotest assigned yet.')} />
      ) : (
        <DataTable columns={[
          t('Kandidat', 'Candidate'), t('Paket Tes', 'Test Package'), t('Ditugaskan', 'Assigned'),
          { label: 'Status', align: 'center' }, { label: t('Skor', 'Score'), align: 'center' }, { label: '', align: 'right' },
        ]}>
          {rows.map(a => (
            <Tr key={a.id} onClick={() => setDetail(a)}>
              <Td className='font-semibold text-gray-800'>{a.candidateName}</Td>
              <Td className='text-sm text-gray-600'>{a.testName}</Td>
              <Td className='whitespace-nowrap text-xs text-gray-500'>{fmtDateTime(a.assignedAt)}</Td>
              <Td align='center'><StatusBadge tone={STATUS_TONE[a.status]}>{a.status}</StatusBadge></Td>
              <Td align='center' className='text-sm font-semibold text-gray-700'>
                {a.status === 'Completed' ? `${a.score} / ${a.maxScore}` : '—'}
              </Td>
              <Td align='right'><span className='text-xs font-semibold text-teal-700'>{t('Detail', 'Details')} →</span></Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {detail && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={() => setDetail(null)}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-base font-bold text-gray-800'>{detail.candidateName}</h3>
                <p className='text-xs text-gray-400'>{detail.testName}</p>
              </div>
              <button onClick={() => setDetail(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-2 text-sm'>
              <p><span className='text-gray-400'>Status:</span> <StatusBadge tone={STATUS_TONE[detail.status]}>{detail.status}</StatusBadge></p>
              <p><span className='text-gray-400'>{t('Ditugaskan', 'Assigned')}:</span> {fmtDateTime(detail.assignedAt)}{detail.assignedByName ? ` · ${detail.assignedByName}` : ''}</p>
              {detail.startedAt && <p><span className='text-gray-400'>{t('Dimulai', 'Started')}:</span> {fmtDateTime(detail.startedAt)}</p>}
              {detail.completedAt && <p><span className='text-gray-400'>{t('Selesai', 'Completed')}:</span> {fmtDateTime(detail.completedAt)}</p>}
              {detail.status === 'Completed' && (
                <p><span className='text-gray-400'>{t('Skor', 'Score')}:</span> <b className='text-gray-800'>{detail.score} / {detail.maxScore}</b>
                  {detail.maxScore > 0 && <span className='text-gray-400'> ({Math.round(detail.score / detail.maxScore * 100)}%)</span>}
                </p>
              )}
            </div>

            {detail.status !== 'Assigned' && (
              <div className='mt-4 space-y-2 border-t border-gray-100 pt-4'>
                <p className='text-xs font-semibold text-gray-500'>{t('Jawaban', 'Answers')}</p>
                {Object.entries(detail.answers || {}).map(([qid, ans]) => {
                  const q = questions.find(x => x.id === Number(qid))
                  if (!q) return null
                  const opt = q.type === 'Pilihan Ganda' ? q.options.find(o => o.id === ans) : null
                  return (
                    <div key={qid} className='rounded-lg bg-gray-50 p-2.5 text-xs'>
                      <p className='font-medium text-gray-700'>{q.questionText}</p>
                      <p className='mt-0.5 text-gray-500'>
                        {q.type === 'Pilihan Ganda'
                          ? <>{opt?.text || '—'} {opt && (Number(opt.score) > 0 ? <span className='text-emerald-600'>✓</span> : <span className='text-red-500'>✕</span>)}</>
                          : LIKERT_SCALE.find(l => l.value === ans)?.label || '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {detail.proctorCaptures?.length > 0 && (
              <div className='mt-4 border-t border-gray-100 pt-4'>
                <p className='mb-2 text-xs font-semibold text-gray-500'>
                  📷 {t('Foto Proctoring', 'Proctoring Photos')} ({detail.proctorCaptures.length})
                </p>
                <div className='flex flex-wrap gap-2'>
                  {detail.proctorCaptures.map((c, i) => (
                    <button key={i} onClick={() => setLightbox(c)} className='group relative'>
                      <img src={c.imageDataUrl} alt='' className='h-16 w-20 rounded-lg object-cover ring-1 ring-gray-200 transition group-hover:ring-teal-400' />
                      <span className='absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 px-1 py-0.5 text-center text-[9px] text-white'>
                        {new Date(c.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {detail.status === 'Assigned' && (
              <div className='mt-4 rounded-xl bg-gray-50 p-3'>
                <p className='mb-1.5 text-xs font-semibold text-gray-500'>{t('Link Tes (kirim ke kandidat)', 'Test Link (send to candidate)')}</p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-gray-600 ring-1 ring-gray-200'>{linkFor(detail.token)}</code>
                  <button onClick={() => copyLink(detail.token)}
                    className='shrink-0 rounded-lg bg-gray-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-gray-700'>
                    {copied ? t('Tersalin!', 'Copied!') : t('Salin', 'Copy')}
                  </button>
                </div>
              </div>
            )}

            <div className='mt-5 flex justify-end gap-2'>
              <ActionButton variant='secondary' onClick={() => del(detail)} className='!text-red-600'>{t('Hapus', 'Delete')}</ActionButton>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4' onClick={() => setLightbox(null)}>
          <div className='max-h-[90vh] max-w-lg' onClick={e => e.stopPropagation()}>
            <div className='mb-2 flex items-center justify-between text-white'>
              <span className='text-sm font-semibold'>
                {new Date(lightbox.at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className='flex items-center gap-3'>
                <a href={lightbox.imageDataUrl} download={`proctor-${lightbox.at}.jpg`} className='text-xs font-semibold hover:underline'>
                  {t('Unduh', 'Download')}
                </a>
                <button onClick={() => setLightbox(null)} className='text-2xl font-bold leading-none hover:text-gray-300'>×</button>
              </div>
            </div>
            <img src={lightbox.imageDataUrl} alt='' className='max-h-[80vh] w-full rounded-xl object-contain' />
          </div>
        </div>
      )}
    </div>
  )
}
