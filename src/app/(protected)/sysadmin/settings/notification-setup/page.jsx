'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import {
  useNotificationSettingsStore,
  TEMPLATE_CATEGORIES,
  DEFAULT_TEMPLATES,
  resolveTemplate,
} from '@/store/notificationSettingsStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader,
  StatCard,
  SectionCard,
  DataTable,
  Tr,
  Td,
  FormField,
  Input,
  ActionButton,
  StatusBadge,
  EmptyState,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'

export default function NotificationSetupPage() {
  const t = useT()
  const {
    smtp,
    setSmtp,
    templates,
    setTemplate,
    resetTemplateToDefault,
    contractSettings,
    setContractSettings,
    logs,
    clearLogs,
  } = useNotificationSettingsStore()

  const [activeTab, setActiveTab] = useState('smtp') // 'smtp' | 'templates' | 'contracts' | 'logs'
  const [saved, setSaved] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ── Tab Template State ────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('contract_expiring_hr')
  const bodyTextareaRef = useRef(null)

  // ── Test Email State ──────────────────────────────────────────────────────────
  const [testEmailTo, setTestEmailTo] = useState('')
  const [isTestingSmtp, setIsTestingSmtp] = useState(false)
  const [testResult, setTestResult] = useState(null) // { success: boolean, message: string }

  // ── Contract Scan State ───────────────────────────────────────────────────────
  const [isScanningContracts, setIsScanningContracts] = useState(false)
  const [contractScanData, setContractScanData] = useState(null)

  // ── Log Modal State ───────────────────────────────────────────────────────────
  const [viewLog, setViewLog] = useState(null)

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Active Template Object
  const currentTemplate = templates[selectedTemplateKey] || DEFAULT_TEMPLATES[selectedTemplateKey] || DEFAULT_TEMPLATES.contract_expiring_hr

  // Filtered Templates by Category
  const filteredTemplates = useMemo(() => {
    return Object.values(templates).filter((tpl) => {
      if (selectedCategory === 'all') return true
      return tpl.category === selectedCategory
    })
  }, [templates, selectedCategory])

  // Sample values map for live preview
  const sampleValues = useMemo(() => {
    const map = {}
    if (currentTemplate?.variables) {
      currentTemplate.variables.forEach((v) => {
        map[v.key] = v.sample
      })
    }
    return map
  }, [currentTemplate])

  // Sisipkan variabel ke posisi kursor textarea
  const insertVariable = (varKey) => {
    const el = bodyTextareaRef.current
    const token = `{{${varKey}}}`
    const currentBody = currentTemplate.body || ''
    if (!el) {
      setTemplate(selectedTemplateKey, { body: currentBody + token })
      flashSaved()
      return
    }
    const start = el.selectionStart ?? currentBody.length
    const end = el.selectionEnd ?? currentBody.length
    const nextBody = currentBody.slice(0, start) + token + currentBody.slice(end)
    setTemplate(selectedTemplateKey, { body: nextBody })
    flashSaved()
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  // Handle Kirim Email Tes
  const handleSendTestEmail = async () => {
    if (!testEmailTo) {
      setTestResult({ success: false, message: 'Masukkan alamat email tujuan terlebih dahulu.' })
      return
    }

    setIsTestingSmtp(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailTo,
          smtpConfig: smtp,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setTestResult({ success: true, message: data.message })
      } else {
        setTestResult({ success: false, message: data.error || 'Uji coba SMTP gagal.' })
      }
    } catch (err) {
      setTestResult({ success: false, message: err?.message || 'Gagal menghubungi server tes email.' })
    } finally {
      setIsTestingSmtp(false)
    }
  }

  // Handle Scan Kontrak
  const handleRunContractScan = async () => {
    setIsScanningContracts(true)
    try {
      const res = await fetch('/api/cron/contract-expiry', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setContractScanData(data)
      } else {
        alert(data.error || 'Gagal menjalankan scan kontrak.')
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan saat menjalankan scan kontrak.')
    } finally {
      setIsScanningContracts(false)
    }
  }

  // Jalankan scan kontrak sekali saat tab kontrak dibuka
  useEffect(() => {
    if (activeTab === 'contracts' && !contractScanData) {
      handleRunContractScan()
    }
  }, [activeTab])

  return (
    <div className='pb-12'>
      {/* Toast Notifikasi Tersimpan */}
      {saved && (
        <div className='fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl animate-fade-in'>
          <span>✅</span>
          <span>{t('Perubahan berhasil disimpan!', 'Changes saved successfully!')}</span>
        </div>
      )}

      {/* Header Utama */}
      <PageHeader
        icon='📧'
        title='Email & Notification Hub'
        subtitle={t(
          'Konfigurasi server SMTP, kelola template notifikasi HTML interaktif untuk approval & kontrak kerja, serta pantau riwayat pengiriman email.',
          'Configure SMTP mail server, manage interactive HTML email templates for approvals & contracts, and monitor sent notification logs.'
        )}
      />

      {/* Stat Bar Ringkasan */}
      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <StatCard
          tone='brand'
          icon='⚙️'
          label={t('Server SMTP', 'SMTP Server')}
          value={smtp.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}
          hint={`${smtp.host || 'Belum diset'}:${smtp.port}`}
        />
        <StatCard
          tone='blue'
          icon='✉️'
          label={t('Template Terdaftar', 'Total Templates')}
          value={String(Object.keys(templates).length)}
          hint={t('12 jenis notifikasi otomatis', '12 automated notification types')}
        />
        <StatCard
          tone='amber'
          icon='📅'
          label={t('Peringatan Kontrak', 'Contract Alerts')}
          value={`${contractSettings.alertIntervals.length} Interval`}
          hint={`H-${contractSettings.alertIntervals.join(', H-')}`}
        />
        <StatCard
          tone='green'
          icon='📤'
          label={t('Riwayat Terkirim', 'Sent History')}
          value={String(logs.length)}
          hint={t('Log audit email keluar', 'Outbound email audit logs')}
        />
      </div>

      {/* Navigasi Tab Utama */}
      <div className='mb-6 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2'>
        {[
          { id: 'smtp', label: t('Server SMTP & Koneksi', 'SMTP Server & Connection'), icon: '⚙️' },
          { id: 'templates', label: t('Template Notifikasi & Live Preview', 'Notification Templates & Preview'), icon: '✉️' },
          { id: 'contracts', label: t('Otomasi Kontrak (PKWT)', 'Contract Expiry Automation'), icon: '📅' },
          { id: 'logs', label: t('Riwayat Pengiriman', 'Sent Logs'), icon: '📋' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: SERVER SMTP & KONEKSI
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Form Konfigurasi SMTP (2 Kolom) */}
          <div className='lg:col-span-2 space-y-6'>
            <SectionCard
              title={t('Konfigurasi Mail Server (SMTP)', 'Mail Server Configuration (SMTP)')}
              icon='⚙️'
              subtitle={t(
                'Kredensial server SMTP yang digunakan untuk mengirimkan seluruh email notifikasi, perizinan, dan peringatan kontrak.',
                'SMTP server credentials used to dispatch all notifications, approvals, and contract alerts.'
              )}
              actions={
                <label className='flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg'>
                  <input
                    type='checkbox'
                    checked={smtp.active}
                    onChange={(e) => {
                      setSmtp({ active: e.target.checked })
                      flashSaved()
                    }}
                    className='h-4 w-4 accent-blue-600 rounded'
                  />
                  <span>{t('Aktifkan Pengiriman Email', 'Enable Live Email Delivery')}</span>
                </label>
              }
            >
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField label='SMTP Host' required hint='e.g. mail.domain.com atau smtp.gmail.com'>
                  <Input
                    value={smtp.host}
                    onChange={(e) => {
                      setSmtp({ host: e.target.value })
                      flashSaved()
                    }}
                    placeholder='mail.perusahaan.com'
                  />
                </FormField>

                <div className='grid grid-cols-2 gap-2'>
                  <FormField label='Port' required hint='465 / 587'>
                    <Input
                      type='number'
                      value={smtp.port}
                      onChange={(e) => {
                        setSmtp({ port: Number(e.target.value) || 465 })
                        flashSaved()
                      }}
                      placeholder='465'
                    />
                  </FormField>

                  <div className='flex flex-col justify-end pb-1.5'>
                    <label className='flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100'>
                      <input
                        type='checkbox'
                        checked={smtp.secure}
                        onChange={(e) => {
                          setSmtp({ secure: e.target.checked })
                          flashSaved()
                        }}
                        className='h-4 w-4 accent-blue-600 rounded'
                      />
                      <span>SSL/TLS (465)</span>
                    </label>
                  </div>
                </div>

                <FormField label='SMTP Username / Email' required hint='Akun email pengirim'>
                  <Input
                    value={smtp.user}
                    onChange={(e) => {
                      setSmtp({ user: e.target.value })
                      flashSaved()
                    }}
                    placeholder='notification@perusahaan.com'
                  />
                </FormField>

                <FormField label='SMTP Password' required hint='Password atau App Password'>
                  <div className='relative'>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={smtp.pass}
                      onChange={(e) => {
                        setSmtp({ pass: e.target.value })
                        flashSaved()
                      }}
                      placeholder='••••••••••••'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1.5 py-0.5 rounded'
                    >
                      {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                </FormField>

                <FormField label='Nama Pengirim (From Name)' required hint='Nama identitas sistem'>
                  <Input
                    value={smtp.fromName}
                    onChange={(e) => {
                      setSmtp({ fromName: e.target.value })
                      flashSaved()
                    }}
                    placeholder='PeopleHub HRMS'
                  />
                </FormField>

                <FormField label='Email Pengirim (From Email)' required hint='Alamat email pengirim resmi'>
                  <Input
                    value={smtp.fromEmail}
                    onChange={(e) => {
                      setSmtp({ fromEmail: e.target.value })
                      flashSaved()
                    }}
                    placeholder='hr-noreply@perusahaan.com'
                  />
                </FormField>

                <div className='sm:col-span-2'>
                  <FormField label='Reply-To Email (Opsional)' hint='Email tujuan saat penerima mengklik Balas/Reply'>
                    <Input
                      value={smtp.replyTo}
                      onChange={(e) => {
                        setSmtp({ replyTo: e.target.value })
                        flashSaved()
                      }}
                      placeholder='hr.support@perusahaan.com'
                    />
                  </FormField>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Kotak Uji Koneksi Email Tes (1 Kolom) */}
          <div className='space-y-6'>
            <SectionCard
              title={t('Uji Koneksi & Kirim Email Tes', 'Test Connection & Send Test Email')}
              icon='🧪'
              subtitle={t(
                'Kirim email tes secara langsung untuk memastikan kredensial SMTP dan konektivitas mail server berjalan sempurna.',
                'Send a test email to verify SMTP credentials and mail server connectivity.'
              )}
            >
              <div className='space-y-4'>
                <FormField label={t('Kirim Email Tes Ke', 'Send Test Email To')} required>
                  <Input
                    type='email'
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder='nama.anda@email.com'
                  />
                </FormField>

                <button
                  type='button'
                  onClick={handleSendTestEmail}
                  disabled={isTestingSmtp}
                  className='w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 text-xs shadow-md transition disabled:opacity-50'
                >
                  {isTestingSmtp ? (
                    <>
                      <span className='animate-spin'>⏳</span>
                      <span>{t('Menghubungi SMTP Server...', 'Connecting to SMTP...')}</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>{t('Kirim Email Tes Sekarang', 'Send Test Email Now')}</span>
                    </>
                  )}
                </button>

                {/* Feedback Hasil Tes */}
                {testResult && (
                  <div
                    className={`rounded-xl p-3.5 text-xs ${
                      testResult.success
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    <div className='flex items-start gap-2'>
                      <span className='text-sm'>{testResult.success ? '✅' : '❌'}</span>
                      <div className='flex-1 leading-relaxed'>{testResult.message}</div>
                    </div>
                  </div>
                )}

                <div className='rounded-xl bg-gray-50 p-3.5 text-[11px] text-gray-500 border border-gray-100 space-y-1.5'>
                  <p className='font-bold text-gray-700 flex items-center gap-1'>
                    <span>💡</span>
                    <span>{t('Petunjuk SMTP VPS / Hosting:', 'SMTP Hosting Tips:')}</span>
                  </p>
                  <p>&bull; Gunakan <strong>Port 465</strong> dengan SSL/TLS aktif untuk cPanel / Google Workspace.</p>
                  <p>&bull; Jika menggunakan Gmail, buat <strong>App Password 16-digit</strong> di menu Google Security.</p>
                  <p>&bull; Pastikan port 465 atau 587 tidak diblokir oleh firewall server/VPS Anda.</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: TEMPLATE NOTIFIKASI & LIVE PREVIEW
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className='space-y-4'>
          {/* Filter Kategori Template */}
          <div className='flex flex-wrap items-center gap-1.5 bg-gray-100/70 p-1.5 rounded-2xl border border-gray-200'>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
            {/* Kolom 1: Daftar Template (3 Kolom) */}
            <div className='lg:col-span-3 space-y-2'>
              <p className='text-xs font-bold uppercase tracking-wider text-gray-400 px-1'>
                {t('Pilih Template', 'Select Template')} ({filteredTemplates.length})
              </p>
              <div className='space-y-1.5 max-h-[750px] overflow-y-auto pr-1'>
                {filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplateKey === tpl.key
                  return (
                    <button
                      key={tpl.key}
                      onClick={() => setSelectedTemplateKey(tpl.key)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-300'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600'>
                          {tpl.category}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tpl.active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          title={tpl.active ? 'Aktif' : 'Nonaktif'}
                        />
                      </div>
                      <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                        {tpl.title}
                      </p>
                      <p className='text-[11px] text-gray-400 line-clamp-1'>{tpl.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Kolom 2: Editor Template (5 Kolom) */}
            <div className='lg:col-span-5 space-y-4'>
              <SectionCard
                title={currentTemplate.title}
                icon='✏️'
                subtitle={currentTemplate.description}
                actions={
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      onClick={() => {
                        resetTemplateToDefault(selectedTemplateKey)
                        flashSaved()
                      }}
                      className='text-[11px] font-semibold text-gray-500 hover:text-red-600 underline'
                    >
                      {t('Reset ke Default', 'Reset to Default')}
                    </button>
                    <label className='flex cursor-pointer items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200'>
                      <input
                        type='checkbox'
                        checked={currentTemplate.active}
                        onChange={(e) => {
                          setTemplate(selectedTemplateKey, { active: e.target.checked })
                          flashSaved()
                        }}
                        className='h-3.5 w-3.5 accent-blue-600 rounded'
                      />
                      <span>{t('Aktif', 'Active')}</span>
                    </label>
                  </div>
                }
              >
                <div className='space-y-4'>
                  <FormField label='Subjek Email' required>
                    <Input
                      value={currentTemplate.subject}
                      onChange={(e) => {
                        setTemplate(selectedTemplateKey, { subject: e.target.value })
                        flashSaved()
                      }}
                    />
                  </FormField>

                  <div className='grid grid-cols-2 gap-3'>
                    <FormField label='Teks Tombol CTA' hint='Tombol aksi utama'>
                      <Input
                        value={currentTemplate.ctaText || ''}
                        onChange={(e) => {
                          setTemplate(selectedTemplateKey, { ctaText: e.target.value })
                          flashSaved()
                        }}
                        placeholder='Buka Portal'
                      />
                    </FormField>

                    <FormField label='Warna Aksen Kartu' hint='Warna tema visual'>
                      <div className='flex items-center gap-2 mt-1'>
                        <input
                          type='color'
                          value={currentTemplate.accentColor || '#2563eb'}
                          onChange={(e) => {
                            setTemplate(selectedTemplateKey, { accentColor: e.target.value })
                            flashSaved()
                          }}
                          className='h-9 w-12 rounded cursor-pointer border border-gray-200 p-0.5'
                        />
                        <span className='font-mono text-xs text-gray-600 uppercase font-semibold'>
                          {currentTemplate.accentColor || '#2563eb'}
                        </span>
                      </div>
                    </FormField>
                  </div>

                  <FormField label='Isi Pesan (Email Body)' required>
                    <textarea
                      ref={bodyTextareaRef}
                      rows={10}
                      value={currentTemplate.body}
                      onChange={(e) => {
                        setTemplate(selectedTemplateKey, { body: e.target.value })
                        flashSaved()
                      }}
                      className='w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-mono leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition'
                    />
                  </FormField>

                  {/* Variabel yang tersedia */}
                  <div>
                    <p className='mb-2 text-xs font-bold text-gray-600 flex items-center gap-1'>
                      <span>⚡</span>
                      <span>{t('Variabel — klik chip untuk menyisipkan ke kursor:', 'Variables — click chip to insert at cursor:')}</span>
                    </p>
                    <div className='flex flex-wrap gap-1.5'>
                      {currentTemplate.variables?.map((v) => (
                        <button
                          key={v.key}
                          type='button'
                          onClick={() => insertVariable(v.key)}
                          className='rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2 py-1 text-[11px] font-mono font-semibold text-blue-700 transition'
                          title={`${v.label} (Contoh: ${v.sample})`}
                        >
                          {`{{${v.key}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Kolom 3: Live Preview HTML Responsif (4 Kolom) */}
            <div className='lg:col-span-4 space-y-2'>
              <p className='text-xs font-bold uppercase tracking-wider text-gray-400 px-1 flex items-center justify-between'>
                <span>{t('Live HTML Preview', 'Live HTML Preview')}</span>
                <span className='text-[10px] text-gray-400 lowercase font-normal'>(data simulasi)</span>
              </p>

              {/* Box Preview Meniru Tampilan Email Client */}
              <div className='rounded-2xl border border-gray-300 bg-slate-100 p-3 shadow-inner'>
                <div className='rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm'>
                  {/* Accent Top Bar */}
                  <div
                    className='h-1.5 w-full'
                    style={{ backgroundColor: currentTemplate.accentColor || '#2563eb' }}
                  />

                  {/* Email Header */}
                  <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between'>
                    <div className='flex items-center gap-1.5'>
                      <div
                        className='w-5 h-5 rounded-md text-white font-black text-[10px] flex items-center justify-center'
                        style={{ backgroundColor: currentTemplate.accentColor || '#2563eb' }}
                      >
                        P
                      </div>
                      <span className='font-bold text-xs text-gray-800'>PeopleHub HRMS</span>
                    </div>
                    <span className='text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500'>
                      HR Notification
                    </span>
                  </div>

                  {/* Subject Title */}
                  <div className='p-4 pb-2'>
                    <h3 className='text-sm font-bold text-gray-900 leading-snug'>
                      {resolveTemplate(currentTemplate.subject, sampleValues)}
                    </h3>
                  </div>

                  {/* Body Text */}
                  <div className='px-4 py-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed'>
                    {resolveTemplate(currentTemplate.body, sampleValues)}
                  </div>

                  {/* CTA Button */}
                  {currentTemplate.ctaText && (
                    <div className='px-4 py-4 text-center'>
                      <span
                        className='inline-block px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm'
                        style={{ backgroundColor: currentTemplate.accentColor || '#2563eb' }}
                      >
                        {currentTemplate.ctaText} &rarr;
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className='px-4 py-3 bg-gray-50 border-t border-gray-100 text-center text-[10px] text-gray-400'>
                    <p className='font-semibold text-gray-600'>PeopleHub &bull; Human Capital Management</p>
                    <p className='mt-0.5 leading-tight'>Email otomatis. Harap tidak membalas langsung.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: OTOMASI KONTRAK (PKWT)
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'contracts' && (
        <div className='space-y-6'>
          {/* Pengaturan Parameter Peringatan */}
          <SectionCard
            title={t('Pengaturan Parameter Peringatan Kontrak (PKWT)', 'Contract Expiry Alert Settings')}
            icon='📅'
            subtitle={t(
              'Sistem secara otomatis memindai seluruh karyawan PKWT aktif dan mengirimkan notifikasi pada interval hari sebelum masa kontrak berakhir.',
              'The system automatically scans all active contract employees and dispatches alerts at specified intervals before contract end date.'
            )}
            actions={
              <button
                type='button'
                onClick={handleRunContractScan}
                disabled={isScanningContracts}
                className='flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-1.5 shadow transition disabled:opacity-50'
              >
                <span>{isScanningContracts ? '⏳' : '⚡'}</span>
                <span>{isScanningContracts ? 'Sedang Memindai...' : 'Jalankan Pengecekan Sekarang'}</span>
              </button>
            }
          >
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <p className='text-xs font-bold text-gray-700 mb-2'>
                  {t('Interval Hari Peringatan (Sebelum Kontrak Berakhir):', 'Alert Day Intervals (Before Expiry):')}
                </p>
                <div className='flex flex-wrap gap-3'>
                  {[90, 60, 45, 30, 14, 7, 3, 1].map((days) => {
                    const isChecked = contractSettings.alertIntervals.includes(days)
                    return (
                      <label
                        key={days}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type='checkbox'
                          checked={isChecked}
                          onChange={(e) => {
                            let next = [...contractSettings.alertIntervals]
                            if (e.target.checked) {
                              next.push(days)
                            } else {
                              next = next.filter((d) => d !== days)
                            }
                            next.sort((a, b) => b - a)
                            setContractSettings({ alertIntervals: next })
                            flashSaved()
                          }}
                          className='h-3.5 w-3.5 accent-amber-600 rounded'
                        />
                        <span>H-{days} Hari</span>
                      </label>
                    )
                  })}
                </div>
                <p className='mt-2 text-[11px] text-gray-400'>
                  {t(
                    'Setiap karyawan kontrak yang sisa harinya tepat jatuh pada hari yang dicentang akan otomatis dikirimi email.',
                    'Employees whose days remaining match any checked day will automatically trigger an email notification.'
                  )}
                </p>
              </div>

              <div className='space-y-4'>
                <FormField
                  label={t('Email Penerima Tim HR', 'HR Team Recipient Emails')}
                  required
                  hint='Bisa jamak, pisahkan dengan koma'
                >
                  <Input
                    value={contractSettings.hrEmails}
                    onChange={(e) => {
                      setContractSettings({ hrEmails: e.target.value })
                      flashSaved()
                    }}
                    placeholder='hr@perusahaan.com, talent@perusahaan.com'
                  />
                </FormField>

                <div className='space-y-2 pt-1'>
                  <label className='flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={contractSettings.notifyManager}
                      onChange={(e) => {
                        setContractSettings({ notifyManager: e.target.checked })
                        flashSaved()
                      }}
                      className='h-4 w-4 accent-amber-600 rounded'
                    />
                    <span>{t('Otomatis kirim salinan peringatan ke Atasan Langsung (Manager)', 'Automatically send alert copy to direct manager')}</span>
                  </label>

                  <label className='flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={contractSettings.notifyEmployee}
                      onChange={(e) => {
                        setContractSettings({ notifyEmployee: e.target.checked })
                        flashSaved()
                      }}
                      className='h-4 w-4 accent-amber-600 rounded'
                    />
                    <span>{t('Kirim pemberitahuan ke Karyawan saat sisa waktu <= 14 hari', 'Send notification to employee when days remaining <= 14 days')}</span>
                  </label>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Tabel Hasil Pengecekan Terakhir */}
          <SectionCard
            title={t('Daftar Karyawan Kontrak Mendekati Masa Berakhir', 'Contract Employees Approaching Expiry')}
            icon='👥'
            subtitle={
              contractScanData
                ? `Hasil pemindaian terakhir (${contractScanData.scanDate}): ${contractScanData.expiringWithinScopeCount} karyawan dipantau.`
                : 'Memuat data pemindaian...'
            }
            bodyClass='p-0'
          >
            {isScanningContracts ? (
              <div className='p-8 text-center text-xs text-gray-500'>
                <span className='animate-spin inline-block mr-2'>⏳</span>
                <span>Memindai data kontrak karyawan dari database...</span>
              </div>
            ) : !contractScanData || contractScanData.employees.length === 0 ? (
              <div className='p-8'>
                <EmptyState
                  icon='🎉'
                  title={t('Tidak ada kontrak yang mendekati masa habis.', 'No contracts approaching expiry.')}
                  description={t('Semua karyawan kontrak masih memiliki masa berlaku panjang.', 'All contract employees are well within their active contract duration.')}
                />
              </div>
            ) : (
              <DataTable
                className='rounded-none shadow-none ring-0'
                columns={[
                  t('Karyawan', 'Employee'),
                  t('Departemen & Jabatan', 'Dept & Position'),
                  t('Tipe Kontrak', 'Contract Type'),
                  t('Tgl Berakhir', 'End Date'),
                  t('Sisa Waktu', 'Days Remaining'),
                  t('Status Peringatan', 'Alert Status'),
                  { label: t('Aksi', 'Action'), align: 'right' },
                ]}
              >
                {contractScanData.employees.map((emp) => {
                  const days = emp.daysRemaining
                  const badgeTone = days <= 7 ? 'danger' : days <= 30 ? 'warning' : 'info'

                  return (
                    <Tr key={emp.employeeId}>
                      <Td>
                        <span className='font-bold text-gray-900'>{emp.name}</span>
                        <span className='block text-[11px] text-gray-400'>EMP-{emp.employeeId}</span>
                      </Td>
                      <Td>
                        <span className='text-xs text-gray-800'>{emp.department}</span>
                        <span className='block text-[11px] text-gray-500'>{emp.position}</span>
                      </Td>
                      <Td className='text-xs text-gray-600'>{emp.employmentType}</Td>
                      <Td className='text-xs font-semibold text-gray-800 font-mono'>{emp.endDate}</Td>
                      <Td>
                        <StatusBadge tone={badgeTone}>
                          {days === 0 ? 'Hari Ini' : `${days} Hari Lagi`}
                        </StatusBadge>
                      </Td>
                      <Td>
                        {emp.isAlertDay ? (
                          <span className='inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200'>
                            <span>🔔</span>
                            <span>Hari Peringatan (H-{days})</span>
                          </span>
                        ) : (
                          <span className='text-[11px] text-gray-400'>Dalam Pemantauan</span>
                        )}
                      </Td>
                      <Td align='right'>
                        <a
                          href={`/hr/employee/personnel-action/extend-contract?empId=${emp.employeeId}`}
                          className='inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline'
                        >
                          <span>Perpanjang / Terminate</span>
                          <span>&rarr;</span>
                        </a>
                      </Td>
                    </Tr>
                  )
                })}
              </DataTable>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 4: RIWAYAT PENGIRIMAN (SENT LOGS)
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <SectionCard
          title={t('Riwayat Notifikasi Terkirim', 'Sent Notification History')}
          icon='📋'
          subtitle={t('Daftar riwayat lengkap seluruh email notifikasi yang dikirimkan oleh sistem PeopleHub.', 'Complete audit history of all notification emails dispatched by PeopleHub.')}
          actions={
            logs.length > 0 && (
              <button
                type='button'
                onClick={() => {
                  if (confirm(t('Apakah Anda yakin ingin menghapus seluruh log?', 'Are you sure you want to clear all logs?'))) {
                    clearLogs()
                  }
                }}
                className='text-xs font-semibold text-red-600 hover:underline'
              >
                {t('Bersihkan Riwayat', 'Clear Logs')}
              </button>
            )
          }
          bodyClass='p-0'
        >
          {logs.length === 0 ? (
            <div className='p-8'>
              <EmptyState
                icon='📧'
                title={t('Belum ada riwayat email terkirim.', 'No sent email history yet.')}
                description={t('Semua email tes, perizinan cuti/lembur, dan peringatan kontrak akan otomatis tercatat di sini.', 'All test emails, leave/overtime notifications, and contract alerts will be recorded here.')}
              />
            </div>
          ) : (
            <DataTable
              className='rounded-none shadow-none ring-0'
              columns={[
                t('Kepada (To)', 'To'),
                t('Event / Jenis', 'Event Type'),
                'Subjek Email',
                'Status',
                t('Waktu Pengiriman', 'Sent At'),
                { label: t('Aksi', 'Action'), align: 'right' },
              ]}
            >
              {logs.map((log) => (
                <Tr key={log.id}>
                  <Td className='text-xs font-medium text-gray-800 max-w-[180px] truncate'>{log.to}</Td>
                  <Td>
                    <span className='text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono'>
                      {log.eventKey || 'general'}
                    </span>
                  </Td>
                  <Td className='max-w-xs truncate text-xs text-gray-600'>{log.subject}</Td>
                  <Td>
                    {log.status === 'failed' ? (
                      <StatusBadge tone='danger'>{t('Gagal', 'Failed')}</StatusBadge>
                    ) : log.status === 'sent' ? (
                      <StatusBadge tone='success'>{t('Terkirim', 'Sent')}</StatusBadge>
                    ) : log.status === 'skipped' ? (
                      <StatusBadge tone='warning'>{t('Dilewati (Paused)', 'Skipped')}</StatusBadge>
                    ) : (
                      <span className='text-xs text-gray-400'>—</span>
                    )}
                  </Td>
                  <Td className='text-xs tabular-nums text-gray-400'>
                    {new Date(log.sentAt).toLocaleString('id-ID')}
                  </Td>
                  <Td align='right'>
                    <button
                      onClick={() => setViewLog(log)}
                      className='text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline'
                    >
                      {t('Lihat Detail', 'View Detail')}
                    </button>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL DETAIL LOG
      ───────────────────────────────────────────────────────────────────────── */}
      {viewLog && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs'
          onClick={() => setViewLog(null)}
        >
          <div
            className='w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start justify-between border-b pb-3'>
              <div>
                <h3 className='text-base font-bold text-gray-900'>{t('Detail Notifikasi Email', 'Email Notification Detail')}</h3>
                <p className='text-xs text-gray-400'>ID Log: {viewLog.id}</p>
              </div>
              <button
                onClick={() => setViewLog(null)}
                className='text-2xl font-bold leading-none text-gray-400 hover:text-gray-600'
              >
                &times;
              </button>
            </div>

            <div className='space-y-3 text-xs'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-gray-400 font-semibold'>{t('Status Pengiriman', 'Status')}:</span>
                  <div className='mt-0.5'>
                    {viewLog.status === 'failed' ? (
                      <StatusBadge tone='danger'>{t('Gagal', 'Failed')}</StatusBadge>
                    ) : (
                      <StatusBadge tone='success'>{t('Terkirim', 'Sent')}</StatusBadge>
                    )}
                  </div>
                </div>
                <div>
                  <span className='text-gray-400 font-semibold'>{t('Waktu', 'Sent At')}:</span>
                  <p className='text-gray-700 font-mono mt-0.5'>{new Date(viewLog.sentAt).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {viewLog.error && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-xl'>
                  <span className='font-bold text-red-800'>{t('Pesan Kesalahan:', 'Error Message:')}</span>
                  <p className='text-red-700 mt-0.5 leading-relaxed'>{viewLog.error}</p>
                </div>
              )}

              <div>
                <span className='text-gray-400 font-semibold'>{t('Kepada (To)', 'To')}:</span>
                <p className='text-gray-800 font-medium font-mono'>{viewLog.to}</p>
              </div>

              <div>
                <span className='text-gray-400 font-semibold'>Subjek Email:</span>
                <p className='text-gray-900 font-bold'>{viewLog.subject}</p>
              </div>

              {viewLog.messageId && (
                <div>
                  <span className='text-gray-400 font-semibold'>Message-ID:</span>
                  <p className='text-gray-500 font-mono break-all'>{viewLog.messageId}</p>
                </div>
              )}
            </div>

            <div className='pt-2'>
              <ActionButton className='w-full' onClick={() => setViewLog(null)}>
                {t('Tutup', 'Close')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
