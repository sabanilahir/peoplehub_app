'use client'
import Icon from '@/components/ui/Icon'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useCertificateStore, THEMES } from '@/store/certificateStore'
import { useT } from '@/store/languageStore'

// ─── Variables ────────────────────────────────────────────────────────────────
const RTF_VARIABLES = [
  { var:'[[learner_name]]',       desc:'Nama lengkap peserta' },
  { var:'[[nik]]',                desc:'NIK / Employee ID' },
  { var:'[[position]]',           desc:'Jabatan peserta' },
  { var:'[[department]]',         desc:'Departemen' },
  { var:'[[company_name]]',       desc:'Nama perusahaan' },
  { var:'[[course_name]]',        desc:'Nama course' },
  { var:'[[course_code]]',        desc:'Kode course' },
  { var:'[[training_hours]]',     desc:'Total jam pelatihan' },
  { var:'[[completion_date]]',    desc:'Tanggal selesai' },
  { var:'[[score]]',              desc:'Nilai akhir' },
  { var:'[[grade]]',              desc:'Predikat (A/B/C)' },
  { var:'[[validity_date]]',      desc:'Tanggal kadaluarsa' },
  { var:'[[certificate_number]]', desc:'Nomor sertifikat' },
  { var:'[[approver_name]]',      desc:'Nama penandatangan' },
  { var:'[[approver_title]]',     desc:'Jabatan penandatangan' },
  { var:'[[issue_date]]',         desc:'Tanggal penerbitan' },
  { var:'[[period]]',             desc:'Periode pelatihan' },
]

const CERT_TYPES   = ['Penyelesaian (Completion)', 'Partisipasi (Participation)', 'Prestasi (Achievement)', 'Excellence Award']
const ORIENTATIONS = ['Landscape', 'Portrait']
const FONTS        = ['Georgia, serif', 'Arial, sans-serif', 'Times New Roman, serif', '"Courier New", monospace', 'Verdana, sans-serif']
const FONT_LABELS  = ['Georgia', 'Arial', 'Times New Roman', 'Courier New', 'Verdana']

const DUMMY_DATA = {
  '[[learner_name]]':       'Budi Santoso',
  '[[nik]]':                '10045',
  '[[position]]':           'Senior Engineer',
  '[[department]]':         'Technology',
  '[[company_name]]':       'PT Kappabel Maju Bersama',
  '[[course_name]]':        'Leadership Fundamentals',
  '[[course_code]]':        'LDR-2025-01',
  '[[training_hours]]':     '16 Jam',
  '[[completion_date]]':    '20 Juni 2025',
  '[[score]]':              '92',
  '[[grade]]':              'A',
  '[[validity_date]]':      '20 Juni 2026',
  '[[certificate_number]]': 'CERT/2025/0042',
  '[[approver_name]]':      'Siti Rahayu',
  '[[approver_title]]':     'Direktur SDM',
  '[[issue_date]]':         '20 Juni 2025',
  '[[period]]':             'Juni 2025',
}

function applyDummy(text) {
  if (!text) return text
  return Object.entries(DUMMY_DATA).reduce((t, [k, v]) => t.replaceAll(k, v), text)
}

const EMPTY_TPL = {
  name: '', type: CERT_TYPES[0], orientation: 'Landscape',
  backgroundImageUrl: null, uploadFileName: null,
  elements: [], showCertNo: false, signatoryIds: [],
  certNumberFormat: 'CERT/[[YYYY]]/[[SEQ:4]]',
  validityMonths: 0, notes: '', status: 'Draft',
}

