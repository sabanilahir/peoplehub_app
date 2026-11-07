'use client'
import { useState, useEffect } from 'react'
import { useEmergencySosLimitStore } from '@/store/emergencySosLimitStore'
import { useEmergencySosStore } from '@/store/emergencySosStore'
import { useT } from '@/store/languageStore'
import { PageHeader, StatCard, FormField, Input, ActionButton } from '@/components/ui'

export default function EmergencySosLimitPage() {
  const t = useT()
  const { enabled, maxPerWindow, windowMinutes, setConfig } = useEmergencySosLimitStore()
  const { alerts } = useEmergencySosStore()

  const [form, setForm] = useState({ enabled, maxPerWindow, windowMinutes })
  const [flash, setFlash] = useState('')
  const [now, setNow] = useState(() => Date.now())

  // Re-sync local form if the persisted config changes elsewhere (e.g. DB prime
  // resolving after this page already mounted with the pre-hydration default).
  useEffect(() => { setForm({ enabled, maxPerWindow, windowMinutes }) }, [enabled, maxPerWindow, windowMinutes])

  // Tick the "current window" stat live so an admin watching this page during
  // an actual incident sees the count/slots-remaining update in real time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const cutoff = now - form.windowMinutes * 60 * 1000
  const recentCount = alerts.filter(a => new Date(a.createdAt).getTime() >= cutoff).length
  const slotsLeft = Math.max(0, form.maxPerWindow - recentCount)

  const save = () => {
    setConfig({
      enabled: form.enabled,
      maxPerWindow: Math.max(1, Number(form.maxPerWindow) || 1),
      windowMinutes: Math.max(1, Number(form.windowMinutes) || 1),
    })
    setFlash(t('Pengaturan disimpan.', 'Settings saved.'))
    setTimeout(() => setFlash(''), 3000)
  }

  return (
    <div>
      <PageHeader
        icon='🆘'
        title={t('Batas SOS Serentak', 'Concurrent SOS Limit')}
        subtitle={t(
          'Cegah lonjakan Emergency SOS saat kejadian massal (mis. gempa) — batasi berapa banyak rekaman yang diterima dalam rentang waktu tertentu, sisanya dianggap sudah terwakilkan.',
          'Prevent an Emergency SOS flood during a mass event (e.g. an earthquake) — cap how many recordings are accepted within a time window; the rest are considered already represented.',
        )}
        actions={flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon='🆘' tone='brand' label={t('SOS Terkirim (Jendela Saat Ini)', 'SOS Sent (Current Window)')} value={`${recentCount} / ${form.maxPerWindow}`} />
        <StatCard icon='✅' tone={slotsLeft > 0 ? 'green' : 'red'} label={t('Slot Tersisa', 'Slots Remaining')} value={String(slotsLeft)} />
        <StatCard icon={form.enabled ? '🔒' : '🔓'} tone={form.enabled ? 'teal' : 'gray'} label='Status' value={form.enabled ? t('Aktif', 'Enabled') : t('Nonaktif', 'Disabled')} />
      </div>

      <div className='max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100'>
        <label className='mb-5 flex cursor-pointer items-center justify-between'>
          <div>
            <p className='text-sm font-semibold text-gray-800'>{t('Aktifkan Batas SOS Serentak', 'Enable Concurrent SOS Limit')}</p>
            <p className='mt-0.5 text-xs text-gray-400'>
              {t('Kalau nonaktif, semua karyawan bisa mengirim SOS tanpa batas.', 'When off, every employee can send an SOS without limit.')}
            </p>
          </div>
          <input type='checkbox' checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            className='h-5 w-9 shrink-0 accent-red-700' />
        </label>

        <div className='grid grid-cols-2 gap-4'>
          <FormField label={t('Maksimum Rekaman SOS', 'Max SOS Recordings')}
            hint={t('Jumlah SOS yang diterima per jendela waktu.', 'How many SOS accepted per time window.')}>
            <Input type='number' min={1} value={form.maxPerWindow} disabled={!form.enabled}
              onChange={e => setForm(f => ({ ...f, maxPerWindow: e.target.value }))} />
          </FormField>
          <FormField label={t('Rentang Waktu (menit)', 'Time Window (minutes)')}
            hint={t('Contoh: 15 menit = jam 09:00–09:15.', 'e.g. 15 minutes = 09:00–09:15.')}>
            <Input type='number' min={1} value={form.windowMinutes} disabled={!form.enabled}
              onChange={e => setForm(f => ({ ...f, windowMinutes: e.target.value }))} />
          </FormField>
        </div>

        <div className='mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-500'>
          {form.enabled
            ? t(
                `Contoh: maksimum ${form.maxPerWindow} rekaman diterima dalam ${form.windowMinutes} menit — setelah itu, karyawan yang mencoba mengirim SOS akan melihat pesan bahwa laporan sudah terwakilkan, sampai jendela waktu bergeser lagi.`,
                `Example: up to ${form.maxPerWindow} recordings are accepted within ${form.windowMinutes} minutes — after that, employees trying to send an SOS see a message that it's already been reported, until the window shifts again.`,
              )
            : t('Batas sedang nonaktif — semua SOS akan diterima.', 'Limit is currently disabled — every SOS will be accepted.')}
        </div>

        <div className='mt-6 flex justify-end'>
          <ActionButton onClick={save} icon='💾'>{t('Simpan', 'Save')}</ActionButton>
        </div>
      </div>
    </div>
  )
}
