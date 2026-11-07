'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useVipStore } from '@/store/vipStore'
import { useHayStore } from '@/store/hayStore'
import { useT }        from '@/store/languageStore'
import { PageHeader, DataTable, Tr, Td, StatusBadge, EmptyState, FilterPill } from '@/components/ui'

/* ── HAY fields (T-G-R-O-W) ─────────────────────────────────────────────── */
const HAY_FIELDS = [
  { key: 'topic',      label: '1. T — Topic' },
  { key: 'goal',       label: '2. G — Goal' },
  { key: 'reality',    label: '3. R — Reality' },
  { key: 'options',    label: '4. O — Options/Alternatives' },
  { key: 'wayForward', label: '5. W — Way Forward' },
]

/* ── Status tone maps ───────────────────────────────────────────────────── */
const vipTone = (s) => ({
  'Pending Manager': 'warning', 'Returned': 'danger',
  'Active': 'info', 'In Review': 'info', 'Pending Employee Ack': 'warning',
  'Closed': 'success', 'Cancelled': 'neutral',
}[s] || 'neutral')

const hayTone = (s) => ({
  'Completed': 'success', 'Pending Employee': 'info', 'Pending Manager': 'warning',
}[s] || 'neutral')

export default function HrCheckInPage() {
  const t = useT()
  const vipSessions = useVipStore(s => s.sessions)
  const haySessions = useHayStore(s => s.sessions)

  const [tab, setTab] = useState('vip')          // 'vip' | 'hay'
  const [selectedVip, setSelectedVip] = useState(null)
  const [selectedHay, setSelectedHay] = useState(null)
  const [q, setQ] = useState('')

  const filteredVip = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return vipSessions.filter(v =>
      !kw || v.employeeName?.toLowerCase().includes(kw) || v.managerName?.toLowerCase().includes(kw) || v.name?.toLowerCase().includes(kw))
  }, [vipSessions, q])

  const filteredHay = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return haySessions.filter(h =>
      !kw || h.employeeName?.toLowerCase().includes(kw) || h.managerName?.toLowerCase().includes(kw))
  }, [haySessions, q])

  /* ── VIP detail ─────────────────────────────────────────────────────── */
  if (selectedVip) {
    const v = selectedVip
    return (
      <div className='pb-10'>
        <div className='flex items-center gap-3 mb-5'>
          <button onClick={() => setSelectedVip(null)} className='text-sm text-gray-500 hover:text-gray-700'>
            <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}
          </button>
          <span className='text-gray-300'>|</span>
          <h1 className='text-xl font-bold text-gray-800'>
            <span className='text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold mr-2 align-middle'>VIP</span>
            {v.name} — {v.employeeName}
          </h1>
        </div>

        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4 max-w-4xl'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <div className='grid grid-cols-2 gap-x-8 gap-y-2 text-sm'>
              {[
                [t('Karyawan', 'Employee'), v.employeeName],
                [t('Atasan', 'Manager'), v.managerName || '—'],
                [t('Tanggal', 'Date'), v.date || '—'],
                [t('Disetujui oleh', 'Approved by'), v.managerApprovedBy || '—'],
              ].map(([k, val]) => (
                <div key={k} className='flex gap-2'><span className='text-gray-400 w-28 shrink-0'>{k}</span><span className='font-semibold text-gray-800'>{val}</span></div>
              ))}
            </div>
            <StatusBadge tone={vipTone(v.status)}>{v.status}</StatusBadge>
          </div>

          {v.status === 'Closed' && (
            <div className='bg-green-50 border border-green-100 rounded-xl p-4 text-sm'>
              <span className='font-bold text-green-700'><Icon e='⭐' size={14} className='inline align-[-2px]' /> {t('Skor Akhir', 'Final Score')}: {v.finalScore ?? '—'}</span>
              {v.ratingNote && <p className='text-gray-600 mt-1'>{v.ratingNote}</p>}
            </div>
          )}
          {v.returnNote && (
            <div className='bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700'>
              <span className='font-bold'>{t('Catatan dikembalikan', 'Return note')}:</span> {v.returnNote}
            </div>
          )}

          {(v.status === 'Pending Employee Ack' || v.status === 'Closed') && v.selfScore != null && (
            <div className='bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600'>
              {t('Self-assessment', 'Self-assessment')}: <b>{v.selfScore}</b> · {t('Skor akhir (tertimbang)', 'Final score (weighted)')}: <b>{v.finalScore ?? '—'}</b>
              {v.objected && <span className='block text-red-600 font-bold mt-1'>⚠ {t('Karyawan mengajukan keberatan.', 'Employee objected.')}</span>}
            </div>
          )}

          <div className='space-y-3'>
            {(v.topics ?? []).map((tp, idx) => (
              <div key={tp.id ?? idx} className='border border-gray-200 rounded-xl p-4'>
                <div className='flex items-start justify-between gap-3 mb-2'>
                  <h3 className='font-bold text-gray-800'>{idx + 1}. {tp.title || '—'}</h3>
                  <span className='text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0'>{t('Bobot', 'Weight')} {tp.weight || 0}%</span>
                </div>
                {tp.description && <p className='text-sm text-gray-600 mb-2'>{tp.description}</p>}
                {tp.goalPlan && <p className='text-xs text-gray-400 mb-2'>{t('Goal Plan', 'Goal Plan')}: {tp.goalPlan}</p>}
                <div className='flex items-center gap-2 mb-2'>
                  <span className='text-xs text-gray-400'>Status:</span>
                  <span className='text-xs font-semibold text-blue-700'>{tp.status || '—'}</span>
                </div>
                {tp.checkInNotes && (
                  <div className='bg-gray-50 rounded-lg p-3 text-sm text-gray-700'>
                    <p className='text-xs font-bold text-gray-400 mb-1'>{t('Catatan Check-In', 'Check-In Notes')}</p>
                    {tp.checkInNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── HAY detail ─────────────────────────────────────────────────────── */
  if (selectedHay) {
    const h = selectedHay
    return (
      <div className='pb-10'>
        <div className='flex items-center gap-3 mb-5'>
          <button onClick={() => setSelectedHay(null)} className='text-sm text-gray-500 hover:text-gray-700'>
            <Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}
          </button>
          <span className='text-gray-300'>|</span>
          <h1 className='text-xl font-bold text-gray-800'>
            <span className='text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold mr-2 align-middle'>HAY</span>
            {t('Sesi HAY', 'HAY Session')} — {h.employeeName}
          </h1>
        </div>

        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4 max-w-4xl'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <div className='grid grid-cols-2 gap-x-8 gap-y-2 text-sm'>
              {[
                [t('Karyawan', 'Employee'), h.employeeName],
                [t('Atasan', 'Manager'), h.managerName || '—'],
                [t('Tanggal', 'Date'), h.date || '—'],
                [t('Dibuat oleh', 'Created by'), h.createdBy === 'manager' ? t('Atasan', 'Manager') : t('Karyawan', 'Employee')],
              ].map(([k, val]) => (
                <div key={k} className='flex gap-2'><span className='text-gray-400 w-28 shrink-0'>{k}</span><span className='font-semibold text-gray-800'>{val}</span></div>
              ))}
            </div>
            <StatusBadge tone={hayTone(h.status)}>{h.status}</StatusBadge>
          </div>

          {h.confidential !== false ? (
            /* HAY adalah percakapan coaching personal — HR hanya melihat metadata/agregat,
               bukan isi reflektif (T-G-R-O-W), demi menjaga kepercayaan & kerahasiaan. */
            <div className='bg-slate-50 border border-slate-200 rounded-xl p-5'>
              <p className='text-sm font-bold text-slate-700 mb-1'>🔒 {t('Konten HAY bersifat rahasia', 'HAY content is confidential')}</p>
              <p className='text-xs text-slate-500 mb-4'>
                {t('Untuk menjaga keterbukaan sesi coaching, HR hanya melihat metadata kepatuhan — bukan isi jawaban. Isi hanya dibuka bila sesi dieskalasikan.', 'To protect openness in coaching, HR sees only compliance metadata — not the answers. Content is revealed only if the session is escalated.')}
              </p>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs'>
                {[
                  [t('Putaran dialog', 'Dialogue rounds'), h.round ?? 1],
                  [t('Karyawan mengisi', 'Employee filled'), h.employeeFilledAt ? '✓' : '—'],
                  [t('Atasan mengisi', 'Manager filled'), h.managerFilledAt ? '✓' : '—'],
                  [t('Action items', 'Action items'), (h.actionItems?.length ?? 0)],
                  [t('Sign-off bersama', 'Mutual sign-off'), h.signedOffAt ? '✓' : '—'],
                  [t('Jatuh tempo', 'Due date'), h.dueDate || '—'],
                ].map(([k, val]) => (
                  <div key={k} className='bg-white rounded-lg border border-slate-100 px-3 py-2'>
                    <p className='text-slate-400'>{k}</p>
                    <p className='font-bold text-slate-700'>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div className={`grid gap-5 ${h.employeeAnswers && h.managerAnswers ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {h.employeeAnswers && (
              <div className='border border-gray-200 rounded-xl overflow-hidden'>
                <div className='bg-gray-50 px-4 py-2 border-b border-gray-200'>
                  <h3 className='text-sm font-bold text-gray-700'>{t('Jawaban Karyawan', 'Employee Answers')}</h3>
                </div>
                <div className='p-4 space-y-3'>
                  {HAY_FIELDS.map(f => (
                    <div key={f.key}>
                      <p className='text-xs font-bold text-gray-400 mb-0.5'>{f.label}</p>
                      <p className='text-sm text-gray-700 whitespace-pre-wrap'>{h.employeeAnswers[f.key] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {h.managerAnswers && (
              <div className='border border-green-200 rounded-xl overflow-hidden'>
                <div className='bg-green-50 px-4 py-2 border-b border-green-200'>
                  <h3 className='text-sm font-bold text-green-800'>{t('Jawaban Atasan', 'Manager Answers')}</h3>
                </div>
                <div className='p-4 space-y-3'>
                  {HAY_FIELDS.map(f => (
                    <div key={f.key}>
                      <p className='text-xs font-bold text-green-600 mb-0.5'>{f.label}</p>
                      <p className='text-sm text-green-900 whitespace-pre-wrap'>{h.managerAnswers[f.key] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    )
  }

  /* ── List view ──────────────────────────────────────────────────────── */
  return (
    <div>
      <PageHeader icon='🗂️'
        title={t('Check-In Performance (HR)', 'Performance Check-In (HR)')}
        subtitle={t('Lihat semua sesi & form VIP dan HAY dari seluruh karyawan.', 'View all VIP and HAY check-in sessions & forms across all employees.')}
      />

      <div className='flex items-center gap-2 mb-4 flex-wrap'>
        <FilterPill active={tab === 'vip'} onClick={() => setTab('vip')}>VIP ({vipSessions.length})</FilterPill>
        <FilterPill active={tab === 'hay'} onClick={() => setTab('hay')}>HAY ({haySessions.length})</FilterPill>
        <div className='ml-auto'>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('Cari karyawan / atasan…', 'Search employee / manager…')}
            className='px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 w-64' />
        </div>
      </div>

      {tab === 'vip' ? (
        <div className='bg-white rounded-xl shadow-sm'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-700'>
              <Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Semua Sesi VIP', 'All VIP Sessions')}
              <span className='ml-2 text-xs font-normal text-gray-400'>({filteredVip.length})</span>
            </h2>
          </div>
          {filteredVip.length === 0 ? (
            <EmptyState icon='📋' title={t('Belum ada sesi VIP.', 'No VIP sessions yet.')} />
          ) : (
            <DataTable columns={[
              { label: t('Sesi', 'Session') }, { label: t('Karyawan', 'Employee') }, { label: t('Atasan', 'Manager') },
              { label: t('Tanggal', 'Date') }, { label: t('Skor', 'Score') }, { label: 'Status' }, { label: '' },
            ]}>
              {filteredVip.map(v => (
                <Tr key={v.id}>
                  <Td className='font-semibold text-gray-800'>{v.name}</Td>
                  <Td className='text-gray-600'>{v.employeeName}</Td>
                  <Td className='text-gray-600'>{v.managerName || '—'}</Td>
                  <Td className='text-gray-500 text-xs'>{v.date || '—'}</Td>
                  <Td className='text-gray-700'>{v.finalScore ?? '—'}</Td>
                  <Td><StatusBadge tone={vipTone(v.status)}>{v.status}</StatusBadge></Td>
                  <Td align='right'>
                    <button onClick={() => setSelectedVip(v)}
                      className='px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition'>
                      {t('Lihat', 'View')}
                    </button>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </div>
      ) : (
        <div className='bg-white rounded-xl shadow-sm'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-700'>
              <Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Semua Sesi HAY', 'All HAY Sessions')}
              <span className='ml-2 text-xs font-normal text-gray-400'>({filteredHay.length})</span>
            </h2>
          </div>
          {filteredHay.length === 0 ? (
            <EmptyState icon='📋' title={t('Belum ada sesi HAY.', 'No HAY sessions yet.')} />
          ) : (
            <DataTable columns={[
              { label: t('Karyawan', 'Employee') }, { label: t('Atasan', 'Manager') },
              { label: t('Tanggal', 'Date') }, { label: t('Dibuat oleh', 'Created by') }, { label: 'Status' }, { label: '' },
            ]}>
              {filteredHay.map(h => (
                <Tr key={h.id}>
                  <Td className='font-semibold text-gray-800'>{h.employeeName}</Td>
                  <Td className='text-gray-600'>{h.managerName || '—'}</Td>
                  <Td className='text-gray-500 text-xs'>{h.date || '—'}</Td>
                  <Td className='text-gray-500 text-xs'>{h.createdBy === 'manager' ? t('Atasan', 'Manager') : t('Karyawan', 'Employee')}</Td>
                  <Td><StatusBadge tone={hayTone(h.status)}>{h.status}</StatusBadge></Td>
                  <Td align='right'>
                    <button onClick={() => setSelectedHay(h)}
                      className='px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition'>
                      {t('Lihat', 'View')}
                    </button>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </div>
      )}
    </div>
  )
}
