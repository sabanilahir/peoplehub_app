'use client'
import { useState, useEffect } from 'react'
import { useGenAiSettingsStore, GEN_AI_PROVIDERS } from '@/store/genAiSettingsStore'
import { useT } from '@/store/languageStore'
import { PageHeader, StatCard, FormField, Input, Select, ActionButton } from '@/components/ui'

const MODE_INFO = (t) => [
  {
    key: 'off', icon: '🚫',
    title: t('Tanpa Gen AI', 'No Gen AI'),
    desc: t('Fitur AI (mis. generate deskripsi pekerjaan) disembunyikan sepenuhnya.',
            'AI features (e.g. job description generation) are hidden entirely.'),
  },
  {
    key: 'byok', icon: '🔑',
    title: t('Koneksi Sendiri (BYOK)', 'Bring Your Own Key'),
    desc: t('Customer pakai API key & provider LLM mereka sendiri — biaya penggunaan langsung ke akun mereka, bukan ke Rans PeopleHub.',
            "Customer uses their own LLM API key & provider — usage cost goes straight to their own account, not Rans PeopleHub's."),
  },
  {
    key: 'embedded', icon: '⚡',
    title: t('Disediakan Platform (Berbayar)', 'Platform-Provided (Billed)'),
    desc: t('Pakai LLM milik Rans PeopleHub — penggunaan dihitung sebagai kredit dan dikenakan biaya ke customer. Sumber pendapatan tambahan.',
            "Uses Rans PeopleHub's own LLM — usage is metered as credits and billed to the customer. An extra Rans PeopleHub revenue line."),
  },
]

