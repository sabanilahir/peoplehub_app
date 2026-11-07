'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { usePipStore, PERNYATAAN } from '@/store/pipStore'
import { useAuthStore }            from '@/store/authStore'
import { useT }                    from '@/store/languageStore'
import { PageHeader, DataTable, Tr, Td, StatusBadge, EmptyState } from '@/components/ui'
import PipSignoffBlock from '@/components/performance/PipSignoffBlock'

const STATUS_TONE = {
  'Pending HR Review':       'warning',
  'Rejected by HR':          'danger',
  'Pending Acknowledgement': 'warning',
  'Disputed':                'warning',
  'Active':                  'info',
  'Pending HR Outcome':      'warning',
  'Passed':                  'success',
  'Failed':                  'danger',
}

const statusLabel = (s, t) => ({
  'Pending HR Review':       t('Menunggu Review HR', 'Awaiting HR Review'),
  'Rejected by HR':          t('Ditolak HR', 'Rejected by HR'),
  'Pending Acknowledgement': t('Menunggu Karyawan', 'Awaiting Employee'),
  'Disputed':                t('Keberatan — Mediasi HR', 'Disputed — HR Mediation'),
  'Active':                  t('Berjalan', 'Active'),
  'Pending HR Outcome':      t('Menunggu Sign-off HR', 'Awaiting HR Sign-off'),
  'Passed':                  t('Lulus', 'Passed'),
  'Failed':                  t('Gagal', 'Failed'),
}[s] || s)

