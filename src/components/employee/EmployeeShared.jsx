'use client'
import { useT } from '@/store/languageStore'

export const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
export const selectClass = inputClass

export function Field({ label, children }) {
  return (
    <div>
      <label className='block text-xs font-semibold text-gray-500 mb-1'>{label}</label>
      {children}
    </div>
  )
}

export function Input({ value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <input
      type={type} value={value || ''} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      className={`${inputClass} ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
    />
  )
}

export function Select({ value, onChange, options, disabled = false }) {
  const t = useT()
  return (
    <select
      value={value || ''} onChange={onChange} disabled={disabled}
      className={`${selectClass} ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
    >
      <option value=''>{t('-- Pilih --', '-- Select --')}</option>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  )
}

export function Section({ title, children }) {
  return (
    <div>
      <h3 className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-3'>{title}</h3>
      {children}
    </div>
  )
}

export function Avatar({ emp, size = 'md' }) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-9 h-9'
  const txt = size === 'lg' ? 'text-lg font-bold' : 'text-xs font-bold'
  const initials = (emp?.name || '?').trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={`${dim} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
      {emp?.photo
        ? <img src={emp.photo} alt='' className='w-full h-full object-cover' />
        : <span className={`${txt} text-white`}>{initials}</span>
      }
    </div>
  )
}

export function GradeSelect({ value, onChange, grades, placeholder }) {
  const t = useT()
  const grouped = grades.reduce((m, g) => { (m[g.category] ??= []).push(g); return m }, {})
  return (
    <select value={value || ''} onChange={onChange} className={selectClass}>
      <option value=''>{placeholder || t('-- Pilih --', '-- Select --')}</option>
      {Object.entries(grouped).map(([cat, items]) => (
        <optgroup key={cat} label={`── ${cat} ──`}>
          {items.map(g => (
            <option key={g.id} value={g.id}>{g.code.replace('PC', '')} · {g.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

// Cascading org selects: Company → (auto-derives Division) → BU → Dept → Position
export function CascadingOrgSelects({ form, setForm, S }) {
  const t = useT()

  const filteredBUs   = S.businessUnits.filter(bu => !form.companyId || bu.companyId === +form.companyId)
  const filteredDepts = S.departments.filter(d  => !form.businessUnitId || d.businessUnitId === +form.businessUnitId)
  const filteredPos   = S.positions.filter(p    => !form.departmentId  || p.departmentId    === +form.departmentId)

  const handleCompany = (e) => {
    const companyId = e.target.value ? +e.target.value : ''
    const company   = S.companies.find(c => c.id === companyId)
    setForm(f => ({ ...f, companyId, divisionId: company?.divisionId || '', businessUnitId: '', departmentId: '', positionId: '' }))
  }
  const handleBU   = (e) => setForm(f => ({ ...f, businessUnitId: e.target.value ? +e.target.value : '', departmentId: '', positionId: '' }))
  const handleDept = (e) => setForm(f => ({ ...f, departmentId:   e.target.value ? +e.target.value : '', positionId: '' }))
  const handlePos  = (e) => setForm(f => ({ ...f, positionId:     e.target.value ? +e.target.value : '' }))

  return (
    <>
      <Field label={t('Company *', 'Company *')}>
        <select value={form.companyId || ''} onChange={handleCompany} className={selectClass}>
          <option value=''>{t('-- Pilih --', '-- Select --')}</option>
          {S.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {form.companyId && (() => {
          const code = S.companies.find(x => x.id === +form.companyId)?.companyCode
          return code
            ? <span className='inline-block mt-1 font-mono font-bold text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded tracking-widest'>{code}</span>
            : null
        })()}
      </Field>

      <Field label='Division'>
        <select
          value={form.divisionId || ''}
          disabled
          className={`${selectClass} bg-gray-50 text-gray-400 cursor-not-allowed`}
        >
          <option value=''>{t('— Auto dari Company —', '— Auto from Company —')}</option>
          {S.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {!form.companyId && <p className='text-xs text-gray-400 mt-1'>{t('Pilih Company terlebih dahulu', 'Select a Company first')}</p>}
      </Field>

      <Field label={t('Business Unit', 'Business Unit')}>
        <select
          value={form.businessUnitId || ''} onChange={handleBU}
          disabled={!form.companyId}
          className={`${selectClass} ${!form.companyId ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
        >
          <option value=''>{t('-- Pilih --', '-- Select --')}</option>
          {filteredBUs.map(bu => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
        </select>
      </Field>

      <Field label={t('Department *', 'Department *')}>
        <select
          value={form.departmentId || ''} onChange={handleDept}
          disabled={!form.businessUnitId}
          className={`${selectClass} ${!form.businessUnitId ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
        >
          <option value=''>{t('-- Pilih --', '-- Select --')}</option>
          {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>

      <Field label={t('Position *', 'Position *')}>
        <select
          value={form.positionId || ''} onChange={handlePos}
          disabled={!form.departmentId}
          className={`${selectClass} ${!form.departmentId ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
        >
          <option value=''>{t('-- Pilih --', '-- Select --')}</option>
          {filteredPos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
    </>
  )
}
