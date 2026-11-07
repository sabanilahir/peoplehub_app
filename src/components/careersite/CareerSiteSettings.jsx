'use client'
import Icon from '@/components/ui/Icon'
import { useRef, useState } from 'react'
import { useBrandingStore, BG_CONSTRAINTS as C } from '@/store/brandingStore'
import { useT } from '@/store/languageStore'

const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

function BannerUploadZone({ current, label, hint, onUpload, onRemove }) {
  const [dragging, setDragging] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef()

  const validate = (file) => {
    setErr(null)
    if (!C.acceptedTypes.includes(file.type))
      return setErr(`Tipe file tidak didukung. Gunakan: ${C.acceptedExt}`)
    if (file.size > C.maxSizeBytes)
      return setErr(`Ukuran file melebihi ${C.maxSizeMB} MB.`)

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width > C.maxWidth || img.height > C.maxHeight) {
        setErr(`Dimensi terlalu besar. Maksimal ${C.maxWidth}×${C.maxHeight} px.`)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => onUpload(e.target.result)
      reader.readAsDataURL(file)
    }
    img.src = url
  }

  const handleFile = (file) => { if (file) validate(file) }

  return (
    <div className='rounded-xl bg-white p-6 shadow-sm'>
      <h2 className='mb-1 text-sm font-bold text-gray-700'>{label}</h2>
      <p className='mb-4 text-xs text-gray-400'>{hint}</p>

      <div className='mb-4 flex flex-wrap gap-2'>
        {[`Maks. ${C.maxWidth}×${C.maxHeight} px`, `Maks. ${C.maxSizeMB} MB`, C.acceptedExt].map(x => (
          <span key={x} className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500'>{x}</span>
        ))}
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current.click()}
        className={`relative flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed transition ${
          dragging ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'}`}
      >
        {current ? (
          <img src={current} alt='' className='absolute inset-0 h-full w-full object-cover' />
        ) : (
          <>
            <span className='text-3xl'><Icon e='🖼️' size={18} /></span>
            <p className='text-xs font-semibold text-gray-600'>Klik atau drag & drop</p>
            <p className='text-xs text-gray-400'>{C.acceptedExt} · maks. {C.maxSizeMB} MB</p>
          </>
        )}
        <input ref={fileRef} type='file' accept={C.acceptedTypes.join(',')} className='hidden'
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {current && (
        <button onClick={onRemove} className='mt-3 text-xs font-semibold text-red-500 hover:text-red-700'>
          <Icon e='🗑️' size={14} className='inline align-[-2px]' /> Hapus Banner
        </button>
      )}

      {err && (
        <div className='mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600'>
          <Icon e='⚠️' size={14} className='inline align-[-2px]' /> {err}
        </div>
      )}
    </div>
  )
}

