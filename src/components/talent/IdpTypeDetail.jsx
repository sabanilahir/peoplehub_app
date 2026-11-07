'use client'
import { useState } from 'react'
import { CTD_COURSES, TRAINING_DELIVERY } from '@/store/idpStore'
import Icon from '@/components/ui/Icon'

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-500'

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className='mb-1.5 block text-sm font-semibold text-gray-700'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {children}
      {hint && <p className='mt-1 text-xs text-gray-400'>{hint}</p>}
    </div>
  )
}

// ── Textarea dengan penghitung karakter ───────────────────────────────────────
function TextArea({ value = '', onChange, max, rows = 3, placeholder, disabled }) {
  return (
    <div>
      <textarea
        rows={rows} maxLength={max} value={value} disabled={disabled} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`${inputCls} resize-y`}
      />
      {max ? <div className='mt-0.5 text-right text-xs text-gray-300'>{(value || '').length}/{max}</div> : null}
    </div>
  )
}

// ── Input teks dengan penghitung ─────────────────────────────────────────────
function CountedInput({ value = '', onChange, max, placeholder, disabled }) {
  return (
    <div>
      <input
        value={value} maxLength={max} disabled={disabled} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={inputCls}
      />
      {max ? <div className='mt-0.5 text-right text-xs text-gray-300'>{(value || '').length}/{max}</div> : null}
    </div>
  )
}

// ── Input chip (tag) ──────────────────────────────────────────────────────────
function Chips({ value = [], onChange, placeholder, disabled }) {
  const [text, setText] = useState('')
  const add = () => {
    const v = text.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setText('')
  }
  return (
    <div className='flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100'>
      {value.map(t => (
        <span key={t} className='inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'>
          {t}
          {!disabled && <button type='button' onClick={() => onChange(value.filter(x => x !== t))} className='text-blue-400 hover:text-blue-700'>×</button>}
        </span>
      ))}
      {!disabled && (
        <input
          value={text} placeholder={value.length ? 'Ketik…' : placeholder}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          onBlur={add}
          className='min-w-[90px] flex-1 border-0 py-0.5 text-sm text-gray-700 outline-none'
        />
      )}
    </div>
  )
}