export default function HrPipReviewPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { sessions, hrApprovePip, hrRejectPip, confirmPipOutcome, revertPipOutcome, resolveDispute, signPip } = usePipStore()

  const [selectedId, setSelectedId] = useState(null)
  const [rejecting,  setRejecting]  = useState(false)
  const [note,       setNote]       = useState('')
  const [forwardOff, setForwardOff] = useState(false)
  const [msg,        setMsg]        = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const pending  = sessions.filter(p => p.status === 'Pending HR Review')
  const pendingOutcome = sessions.filter(p => p.status === 'Pending HR Outcome')
  const disputed = sessions.filter(p => p.status === 'Disputed')
  const selected = sessions.find(p => p.id === selectedId) ?? null

  const doApprove = () => {
    hrApprovePip(selected.id, currentUser)
    flash(t('PIP disetujui & diteruskan ke karyawan.', 'PIP approved & forwarded to the employee.'))
    setSelectedId(null); setNote(''); setRejecting(false)
  }
  const doReject = () => {
    if (!note.trim()) return flash(t('Alasan penolakan wajib diisi.', 'Rejection reason is required.'), 'error')
    hrRejectPip(selected.id, currentUser, note)
    flash(t('PIP dikembalikan ke atasan.', 'PIP returned to the manager.'))
    setSelectedId(null); setNote(''); setRejecting(false)
  }

  const Toast = msg ? (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
      {msg.text}
    </div>
  ) : null

  // ── Detail / review view ──────────────────────────────────────────────────
  if (selected) {
    return (
      <div className='pb-10'>
        {Toast}
        <div className='flex items-center gap-3 mb-5'>
          <button onClick={() => { setSelectedId(null); setRejecting(false); setNote('') }}
            className='text-sm text-gray-500 hover:text-gray-700'><Icon e='←' size={14} className='inline align-[-2px]' /> {t('Kembali', 'Back')}</button>
          <span className='text-gray-300'>|</span>
          <h1 className='text-xl font-bold text-gray-800'>{t('Review PIP', 'PIP Review')} — {selected.employeeName}</h1>
        </div>

        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4 max-w-3xl'>
          <div className='grid grid-cols-2 gap-x-8 gap-y-2 text-sm'>
            {[
              [t('Karyawan', 'Employee'), selected.employeeName],
              [t('Departemen', 'Department'), selected.employeeDept || '—'],
              [t('Atasan', 'Manager'), selected.managerName || '—'],
              [t('Periode', 'Period'), `${selected.startDate} → ${selected.endDate}`],
            ].map(([k, v]) => (
              <div key={k} className='flex gap-2'><span className='text-gray-400 w-28 shrink-0'>{k}</span><span className='font-semibold text-gray-800'>{v}</span></div>
            ))}
          </div>

          <div className='bg-gray-50 rounded-xl p-3'>
            <p className='text-xs font-bold text-gray-400 mb-1'>{t('Alasan PIP', 'PIP Reason')}</p>
            <p className='text-sm text-gray-700'>{selected.alasanPip || '—'}</p>
          </div>
          <div className='bg-gray-50 rounded-xl p-3'>
            <p className='text-xs font-bold text-gray-400 mb-1'>{t('Rencana Perbaikan', 'Improvement Plan')}</p>
            <p className='text-sm text-gray-700'>{selected.rencanaPerbaikan || '—'}</p>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-xs border border-gray-200 rounded-xl overflow-hidden'>
              <thead><tr className='bg-gray-50'>
                <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>KPI</th>
                <th className='border border-gray-200 px-2 py-1.5 text-left font-bold text-gray-600'>{t('Deskripsi', 'Description')}</th>
                <th className='border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600'>Target</th>
              </tr></thead>
              <tbody>
                {(selected.kpiRows ?? []).map(r => (
                  <tr key={r.id}>
                    <td className='border border-gray-200 px-2 py-1.5 text-gray-700'>{r.kpi || '—'}</td>
                    <td className='border border-gray-200 px-2 py-1.5 text-gray-600'>{r.deskripsi || '—'}</td>
                    <td className='border border-gray-200 px-2 py-1.5 text-center text-gray-700'>{r.target || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='bg-amber-50 border border-amber-100 rounded-xl p-4'>
            <p className='text-xs font-bold text-amber-700 mb-2'>{t('Pernyataan (akan diakui karyawan)', 'Declaration (to be acknowledged by employee)')}</p>
            <ul className='list-disc pl-4 space-y-1'>
              {PERNYATAAN.map((p, i) => <li key={i} className='text-[11px] text-gray-600 leading-relaxed'>{p}</li>)}
            </ul>
          </div>

          {selected.status === 'Pending HR Review' ? (
            !rejecting ? (
              <div className='flex gap-3 pt-1'>
                <button onClick={doApprove}
                  className='px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition'>
                  <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Setujui & Teruskan ke Karyawan', 'Approve & Forward to Employee')}
                </button>
                <button onClick={() => setRejecting(true)}
                  className='px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition'>
                  <Icon e='✗' size={14} className='inline align-[-2px]' /> {t('Kembalikan ke Atasan', 'Return to Manager')}
                </button>
              </div>
            ) : (
              <div className='bg-red-50 border border-red-200 rounded-xl p-4'>
                <p className='text-xs font-semibold text-red-600 mb-1'>{t('Alasan dikembalikan (wajib)', 'Reason for return (required)')}</p>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                  className='w-full px-3 py-2 text-sm border border-red-300 rounded-lg outline-none focus:border-red-500 resize-none bg-white mb-3' />
                <div className='flex gap-2'>
                  <button onClick={doReject} disabled={!note.trim()}
                    className='px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition'>
                    {t('Konfirmasi Kembalikan', 'Confirm Return')}
                  </button>
                  <button onClick={() => { setRejecting(false); setNote('') }}
                    className='px-5 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition'>
                    {t('Batal', 'Cancel')}
                  </button>
                </div>
              </div>
            )
          ) : selected.status === 'Pending HR Outcome' ? (
            <div className='bg-indigo-50 border border-indigo-200 rounded-xl p-4'>
              <p className='text-sm font-bold text-indigo-800 mb-1'>{t('Sign-off Hasil Akhir PIP', 'Sign off Final PIP Outcome')}</p>
              <p className='text-xs text-indigo-700 mb-1'>{t('Usulan atasan', 'Manager proposed')}: <b>{selected.outcome}</b>{selected.outcomeProposedBy ? ` (${selected.outcomeProposedBy})` : ''}</p>
              <p className='text-xs text-indigo-600 mb-3'>{t('HR wajib mengesahkan hasil ini sebelum final — khususnya hasil "Gagal" yang dapat berujung PHK.', 'HR must sign off before this is final — especially a "Failed" outcome that may lead to termination.')}</p>
              {selected.outcome === 'Failed' && (
                <label className='flex items-center gap-2 text-xs text-red-700 mb-3'>
                  <input type='checkbox' checked={forwardOff} onChange={e => setForwardOff(e.target.checked)} className='w-4 h-4 accent-red-600' />
                  {t('Teruskan ke proses offboarding/terminate setelah disahkan', 'Forward to offboarding/terminate after sign-off')}
                </label>
              )}
              {!rejecting ? (
                <div className='flex gap-2'>
                  <button onClick={() => { confirmPipOutcome(selected.id, currentUser, forwardOff); flash(t('Hasil PIP disahkan.', 'PIP outcome signed off.')); setSelectedId(null); setForwardOff(false) }}
                    className='px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition'>
                    <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Sahkan Hasil', 'Sign off Outcome')}
                  </button>
                  <button onClick={() => setRejecting(true)}
                    className='px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition'>
                    <Icon e='↩' size={14} className='inline align-[-2px]' /> {t('Kembalikan ke Atasan', 'Send back to Manager')}
                  </button>
                </div>
              ) : (
                <div className='bg-white border border-amber-200 rounded-lg p-3'>
                  <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                    placeholder={t('Alasan dikembalikan (wajib)', 'Reason to send back (required)')}
                    className='w-full px-3 py-2 text-sm border border-amber-300 rounded-lg outline-none focus:border-amber-500 resize-none mb-2' />
                  <div className='flex gap-2'>
                    <button onClick={() => { if (!note.trim()) return flash(t('Alasan wajib diisi.', 'Reason is required.'), 'error'); revertPipOutcome(selected.id, currentUser, note); flash(t('Usulan dikembalikan ke atasan.', 'Proposal sent back to the manager.')); setSelectedId(null); setNote(''); setRejecting(false) }}
                      className='px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg'>{t('Konfirmasi', 'Confirm')}</button>
                    <button onClick={() => { setRejecting(false); setNote('') }} className='px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg'>{t('Batal', 'Cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          ) : selected.status === 'Disputed' ? (
            <div className='bg-amber-50 border border-amber-200 rounded-xl p-4'>
              <p className='text-sm font-bold text-amber-800 mb-1'>{t('Mediasi Keberatan Karyawan', 'Mediate Employee Dispute')}</p>
              {selected.disputeNote && <p className='text-xs text-amber-700 italic mb-3'>"{selected.disputeNote}"</p>}
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder={t('Resolusi / catatan mediasi (wajib)', 'Resolution / mediation note (required)')}
                className='w-full px-3 py-2 text-sm border border-amber-300 rounded-lg outline-none focus:border-amber-500 resize-none mb-3 bg-white' />
              <div className='flex gap-2'>
                <button onClick={() => { if (!note.trim()) return flash(t('Resolusi wajib diisi.', 'Resolution is required.'), 'error'); resolveDispute(selected.id, currentUser, note, false); flash(t('Keberatan diselesaikan — PIP berjalan.', 'Dispute resolved — PIP is now active.')); setSelectedId(null); setNote('') }}
                  className='px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition'>
                  {t('Selesaikan & Jalankan PIP', 'Resolve & Activate PIP')}
                </button>
                <button onClick={() => { if (!note.trim()) return flash(t('Resolusi wajib diisi.', 'Resolution is required.'), 'error'); resolveDispute(selected.id, currentUser, note, true); flash(t('Dikembalikan ke atasan untuk revisi.', 'Sent back to the manager for revision.')); setSelectedId(null); setNote('') }}
                  className='px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition'>
                  {t('Kembalikan ke Atasan', 'Send back to Manager')}
                </button>
              </div>
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              {t('Status', 'Status')}: <span className='font-semibold'>{statusLabel(selected.status, t)}</span>
              {selected.appealedAt && <p className='mt-2 text-amber-700'><Icon e='⚠' size={14} className='inline align-[-2px]' /> {t('Karyawan mengajukan banding', 'Employee filed an appeal')}: "{selected.appealNote}"</p>}
              {selected.forwardedToOffboarding && <p className='mt-1 text-red-700'>{t('Diteruskan ke proses offboarding.', 'Forwarded to offboarding.')}</p>}
            </div>
          )}

          {(selected.status === 'Passed' || selected.status === 'Failed') && (
            <PipSignoffBlock pip={selected}
              canSign={selected.signoffs?.hrbp ? null : 'hrbp'}
              onSign={() => { signPip(selected.id, 'hrbp', { name: currentUser?.name || 'HRBP', position: 'HRBP' }); flash(t('Anda telah menandatangani persetujuan final.', 'You have signed the final agreement.')) }} />
          )}
        </div>
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div>
      {Toast}
      <PageHeader icon='🛡️'
        title={t('Review PIP (HR)', 'PIP Review (HR)')}
        subtitle={t('Tinjau & setujui Performance Improvement Plan sebelum diberikan ke karyawan.', 'Review & approve Performance Improvement Plans before they reach the employee.')}
      />

      <div className='bg-white rounded-xl shadow-sm mb-6'>
        <div className='px-6 py-4 border-b border-gray-100'>
          <h2 className='text-sm font-bold text-gray-700'><Icon e='⏳' size={14} className='inline align-[-2px]' /> {t('Menunggu Review Anda', 'Awaiting Your Review')} <span className='ml-2 text-xs font-normal text-gray-400'>({pending.length})</span></h2>
        </div>
        {pending.length === 0 ? (
          <div className='px-6 py-10 text-center text-gray-400 text-sm'>{t('Tidak ada PIP yang menunggu review.', 'No PIP awaiting review.')}</div>
        ) : (
          <DataTable columns={[
            { label: t('Karyawan', 'Employee') }, { label: t('Departemen', 'Department') },
            { label: t('Atasan', 'Manager') }, { label: t('Periode', 'Period') }, { label: t('Aksi', 'Action'), align: 'right' },
          ]}>
            {pending.map(p => (
              <Tr key={p.id}>
                <Td className='font-semibold text-gray-800'>{p.employeeName}</Td>
                <Td className='text-gray-600'>{p.employeeDept || '—'}</Td>
                <Td className='text-gray-600'>{p.managerName || '—'}</Td>
                <Td className='text-gray-500 text-xs'>{p.startDate} <Icon e='→' size={14} className='inline align-[-2px]' /> {p.endDate}</Td>
                <Td align='right'>
                  <button onClick={() => setSelectedId(p.id)}
                    className='px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition'>
                    {t('Review', 'Review')}
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </div>

      {pendingOutcome.length > 0 && (
        <div className='bg-white rounded-xl shadow-sm mb-6'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-700'><Icon e='⭐' size={14} className='inline align-[-2px]' /> {t('Menunggu Sign-off Hasil Akhir', 'Awaiting Outcome Sign-off')} <span className='ml-2 text-xs font-normal text-gray-400'>({pendingOutcome.length})</span></h2>
          </div>
          <DataTable columns={[
            { label: t('Karyawan', 'Employee') }, { label: t('Atasan', 'Manager') }, { label: t('Usulan', 'Proposed') }, { label: t('Aksi', 'Action'), align: 'right' },
          ]}>
            {pendingOutcome.map(p => (
              <Tr key={p.id}>
                <Td className='font-semibold text-gray-800'>{p.employeeName}</Td>
                <Td className='text-gray-600'>{p.managerName || '—'}</Td>
                <Td><StatusBadge tone={p.outcome === 'Passed' ? 'success' : 'danger'}>{p.outcome}</StatusBadge></Td>
                <Td align='right'><button onClick={() => setSelectedId(p.id)} className='px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition'>{t('Sign-off', 'Sign off')}</button></Td>
              </Tr>
            ))}
          </DataTable>
        </div>
      )}

      {disputed.length > 0 && (
        <div className='bg-white rounded-xl shadow-sm mb-6'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-700'><Icon e='⚠' size={14} className='inline align-[-2px]' /> {t('Keberatan Menunggu Mediasi', 'Disputes Awaiting Mediation')} <span className='ml-2 text-xs font-normal text-gray-400'>({disputed.length})</span></h2>
          </div>
          <DataTable columns={[
            { label: t('Karyawan', 'Employee') }, { label: t('Atasan', 'Manager') }, { label: t('Aksi', 'Action'), align: 'right' },
          ]}>
            {disputed.map(p => (
              <Tr key={p.id}>
                <Td className='font-semibold text-gray-800'>{p.employeeName}</Td>
                <Td className='text-gray-600'>{p.managerName || '—'}</Td>
                <Td align='right'><button onClick={() => setSelectedId(p.id)} className='px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition'>{t('Mediasi', 'Mediate')}</button></Td>
              </Tr>
            ))}
          </DataTable>
        </div>
      )}

      <div className='bg-white rounded-xl shadow-sm'>
        <div className='px-6 py-4 border-b border-gray-100'>
          <h2 className='text-sm font-bold text-gray-700'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Semua PIP', 'All PIP')} <span className='ml-2 text-xs font-normal text-gray-400'>({sessions.length})</span></h2>
        </div>
        {sessions.length === 0 ? (
          <EmptyState icon='📋' title={t('Belum ada PIP.', 'No PIP yet.')} />
        ) : (
          <DataTable columns={[
            { label: t('Karyawan', 'Employee') }, { label: t('Atasan', 'Manager') },
            { label: t('Periode', 'Period') }, { label: 'Status' }, { label: '' },
          ]}>
            {sessions.map(p => (
              <Tr key={p.id}>
                <Td className='font-semibold text-gray-800'>{p.employeeName}</Td>
                <Td className='text-gray-600'>{p.managerName || '—'}</Td>
                <Td className='text-gray-500 text-xs'>{p.startDate} <Icon e='→' size={14} className='inline align-[-2px]' /> {p.endDate}</Td>
                <Td><StatusBadge tone={STATUS_TONE[p.status] ?? 'neutral'}>{statusLabel(p.status, t)}</StatusBadge></Td>
                <Td align='right'>
                  <button onClick={() => setSelectedId(p.id)}
                    className='px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition'>
                    {t('Lihat', 'View')}
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  )
}
