'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useEmergencySosStore } from '@/store/emergencySosStore'
import { HR_ROLES } from '@/constants/roles'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, DataTable, Tr, Td, FilterBar, FilterPill,
  ActionButton, StatusBadge, EmptyState, FixedDurationVideo,
} from '@/components/ui'

const STATUS_TONE = { Pending: 'warning', Valid: 'success', Flagged: 'danger' }
const CATEGORY_ICON = { 'Kebakaran': '🔥', 'Kecelakaan Kerja': '⚠️', 'Medis': '🚑', 'Keamanan': '🛡️', 'Lainnya': '🆘' }

const getDirectManagerId = (employeeId, employees) => employees.find(e => e.id === employeeId)?.managerId ?? null

const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const formatBytes = (n) => !n ? '—' : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`

export default function EmergencySosLogPage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { employees } = useEmployeeStore()
  const { alerts, reviewAlert } = useEmergencySosStore()

  const isHR = HR_ROLES.includes(currentUser?.role)
  const visibleAlerts = isHR
    ? alerts
    : alerts.filter(a => getDirectManagerId(a.employeeId, employees) === currentUser?.id)

  const [status, setStatus] = useState('all')
  const [detail, setDetail] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [flash, setFlash] = useState('')

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const rows = visibleAlerts
    .filter(a => status === 'all' || a.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const counts = {
    all: visibleAlerts.length,
    Pending: visibleAlerts.filter(a => a.status === 'Pending').length,
    Valid: visibleAlerts.filter(a => a.status === 'Valid').length,
    Flagged: visibleAlerts.filter(a => a.status === 'Flagged').length,
  }

  // Prior-flag count per employee (excluding the alert currently open in the
  // detail modal) — surfaces repeat misuse right where a reviewer decides.
  const flagCountFor = (employeeId) => alerts.filter(a => a.employeeId === employeeId && a.status === 'Flagged').length

  const openDetail = (a) => { setDetail(a); setReviewNote(a.reviewNote || '') }
  const closeDetail = () => { setDetail(null); setReviewNote('') }

  const review = (newStatus) => {
    reviewAlert(detail.id, {
      status: newStatus, reviewedBy: currentUser.id, reviewedByName: currentUser.name,
      reviewedAt: new Date().toISOString(), reviewNote: reviewNote.trim(),
    })
    say(newStatus === 'Valid'
      ? t('Ditandai sebagai valid.', 'Marked as valid.')
      : t('Ditandai sebagai disalahgunakan (flag).', 'Flagged as misuse.'))
    closeDetail()
  }

  return (
    <div>
      <PageHeader
        icon='🆘'
        title='Emergency SOS Log'
        subtitle={t(
          'Riwayat SOS yang dikirim dari tombol darurat — tinjau video dan tandai valid atau disalahgunakan.',
          'History of alerts sent via the emergency button — review the video and mark each as valid or misuse.',
        )}
        actions={flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
      />

      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <StatCard icon='🆘' tone='brand' label={t('Total SOS', 'Total SOS')} value={String(counts.all)} />
        <StatCard icon='⏳' tone='orange' label='Pending' value={String(counts.Pending)} />
        <StatCard icon='✅' tone='green' label='Valid' value={String(counts.Valid)} />
        <StatCard icon='🚩' tone='red' label={t('Disalahgunakan', 'Flagged')} value={String(counts.Flagged)} />
      </div>

      <div className='mb-4'>
        <FilterBar>
          <FilterPill active={status === 'all'} onClick={() => setStatus('all')}>{t('Semua', 'All')}</FilterPill>
          <FilterPill active={status === 'Pending'} onClick={() => setStatus('Pending')}>Pending</FilterPill>
          <FilterPill active={status === 'Valid'} onClick={() => setStatus('Valid')}>Valid</FilterPill>
          <FilterPill active={status === 'Flagged'} onClick={() => setStatus('Flagged')}>{t('Disalahgunakan', 'Flagged')}</FilterPill>
        </FilterBar>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon='🆘' title={t('Belum ada SOS.', 'No SOS alerts yet.')} />
      ) : (
        <DataTable columns={[
          t('Waktu', 'Time'), t('Karyawan', 'Employee'), t('Kategori', 'Category'),
          { label: t('Video', 'Video'), align: 'center' }, { label: 'Status', align: 'center' }, { label: '', align: 'right' },
        ]}>
          {rows.map(a => (
            <Tr key={a.id} onClick={() => openDetail(a)}>
              <Td className='whitespace-nowrap text-xs text-gray-500'>{fmtDateTime(a.createdAt)}</Td>
              <Td>
                <span className='font-semibold text-gray-800'>{a.employeeName}</span>
                {flagCountFor(a.employeeId) > 0 && (
                  <span className='ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600'>🚩×{flagCountFor(a.employeeId)}</span>
                )}
              </Td>
              <Td className='text-sm text-gray-600'>{CATEGORY_ICON[a.category]} {a.category}</Td>
              <Td align='center'>{a.videoDataUrl ? <span title={formatBytes(a.videoSize)}>🎥</span> : <span className='text-gray-300'>—</span>}</Td>
              <Td align='center'><StatusBadge tone={STATUS_TONE[a.status]}>{a.status}</StatusBadge></Td>
              <Td align='right'><span className='text-xs font-semibold text-teal-700'>{t('Lihat', 'View')} →</span></Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {detail && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeDetail}>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-base font-bold text-gray-800'>{CATEGORY_ICON[detail.category]} {detail.category}</h3>
                <p className='text-xs text-gray-400'>{detail.employeeName} · {fmtDateTime(detail.createdAt)}</p>
              </div>
              <button onClick={closeDetail} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            {flagCountFor(detail.employeeId) > 0 && (
              <div className='mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700'>
                🚩 {t(`Karyawan ini pernah di-flag ${flagCountFor(detail.employeeId)}x sebelumnya.`, `This employee has been flagged ${flagCountFor(detail.employeeId)}x before.`)}
              </div>
            )}

            {detail.videoDataUrl ? (
              <FixedDurationVideo src={detail.videoDataUrl} controls className='aspect-video w-full rounded-xl bg-black' />
            ) : (
              <div className='flex items-center justify-center rounded-xl bg-gray-50 py-10 text-sm text-gray-400'>
                {t('Tidak ada video (kamera tidak tersedia saat dikirim).', 'No video (camera unavailable when sent).')}
              </div>
            )}

            <div className='mt-4 space-y-2 text-sm'>
              <p><span className='text-gray-400'>Status:</span> <StatusBadge tone={STATUS_TONE[detail.status]}>{detail.status}</StatusBadge></p>
              {detail.reviewedByName && (
                <p className='text-xs text-gray-400'>
                  {t('Ditinjau oleh', 'Reviewed by')} {detail.reviewedByName} · {fmtDateTime(detail.reviewedAt)}
                </p>
              )}
            </div>

            {isHR && detail.status === 'Pending' && (
              <div className='mt-4 space-y-3 border-t border-gray-100 pt-4'>
                <textarea rows={2} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                  placeholder={t('Catatan tinjauan (opsional)', 'Review note (optional)')}
                  className='w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100' />
                <div className='flex justify-end gap-2'>
                  <ActionButton variant='secondary' onClick={() => review('Flagged')} className='!text-red-600'>
                    🚩 {t('Disalahgunakan', 'Flag as misuse')}
                  </ActionButton>
                  <ActionButton onClick={() => review('Valid')} icon='✅'>{t('Tandai Valid', 'Mark Valid')}</ActionButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
