'use client'
import { useRef, useState } from 'react'
import {
  useNotificationSettingsStore, CANDIDATE_APPLY_VARIABLES, resolveTemplate,
} from '@/store/notificationSettingsStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td,
  FormField, Input, ActionButton, StatusBadge, EmptyState,
} from '@/components/ui'

const SAMPLE_VALUES = Object.fromEntries(CANDIDATE_APPLY_VARIABLES.map(v => [v.key, v.sample]))

export default function NotificationSetupPage() {
  const t = useT()
  const { candidateApply, logs, setSubject, setBody, setActive } = useNotificationSettingsStore()
  const [saved, setSaved] = useState(false)
  const [viewLog, setViewLog] = useState(null)
  const bodyRef = useRef(null)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }

  // Insert {{variable}} at the textarea's current cursor position rather
  // than just appending, so building a template feels like a normal editor.
  const insertVariable = (key) => {
    const el = bodyRef.current
    const token = `{{${key}}}`
    if (!el) { setBody(candidateApply.body + token); flash(); return }
    const start = el.selectionStart ?? candidateApply.body.length
    const end = el.selectionEnd ?? candidateApply.body.length
    const next = candidateApply.body.slice(0, start) + token + candidateApply.body.slice(end)
    setBody(next)
    flash()
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length) })
  }

  return (
    <div>
      {saved && (
        <div className='fixed bottom-6 right-6 z-50 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg'>
          ✅ {t('Perubahan disimpan!', 'Changes saved!')}
        </div>
      )}

      <PageHeader
        icon='📧'
        title='Notification Setup'
        subtitle={t(
          'Atur subject, isi email, dan variabel notifikasi yang otomatis terkirim saat kandidat klik "Kirim Lamaran" di Career Site.',
          'Configure the subject, body, and variables for the notification sent automatically when a candidate clicks "Kirim Lamaran" on the Career Site.',
        )}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard tone='brand' icon='📧' label={t('Status', 'Status')} value={candidateApply.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')} />
        <StatCard tone='green' icon='✅' label={t('Total Terkirim', 'Total Sent')} value={String(logs.length)} />
        <StatCard tone='blue' icon='📌' label={t('Terhubung ke', 'Connected to')} value='Kirim Lamaran'
          hint={t('Tombol submit di Career Site apply page', 'Submit button on the Career Site apply page')} />
      </div>

      <SectionCard
        title={t('Event: Kandidat Melamar', 'Event: Candidate Applied')}
        icon='📧'
        subtitle={t('Trigger: klik tombol "Kirim Lamaran" pada /careers/apply', 'Trigger: clicking the "Kirim Lamaran" button on /careers/apply')}
        actions={
          <label className='flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600'>
            <input type='checkbox' checked={candidateApply.active}
              onChange={e => { setActive(e.target.checked); flash() }} className='h-4 w-4 accent-teal-700' />
            {t('Kirim email saat lamaran masuk', 'Send email when an application comes in')}
          </label>
        }
      >
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <div className='space-y-4'>
            <FormField label='Subject' required>
              <Input value={candidateApply.subject} onChange={e => { setSubject(e.target.value); flash() }} />
            </FormField>

            <FormField label={t('Isi Email', 'Email Body')} required>
              <textarea ref={bodyRef} rows={12} value={candidateApply.body}
                onChange={e => { setBody(e.target.value); flash() }}
                className='w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
            </FormField>

            <div>
              <p className='mb-2 text-xs font-semibold text-gray-600'>
                {t('Variabel — klik untuk sisipkan ke isi email', 'Variables — click to insert into the email body')}
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {CANDIDATE_APPLY_VARIABLES.map(v => (
                  <button key={v.key} type='button' onClick={() => insertVariable(v.key)}
                    className='rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-mono font-semibold text-teal-700 hover:bg-teal-100'
                    title={v.label}>
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-wide text-gray-400'>{t('Live Preview', 'Live Preview')}</p>
            <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
              <div className='mb-3 border-b border-gray-200 pb-3'>
                <p className='text-[11px] font-semibold text-gray-400'>{t('Kepada', 'To')}</p>
                <p className='text-sm text-gray-700'>{SAMPLE_VALUES.email}</p>
              </div>
              <div className='mb-3 border-b border-gray-200 pb-3'>
                <p className='text-[11px] font-semibold text-gray-400'>Subject</p>
                <p className='text-sm font-semibold text-gray-800'>{resolveTemplate(candidateApply.subject, SAMPLE_VALUES) || '—'}</p>
              </div>
              <p className='whitespace-pre-wrap text-sm text-gray-700'>{resolveTemplate(candidateApply.body, SAMPLE_VALUES) || '—'}</p>
            </div>
            <p className='mt-2 text-[11px] text-gray-400'>
              {t('Preview memakai data contoh — email sungguhan memakai data kandidat asli.', 'Preview uses sample data — the real email uses the actual candidate data.')}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('Riwayat Notifikasi Terkirim', 'Sent Notification History')} icon='📧' bodyClass='p-0' className='mt-6'>
        {logs.length === 0 ? (
          <div className='p-5'>
            <EmptyState icon='📧' title={t('Belum ada notifikasi terkirim.', 'No notifications sent yet.')}
              description={t('Akan muncul di sini setiap ada kandidat yang klik "Kirim Lamaran".', 'Will appear here every time a candidate clicks "Kirim Lamaran".')} />
          </div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0' columns={[
            t('Kepada', 'To'), t('Kandidat', 'Candidate'), 'Subject', 'Status', t('Waktu Kirim', 'Sent At'), { label: t('Aksi', 'Action'), align: 'right' },
          ]}>
            {logs.map(log => (
              <Tr key={log.id}>
                <Td className='text-xs text-gray-600'>{log.to}</Td>
                <Td className='text-sm font-semibold text-gray-800'>{log.candidateName}</Td>
                <Td className='max-w-xs truncate text-xs text-gray-500'>{log.subject}</Td>
                <Td>
                  {log.emailStatus === 'failed'
                    ? <StatusBadge tone='danger'>{t('Gagal', 'Failed')}</StatusBadge>
                    : log.emailStatus === 'sent'
                      ? <StatusBadge tone='success'>{t('Terkirim', 'Sent')}</StatusBadge>
                      : <span className='text-xs text-gray-300'>—</span>}
                </Td>
                <Td className='text-xs tabular-nums text-gray-400'>{new Date(log.sentAt).toLocaleString('id-ID')}</Td>
                <Td align='right'>
                  <button onClick={() => setViewLog(log)} className='text-xs font-semibold text-teal-700 hover:underline'>
                    {t('Lihat', 'View')}
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {viewLog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={() => setViewLog(null)}>
          <div className='w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-base font-bold text-gray-800'>{t('Detail Notifikasi', 'Notification Detail')}</h3>
              <button onClick={() => setViewLog(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-3 text-sm'>
              {viewLog.emailStatus && (
                <div>
                  <span className='text-xs font-semibold text-gray-400'>Status</span>
                  <p className='mt-0.5'>
                    {viewLog.emailStatus === 'failed'
                      ? <StatusBadge tone='danger'>{t('Gagal', 'Failed')}</StatusBadge>
                      : <StatusBadge tone='success'>{t('Terkirim', 'Sent')}</StatusBadge>}
                  </p>
                </div>
              )}
              {viewLog.emailStatus === 'failed' && viewLog.emailError && (
                <div><span className='text-xs font-semibold text-gray-400'>{t('Pesan Error', 'Error Message')}</span><p className='text-red-600'>{viewLog.emailError}</p></div>
              )}
              <div><span className='text-xs font-semibold text-gray-400'>{t('Kepada', 'To')}</span><p className='text-gray-800'>{viewLog.to}</p></div>
              <div><span className='text-xs font-semibold text-gray-400'>Subject</span><p className='font-semibold text-gray-800'>{viewLog.subject}</p></div>
              <div><span className='text-xs font-semibold text-gray-400'>{t('Isi Email', 'Body')}</span><p className='whitespace-pre-wrap text-gray-700'>{viewLog.body}</p></div>
              <div><span className='text-xs font-semibold text-gray-400'>{t('Waktu Kirim', 'Sent At')}</span><p className='text-gray-500'>{new Date(viewLog.sentAt).toLocaleString('id-ID')}</p></div>
            </div>
            <ActionButton className='mt-5 w-full' onClick={() => setViewLog(null)}>{t('Tutup', 'Close')}</ActionButton>
          </div>
        </div>
      )}
    </div>
  )
}