// ── Kotak unggah berkas (simulasi — simpan nama file saja) ─────────────────────
function FileDrop({ value, onChange, disabled, compact }) {
  return (
    <label className={`flex ${compact ? 'h-[52px]' : 'min-h-[92px]'} cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 px-3 text-center text-xs text-gray-500 transition hover:border-red-300 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {value
        ? <span className='inline-flex items-center gap-1.5 font-medium text-gray-700'><Icon name='clip' size={14} /> {value}</span>
        : <>
            <span className='inline-flex items-center gap-1.5 text-gray-500'>
              <Icon name='upload' size={compact ? 14 : 18} className='text-gray-400' />
              {compact ? 'Upload File atau Link' : <>Tarik file ke sini atau <span className='font-semibold text-red-600'>pilih file</span></>}
            </span>
            <span className='text-[11px] text-gray-400'>{compact ? 'Maks. 5MB' : 'JPG, PNG, atau PDF — maks 5MB'}</span>
          </>}
      <input type='file' className='hidden' disabled={disabled} onChange={e => onChange(e.target.files?.[0]?.name || '')} />
    </label>
  )
}

// ── Kartu orang (reviewer read-only) ──────────────────────────────────────────
function PersonCard({ name, sub, auto }) {
  return (
    <div className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm'>
      <span className='flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white'>{(name || '?')[0]}</span>
      <div className='min-w-0'>
        <div className='flex items-center gap-1.5'>
          <span className='text-sm font-semibold text-gray-800'>{name || '—'}</span>
          {auto && <span className='rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600'>AUTO</span>}
        </div>
        {sub && <div className='text-xs text-gray-400'>{sub}</div>}
      </div>
    </div>
  )
}

// ── Select orang (mentor / coach) ─────────────────────────────────────────────
function PersonSelect({ value, onChange, people, disabled }) {
  const sel = people.find(p => p.name === value) || people[0]
  return (
    <div className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm'>
      <span className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white'>{(sel?.name || '?')[0]}</span>
      <select
        value={value || sel?.name || ''} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className='w-full border-0 bg-transparent text-sm font-semibold text-gray-800 outline-none disabled:text-gray-500'
      >
        {people.map(p => <option key={p.name} value={p.name}>{p.name}{p.sub ? ` — ${p.sub}` : ''}</option>)}
      </select>
    </div>
  )
}

const InfoBox = ({ children, tone = 'info' }) => (
  <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${tone === 'warn' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' : 'bg-blue-50/70 text-gray-600 ring-1 ring-blue-100'}`}>
    <span className={`mt-0.5 flex-shrink-0 ${tone === 'warn' ? 'text-amber-500' : 'text-blue-400'}`}><Icon name='info' size={16} /></span>
    <span>{children}</span>
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
// Form per tipe IDP
// ══════════════════════════════════════════════════════════════════════════════

function CtdCourse({ detail, set, readOnly }) {
  return (
    <div>
      <h4 className='mb-4 flex items-center gap-2 text-sm font-bold text-gray-800'>
        <Icon name='book' size={16} className='text-red-600' /> Pilih Pelatihan — CTD Catalog Course
      </h4>
      <div className='overflow-x-auto rounded-xl ring-1 ring-gray-100'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'>
              <th className='px-4 py-3'>Nama Course</th>
              <th className='px-4 py-3'>Kategori</th>
              <th className='px-4 py-3'>Periode Pembukaan</th>
              <th className='px-4 py-3'>Tanggal Pelaksanaan</th>
              <th className='px-4 py-3'>Durasi</th>
              <th className='px-4 py-3'>Aksi</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {CTD_COURSES.map(c => {
              const picked = detail.courseId === c.id
              return (
                <tr key={c.id} className={picked ? 'bg-red-50/40' : ''}>
                  <td className='px-4 py-3'>
                    <div className='font-semibold text-gray-800'>{c.name}</div>
                    <div className='mt-0.5 max-w-xs text-xs text-gray-400'>{c.description}</div>
                  </td>
                  <td className='px-4 py-3 text-gray-600'>{c.category}</td>
                  <td className='px-4 py-3 text-gray-600'>{c.openPeriod}</td>
                  <td className='px-4 py-3 text-gray-600'>{c.execDate}</td>
                  <td className='px-4 py-3 text-gray-600'>{c.duration}</td>
                  <td className='px-4 py-3'>
                    <button
                      type='button' disabled={readOnly}
                      onClick={() => set({ courseId: picked ? '' : c.id, courseName: picked ? '' : c.name })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-50 ${
                        picked ? 'bg-red-600 text-white ring-red-600' : 'bg-white text-red-600 ring-red-200 hover:bg-red-50'
                      }`}
                    >
                      {picked ? '✓ Terpilih' : 'Pilih Course'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProjectForm({ detail, set, readOnly }) {
  return (
    <div>
      <h4 className='text-sm font-bold text-gray-800'>Rincian Project</h4>
      <p className='mb-4 text-xs text-gray-400'>Tuliskan project yang ingin Anda jalankan untuk meningkatkan kompetensi ini.</p>
      <div className='grid gap-x-6 gap-y-4 md:grid-cols-2'>
        <Field label='Nama Project' required>
          <TextArea rows={3} value={detail.name} onChange={v => set({ name: v })} placeholder='Contoh: Digital Marketing Campaign Optimization' disabled={readOnly} />
        </Field>
        <Field label='Goal / Tujuan Project' required>
          <TextArea rows={3} max={500} value={detail.goal} onChange={v => set({ goal: v })} placeholder='Jelaskan tujuan utama project ini dan kompetensi apa yang ingin ditingkatkan.' disabled={readOnly} />
        </Field>
        <Field label='Periode Project' required>
          <div className='flex items-center gap-2'>
            <input type='date' value={detail.start || ''} disabled={readOnly} onChange={e => set({ start: e.target.value })} className={inputCls} />
            <span className='text-gray-400'>–</span>
            <input type='date' value={detail.end || ''} disabled={readOnly} onChange={e => set({ end: e.target.value })} className={inputCls} />
          </div>
        </Field>
        <Field label='Durasi Project' required hint='Contoh: 3 bulan, 6 bulan'>
          <input value={detail.duration || ''} disabled={readOnly} onChange={e => set({ duration: e.target.value })} placeholder='Contoh: 3 bulan' className={inputCls} />
        </Field>
        <Field label='Peran Anda dalam Project' required>
          <CountedInput max={100} value={detail.role} onChange={v => set({ role: v })} placeholder='Contoh: Project Lead, Project Member, Contributor' disabled={readOnly} />
        </Field>
        <Field label='Stakeholder / PIC (Opsional)'>
          <CountedInput max={100} value={detail.stakeholder} onChange={v => set({ stakeholder: v })} placeholder='Contoh: Tim Marketing, Manager Sales' disabled={readOnly} />
        </Field>
      </div>
      <div className='mt-4'>
        <InfoBox>Pastikan project tersebut menantang namun sesuai dengan peran Anda saat ini dan memberikan pengalaman serta kompetensi yang Anda butuhkan.</InfoBox>
      </div>
    </div>
  )
}

function TrainingForm({ detail, set, readOnly }) {
  return (
    <div>
      <h4 className='mb-4 text-sm font-bold text-gray-800'>Rincian Training</h4>
      <div className='grid gap-x-6 gap-y-4 md:grid-cols-2'>
        <Field label='Nama training' className='md:col-span-2'>
          <input value={detail.name || ''} disabled={readOnly} onChange={e => set({ name: e.target.value })} placeholder='Contoh: Agile Learning Bootcamp' className={inputCls} />
        </Field>
        <Field label='Penyelenggara'>
          <input value={detail.organizer || ''} disabled={readOnly} onChange={e => set({ organizer: e.target.value })} placeholder='Nama institusi / vendor' className={inputCls} />
        </Field>
        <Field label='Jenis pelaksanaan'>
          <select value={detail.delivery || 'Online'} disabled={readOnly} onChange={e => set({ delivery: e.target.value })} className={inputCls}>
            {TRAINING_DELIVERY.map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label='Tanggal mulai'>
          <input type='date' value={detail.start || ''} disabled={readOnly} onChange={e => set({ start: e.target.value })} className={inputCls} />
        </Field>
        <Field label='Durasi (hari)'>
          <input type='number' min='1' value={detail.days || ''} disabled={readOnly} onChange={e => set({ days: e.target.value })} placeholder='2' className={inputCls} />
        </Field>
        <Field label='Estimasi biaya (Rp)' className='md:col-span-2'>
          <input value={detail.cost || ''} disabled={readOnly} onChange={e => set({ cost: e.target.value })} placeholder='5.000.000' className={inputCls} />
        </Field>
        <Field label='Brosur / informasi training' className='md:col-span-2'>
          <FileDrop value={detail.brochure} onChange={v => set({ brochure: v })} disabled={readOnly} />
        </Field>
      </div>
      <div className='mt-4'>
        <InfoBox tone='warn'>Menunggu persetujuan atasan setelah disimpan.</InfoBox>
      </div>
    </div>
  )
}

function AssignmentForm({ detail, set, readOnly, reviewer }) {
  return (
    <div>
      <h4 className='text-sm font-bold text-gray-800'>Assignment Details</h4>
      <p className='mb-4 text-xs text-gray-400'>Tulis assignment yang ingin Anda jalankan untuk meningkatkan kompetensi ini.</p>
      <div className='grid gap-x-6 gap-y-4 md:grid-cols-2'>
        <Field label='Assignment Title' required>
          <TextArea rows={2} max={100} value={detail.title} onChange={v => set({ title: v })} placeholder='Contoh: Lead Weekly Sales Meeting' disabled={readOnly} />
        </Field>
        <Field label='Development Goal' required>
          <TextArea rows={2} max={500} value={detail.goal} onChange={v => set({ goal: v })} placeholder='Meningkatkan kemampuan komunikasi…' disabled={readOnly} />
        </Field>
        <Field label='Assignment Description' required>
          <TextArea rows={3} max={500} value={detail.description} onChange={v => set({ description: v })} placeholder='Menjadi PIC dan fasilitator…' disabled={readOnly} />
        </Field>
        <Field label='Period' required>
          <div className='flex items-center gap-2'>
            <input type='date' value={detail.start || ''} disabled={readOnly} onChange={e => set({ start: e.target.value })} className={inputCls} />
            <span className='text-gray-400'>–</span>
            <input type='date' value={detail.end || ''} disabled={readOnly} onChange={e => set({ end: e.target.value })} className={inputCls} />
            <input value={detail.durationLabel || ''} disabled={readOnly} onChange={e => set({ durationLabel: e.target.value })} placeholder='1 Month' className={`${inputCls} w-28`} />
          </div>
        </Field>
        <Field label='Expected Deliverables' required>
          <Chips value={detail.deliverables} onChange={v => set({ deliverables: v })} placeholder='Contoh: Action Plan' disabled={readOnly} />
        </Field>
        <Field label='Success Indicator' required>
          <TextArea rows={3} max={300} value={detail.successIndicator} onChange={v => set({ successIndicator: v })} placeholder='Meeting berjalan sesuai agenda…' disabled={readOnly} />
        </Field>
        <Field label='Supervisor (Reviewer)'>
          <PersonCard name={reviewer?.name} sub={reviewer?.sub} auto />
        </Field>
        <Field label='Evidence (Optional)'>
          <FileDrop compact value={detail.evidence} onChange={v => set({ evidence: v })} disabled={readOnly} />
        </Field>
      </div>
    </div>
  )
}

function MentorForm({ detail, set, readOnly, people, coaching }) {
  const roleLabel = coaching ? 'Coach' : 'Mentor'
  const noun = coaching ? 'Coaching' : 'Mentoring'
  return (
    <div>
      <h4 className='text-sm font-bold text-gray-800'>{noun} Details</h4>
      <p className='mb-4 text-xs text-gray-400'>Lengkapi informasi {noun.toLowerCase()} untuk pengembangan kompetensi ini.</p>
      <div className='grid gap-x-6 gap-y-4 md:grid-cols-2'>
        <Field label={roleLabel} required>
          <PersonSelect value={detail.mentor} onChange={v => set({ mentor: v })} people={people} disabled={readOnly} />
        </Field>
        <Field label={`${noun} Goal`} required>
          <TextArea rows={3} max={500} value={detail.goal} onChange={v => set({ goal: v })} placeholder='Meningkatkan kemampuan…' disabled={readOnly} />
        </Field>
        <Field label={`Periode ${noun}`} required>
          <div className='flex items-center gap-2'>
            <input type='date' value={detail.start || ''} disabled={readOnly} onChange={e => set({ start: e.target.value })} className={inputCls} />
            <span className='text-gray-400'>–</span>
            <input type='date' value={detail.end || ''} disabled={readOnly} onChange={e => set({ end: e.target.value })} className={inputCls} />
          </div>
        </Field>
        <Field label={`Topik ${noun}`} required>
          <Chips value={detail.topics} onChange={v => set({ topics: v })} placeholder='Contoh: Problem Solving' disabled={readOnly} />
        </Field>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function IdpTypeDetail({ type, detail = {}, onChange, readOnly, reviewer, people = [] }) {
  const set = patch => onChange({ ...detail, ...patch })
  const props = { detail, set, readOnly }
  switch (type) {
    case 'CTD Catalog Course': return <CtdCourse {...props} />
    case 'Project':            return <ProjectForm {...props} />
    case 'Training':           return <TrainingForm {...props} />
    case 'Assignment':         return <AssignmentForm {...props} reviewer={reviewer} />
    case 'Mentoring':          return <MentorForm {...props} people={people} />
    case 'Coaching':           return <MentorForm {...props} people={people} coaching />
    default:                   return null
  }
}