export default function GenAiSettingsPage() {
  const t = useT()
  const {
    mode, provider, apiKey, model, creditsLimit, creditsUsed,
    setConfig, resetUsage,
  } = useGenAiSettingsStore()

  const [form, setForm] = useState({ mode, provider, apiKey, model, creditsLimit })
  const [showKey, setShowKey] = useState(false)
  const [flash, setFlash] = useState('')

  // Re-sync local form if the persisted config changes elsewhere (e.g. DB
  // prime resolving after this page already mounted with the pre-hydration
  // default).
  useEffect(() => {
    setForm({ mode, provider, apiKey, model, creditsLimit })
  }, [mode, provider, apiKey, model, creditsLimit])

  const save = () => {
    setConfig({
      mode: form.mode,
      provider: form.provider,
      apiKey: form.apiKey.trim(),
      model: form.model.trim(),
      creditsLimit: Math.max(1, Number(form.creditsLimit) || 1),
    })
    setFlash(t('Pengaturan disimpan.', 'Settings saved.'))
    setTimeout(() => setFlash(''), 3000)
  }

  const maskedKey = form.apiKey ? `${form.apiKey.slice(0, 6)}${'•'.repeat(Math.max(4, form.apiKey.length - 10))}${form.apiKey.slice(-4)}` : ''
  const creditsPct = Math.min(100, Math.round((creditsUsed / Math.max(1, creditsLimit)) * 100))

  return (
    <div>
      <PageHeader
        icon='✨'
        title={t('Konfigurasi Gen AI', 'Gen AI Configuration')}
        subtitle={t(
          'Atur bagaimana fitur AI generatif (mis. generate deskripsi pekerjaan) bekerja untuk instance ini — dimatikan, pakai koneksi customer sendiri, atau disediakan & ditagih oleh Rans PeopleHub.',
          'Control how generative AI features (e.g. job description generation) work for this instance — off, customer-provided connector, or Rans PeopleHub-provided & billed.',
        )}
        actions={flash && <span className='rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>{flash}</span>}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon='✨' tone='brand'
          label={t('Mode Aktif', 'Active Mode')}
          value={MODE_INFO(t).find(m => m.key === mode)?.title || '—'} />
        <StatCard icon={mode === 'off' ? '🔓' : '🔒'} tone={mode === 'off' ? 'gray' : 'teal'}
          label='Status' value={mode === 'off' ? t('Nonaktif', 'Disabled') : t('Aktif', 'Enabled')} />
        {mode === 'embedded' ? (
          <StatCard icon='⚡' tone={creditsPct >= 90 ? 'red' : 'orange'}
            label={t('Kredit Terpakai', 'Credits Used')} value={`${creditsUsed} / ${creditsLimit}`} />
        ) : (
          <StatCard icon='🔑' tone='blue'
            label={t('Provider', 'Provider')} value={mode === 'byok' ? (form.provider || '—') : '—'} />
        )}
      </div>

      {/* Mode selector */}
      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {MODE_INFO(t).map(m => (
          <button key={m.key} type='button' onClick={() => setForm(f => ({ ...f, mode: m.key }))}
            className={`rounded-2xl p-5 text-left shadow-sm ring-1 transition ${
              form.mode === m.key ? 'bg-white ring-2 ring-teal-500' : 'bg-white ring-gray-100 hover:ring-gray-200'}`}>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-2xl'>{m.icon}</span>
              {form.mode === m.key && (
                <span className='rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700'>
                  {t('DIPILIH', 'SELECTED')}
                </span>
              )}
            </div>
            <p className='text-sm font-bold text-gray-800'>{m.title}</p>
            <p className='mt-1 text-xs leading-relaxed text-gray-500'>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* BYOK connector form */}
      {form.mode === 'byok' && (
        <div className='mb-6 max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100'>
          <h3 className='mb-4 text-sm font-bold text-gray-800'>{t('Koneksi LLM Customer', "Customer's LLM Connector")}</h3>
          <div className='space-y-4'>
            <FormField label={t('Provider', 'Provider')}>
              <Select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                {GEN_AI_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label='API Key' hint={t('Disimpan terenkripsi di server — tidak pernah dikirim ke browser client lain.', "Stored server-side — never sent to any other client's browser.")}>
              <div className='relative'>
                <Input type={showKey ? 'text' : 'password'} value={form.apiKey}
                  placeholder='sk-ant-...'
                  onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  className='pr-16' />
                <button type='button' onClick={() => setShowKey(v => !v)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600'>
                  {showKey ? t('Sembunyikan', 'Hide') : t('Lihat', 'Show')}
                </button>
              </div>
              {!showKey && form.apiKey && (
                <p className='mt-1 font-mono text-xs text-gray-400'>{maskedKey}</p>
              )}
            </FormField>
            <FormField label={t('Model', 'Model')} hint={t('Contoh: claude-sonnet-5, gpt-4o.', 'e.g. claude-sonnet-5, gpt-4o.')}>
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </FormField>
          </div>
        </div>
      )}

      {/* Embedded / billed usage */}
      {form.mode === 'embedded' && (
        <div className='mb-6 max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100'>
          <h3 className='mb-1 text-sm font-bold text-gray-800'>{t('Kuota & Penagihan', 'Quota & Billing')}</h3>
          <p className='mb-4 text-xs text-gray-400'>
            {t('Placeholder — penghitungan kredit real-time & integrasi penagihan sesungguhnya (Stripe, dsb.) menyusul saat multi-tenant sudah siap.',
               'Placeholder — real-time credit metering & actual billing integration (Stripe, etc.) follow once multi-tenancy is in place.')}
          </p>
          <FormField label={t('Batas Kredit per Bulan', 'Monthly Credit Limit')}
            hint={t('1 kredit ≈ 1 kali generate.', '1 credit ≈ 1 generation call.')}>
            <Input type='number' min={1} value={form.creditsLimit}
              onChange={e => setForm(f => ({ ...f, creditsLimit: e.target.value }))} />
          </FormField>
          <div className='mt-4'>
            <div className='mb-1.5 flex items-center justify-between text-xs'>
              <span className='text-gray-500'>{t('Terpakai bulan ini', 'Used this month')}</span>
              <span className='font-semibold text-gray-700'>{creditsUsed} / {creditsLimit}</span>
            </div>
            <div className='h-2 w-full overflow-hidden rounded-full bg-gray-100'>
              <div className='h-full rounded-full transition-all'
                style={{ width: `${creditsPct}%`, background: creditsPct >= 90 ? '#dc2626' : 'linear-gradient(90deg,#052B52,#039299)' }} />
            </div>
          </div>
          <div className='mt-4 flex justify-end'>
            <ActionButton variant='secondary' size='sm' onClick={resetUsage}>
              {t('Reset Penggunaan Bulan Ini', "Reset This Month's Usage")}
            </ActionButton>
          </div>
        </div>
      )}

      <div className='flex max-w-lg justify-end'>
        <ActionButton onClick={save} icon='💾'>{t('Simpan', 'Save')}</ActionButton>
      </div>
    </div>
  )
}
