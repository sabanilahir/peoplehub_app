'use client'
import Icon from '@/components/ui/Icon'
import { useRef, useState }                            from 'react'
import { useBrandingStore, PRESET_THEMES, BG_CONSTRAINTS as C } from '@/store/brandingStore'
import { useT } from '@/store/languageStore'

const BLANK = { type:'custom', presetKey:'', name:'', startDate:'', endDate:'', image:null }

export default function LoginThemePage() {
  const t = useT()
  const { loginThemes, addTheme, updateTheme, deleteTheme, toggleTheme } = useBrandingStore()
  const [form,    setForm   ] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [err,     setErr    ] = useState(null)
  const [msg,     setMsg    ] = useState(null)
  const [preview, setPreview] = useState(null)   // full-screen preview id
  const fileRef = useRef()

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  // ── image upload & validate ────────────────────────────────────
  const handleImageFile = (file) => {
    setErr(null)
    if (!file) return
    if (!C.acceptedTypes.includes(file.type))
      return setErr(`Tipe file tidak didukung. Gunakan: ${C.acceptedExt}`)
    if (file.size > C.maxSizeBytes)
      return setErr(`Ukuran file melebihi ${C.maxSizeMB} MB.`)

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width > C.maxWidth || img.height > C.maxHeight)
        return setErr(`Dimensi terlalu besar. Maksimal ${C.maxWidth}×${C.maxHeight} px (landscape Full HD).`)
      const reader = new FileReader()
      reader.onload = (e) => setForm(f => ({ ...f, image: e.target.result }))
      reader.readAsDataURL(file)
    }
    img.src = url
  }

  // ── fill form from preset ──────────────────────────────────────
  const applyPreset = (preset) => {
    const year  = new Date().getFullYear()
    setForm(f => ({
      ...f,
      type:       'preset',
      presetKey:  preset.key,
      name:       preset.label,
      startDate:  `${year}-${preset.startMD}`,
      endDate:    `${year}-${preset.endMD}`,
    }))
  }

  // ── save ──────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.name || !form.startDate || !form.endDate)
      return flash('Nama, tanggal mulai dan selesai wajib diisi.','error')
    if (!form.image && !editing)
      return flash('Background image wajib diupload.','error')
    if (form.endDate < form.startDate)
      return flash('Tanggal selesai tidak boleh sebelum tanggal mulai.','error')

    if (editing) {
      updateTheme(editing, form); setEditing(null); flash('Theme diperbarui.')
    } else {
      addTheme(form); flash('Theme ditambahkan.')
    }
    setForm(BLANK); setErr(null)
  }

  const handleEdit = (t) => {
    setEditing(t.id)
    setForm({ type:t.type, presetKey:t.presetKey||'', name:t.name,
              startDate:t.startDate, endDate:t.endDate, image:t.image })
  }

  // ── today check ───────────────────────────────────────────────
  const today     = new Date().toISOString().slice(0,10)
  const isActive  = (t) => t.active && t.startDate <= today && today <= t.endDate

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Login Theme</h1>
      <p className='text-gray-500 text-sm mb-6'>
        Atur background halaman login sesuai event kalender atau tanggal kustom.
      </p>

      {msg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.type==='error'?'bg-red-50 text-red-600 border border-red-200':'bg-green-50 text-green-600 border border-green-200'}`}>
          {msg.text}
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* ── Form ── */}
        <div className='bg-white rounded-xl p-6 shadow-sm'>
          <h2 className='text-sm font-bold text-gray-700 mb-4'>
            {editing ? 'Edit Theme' : 'Tambah Theme'}
          </h2>

          {/* Preset quick-fill */}
          {!editing && (
            <div className='mb-4'>
              <p className='text-xs font-semibold text-gray-500 mb-2'><Icon e='⚡' size={14} className='inline align-[-2px]' /> Preset Event</p>
              <div className='flex flex-wrap gap-1.5'>
                {PRESET_THEMES.map(p => (
                  <button key={p.key} onClick={() => applyPreset(p)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                      form.presetKey===p.key
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300'
                    }`}>
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className='flex flex-col gap-3'>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1'>Nama Theme</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder='mis. Selamat Hari Raya'
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>Tanggal Mulai</label>
                <input type='date' value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>Tanggal Selesai</label>
                <input type='date' value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1'>Background Image</label>
              {/* Constraints */}
              <div className='flex flex-wrap gap-1.5 mb-2'>
                {[`Maks. ${C.maxWidth}×${C.maxHeight}px`,`Maks. ${C.maxSizeMB} MB`,`${C.acceptedExt}`].map(t=>(
                  <span key={t} className='text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full'>{t}</span>
                ))}
              </div>

              <div
                onClick={() => fileRef.current.click()}
                className='flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-red-300 hover:bg-gray-50 transition'>
                {form.image
                  ? <img src={form.image} alt='' className='w-full h-24 object-cover rounded-lg' />
                  : <>
                      <span className='text-2xl'><Icon e='🌄' size={15} /></span>
                      <p className='text-xs text-gray-400 text-center'>Klik untuk upload<br/>atau drag & drop</p>
                    </>
                }
              </div>
              <input ref={fileRef} type='file' accept={C.acceptedTypes.join(',')} className='hidden'
                onChange={e=>handleImageFile(e.target.files[0])} />
              {form.image && (
                <button onClick={()=>setForm(f=>({...f,image:null}))}
                  className='text-xs text-red-500 hover:text-red-700 mt-1 font-semibold'><Icon e='🗑️' size={14} className='inline align-[-2px]' /> Hapus gambar
                </button>
              )}
              {err && <p className='text-xs text-red-600 mt-1'><Icon e='⚠️' size={14} className='inline align-[-2px]' /> {err}</p>}
            </div>

            <div className='flex gap-2 pt-1'>
              <button onClick={handleSave}
                className='flex-1 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90'
                style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                {editing ? t('Simpan','Save') : t('Tambah','Add')}
              </button>
              {editing && (
                <button onClick={()=>{setEditing(null);setForm(BLANK);setErr(null)}}
                  className='px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>
                  Batal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Theme list ── */}
        <div className='lg:col-span-2 flex flex-col gap-4'>

          {/* Active now banner */}
          {(() => {
            const active = loginThemes.find(isActive)
            return active ? (
              <div className='flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3'>
                <span className='text-xl'><Icon e='✅' size={15} /></span>
                <div>
                  <p className='text-sm font-bold text-green-700'>Theme Aktif Sekarang</p>
                  <p className='text-xs text-green-600'>{active.name} · {active.startDate} – {active.endDate}</p>
                </div>
                {active.image && (
                  <img src={active.image} className='ml-auto h-12 w-20 object-cover rounded-lg' />
                )}
              </div>
            ) : (
              <div className='flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3'>
                <span className='text-xl'>ℹ️</span>
                <p className='text-sm text-gray-500'>Tidak ada theme aktif hari ini. Background default akan digunakan.</p>
              </div>
            )
          })()}

          {/* Theme cards */}
          {loginThemes.length === 0 ? (
            <div className='bg-white rounded-xl p-10 shadow-sm text-center text-gray-400 text-sm'>
              Belum ada theme. Tambahkan dari form di kiri.
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {loginThemes.map(t => (
                <div key={t.id}
                  className={`bg-white rounded-xl overflow-hidden shadow-sm border-2 transition ${isActive(t) ? 'border-green-400' : 'border-gray-100'}`}>

                  {/* Thumbnail */}
                  <div className='relative h-32 bg-gray-100 overflow-hidden'>
                    {t.image
                      ? <img src={t.image} alt='' className='w-full h-full object-cover' />
                      : <div className='w-full h-full flex items-center justify-center text-4xl text-gray-200'><Icon e='🌄' size={15} /></div>
                    }
                    {/* Overlay badges */}
                    <div className='absolute top-2 left-2 flex gap-1.5'>
                      {isActive(t) && (
                        <span className='text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full shadow'><Icon e='●' size={14} className='inline align-[-2px]' /> LIVE</span>
                      )}
                      {t.type === 'preset' && (
                        <span className='text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full shadow'>
                          {PRESET_THEMES.find(p=>p.key===t.presetKey)?.emoji} Preset
                        </span>
                      )}
                    </div>
                    {/* Preview button */}
                    <button onClick={() => setPreview(t.id)}
                      className='absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded-lg hover:bg-black/70'><Icon e='👁️' size={14} className='inline align-[-2px]' /> Preview
                    </button>
                  </div>

                  <div className='p-4'>
                    <div className='flex items-start justify-between gap-2 mb-1'>
                      <p className='text-sm font-bold text-gray-800'>{t.name}</p>
                      <label className='flex items-center gap-1.5 cursor-pointer flex-shrink-0'>
                        <input type='checkbox' checked={t.active} onChange={()=>toggleTheme(t.id)}
                          className='w-3.5 h-3.5 accent-red-600' />
                        <span className='text-xs text-gray-500'>Aktif</span>
                      </label>
                    </div>
                    <p className='text-xs text-gray-400 mb-3'><Icon e='📅' size={14} className='inline align-[-2px]' /> {t.startDate} – {t.endDate}</p>
                    <div className='flex gap-2'>
                      <button onClick={() => handleEdit(t)}
                        className='flex-1 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100'>
                        Edit
                      </button>
                      <button onClick={() => { if(confirm(`Hapus theme "${t.name}"?`)) deleteTheme(t.id) }}
                        className='flex-1 py-1.5 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100'>
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Full-screen preview modal ── */}
      {preview && (() => {
        const t = loginThemes.find(x => x.id === preview)
        if (!t) return null
        return (
          <div className='fixed inset-0 z-[999] flex items-center justify-center'
            style={{ background: t.image ? `url(${t.image}) center/cover no-repeat` : 'linear-gradient(135deg,#1a1a2e,#052B52)' }}>
            <div className='absolute inset-0 bg-black/40' onClick={() => setPreview(null)} />
            <div className='relative bg-white rounded-2xl p-10 w-96 shadow-2xl z-10 text-center'>
              <p className='text-2xl font-bold text-gray-900 mb-1' style={{fontFamily:'Georgia,serif'}}>
                RAMUS<span className='text-red-600'>E</span>N
              </p>
              <p className='text-gray-400 text-xs mb-6'>Human Capital Management</p>
              <div className='space-y-3 mb-4'>
                <div className='h-9 bg-gray-100 rounded-lg' />
                <div className='h-9 bg-gray-100 rounded-lg' />
                <div className='h-10 rounded-lg' style={{background:'linear-gradient(135deg,#052B52,#039299)'}} />
              </div>
              <p className='text-xs text-gray-400 italic'>Preview: {t.name}</p>
              <button onClick={() => setPreview(null)}
                className='mt-4 text-xs text-gray-400 hover:text-gray-600 underline'>
                Tutup Preview
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
