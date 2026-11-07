'use client'
import { useState, useMemo, Fragment } from 'react'
import {
  PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, ActionButton,
  EmptyState, Select, SearchBar, Input, FormField,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { useMasterActivityStore } from '@/store/masterActivityStore'

// ─── Master Activity Point ──────────────────────────────────────────────────
// Benchmark: Moodle activity modules + completion tracking + Level Up! gamification.
// Setiap "activity module" punya aturan poin, syarat penyelesaian (completion
// trigger), batas perolehan, dan opsi pengulangan. Menjadi referensi ketika
// sebuah course memakai tipe Activity Point.

// Kategori aktivitas (mengikuti pengelompokan modul Moodle).
const CATEGORIES = ['Content', 'Assessment', 'Engagement', 'Community', 'Participation Point']
const CAT_TONE = { Content:'info', Assessment:'success', Engagement:'warning', Community:'purple', 'Participation Point':'pink' }
// Warna chip ikon per kategori (soft background + foreground).
const CAT_CHIP = {
  Content:       { bg:'#eff6ff', fg:'#2563eb' },
  Assessment:    { bg:'#ecfdf5', fg:'#059669' },
  Engagement:    { bg:'#fffbeb', fg:'#d97706' },
  Community: { bg:'#f5f3ff', fg:'#7c3aed' },
  'Participation Point': { bg:'#fdf2f8', fg:'#db2777' },
}

// Completion trigger — kapan poin diberikan (Moodle activity completion).
const TRIGGERS = ['On View', 'On Submit', 'On Pass Grade', 'On Complete']

// Ikon SVG profesional (Feather/Lucide) per tipe aktivitas.
const ICON_NAME = {
  VIDEO:'play', READ:'book', PAGE:'file', BOOK:'book', DOWNLOAD:'arrowDown', URL:'link',
  SCORM:'package', H5P:'puzzle', QUIZ_PASS:'checkSmall', ASSIGNMENT:'edit', WORKSHOP:'users',
  LESSON:'target', DISCUSSION:'message', FORUM:'message', SURVEY:'chart', FEEDBACK:'bulb',
  CHOICE:'clipboard', ATTENDANCE:'calendar', TRAINER:'users',
  PENGAJAR:'users', DEVELOP_MODULE:'package', COACHING:'handshake', MENTORING:'users',
  LEARNING_TOOLS:'edit', PESERTA_TRAINING:'graduation', BEST_STUDENT:'trophy',
}
const iconFor = (code) => ICON_NAME[code] || 'graduation'

// Daftar tipe aktivitas yang dikenali sistem (dipakai sebagai pilihan dropdown
// Activity Code). Setiap tipe terikat ke satu kategori, sehingga pilihan
// Activity Code mengikuti kategori yang dipilih.
const ACTIVITY_CODES = [
  { code:'VIDEO',      label:'Video',              category:'Content' },
  { code:'READ',       label:'Read Material',      category:'Content' },
  { code:'PAGE',       label:'Page',               category:'Content' },
  { code:'BOOK',       label:'Book',               category:'Content' },
  { code:'DOWNLOAD',   label:'Download File',      category:'Content' },
  { code:'URL',        label:'External URL',       category:'Content' },
  { code:'SCORM',      label:'SCORM Package',      category:'Content' },
  { code:'H5P',        label:'Interactive (H5P)',  category:'Content' },
  { code:'QUIZ_PASS',  label:'Quiz',               category:'Assessment' },
  { code:'ASSIGNMENT', label:'Assignment',         category:'Assessment' },
  { code:'WORKSHOP',   label:'Workshop',           category:'Assessment' },
  { code:'LESSON',     label:'Lesson',             category:'Assessment' },
  { code:'SURVEY',     label:'Survey',             category:'Engagement' },
  { code:'FEEDBACK',   label:'Feedback',           category:'Engagement' },
  { code:'CHOICE',     label:'Choice',             category:'Engagement' },
  { code:'ATTENDANCE', label:'Attendance',         category:'Engagement' },
  { code:'DISCUSSION', label:'Discussion',         category:'Community' },
  { code:'FORUM',      label:'Forum',              category:'Community' },
  { code:'TRAINER',    label:'Trainer',            category:'Community' },
  { code:'PENGAJAR',         label:'Pengajar',               category:'Participation Point' },
  { code:'DEVELOP_MODULE',   label:'Develop Module',         category:'Participation Point' },
  { code:'COACHING',         label:'Coaching',               category:'Participation Point' },
  { code:'MENTORING',        label:'Mentoring',              category:'Participation Point' },
  { code:'LEARNING_TOOLS',   label:'Creating Learning Tools',category:'Participation Point' },
  { code:'PESERTA_TRAINING', label:'Peserta Training',       category:'Participation Point' },
  { code:'BEST_STUDENT',     label:'Best Student',           category:'Participation Point' },
]

// Chip ikon dengan warna sesuai kategori.
function ActivityIcon({ code, category, size = 18 }) {
  const c = CAT_CHIP[category] || { bg:'#f3f4f6', fg:'#6b7280' }
  const box = size + 20
  return (
    <span className='inline-flex flex-shrink-0 items-center justify-center rounded-lg'
      style={{ width:box, height:box, background:c.bg, color:c.fg }}>
      <Icon name={iconFor(code)} size={size} />
    </span>
  )
}

const BLANK = {
  activity_name:'', activity_code:'', category:'Content', trigger:'On View',
  point:'10', max_earn:'1', repeatable:false, cooldown:'0', min_grade:'0',
  description:'', status:'Active',
}

const numOr0 = (v) => Number(v) || 0

export default function MasterActivityPointPage() {
  const { activities: data, addActivity, updateActivity, deleteActivity, toggleStatus } = useMasterActivityStore()
  const [query,  setQuery]  = useState('')
  const [catF,   setCatF]   = useState('')
  const [statF,  setStatF]  = useState('')
  const [modal,  setModal]  = useState(false)
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(BLANK)
  const [msg,    setMsg]    = useState(null)
  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  // Pilihan Activity Code mengikuti kategori yang dipilih pada form.
  const codeOptions = useMemo(
    () => ACTIVITY_CODES.filter(a => a.category === form.category),
    [form.category])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter(d =>
      (!catF  || d.category === catF) &&
      (!statF || d.status === statF) &&
      (!q || `${d.activity_name} ${d.activity_code} ${d.description}`.toLowerCase().includes(q)))
  }, [data, query, catF, statF])

  // Kelompokkan hasil filter per kategori (tampilan ala Moodle course index).
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(d => { (map[d.category] ||= []).push(d) })
    return CATEGORIES.filter(c => map[c]?.length).map(c => [c, map[c]])
  }, [filtered])

  const openNew  = () => { setForm(BLANK); setEditId(null); setModal(true) }
  const openEdit = (d) => {
    setForm({
      activity_name:d.activity_name, activity_code:d.activity_code, category:d.category, trigger:d.trigger,
      point:String(d.point), max_earn:d.max_earn, repeatable:d.repeatable, cooldown:String(d.cooldown),
      min_grade:String(d.min_grade), description:d.description||'', status:d.status,
    })
    setEditId(d.id); setModal(true)
  }
  const close = () => { setModal(false); setEditId(null); setForm(BLANK) }

  const save = () => {
    if (!form.activity_name.trim()) return flash('Nama aktivitas wajib diisi.', 'error')
    if (!form.activity_code.trim()) return flash('Activity code wajib diisi.', 'error')
    const payload = {
      ...form,
      activity_code:form.activity_code.toUpperCase().replace(/\s+/g,'_'),
      point:numOr0(form.point), cooldown:numOr0(form.cooldown), min_grade:numOr0(form.min_grade),
    }
    if (editId) { updateActivity(editId, payload); flash('Activity point diperbarui.') }
    else        { addActivity(payload); flash('Activity point ditambahkan.') }
    close()
  }
  const remove     = (id) => { deleteActivity(id); flash('Activity point dihapus.') }
  const toggleStat = (id) => { toggleStatus(id) }

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${msg.type==='error'?'bg-red-600 text-white':'bg-gray-900 text-white'}`}>
          {msg.type==='error'?'⚠':'✓'} {msg.text}
        </div>
      )}

      <PageHeader icon='🎯' title='Master Activity Point'
        subtitle='Katalog modul aktivitas beserta aturan poin, syarat penyelesaian, dan batas perolehan. Menjadi referensi untuk course bertipe Activity Point.' />

      <SectionCard title={`Katalog Activity (${filtered.length})`} bodyClass='p-0'
        actions={
          <div className='flex flex-nowrap items-center justify-end gap-2'>
            <div className='hidden w-44 sm:block'><SearchBar value={query} onChange={setQuery} placeholder='Cari aktivitas…' /></div>
            <div className='w-36'>
              <Select value={catF} onChange={e=>setCatF(e.target.value)} className='py-2 text-xs'>
                <option value=''>Semua Kategori</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className='w-32'>
              <Select value={statF} onChange={e=>setStatF(e.target.value)} className='py-2 text-xs'>
                <option value=''>Semua Status</option>
                <option value='Active'>Active</option>
                <option value='Inactive'>Inactive</option>
              </Select>
            </div>
            <button onClick={openNew} className='shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>+ Add Activity</button>
          </div>
        }>
        {filtered.length === 0 ? (
          <div className='p-6'><EmptyState title='Tidak ada activity point.' description='Ubah filter atau tambahkan modul aktivitas baru.' /></div>
        ) : (
          <DataTable className='rounded-none shadow-none ring-0'
            columns={['Activity', 'Category', 'Completion Trigger', {label:'Point',align:'right'}, {label:'Max / Course',align:'center'}, 'Rule', 'Status', {label:'Aksi',align:'right'}]}>
            {grouped.map(([cat, rows]) => (
              <Fragment key={cat}>
                <tr className='bg-gray-50/70'>
                  <td colSpan={8} className='px-4 py-2'>
                    <span className='text-[11px] font-bold uppercase tracking-wide text-gray-500'>{cat}</span>
                    <span className='ml-2 text-[11px] text-gray-400'>{rows.length} aktivitas</span>
                  </td>
                </tr>
                {rows.map(d => (
                  <Tr key={d.id}>
                    <Td>
                      <div className='flex items-center gap-2.5'>
                        <ActivityIcon code={d.activity_code} category={d.category} />
                        <div className='min-w-0'>
                          <div className='font-medium text-gray-800'>{d.activity_name}</div>
                          <div className='font-mono text-[11px] text-gray-400'>{d.activity_code}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><StatusBadge tone={CAT_TONE[d.category]||'neutral'}>{d.category}</StatusBadge></Td>
                    <Td className='text-xs text-gray-600'>{d.trigger}{d.trigger==='On Pass Grade' && d.min_grade>0 && <span className='text-gray-400'> (≥{d.min_grade})</span>}</Td>
                    <Td align='right'><span className='font-semibold text-gray-800'>+{d.point}</span></Td>
                    <Td align='center' className='text-xs text-gray-500'>{d.max_earn}</Td>
                    <Td className='text-xs text-gray-500'>
                      {d.repeatable
                        ? <span className='inline-flex items-center gap-1'><Icon name='repeat' size={14} /> Repeatable{d.cooldown>0 && ` · ${d.cooldown}h`}</span>
                        : <span className='text-gray-400'>Once</span>}
                    </Td>
                    <Td>
                      <button onClick={()=>toggleStat(d.id)} title='Klik untuk ubah status'>
                        <StatusBadge tone={d.status==='Active'?'success':'neutral'}>{d.status}</StatusBadge>
                      </button>
                    </Td>
                    <Td align='right'>
                      <div className='flex justify-end gap-1.5'>
                        <ActionButton size='sm' variant='secondary' onClick={()=>openEdit(d)}>Edit</ActionButton>
                        <button onClick={()=>remove(d.id)} className='px-2 text-xs font-semibold text-gray-400 hover:text-red-600'>Hapus</button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Fragment>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={close}>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl' onClick={e=>e.stopPropagation()}>
            <div className='sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4'>
              <div className='flex items-center gap-2.5'>
                <ActivityIcon code={form.activity_code} category={form.category} size={20} />
                <h2 className='text-base font-bold text-gray-800'>{editId ? 'Edit Activity Point' : 'Add Activity Point'}</h2>
              </div>
              <button onClick={close} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>

            <div className='space-y-5 px-6 py-5'>
              <div>
                <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Identitas Aktivitas</h3>
                <div className='grid grid-cols-2 gap-3'>
                  <FormField label='Activity Name' required><Input value={form.activity_name} onChange={e=>setForm(f=>({...f,activity_name:e.target.value}))} placeholder='mis. Quiz Passed' /></FormField>
                  <FormField label='Category' required hint='Menentukan tipe aktivitas yang tersedia'>
                    <Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value,activity_code:''}))}>
                      {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormField>
                  <FormField label='Activity Code' required hint='Menentukan tipe & ikon aktivitas'>
                    <Select value={form.activity_code} onChange={e=>setForm(f=>({...f,activity_code:e.target.value}))}>
                      <option value=''>— Pilih tipe —</option>
                      {codeOptions.map(a=><option key={a.code} value={a.code}>{a.label} ({a.code})</option>)}
                    </Select>
                  </FormField>
                  <FormField label='Completion Trigger' hint='Kapan poin diberikan'>
                    <Select value={form.trigger} onChange={e=>setForm(f=>({...f,trigger:e.target.value}))}>
                      {TRIGGERS.map(t=><option key={t} value={t}>{t}</option>)}
                    </Select>
                  </FormField>
                </div>
              </div>

              <div>
                <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Aturan Poin</h3>
                <div className='grid grid-cols-2 gap-3'>
                  <FormField label='Point' required><Input type='number' value={form.point} onChange={e=>setForm(f=>({...f,point:e.target.value}))} /></FormField>
                  <FormField label='Maximum Earn / Course' hint='Angka atau "Unlimited"'><Input value={form.max_earn} onChange={e=>setForm(f=>({...f,max_earn:e.target.value}))} placeholder='1 / Unlimited' /></FormField>
                  {form.trigger==='On Pass Grade' && (
                    <FormField label='Min. Grade (%)' hint='Nilai minimum kelulusan'><Input type='number' value={form.min_grade} onChange={e=>setForm(f=>({...f,min_grade:e.target.value}))} /></FormField>
                  )}
                  <FormField label='Cooldown (jam)' hint='Jeda antar perolehan, 0 = tanpa jeda'><Input type='number' value={form.cooldown} onChange={e=>setForm(f=>({...f,cooldown:e.target.value}))} disabled={!form.repeatable} /></FormField>
                </div>
                <label className='mt-3 flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm'>
                  <input type='checkbox' checked={form.repeatable} onChange={e=>setForm(f=>({...f,repeatable:e.target.checked}))} className='h-4 w-4' />
                  <span className='font-medium text-gray-700'>Repeatable</span>
                  <span className='text-xs text-gray-400'>Poin dapat diperoleh lebih dari sekali (hingga batas Max Earn)</span>
                </label>
              </div>

              <div>
                <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-400'>Lainnya</h3>
                <FormField label='Description'>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2}
                    className='w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100' />
                </FormField>
                <FormField label='Status' className='mt-3'>
                  <Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value='Active'>Active</option>
                    <option value='Inactive'>Inactive</option>
                  </Select>
                </FormField>
              </div>
            </div>

            <div className='sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4'>
              <button onClick={save} className='flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{editId ? 'Simpan Perubahan' : 'Tambah Activity'}</button>
              <button onClick={close} className='flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200'>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