// ─── Password Gate Modal ──────────────────────────────────────────────────────
function PasswordGateModal({ signatoryName, expectedPassword, onConfirm, onCancel }) {
  const [pw,  setPw ] = useState('')
  const [err, setErr] = useState(false)
  const inputRef = useRef()
  useEffect(() => { inputRef.current?.focus() }, [])
  const submit = () => {
    if (pw === expectedPassword) { onConfirm() }
    else { setErr(true); setPw('') }
  }
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4' onClick={onCancel}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden' onClick={e => e.stopPropagation()}>
        <div className='px-6 py-4 flex items-center justify-between' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
          <div>
            <h2 className='text-white font-bold text-sm'><Icon name='lock' size={13} className='inline align-[-2px]' /> Verifikasi Password</h2>
            <p className='text-red-200 text-xs mt-0.5'>{signatoryName}</p>
          </div>
          <button onClick={onCancel} className='w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white text-xs hover:bg-white/30'><Icon name='close' size={15} /></button>
        </div>
        <div className='p-6 space-y-4'>
          <p className='text-sm text-gray-600'>Masukkan password tanda tangan untuk melanjutkan.</p>
          <div>
            <input ref={inputRef} type='password' value={pw} onChange={e => { setPw(e.target.value); setErr(false) }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder='Password…'
              className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-red-400'}`} />
            {err && <p className='text-xs text-red-500 mt-1'>Password salah. Coba lagi.</p>}
          </div>
          <div className='flex gap-2'>
            <button onClick={submit}
              className='flex-1 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition'
              style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
              Konfirmasi
            </button>
            <button onClick={onCancel} className='px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition'>
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Signatory Manager ────────────────────────────────────────────────────────
function SignatoryManager() {
  const { signatories, addSignatory, updateSignatory, deleteSignatory } = useCertificateStore()
  const [form,         setForm        ] = useState(null)
  const [msg,          setMsg         ] = useState(null)
  const [preview,      setPreview     ] = useState(null)
  const [passwordGate, setPasswordGate] = useState(null) // { sg, pending }
  const [unlockedIds,  setUnlockedIds ] = useState([])   // ids whose sig image is revealed on card
  const sigRef = useRef()
  const flash = (t, type='success') => { setMsg({t,type}); setTimeout(()=>setMsg(null),3000) }

  // Open action only if password passes (or no password set)
  const withPassword = (sg, fn) => {
    if (sg.password) { setPasswordGate({ sg, pending: fn }) }
    else fn()
  }

  const handleUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setForm(p => ({ ...p, signatureImage: e.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!form.name?.trim())  { flash('Nama penandatangan wajib diisi.','error'); return }
    if (!form.title?.trim()) { flash('Jabatan wajib diisi.','error'); return }
    if (form._newPw && form._newPw !== form._confirmPw) { flash('Konfirmasi password tidak cocok.','error'); return }
    const payload = { ...form }
    if (form._newPw) payload.password = form._newPw
    delete payload._newPw
    delete payload._confirmPw
    if (payload.id) {
      updateSignatory(payload.id, payload)
      flash(`"${payload.name}" diperbarui.`)
    } else {
      addSignatory({ ...payload, status: 'Active' })
      flash(`"${payload.name}" ditambahkan.`)
    }
    setForm(null)
  }

  const initials = (name='') => name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

  return (
    <div>
      {msg && (
        <div className={`text-xs px-4 py-3 rounded-lg mb-4 ${msg.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-600'}`}>{msg.t}</div>
      )}

      <div className='flex justify-between items-center mb-5'>
        <p className='text-sm text-gray-500'>{signatories.length} penandatangan terdaftar</p>
        <button onClick={() => setForm({ name:'', title:'', department:'', signatureImage: null, status:'Active' })}
          className='px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 flex items-center gap-2 transition'
          style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
          + Tambah Penandatangan
        </button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5'>
        {signatories.map(sg => (
          <div key={sg.id} className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md transition'>
            <div className='h-1.5' style={{ background: 'linear-gradient(90deg,#052B52,#039299)' }} />
            <div className='p-5'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {initials(sg.name)}
                  </div>
                  <div>
                    <p className='font-bold text-gray-800 text-sm'>{sg.name}</p>
                    <p className='text-xs text-gray-500'>{sg.department}</p>
                  </div>
                </div>
                <div className='flex items-center gap-1.5'>
                  {sg.password && <span className='text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold'><Icon name='lock' size={12} /></span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sg.status==='Active'?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>
                    {sg.status}
                  </span>
                </div>
              </div>

              <p className='text-xs text-gray-500 mb-3'>{sg.title}</p>

              <div className='border border-gray-100 rounded-xl bg-gray-50 p-3 mb-4 flex items-center justify-center'
                style={{ minHeight: 80 }}>
                {!sg.signatureImage ? (
                  <span className='text-xs text-gray-300 italic'>Belum ada gambar tanda tangan</span>
                ) : sg.password && !unlockedIds.includes(sg.id) ? (
                  <button
                    onClick={() => withPassword(sg, () => setUnlockedIds(ids => [...ids, sg.id]))}
                    className='flex flex-col items-center gap-1.5 text-gray-400 hover:text-amber-600 transition group'>
                    <span className='group-hover:scale-110 transition-transform text-gray-500'><Icon name='lock' size={20} /></span>
                    <span className='text-[10px] font-semibold'>Klik untuk lihat tanda tangan</span>
                  </button>
                ) : (
                  <img src={sg.signatureImage} alt='tanda tangan' className='max-h-16 max-w-full object-contain cursor-zoom-in'
                    onClick={() => setPreview(sg)} />
                )}
              </div>

              <div className='flex gap-1.5'>
                <button onClick={() => withPassword(sg, () => setForm({ ...sg }))}
                  className='flex-1 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition'
                  style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
                  {sg.password ? <><Icon name='lock' size={12} className='inline align-[-2px]' /> Edit</> : <><Icon name='edit' size={12} className='inline align-[-2px]' /> Edit</>}
                </button>
                <button onClick={() => withPassword(sg, () => setPreview(sg))} title='Pratinjau tanda tangan'
                  className='px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition'>
                  <Icon name='search' size={14} />
                </button>
                <button onClick={() => withPassword(sg, () => { if (confirm(`Hapus "${sg.name}"?`)) deleteSignatory(sg.id) })} title='Hapus penandatangan'
                  className='px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition'>
                  <Icon name='trash' size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {signatories.length === 0 && (
          <div className='col-span-3 bg-white rounded-2xl p-16 text-center shadow-sm'>
            <div className='text-gray-300 mb-4'><Icon name='edit' size={40} /></div>
            <h3 className='font-bold text-gray-700 mb-1'>Belum ada penandatangan</h3>
            <p className='text-sm text-gray-400 mb-5'>Tambahkan penandatangan beserta gambar tanda tangannya.</p>
          </div>
        )}
      </div>

      {/* Form modal */}
      {form && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={() => setForm(null)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden' style={{ maxHeight: '90vh' }} onClick={e=>e.stopPropagation()}>
            <div className='px-6 py-4 flex items-center justify-between flex-shrink-0'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
              <h2 className='text-white font-bold text-sm'>
                {form.id ? 'Edit Penandatangan' : 'Tambah Penandatangan'}
              </h2>
              <button onClick={() => setForm(null)}
                className='w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white text-xs hover:bg-white/30'><Icon name='close' size={15} /></button>
            </div>

            <div className='p-6 space-y-4 overflow-y-auto flex-1'>
              <div>
                <label className='block text-xs font-bold text-gray-500 mb-1'>Nama Lengkap *</label>
                <input value={form.name || ''} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
                  placeholder='Nama penandatangan' />
              </div>
              <div>
                <label className='block text-xs font-bold text-gray-500 mb-1'>Jabatan *</label>
                <input value={form.title || ''} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
                  placeholder='Jabatan / posisi' />
              </div>
              <div>
                <label className='block text-xs font-bold text-gray-500 mb-1'>Departemen</label>
                <input value={form.department || ''} onChange={e=>setForm(p=>({...p,department:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
                  placeholder='Departemen' />
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-500 mb-2'>Gambar Tanda Tangan</label>
                <div className='border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition'
                  style={{ borderColor: form.signatureImage ? '#039299' : '#d1d5db' }}
                  onClick={() => sigRef.current?.click()}>
                  <input ref={sigRef} type='file' accept='image/*' className='hidden'
                    onChange={e=>handleUpload(e.target.files[0])} />
                  {form.signatureImage ? (
                    <div className='flex flex-col items-center gap-1'>
                      <img src={form.signatureImage} alt='sig' className='max-h-20 object-contain' />
                      <span className='text-[10px] text-red-500 mt-1'>Klik untuk ganti</span>
                    </div>
                  ) : (
                    <div>
                      <div className='text-gray-300 mb-1'><Icon name='edit' size={26} /></div>
                      <p className='text-xs font-semibold text-gray-500'>Upload gambar tanda tangan</p>
                      <p className='text-[10px] text-gray-400'>PNG transparan direkomendasikan</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-500 mb-1'>Status</label>
                <select value={form.status || 'Active'} onChange={e=>setForm(p=>({...p,status:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className='border-t border-gray-100 pt-4 space-y-3'>
                <p className='text-xs font-bold text-gray-500 flex items-center gap-1.5'><Icon name='lock' size={13} className='inline align-[-2px]' /> Password Tanda Tangan
                  {form.id && form.password && <span className='text-[10px] font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full'>Sudah diatur</span>}
                </p>
                <p className='text-[11px] text-gray-400 -mt-1'>Password diperlukan setiap kali tanda tangan ini dibuka atau digunakan di template.</p>
                <div>
                  <label className='block text-xs font-semibold text-gray-500 mb-1'>{form.id && form.password ? 'Ganti Password' : 'Password Baru'}</label>
                  <input type='password' value={form._newPw || ''} onChange={e=>setForm(p=>({...p,_newPw:e.target.value}))}
                    placeholder={form.id && form.password ? 'Kosongkan jika tidak ingin mengubah' : 'Buat password…'}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                </div>
                {form._newPw && (
                  <div>
                    <label className='block text-xs font-semibold text-gray-500 mb-1'>Konfirmasi Password</label>
                    <input type='password' value={form._confirmPw || ''} onChange={e=>setForm(p=>({...p,_confirmPw:e.target.value}))}
                      placeholder='Ulangi password…'
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                  </div>
                )}
              </div>

              <div className='flex gap-2 pt-2'>
                <button onClick={handleSave}
                  className='flex-1 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition'
                  style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
                  {form.id ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
                <button onClick={() => setForm(null)}
                  className='px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition'>
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4' onClick={() => setPreview(null)}>
          <div className='bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center' onClick={e=>e.stopPropagation()}>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
                {initials(preview.name)}
              </div>
              <div className='text-left'>
                <p className='font-bold text-gray-800 text-sm'>{preview.name}</p>
                <p className='text-xs text-gray-500'>{preview.title}</p>
              </div>
            </div>
            <div className='border border-gray-100 rounded-xl bg-gray-50 p-6 flex items-center justify-center mb-4' style={{ minHeight: 120 }}>
              {preview.signatureImage
                ? <img src={preview.signatureImage} alt='tanda tangan' className='max-h-28 object-contain' />
                : <span className='text-gray-300 text-sm italic'>Tidak ada gambar</span>}
            </div>
            <button onClick={() => setPreview(null)}
              className='text-xs text-gray-400 hover:text-gray-600'>Tutup</button>
          </div>
        </div>
      )}

      {/* Password gate modal */}
      {passwordGate && (
        <PasswordGateModal
          signatoryName={passwordGate.sg.name}
          expectedPassword={passwordGate.sg.password}
          onConfirm={() => { passwordGate.pending(); setPasswordGate(null) }}
          onCancel={() => setPasswordGate(null)}
        />
      )}
    </div>
  )
}

// ─── Signatory Picker (used inside CanvasEditor) ──────────────────────────────
function SignatoryPicker({ signatoryIds, onChange, onInsertToCanvas, signatories }) {
  const [open,         setOpen        ] = useState(false)
  const [passwordGate, setPasswordGate] = useState(null) // { sg, pending }
  const selected = signatories.filter(s => (signatoryIds||[]).includes(s.id))

  const withPassword = (sg, fn) => {
    if (sg.password) setPasswordGate({ sg, pending: fn })
    else fn()
  }

  const toggle = (sg) => {
    const cur = signatoryIds || []
    if (cur.includes(sg.id)) {
      onChange(cur.filter(x => x !== sg.id))
    } else {
      withPassword(sg, () => onChange([...cur, sg.id]))
    }
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <label className='block text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Penandatangan</label>
        <button onClick={() => setOpen(true)}
          className='text-[10px] text-red-600 font-semibold hover:underline'>+ Pilih</button>
      </div>

      {selected.length === 0 ? (
        <button onClick={() => setOpen(true)}
          className='w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-center text-xs text-gray-400 hover:border-red-300 hover:text-red-500 transition'>
          <Icon name='edit' size={13} className='inline align-[-2px]' /> Pilih penandatangan dari master
        </button>
      ) : (
        <div className='space-y-2'>
          {selected.map(sg => (
            <div key={sg.id} className='flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100'>
              <div className='border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center' style={{ width:56, height:36 }}>
                <span className='text-gray-500'><Icon name='edit' size={16} /></span>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-bold text-gray-700 truncate'>{sg.name}</p>
                <p className='text-[10px] text-gray-400 truncate'>{sg.title}</p>
              </div>
              <div className='flex flex-col gap-1'>
                <button onClick={() => withPassword(sg, () => onInsertToCanvas(sg))}
                  title='Masukkan ke canvas'
                  className='text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-semibold hover:bg-red-100 transition'>
                  {sg.password ? <><Icon name='lock' size={12} className='inline align-[-2px]' /> Canvas</> : <>+ Canvas</>}
                </button>
                <button onClick={() => toggle(sg)}
                  className='text-[10px] text-gray-300 hover:text-red-400 transition text-right'>hapus</button>
              </div>
            </div>
          ))}
          <button onClick={() => setOpen(true)}
            className='w-full text-[10px] text-red-600 font-semibold py-1.5 hover:underline'>
            + Tambah penandatangan lain
          </button>
        </div>
      )}

      {/* Picker modal */}
      {open && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4' onClick={() => setOpen(false)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden' onClick={e=>e.stopPropagation()}>
            <div className='px-5 py-4 flex items-center justify-between'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
              <h2 className='text-white font-bold text-sm'>Pilih Penandatangan</h2>
              <button onClick={() => setOpen(false)}
                className='w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white text-xs hover:bg-white/30'><Icon name='close' size={15} /></button>
            </div>
            <div className='p-4 max-h-96 overflow-y-auto space-y-2'>
              {signatories.filter(s=>s.status==='Active').map(sg => {
                const checked = (signatoryIds||[]).includes(sg.id)
                return (
                  <button key={sg.id} onClick={() => toggle(sg)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${checked?'border-red-400 bg-red-50':'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked?'border-red-500 bg-red-500':'border-gray-300'}`}>
                      {checked && <span className='text-white text-[10px] font-bold'><Icon name='checkSmall' size={11} /></span>}
                    </div>
                    <div className='border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center' style={{ width:64, height:40 }}>
                      <span className='text-gray-500'><Icon name='edit' size={18} /></span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-bold text-gray-800 truncate'>{sg.name}</p>
                      <p className='text-xs text-gray-500 truncate'>{sg.title}</p>
                      {sg.department && <p className='text-[10px] text-gray-400 truncate'>{sg.department}</p>}
                    </div>
                    {sg.password && <span className='text-[10px] text-gray-400 flex-shrink-0'><Icon name='lock' size={12} /></span>}
                  </button>
                )
              })}
            </div>
            <div className='px-5 py-3 border-t border-gray-100 flex justify-end'>
              <button onClick={() => setOpen(false)}
                className='px-5 py-2 text-sm font-bold text-white rounded-xl hover:opacity-90 transition'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordGate && (
        <PasswordGateModal
          signatoryName={passwordGate.sg.name}
          expectedPassword={passwordGate.sg.password}
          onConfirm={() => { passwordGate.pending(); setPasswordGate(null) }}
          onCancel={() => setPasswordGate(null)}
        />
      )}
    </div>
  )
}

// ─── Canvas Editor ─────────────────────────────────────────────────────────────
function CanvasEditor({ tpl, onSave, onCancel }) {
  const { signatories } = useCertificateStore()

  const initialForm = { ...tpl, elements: tpl.elements ? [...tpl.elements] : [], signatoryIds: tpl.signatoryIds || [], certNumberFormat: tpl.certNumberFormat || 'CERT/[[YYYY]]/[[SEQ:4]]' }

  const [form,        setForm      ] = useState(initialForm)
  const [selectedId,  setSelectedId] = useState(null)
  const [dragging,    setDragging  ] = useState(null)
  const [editingId,   setEditingId ] = useState(null)
  // Panel tab: 'desain' | 'properti' | 'pengaturan'
  const [panelTab,    setPanelTab  ] = useState('desain')
  const [msg,         setMsg       ] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)
  // Collapsible variables section in Desain tab
  const [varsOpen,    setVarsOpen  ] = useState(false)
  // Variable popup on double-click: null | { elId, x, y }
  const [varPopup,    setVarPopup  ] = useState(null)
  // Soft delete undo: null | { el, timeout }
  const [deletedEl,   setDeletedEl ] = useState(null)

  // History for undo/redo
  const historyRef = useRef([initialForm])
  const historyIdx = useRef(0)

  const canvasRef    = useRef()
  const bgRef        = useRef()
  const textareaRef  = useRef()
  const imgUploadRef = useRef()

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const flash = (t, type='error') => { setMsg({t, type}); setTimeout(() => setMsg(null), 3000) }

  const selected = form.elements.find(e => e.id === selectedId)

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = (newForm) => {
    // Truncate forward history
    const newHistory = historyRef.current.slice(0, historyIdx.current + 1)
    newHistory.push(newForm)
    historyRef.current = newHistory
    historyIdx.current = newHistory.length - 1
  }

  const canUndo = historyIdx.current > 0
  const canRedo = historyIdx.current < historyRef.current.length - 1

  const undo = useCallback(() => {
    if (historyIdx.current > 0) {
      historyIdx.current -= 1
      setForm(historyRef.current[historyIdx.current])
      setSelectedId(null)
    }
  }, [])

  const redo = useCallback(() => {
    if (historyIdx.current < historyRef.current.length - 1) {
      historyIdx.current += 1
      setForm(historyRef.current[historyIdx.current])
      setSelectedId(null)
    }
  }, [])

  // Keyboard: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    const handler = (e) => {
      // Don't intercept when typing in inputs
      const tag = e.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // ── Drag with snap-to-grid ────────────────────────────────────────────────
  const snap = (v) => Math.round(v / 2.5) * 2.5

  const onElemMouseDown = (e, id) => {
    if (editingId === id) return
    e.preventDefault(); e.stopPropagation()
    setSelectedId(id)
    setVarPopup(null)
    const rect = canvasRef.current.getBoundingClientRect()
    const el   = form.elements.find(x => x.id === id)
    setDragging({ id, offsetX: e.clientX - (el.x / 100 * rect.width), offsetY: e.clientY - (el.y / 100 * rect.height) })
  }

  const onCanvasMouseMove = useCallback((e) => {
    if (!dragging) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const rawX = ((e.clientX - dragging.offsetX) / rect.width)  * 100
    const rawY = ((e.clientY - dragging.offsetY) / rect.height) * 100
    const x = snap(Math.max(0, Math.min(95, rawX)))
    const y = snap(Math.max(0, Math.min(95, rawY)))
    setForm(p => ({ ...p, elements: p.elements.map(el => el.id === dragging.id ? { ...el, x, y } : el) }))
  }, [dragging])

  const onCanvasMouseUp = useCallback(() => {
    if (dragging) {
      // Push history after drag ends
      setForm(p => {
        pushHistory(p)
        return p
      })
      setDragging(null)
    }
  }, [dragging])

  useEffect(() => {
    window.addEventListener('mousemove', onCanvasMouseMove)
    window.addEventListener('mouseup',   onCanvasMouseUp)
    return () => {
      window.removeEventListener('mousemove', onCanvasMouseMove)
      window.removeEventListener('mouseup',   onCanvasMouseUp)
    }
  }, [onCanvasMouseMove, onCanvasMouseUp])

  // ── Elements ───────────────────────────────────────────────────────────────
  const addText = () => {
    const el = { id: Date.now(), type: 'text', content: 'Teks baru', x: 10, y: 10, fontSize: 14, color: '#1f2937', bold: false, italic: false, align: 'left', fontFamily: FONTS[0], wrap: false }
    const newForm = (p) => ({ ...p, elements: [...p.elements, el] })
    setForm(p => {
      const nf = newForm(p)
      pushHistory(nf)
      return nf
    })
    setSelectedId(el.id); setPanelTab('properti')
  }

  const addCertNumber = () => {
    const el = { id: Date.now(), type: 'text', content: 'No: [[certificate_number]]', x: 5, y: 5, fontSize: 11, color: '#374151', bold: false, italic: false, align: 'left', fontFamily: FONTS[0], wrap: false }
    setForm(p => {
      const nf = { ...p, elements: [...p.elements, el] }
      pushHistory(nf)
      return nf
    })
    setSelectedId(el.id); setPanelTab('properti')
  }

  const addImageElement = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const el = { id: Date.now(), type: 'image', src: e.target.result, x: 10, y: 10, widthPct: 20 }
      setForm(p => {
        const nf = { ...p, elements: [...p.elements, el] }
        pushHistory(nf)
        return nf
      })
      setSelectedId(el.id); setPanelTab('properti')
    }
    reader.readAsDataURL(file)
  }

  // Insert variable string at textarea cursor position
  const insertVarIntoSelected = (varStr) => {
    const currentContent = selected?.content || ''
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart ?? currentContent.length
      const end   = ta.selectionEnd   ?? currentContent.length
      const newContent = currentContent.slice(0, start) + varStr + currentContent.slice(end)
      updateEl(selected.id, 'content', newContent)
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + varStr.length, start + varStr.length) }, 0)
    } else {
      updateEl(selected.id, 'content', currentContent + varStr)
    }
  }

  // Insert variable into a specific element by id (used by var popup)
  const insertVarIntoEl = (elId, varStr) => {
    setForm(p => {
      const nf = { ...p, elements: p.elements.map(el => el.id === elId ? { ...el, content: (el.content || '') + varStr } : el) }
      pushHistory(nf)
      return nf
    })
    setVarPopup(null)
  }

  // Insert signature image + name + title as canvas elements
  const insertSignatoryToCanvas = (sg) => {
    const now = Date.now()
    const imgEl  = { id: now,     type: 'signature', signatoryId: sg.id, src: sg.signatureImage, x: 62, y: 76, widthPct: 18 }
    const nameEl = { id: now+1,   type: 'text', content: sg.name,  x: 62, y: 88, fontSize: 11, color: '#1f2937', bold: true,  italic: false, align: 'center', fontFamily: FONTS[0] }
    const titleEl= { id: now+2,   type: 'text', content: sg.title, x: 62, y: 92, fontSize: 9,  color: '#6b7280', bold: false, italic: false, align: 'center', fontFamily: FONTS[0] }
    setForm(p => {
      const nf = { ...p, elements: [...p.elements, imgEl, nameEl, titleEl] }
      pushHistory(nf)
      return nf
    })
    flash(`Tanda tangan "${sg.name}" ditambahkan ke canvas.`, 'success')
    setPanelTab('desain')
  }

  const updateEl = (id, k, v) => {
    setForm(p => {
      const nf = { ...p, elements: p.elements.map(el => el.id === id ? { ...el, [k]: v } : el) }
      pushHistory(nf)
      return nf
    })
  }

  // Soft delete: remove immediately but allow undo via snackbar
  const deleteEl = (id) => {
    const el = form.elements.find(e => e.id === id)
    if (!el) return

    // Clear any existing timeout
    if (deletedEl?.timeout) clearTimeout(deletedEl.timeout)

    const timeout = setTimeout(() => {
      setDeletedEl(null)
    }, 3000)

    setDeletedEl({ el, timeout })

    setForm(p => {
      const nf = { ...p, elements: p.elements.filter(e => e.id !== id) }
      pushHistory(nf)
      return nf
    })
    if (selectedId === id) setSelectedId(null)
  }

  const undoDeleteEl = () => {
    if (!deletedEl) return
    clearTimeout(deletedEl.timeout)
    const el = deletedEl.el
    setDeletedEl(null)
    setForm(p => {
      const nf = { ...p, elements: [...p.elements, el] }
      pushHistory(nf)
      return nf
    })
    setSelectedId(el.id)
  }

  const duplicateEl = (id) => {
    const el = form.elements.find(e => e.id === id)
    if (!el) return
    const copy = { ...el, id: Date.now(), x: el.x + 2, y: el.y + 2 }
    setForm(p => {
      const nf = { ...p, elements: [...p.elements, copy] }
      pushHistory(nf)
      return nf
    })
    setSelectedId(copy.id)
  }

  const bringFront = (id) => {
    setForm(p => {
      const rest = p.elements.filter(e => e.id !== id)
      const el   = p.elements.find(e => e.id === id)
      const nf   = { ...p, elements: [...rest, el] }
      pushHistory(nf)
      return nf
    })
  }

  const sendBack = (id) => {
    setForm(p => {
      const rest = p.elements.filter(e => e.id !== id)
      const el   = p.elements.find(e => e.id === id)
      const nf   = { ...p, elements: [el, ...rest] }
      pushHistory(nf)
      return nf
    })
  }

  const handleBgUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      setForm(p => {
        const nf = { ...p, backgroundImageUrl: e.target.result, uploadFileName: file.name }
        pushHistory(nf)
        return nf
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = (status) => {
    if (!form.name.trim())        { flash('Nama template wajib diisi.'); return }
    if (!form.backgroundImageUrl) { flash('Harap upload file desain sertifikat.'); return }
    onSave({ ...form, status })
  }

  const elemIcon = (el) => el.type === 'signature' ? '✍' : el.type === 'image' ? '🖼' : 'T'

  // ── Grid overlay lines ─────────────────────────────────────────────────────
  const GridOverlay = () => (
    <div className='absolute inset-0 pointer-events-none' style={{ zIndex: 5 }}>
      {[10,20,30,40,50,60,70,80,90].map(pct => (
        <div key={`v${pct}`} style={{ position:'absolute', left:`${pct}%`, top:0, bottom:0, width:1, background:'rgba(150,150,150,0.25)' }} />
      ))}
      {[10,20,30,40,50,60,70,80,90].map(pct => (
        <div key={`h${pct}`} style={{ position:'absolute', top:`${pct}%`, left:0, right:0, height:1, background:'rgba(150,150,150,0.25)' }} />
      ))}
    </div>
  )

  // ── Property panel content ─────────────────────────────────────────────────
  const PropertiesPanel = () => (
    <>
      {!selected ? (
        <div className='text-center py-8 text-gray-400 text-xs'>
          <div className='text-gray-300 mb-2'><Icon name='pointer' size={26} /></div>
          Klik elemen di canvas untuk mengedit propertinya
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-gray-600'>
              {selected.type === 'signature' ? <><Icon name='edit' size={13} className='inline align-[-2px]' /> Tanda Tangan</> : 'T Teks'}
            </span>
            <div className='flex gap-1'>
              <button onClick={() => bringFront(selected.id)} title='Pindah ke depan' className='text-[10px] text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded'><Icon e='↑' size={15} /></button>
              <button onClick={() => sendBack(selected.id)} title='Pindah ke belakang' className='text-[10px] text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded'><Icon e='↓' size={15} /></button>
              <button onClick={() => duplicateEl(selected.id)} title='Duplikat elemen' className='text-[10px] text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded'>⧉</button>
              <button onClick={() => deleteEl(selected.id)} title='Hapus elemen' className='text-[10px] text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded'><Icon name='trash' size={14} /></button>
            </div>
          </div>

          {(selected.type === 'signature' || selected.type === 'image') && (
            <>
              <div className='bg-gray-50 rounded-xl p-3'>
                {selected.src
                  ? <img src={selected.src} alt='' className='max-h-16 object-contain' />
                  : <span className='text-gray-300 text-xs italic'>Belum ada gambar</span>}
              </div>
              {selected.type === 'image' && (
                <button onClick={() => imgUploadRef.current?.click()}
                  className='w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition'>
                  Ganti Gambar
                </button>
              )}
              <div>
                <label className='block text-[10px] font-bold text-gray-500 mb-1'>Lebar (%)</label>
                <input type='number' min='5' max='80' value={selected.widthPct || 15}
                  onChange={e => updateEl(selected.id, 'widthPct', Number(e.target.value))}
                  className='w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-300' />
              </div>
            </>
          )}

          {(selected.type === 'text' || selected.type === 'variable') && (
            <div>
              <label className='block text-[10px] font-bold text-gray-500 mb-1'>Isi Teks</label>
              <textarea ref={textareaRef} value={selected.content} rows={3}
                onChange={e => updateEl(selected.id, 'content', e.target.value)}
                className='w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-300 resize-none font-mono' />

              {/* Variable insertion chips */}
              <div className='mt-2'>
                <p className='text-[10px] text-gray-400 mb-1.5'>Sisipkan variabel ke posisi kursor:</p>
                <div className='flex flex-wrap gap-1'>
                  {RTF_VARIABLES.map(v => (
                    <button key={v.var} onClick={() => insertVarIntoSelected(v.var)}
                      title={v.desc}
                      className='text-[9px] font-mono bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded hover:bg-red-100 transition'>
                      {v.var.replace(/\[\[|\]\]/g, '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='block text-[10px] font-bold text-gray-500 mb-1'>X (%)</label>
              <input type='number' min='0' max='98' value={Math.round(selected.x)}
                onChange={e => updateEl(selected.id, 'x', Number(e.target.value))}
                className='w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-300' />
            </div>
            <div>
              <label className='block text-[10px] font-bold text-gray-500 mb-1'>Y (%)</label>
              <input type='number' min='0' max='98' value={Math.round(selected.y)}
                onChange={e => updateEl(selected.id, 'y', Number(e.target.value))}
                className='w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-300' />
            </div>
          </div>

          {selected.type !== 'signature' && (
            <>
              <div>
                <label className='block text-[10px] font-bold text-gray-500 mb-1'>Font</label>
                <select value={selected.fontFamily} onChange={e => updateEl(selected.id, 'fontFamily', e.target.value)}
                  className='w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-300'>
                  {FONTS.map((f, i) => <option key={f} value={f}>{FONT_LABELS[i]}</option>)}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='block text-[10px] font-bold text-gray-500 mb-1'>Ukuran</label>
                  <input type='number' min='6' max='72' value={selected.fontSize}
                    onChange={e => updateEl(selected.id, 'fontSize', Number(e.target.value))}
                    className='w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-300' />
                </div>
                <div>
                  <label className='block text-[10px] font-bold text-gray-500 mb-1'>Warna</label>
                  <input type='color' value={selected.color} onChange={e => updateEl(selected.id, 'color', e.target.value)}
                    className='w-full h-[34px] px-1 py-1 border border-gray-200 rounded-lg cursor-pointer' />
                </div>
              </div>
              <div className='flex gap-2'>
                {[['bold','B','font-bold'],['italic','I','italic']].map(([k,l,cls]) => (
                  <button key={k} onClick={() => updateEl(selected.id, k, !selected[k])}
                    className={`flex-1 py-2 text-xs rounded-lg border transition ${cls} ${selected[k]?'border-red-400 bg-red-50 text-red-700':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {l}
                  </button>
                ))}
                {['left','center','right'].map(a => (
                  <button key={a} onClick={() => updateEl(selected.id, 'align', a)}
                    title={`Rata ${a==='left'?'kiri':a==='center'?'tengah':'kanan'}`}
                    className={`flex-1 py-2 text-xs rounded-lg border transition ${selected.align===a?'border-red-400 bg-red-50 text-red-700':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {a==='left'?'←':a==='center'?'≡':'→'}
                  </button>
                ))}
              </div>
              <button onClick={() => updateEl(selected.id, 'wrap', !selected.wrap)}
                className={`w-full py-2 text-xs rounded-lg border transition font-semibold ${selected.wrap?'border-blue-400 bg-blue-50 text-blue-700':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {selected.wrap ? 'Word Wrap: ON' : 'Word Wrap: OFF'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className='fixed inset-0 z-50 bg-gray-900 flex flex-col' style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Top bar */}
      <div className='flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0'>
        <div className='flex items-center gap-3'>
          <button onClick={onCancel} title='Kembali' className='text-gray-400 hover:text-gray-600 transition'>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder='Nama Template…'
                className='text-sm font-bold text-gray-800 bg-transparent outline-none border-b border-transparent focus:border-red-300 transition w-64' />
              {form.uploadFileName && (
                <span className='text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'><Icon name='upload' size={14} className='inline align-[-2px]' /> {form.uploadFileName}</span>
              )}
            </div>
            <p className='text-[10px] text-gray-400'>{form.elements.length} elemen · {form.orientation}</p>
          </div>
        </div>

        {msg && (
          <div className={`text-xs px-3 py-1.5 rounded-lg ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{msg.t}</div>
        )}

        <div className='flex gap-2 items-center'>
          {/* Undo / Redo buttons */}
          <button onClick={undo} disabled={!canUndo} title='Batalkan (Ctrl+Z)'
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition ${canUndo ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
            ←
          </button>
          <button onClick={redo} disabled={!canRedo} title='Ulangi (Ctrl+Y)'
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition ${canRedo ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
            →
          </button>

          {!previewMode && selectedId && (
            <button onClick={() => deleteEl(selectedId)} title='Hapus elemen terpilih'
              className='w-8 h-8 flex items-center justify-center rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition'>
              <Icon name='close' size={15} />
            </button>
          )}

          <button onClick={() => setPreviewMode(p => !p)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${previewMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
            {previewMode ? <><Icon name='close' size={13} className='inline align-[-2px]' /> Tutup Preview</> : <><Icon name='eye' size={13} className='inline align-[-2px]' /> Preview</>}
          </button>
          <button onClick={() => handleSave('Draft')}
            className='px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition'>
            Simpan Draft
          </button>
          <button onClick={() => handleSave('Active')}
            className='px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            Aktifkan
          </button>
        </div>
      </div>

      {previewMode && (
        <div className='bg-blue-600 text-white text-xs font-semibold text-center py-1.5 shrink-0'>
          Mode Preview — variabel diganti dengan data contoh. Klik "Tutup Preview" untuk kembali mengedit.
        </div>
      )}

      <div className='flex flex-1 overflow-hidden'>

        {/* ── Left panel — hidden in preview mode ────────────────────────────── */}
        {!previewMode && (
          <div className='w-72 bg-white border-r border-gray-200 flex flex-col shrink-0'>

            {/* 2-row tab structure: top row = mode selector */}
            <div className='flex border-b border-gray-100 bg-gray-50'>
              {[['desain','Desain'],['properti','Properti'],['pengaturan','Pengaturan']].map(([k,l]) => (
                <button key={k} onClick={() => setPanelTab(k)}
                  className={`flex-1 py-2.5 text-xs font-bold whitespace-nowrap transition border-b-2 ${panelTab===k?'border-red-600 text-red-700 bg-white':'border-transparent text-gray-400 hover:text-gray-600 bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className='flex-1 overflow-y-auto p-4 space-y-3'>

              {/* ── Desain tab ── */}
              {panelTab === 'desain' && (
                <>
                  {/* Add element buttons */}
                  <div>
                    <p className='text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2'>Tambah Elemen</p>
                    <div className='grid grid-cols-2 gap-2'>
                      <button onClick={addText} title='Tambah teks'
                        className='flex flex-col items-center justify-center gap-1.5 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition text-gray-500 hover:text-red-600'>
                        <span className='text-xl font-bold'>T</span>
                        <span className='text-[10px] font-semibold'>Teks</span>
                      </button>
                      <button onClick={addCertNumber} title='Tambah nomor sertifikat'
                        className='flex flex-col items-center justify-center gap-1.5 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition text-gray-500 hover:text-green-700'>
                        <span className='text-base font-bold'>#</span>
                        <span className='text-[10px] font-semibold text-center leading-tight'>No. Surat</span>
                      </button>
                      <button onClick={() => imgUploadRef.current?.click()} title='Tambah gambar'
                        className='flex flex-col items-center justify-center gap-1.5 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition text-gray-500 hover:text-blue-600'>
                        <input ref={imgUploadRef} type='file' accept='image/*' className='hidden' onChange={e => addImageElement(e.target.files[0])} />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span className='text-[10px] font-semibold'>Gambar</span>
                      </button>
                      <button onClick={() => setPanelTab('pengaturan')} title='Tambah tanda tangan'
                        className='flex flex-col items-center justify-center gap-1.5 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition text-gray-500 hover:text-amber-600'>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                        <span className='text-[10px] font-semibold'>TTD</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload background */}
                  <div>
                    <p className='text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2'>Background</p>
                    <div className='border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition'
                      style={{ borderColor: form.backgroundImageUrl ? '#039299' : '#d1d5db' }}
                      onClick={() => bgRef.current?.click()}>
                      <input ref={bgRef} type='file' accept='image/*' className='hidden' onChange={e => handleBgUpload(e.target.files[0])} />
                      {form.backgroundImageUrl ? (
                        <div className='flex flex-col items-center gap-1'>
                          <img src={form.backgroundImageUrl} alt='bg' className='max-h-16 object-contain rounded' />
                          <span className='text-[10px] text-red-500'>Klik untuk ganti</span>
                        </div>
                      ) : (
                        <div>
                          <div className='text-gray-400 mb-1'><Icon name='upload' size={20} /></div>
                          <p className='text-xs font-semibold text-gray-500'>Upload Background</p>
                          <p className='text-[10px] text-gray-400'>PNG, JPG</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Layer list */}
                  {form.elements.length > 0 && (
                    <div>
                      <p className='text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2'>Layer ({form.elements.length})</p>
                      <div className='space-y-1'>
                        {[...form.elements].reverse().map(el => (
                          <button key={el.id} onClick={() => { setSelectedId(el.id); setPanelTab('properti') }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${selectedId===el.id?'bg-red-50 border border-red-200':'hover:bg-gray-50 border border-transparent'}`}>
                            <span className='text-base shrink-0 text-gray-500'><Icon e={elemIcon(el)} size={15} /></span>
                            <span className='flex-1 truncate text-left text-gray-700'>{el.content || el.signatoryId}</span>
                            <button onClick={e=>{e.stopPropagation(); deleteEl(el.id)}} title='Hapus layer' className='text-gray-300 hover:text-red-500 transition shrink-0'><Icon name='close' size={15} /></button>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Variabel Dinamis section */}
                  <div className='border border-gray-100 rounded-xl overflow-hidden'>
                    <button
                      onClick={() => setVarsOpen(v => !v)}
                      className='w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-gray-50 hover:bg-gray-100 transition'>
                      <span>{ } Variabel Dinamis</span>
                      <span className='text-gray-400 text-xs'>{varsOpen ? <Icon name='arrowUp' size={12} /> : <Icon name='arrowDown' size={12} />}</span>
                    </button>
                    {varsOpen && (
                      <div className='p-3 space-y-1'>
                        <p className='text-[9px] text-blue-600 mb-2'>Klik elemen teks di canvas, lalu gunakan tab Properti untuk menyisipkan variabel.</p>
                        {RTF_VARIABLES.map(v => (
                          <div key={v.var} className='flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 bg-gray-50'>
                            <code className='text-[9px] font-mono text-red-700 bg-white border border-red-100 px-1.5 py-0.5 rounded flex-1 select-all'>{v.var}</code>
                            <span className='text-[9px] text-gray-400 shrink-0 max-w-[80px] text-right'>{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Properti tab ── */}
              {panelTab === 'properti' && <PropertiesPanel />}

              {/* ── Pengaturan tab ── */}
              {panelTab === 'pengaturan' && (
                <>
                  <div>
                    <label className='block text-[10px] font-bold text-gray-500 mb-1'>Nama Template *</label>
                    <input value={form.name} onChange={e => setF('name', e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
                      placeholder='Nama template' />
                  </div>
                  <div>
                    <label className='block text-[10px] font-bold text-gray-500 mb-1'>Tipe Sertifikat</label>
                    <select value={form.type} onChange={e => setF('type', e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                      {CERT_TYPES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className='block text-[10px] font-bold text-gray-500 mb-1'>Orientasi</label>
                    <div className='flex gap-2'>
                      {ORIENTATIONS.map(o => (
                        <button key={o} onClick={() => setF('orientation', o)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${form.orientation===o?'border-red-400 bg-red-50 text-red-700':'border-gray-200 text-gray-600'}`}>
                          {o==='Landscape'?'▭':'▯'} {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className='block text-[10px] font-bold text-gray-500 mb-1'>Format Nomor Sertifikat</label>
                    <input value={form.certNumberFormat || ''} onChange={e => setF('certNumberFormat', e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 font-mono'
                      placeholder='CERT/[[YYYY]]/[[SEQ:4]]' />
                    <p className='text-[10px] text-gray-400 mt-1'>Token: <code>[[YYYY]]</code> tahun · <code>[[MM]]</code> bulan · <code>[[SEQ:4]]</code> nomor urut 4 digit</p>
                  </div>
                  <div>
                    <label className='block text-[10px] font-bold text-gray-500 mb-1'>Masa Berlaku (bulan, 0 = selamanya)</label>
                    <input type='number' min='0' value={form.validityMonths} onChange={e => setF('validityMonths', Number(e.target.value))}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                  </div>
                  <div>
                    <label className='block text-[10px] font-bold text-gray-500 mb-1'>Catatan Internal</label>
                    <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' />
                  </div>

                  <hr className='border-gray-100' />

                  {/* Signatory Picker also in Pengaturan */}
                  <SignatoryPicker
                    signatoryIds={form.signatoryIds}
                    onChange={ids => setF('signatoryIds', ids)}
                    onInsertToCanvas={insertSignatoryToCanvas}
                    signatories={signatories}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Canvas area ────────────────────────────────────────────────────── */}
        <div
          className={`flex-1 flex overflow-auto bg-gray-800 ${previewMode ? 'items-start justify-center pt-8' : 'items-center justify-center p-8'}`}
          onClick={() => { setSelectedId(null); setEditingId(null); setVarPopup(null) }}>

          {!form.backgroundImageUrl ? (
            // Step-by-step guidance when no background
            <div className='flex flex-col items-center gap-6 max-w-sm text-center'>
              <div className='w-20 h-20 rounded-2xl border-2 border-dashed border-gray-600 flex items-center justify-center text-4xl'><Icon name='scroll' size={40} /></div>
              <h3 className='text-white font-bold text-lg'>Mulai Buat Sertifikat</h3>
              <div className='w-full space-y-3 text-left'>
                {/* Step 1 */}
                <div className='flex items-start gap-3 bg-gray-700/60 rounded-xl p-4'>
                  <div className='w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-red-600 text-white'>1</div>
                  <div className='flex-1'>
                    <p className='text-white text-sm font-semibold'>Upload background desain sertifikat</p>
                    <p className='text-gray-400 text-xs mt-0.5'>PNG atau JPG, ukuran A4 landscape direkomendasikan</p>
                    <button
                      onClick={e => { e.stopPropagation(); bgRef.current?.click() }}
                      className='mt-2 px-4 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90 transition'
                      style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                      Upload Background
                    </button>
                  </div>
                </div>
                {/* Step 2 */}
                <div className='flex items-start gap-3 bg-gray-700/40 rounded-xl p-4 opacity-60'>
                  <div className='w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-gray-600 text-gray-300'>2</div>
                  <div className='flex-1'>
                    <p className='text-gray-300 text-sm font-semibold'>Tambahkan teks, variabel, dan tanda tangan</p>
                    <p className='text-gray-500 text-xs mt-0.5'>Gunakan panel kiri untuk menambah elemen ke canvas</p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className='flex items-start gap-3 bg-gray-700/40 rounded-xl p-4 opacity-60'>
                  <div className='w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-gray-600 text-gray-300'>3</div>
                  <div className='flex-1'>
                    <p className='text-gray-300 text-sm font-semibold'>Preview → Aktifkan</p>
                    <p className='text-gray-500 text-xs mt-0.5'>Preview dengan data contoh, lalu aktifkan template</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={canvasRef}
              className='relative select-none shadow-2xl'
              style={{
                aspectRatio: form.orientation === 'Landscape' ? '1.414/1' : '1/1.414',
                maxWidth:    form.orientation === 'Landscape' ? '900px' : '550px',
                maxHeight:   form.orientation === 'Landscape' ? '636px' : '777px',
                width: '100%',
                cursor: dragging ? 'grabbing' : 'default',
              }}
              onClick={e => { e.stopPropagation(); setSelectedId(null); setEditingId(null); setVarPopup(null) }}>

              <img src={form.backgroundImageUrl} alt='template'
                className='w-full h-full object-cover rounded'
                draggable={false} />

              {/* Snap-to-grid overlay while dragging */}
              {dragging && <GridOverlay />}

              {form.elements.map(el => {
                const isSelected = selectedId === el.id
                const dragCursor = dragging?.id === el.id ? 'grabbing' : 'grab'
                const selOutline = isSelected ? '1.5px dashed #039299' : '1.5px dashed transparent'

                if (el.type === 'signature' || el.type === 'image') {
                  return (
                    <div key={el.id}
                      onMouseDown={e => onElemMouseDown(e, el.id)}
                      style={{ position:'absolute', left:`${el.x}%`, top:`${el.y}%`, width:`${el.widthPct||15}%`, cursor:dragCursor, outline:selOutline, outlineOffset:3, zIndex:isSelected?10:1 }}>
                      {el.src
                        ? <img src={el.src} alt='' className='w-full h-auto' draggable={false} />
                        : <div className='w-full h-10 border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400'>{el.type==='signature'?'Tanda Tangan':'Gambar'}</div>}
                      {isSelected && !previewMode && (
                        <span style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'#039299', background:'white', padding:'1px 4px', borderRadius:3, border:'1px solid #fca5a5', whiteSpace:'nowrap', pointerEvents:'none' }}><Icon name='move' size={10} className='inline align-[-1px]' /> drag</span>
                      )}
                    </div>
                  )
                }

                const displayContent = previewMode ? applyDummy(el.content) : el.content

                return (
                  <div key={el.id}
                    onMouseDown={e => previewMode ? null : onElemMouseDown(e, el.id)}
                    onDoubleClick={e => {
                      if (previewMode) return
                      e.stopPropagation()
                      if (el.type === 'text') {
                        // Show variable popup
                        const rect = canvasRef.current?.getBoundingClientRect()
                        if (rect) {
                          const px = (el.x / 100) * rect.width + rect.left
                          const py = (el.y / 100) * rect.height + rect.top
                          setVarPopup({ elId: el.id, x: px, y: py })
                        }
                        setEditingId(el.id)
                      }
                    }}
                    style={{
                      position:  'absolute',
                      left:      `${el.x}%`,
                      top:       `${el.y}%`,
                      fontSize:  el.fontSize,
                      color:     el.color,
                      fontWeight:  el.bold   ? 700 : 400,
                      fontStyle:   el.italic ? 'italic' : 'normal',
                      textAlign:   el.align || 'left',
                      fontFamily:  el.fontFamily || 'Georgia, serif',
                      cursor:      previewMode ? 'default' : dragCursor,
                      userSelect:  'none',
                      whiteSpace:  el.wrap ? 'pre-wrap' : 'nowrap',
                      maxWidth:    el.wrap ? '40%' : undefined,
                      outline:     previewMode ? 'none' : selOutline,
                      outlineOffset: '3px',
                      padding:     '2px 4px',
                      borderRadius: 2,
                      background:  (!previewMode && isSelected) ? 'rgba(215,37,43,0.06)' : 'transparent',
                      zIndex:      isSelected ? 10 : 1,
                    }}>
                    {editingId === el.id && !previewMode ? (
                      <input
                        autoFocus
                        value={el.content}
                        onChange={e => updateEl(el.id, 'content', e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null) }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize:el.fontSize, color:el.color, fontWeight:el.bold?700:400, fontStyle:el.italic?'italic':'normal', fontFamily:el.fontFamily, background:'rgba(255,255,255,0.9)', border:'1px solid #039299', outline:'none', borderRadius:2, padding:'1px 4px', minWidth:80 }}
                      />
                    ) : displayContent}
                    {isSelected && !previewMode && (
                      <span style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'#039299', background:'white', padding:'1px 4px', borderRadius:3, border:'1px solid #fca5a5', whiteSpace:'nowrap', pointerEvents:'none' }}>
                        <Icon name='move' size={12} className='inline align-[-2px]' /> drag · dbl-click edit
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Soft delete snackbar */}
              {deletedEl && (
                <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', zIndex:20 }}
                  className='flex items-center gap-3 bg-gray-800 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl'>
                  <span>Elemen dihapus.</span>
                  <button onClick={undoDeleteEl}
                    className='font-bold text-yellow-300 hover:text-yellow-200 transition underline'>
                    Batalkan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Variable popup on double-click */}
      {varPopup && (
        <div
          style={{ position:'fixed', left: Math.min(varPopup.x, window.innerWidth - 280), top: varPopup.y + 20, zIndex:100, maxWidth:260 }}
          className='bg-white rounded-xl shadow-2xl border border-gray-200 p-3'
          onClick={e => e.stopPropagation()}>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-[10px] font-bold text-gray-600 uppercase tracking-wider'>Sisipkan Variabel</p>
            <button onClick={() => setVarPopup(null)} className='text-gray-300 hover:text-gray-500 text-xs'><Icon name='close' size={15} /></button>
          </div>
          <div className='flex flex-wrap gap-1'>
            {RTF_VARIABLES.map(v => (
              <button key={v.var}
                onClick={() => insertVarIntoEl(varPopup.elId, v.var)}
                title={v.desc}
                className='text-[9px] font-mono bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded hover:bg-red-100 transition'>
                {v.var.replace(/\[\[|\]\]/g, '')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Template Card ─────────────────────────────────────────────────────────────
function TplCard({ tpl, signatories, onEdit, onDuplicate, onDelete }) {
  const assigned = signatories.filter(s => (tpl.signatoryIds||[]).includes(s.id))
  return (
    <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md transition'>
      <div className='h-1.5' style={{ background: 'linear-gradient(90deg,#052B52,#039299)' }} />
      <div className='p-4 pb-3'>
        {tpl.backgroundImageUrl ? (
          <div className='rounded-lg overflow-hidden border border-gray-100' style={{ aspectRatio: tpl.orientation==='Landscape'?'1.414/1':'1/1.414' }}>
            <img src={tpl.backgroundImageUrl} alt='preview' className='w-full h-full object-cover' />
          </div>
        ) : (
          <div className='rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-2xl'
            style={{ aspectRatio:'1.414/1' }}><Icon name='scroll' size={40} /></div>
        )}
      </div>
      <div className='px-4 pb-4'>
        <div className='flex items-start justify-between mb-2'>
          <h3 className='font-bold text-gray-800 text-sm leading-tight'>{tpl.name}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${tpl.status==='Active'?'bg-green-50 text-green-700':'bg-yellow-50 text-yellow-700'}`}>
            {tpl.status}
          </span>
        </div>
        <div className='flex items-center gap-2 mb-3 flex-wrap'>
          <span className='text-xs text-gray-400'>{tpl.orientation}</span>
          <span className='text-gray-200'>·</span>
          <span className='text-xs text-gray-400'>{(tpl.elements||[]).length} elemen</span>
        </div>

        {/* Signatories chips */}
        {assigned.length > 0 && (
          <div className='flex flex-wrap gap-1.5 mb-3'>
            {assigned.map(sg => (
              <div key={sg.id} className='flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5'>
                {sg.signatureImage && (
                  <img src={sg.signatureImage} alt='ttd' className='h-4 w-auto object-contain' />
                )}
                <span className='text-[10px] text-amber-800 font-semibold'>{sg.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className='flex gap-1.5'>
          <button onClick={() => onEdit(tpl)} title='Edit template'
            className='flex-1 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition'
            style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
            <Icon name='edit' size={13} className='inline align-[-2px]' /> Edit
          </button>
          <button onClick={() => onDuplicate(tpl)} title='Salin template'
            className='px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-1'>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Salin
          </button>
          <button onClick={() => onDelete(tpl.id)} title='Hapus template'
            className='px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition'><Icon name='trash' size={14} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MasterCertificatePage() {
  const { templates, signatories, setTemplates } = useCertificateStore()
  const [pageTab,    setPageTab   ] = useState('templates')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTpl, setEditingTpl ] = useState(null)
  const [msg,        setMsg        ] = useState(null)

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const handleNew       = ()    => { setEditingTpl({...EMPTY_TPL, id:null}); setEditorOpen(true) }
  const handleEdit      = (tpl) => { setEditingTpl({...tpl}); setEditorOpen(true) }
  const handleDelete    = (id)  => { setTemplates(p=>p.filter(t=>t.id!==id)); flash('Template dihapus.') }
  const handleDuplicate = (tpl) => {
    const copy = {...tpl, id:Date.now(), name:`${tpl.name} (Salinan)`, status:'Draft'}
    setTemplates(p=>[copy,...p]); flash(`"${tpl.name}" berhasil diduplikasi.`)
  }
  const handleSave = (form) => {
    if (form.id) {
      setTemplates(p=>p.map(t=>t.id===form.id?form:t)); flash(`"${form.name}" diperbarui.`)
    } else {
      setTemplates(p=>[{...form, id:Date.now()},...p]); flash(`"${form.name}" berhasil dibuat.`)
    }
    setEditorOpen(false); setEditingTpl(null)
  }

  const activeCount = templates.filter(t=>t.status==='Active').length

  if (editorOpen && editingTpl) {
    return <CanvasEditor tpl={editingTpl} onSave={handleSave} onCancel={()=>{setEditorOpen(false);setEditingTpl(null)}} />
  }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Master Certificate</h1>
      <p className='text-gray-500 text-sm mb-6'>
        Kelola template sertifikat dan daftar penandatangan yang dapat dipilih saat membuat template.
      </p>

      {msg && (
        <div className={`text-xs px-4 py-3 rounded-lg mb-4 ${msg.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-600'}`}>{msg.text}</div>
      )}

      {/* Page tabs */}
      <div className='flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit'>
        {[['templates','Template Sertifikat'],['signatories','Master Tanda Tangan']].map(([k,l]) => (
          <button key={k} onClick={() => setPageTab(k)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition ${pageTab===k?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Templates tab */}
      {pageTab === 'templates' && (
        <>
          <div className='flex justify-between items-center mb-4'>
            <p className='text-sm text-gray-500'>{templates.length} template</p>
            <button onClick={handleNew}
              className='px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 flex items-center gap-2 transition'
              style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              + Buat Template Baru
            </button>
          </div>

          {templates.length === 0 ? (
            <div className='bg-white rounded-2xl p-16 text-center shadow-sm'>
              <div className='text-5xl mb-4'><Icon name='scroll' size={40} /></div>
              <h3 className='font-bold text-gray-700 mb-1'>Belum ada template</h3>
              <p className='text-sm text-gray-400 mb-5'>Upload desain sertifikat dan tambahkan variabel dinamis di atasnya.</p>
              <button onClick={handleNew} className='px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90'
                style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                + Buat Template Baru
              </button>
            </div>
          ) : (
            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5'>
              {templates.map(tpl=>(
                <TplCard key={tpl.id} tpl={tpl} signatories={signatories}
                  onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Signatories tab */}
      {pageTab === 'signatories' && <SignatoryManager />}
    </div>
  )
}