// Shared by two menu entries — System Admin > Branding > Career Site, and
// HR Administration > Recruitment > Career Site Setup — since recruiters who
// actually maintain job postings don't necessarily have System Admin access,
// but the underlying settings (all in brandingStore) are the same either way.
export default function CareerSiteSettings() {
  const t = useT()
  const {
    careerHeroImage, careerHeroTitle, careerHeroSubtitle,
    careerFooterImage, careerFooterText, careerNavLinks,
    setCareerHeroImage, removeCareerHeroImage, setCareerHeroTitle, setCareerHeroSubtitle,
    setCareerFooterImage, removeCareerFooterImage, setCareerFooterText,
    addCareerNavLink, updateCareerNavLink, deleteCareerNavLink, moveCareerNavLink,
  } = useBrandingStore()

  const [saved, setSaved] = useState(false)
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }

  const [linkForm, setLinkForm] = useState({ label: '', url: '' })
  const addLink = () => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) return
    addCareerNavLink({ label: linkForm.label.trim(), url: linkForm.url.trim() })
    setLinkForm({ label: '', url: '' })
    flash()
  }

  return (
    <div>
      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <h1 className='mb-1 text-2xl font-bold text-gray-800'>Career Site</h1>
          <p className='text-sm text-gray-500'>Atur banner header, banner footer, dan navigation link di halaman Karir publik.</p>
        </div>
        <a href='/careers' target='_blank' rel='noopener noreferrer'
          className='flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90'
          style={{ background: BRAND }}>
          {t('Buka Career Site ↗', 'Open Career Site ↗')}
        </a>
      </div>

      {saved && (
        <div className='fixed bottom-6 right-6 z-50 animate-bounce rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg'>
          <Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Perubahan disimpan!', 'Changes saved!')}
        </div>
      )}

      <div className='flex flex-col gap-6'>

        {/* ── Hero / Header Banner ─────────────────────────────────── */}
        <BannerUploadZone
          label={t('Banner Header (Hero)', 'Header Banner (Hero)')}
          hint={t('Gambar latar di bagian atas halaman Karir. Kosongkan untuk memakai gradient warna brand.',
                   'Background image at the top of the Career page. Leave empty to use the brand gradient.')}
          current={careerHeroImage}
          onUpload={(d) => { setCareerHeroImage(d); flash() }}
          onRemove={() => { removeCareerHeroImage(); flash() }}
        />

        <div className='rounded-xl bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-sm font-bold text-gray-700'>{t('Teks Hero', 'Hero Text')}</h2>
          <div className='space-y-4'>
            <div>
              <label className='mb-1.5 block text-xs font-semibold text-gray-600'>{t('Judul', 'Title')}</label>
              <input value={careerHeroTitle} onChange={e => { setCareerHeroTitle(e.target.value); flash() }}
                className='w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
            </div>
            <div>
              <label className='mb-1.5 block text-xs font-semibold text-gray-600'>{t('Subjudul', 'Subtitle')}</label>
              <textarea rows={2} value={careerHeroSubtitle} onChange={e => { setCareerHeroSubtitle(e.target.value); flash() }}
                className='w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
            </div>
          </div>
        </div>

        {/* ── Navigation Links ─────────────────────────────────────── */}
        <div className='rounded-xl bg-white p-6 shadow-sm'>
          <h2 className='mb-1 text-sm font-bold text-gray-700'>{t('Navigation Link', 'Navigation Links')}</h2>
          <p className='mb-4 text-xs text-gray-400'>
            {t('Ditampilkan di navigation bar atas dan footer halaman Karir. URL diawali "http" akan dibuka di tab baru.',
               'Shown in the top nav bar and footer of the Career page. A URL starting with "http" opens in a new tab.')}
          </p>

          {careerNavLinks.length > 0 && (
            <div className='mb-4 space-y-2'>
              {careerNavLinks.map((link, i) => (
                <div key={link.id} className='flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2'>
                  <div className='flex flex-col gap-0.5'>
                    <button onClick={() => moveCareerNavLink(link.id, -1)} disabled={i === 0}
                      className='text-gray-400 hover:text-gray-700 disabled:opacity-20'><Icon e='▲' size={9} /></button>
                    <button onClick={() => moveCareerNavLink(link.id, 1)} disabled={i === careerNavLinks.length - 1}
                      className='text-gray-400 hover:text-gray-700 disabled:opacity-20'><Icon e='▼' size={9} /></button>
                  </div>
                  <input value={link.label} onChange={e => updateCareerNavLink(link.id, { label: e.target.value })}
                    className='w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-teal-300' />
                  <input value={link.url} onChange={e => updateCareerNavLink(link.id, { url: e.target.value })}
                    className='flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-teal-300' />
                  <button onClick={() => { deleteCareerNavLink(link.id); flash() }}
                    className='rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50'>
                    {t('Hapus', 'Delete')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className='flex items-center gap-2'>
            <input value={linkForm.label} onChange={e => setLinkForm(f => ({ ...f, label: e.target.value }))}
              placeholder={t('Label, mis. Tentang Kami', 'Label, e.g. About Us')}
              className='w-48 rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-teal-300' />
            <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
              placeholder='https://... atau #lowongan'
              className='flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-teal-300' />
            <button onClick={addLink} disabled={!linkForm.label.trim() || !linkForm.url.trim()}
              className='shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-40'
              style={{ background: BRAND }}>
              + {t('Tambah', 'Add')}
            </button>
          </div>
        </div>

        {/* ── Footer Banner ─────────────────────────────────────────── */}
        <BannerUploadZone
          label={t('Banner Footer', 'Footer Banner')}
          hint={t('Gambar latar di bagian bawah halaman Karir. Kosongkan untuk memakai warna navy polos.',
                   'Background image at the bottom of the Career page. Leave empty to use plain navy.')}
          current={careerFooterImage}
          onUpload={(d) => { setCareerFooterImage(d); flash() }}
          onRemove={() => { removeCareerFooterImage(); flash() }}
        />

        <div className='rounded-xl bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-sm font-bold text-gray-700'>{t('Teks Footer', 'Footer Text')}</h2>
          <input value={careerFooterText} onChange={e => { setCareerFooterText(e.target.value); flash() }}
            className='w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
        </div>

        {/* ── Live Preview ──────────────────────────────────────────── */}
        <div className='rounded-xl bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-sm font-bold text-gray-700'><Icon e='👁️' size={14} className='inline align-[-2px]' /> {t('Live Preview', 'Live Preview')}</h2>

          <p className='mb-2 text-xs text-gray-400'>{t('Header / Hero', 'Header / Hero')}</p>
          <div className='mb-6 overflow-hidden rounded-xl border border-gray-100'>
            <div className='relative flex flex-col items-center justify-center gap-2 px-6 py-10 text-center'
              style={careerHeroImage
                ? { backgroundImage: `linear-gradient(135deg, rgba(5,43,82,.88), rgba(3,146,153,.82)), url(${careerHeroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: BRAND }}>
              <p className='text-lg font-bold text-white'>{careerHeroTitle || '—'}</p>
              <p className='max-w-md text-xs text-white/85'>{careerHeroSubtitle || '—'}</p>
              {careerNavLinks.length > 0 && (
                <div className='mt-2 flex flex-wrap justify-center gap-3'>
                  {careerNavLinks.map(l => <span key={l.id} className='text-[11px] font-semibold text-white/90'>{l.label}</span>)}
                </div>
              )}
            </div>
          </div>

          <p className='mb-2 text-xs text-gray-400'>{t('Footer', 'Footer')}</p>
          <div className='overflow-hidden rounded-xl border border-gray-100'>
            <div className='relative flex flex-col items-center justify-center gap-1.5 px-6 py-8 text-center'
              style={careerFooterImage
                ? { backgroundImage: `linear-gradient(135deg, rgba(5,43,82,.9), rgba(3,146,153,.85)), url(${careerFooterImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: '#052B52' }}>
              <p className='text-sm font-semibold text-white'>{careerFooterText || '—'}</p>
              {careerNavLinks.length > 0 && (
                <div className='mt-1 flex flex-wrap justify-center gap-3'>
                  {careerNavLinks.map(l => <span key={l.id} className='text-[11px] text-white/70'>{l.label}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
