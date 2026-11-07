'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { useT } from '@/store/languageStore'
import { PC_CATEGORY_COLOR } from '@/store/structureStore'
import { Field, Input, Select, Section, GradeSelect, CascadingOrgSelects, selectClass } from './EmployeeShared'
import HistorySection from './HistorySection'
import { EMP_TYPES, CURRENCY_LOV } from '@/utils/constants'

export default function TabEmployment({ emp, S, update, grade, flash, addHistory, updateHistory, deleteHistory, allEmployees, onSelectEmployee }) {
  const [form,           setForm          ] = useState({ ...emp })
  const [showAdditional, setShowAdditional] = useState(true)
  const t = useT()

  useEffect(() => { setForm({ ...emp }) }, [emp.id])

  const saveAll = () => {
    if (!form.companyId)   return flash(t('Company wajib dipilih.', 'Company is required.'), 'error')
    if (!form.joinDate)    return flash(t('Join Date wajib diisi.', 'Join Date is required.'), 'error')
    update(emp.id, {
      nik: form.nik, companyId: form.companyId, divisionId: form.divisionId,
      businessUnitId: form.businessUnitId, departmentId: form.departmentId,
      positionId: form.positionId, gradeId: form.gradeId, individualClassId: form.individualClassId,
      managerId: form.managerId, employmentType: form.employmentType,
      status: form.status, joinDate: form.joinDate, endDate: form.endDate,
      currency: form.currency || '', basicSalary: form.basicSalary || '',
      salaryAdjustment: form.salaryAdjustment || '', promotionAllowance: form.promotionAllowance || '',
      meals: form.meals || '', communication: form.communication || '',
      gasCard: form.gasCard || '', tollAndParking: form.tollAndParking || '', medical: form.medical || '',
    })
    flash(t('Employment data disimpan.', 'Employment data saved.'))
  }

  const g     = grade(form.gradeId)
  const isPHL = S.companies.find(c => c.id === +form.companyId)?.country === 'Philippines'

  const gradeCard = (grObj, label) => grObj ? (
    <div className={`flex flex-col justify-center px-4 py-3 rounded-xl border ${PC_CATEGORY_COLOR[grObj.category]?.replace('bg-','border-').split(' ')[0]} bg-opacity-30`}>
      <div className='flex items-center gap-2 mb-1'>
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${PC_CATEGORY_COLOR[grObj.category]}`}>{grObj.code} · {grObj.category}</div>
        <span className='text-xs text-gray-400 font-medium'>{label}</span>
      </div>
      <div className='text-sm font-semibold text-gray-800'>{grObj.name}</div>
      {!grObj.isBoard
        ? <div className='text-xs text-gray-500 mt-0.5'>Rp {new Intl.NumberFormat('id-ID').format(grObj.minSalary)} – Rp {new Intl.NumberFormat('id-ID').format(grObj.maxSalary)}</div>
        : <div className='text-xs text-yellow-600 mt-0.5'>Honorarium-based</div>}
    </div>
  ) : null

  return (
    <div className='space-y-6'>

      {/* Organization */}
      <Section title='Organization'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <CascadingOrgSelects form={form} setForm={setForm} S={S} />

          {/* Manager */}
          <Field label={t('Manager (Atasan Langsung)', 'Manager (Direct Supervisor)')}>
            <select value={form.managerId || ''}
              onChange={e => setForm(f => ({ ...f, managerId: e.target.value ? +e.target.value : null }))}
              className={selectClass}>
              <option value=''>— {t('Tidak ada', 'None')} —</option>
              {(allEmployees || [])
                .filter(e => e.id !== emp.id && e.status === 'Active')
                .map(e => <option key={e.id} value={e.id}>{e.name} · {e.nik}</option>)}
            </select>
            {form.managerId && (() => {
              const mgr = (allEmployees || []).find(e => e.id === +form.managerId)
              const pos = mgr?.positionId ? S.positions.find(p => p.id === mgr.positionId)?.name : null
              return mgr ? (
                <button onClick={() => onSelectEmployee?.(mgr.id)}
                  className='mt-2 w-full flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 hover:bg-blue-100 hover:border-blue-300 transition text-left group'>
                  <div className='w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 overflow-hidden'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {mgr.photo ? <img src={mgr.photo} className='w-full h-full object-cover' /> : (mgr.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xs font-semibold text-blue-800 group-hover:underline'>{mgr.name}</div>
                    {pos && <div className='text-xs text-blue-500'>{pos}</div>}
                  </div>
                  <span className='text-blue-300 text-xs group-hover:text-blue-500'><Icon e='→' size={15} /></span>
                </button>
              ) : null
            })()}
          </Field>
        </div>
      </Section>

      {/* Direct Subordinates */}
      {(() => {
        const subs = (allEmployees || []).filter(e => e.managerId === emp.id && e.id !== emp.id)
        if (!subs.length) return null
        return (
          <Section title={`${t('Bawahan Langsung', 'Direct Subordinates')} (${subs.length})`}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
              {subs.map(s => (
                <button key={s.id} onClick={() => onSelectEmployee?.(s.id)}
                  className='flex items-center gap-3 px-3 py-2.5 border border-gray-100 rounded-xl hover:bg-red-50 hover:border-red-200 transition text-left group'>
                  <div className='w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden flex-shrink-0'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {s.photo ? <img src={s.photo} className='w-full h-full object-cover' /> : (s.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xs font-semibold text-gray-800 truncate group-hover:text-red-700'>{s.name}</div>
                    <div className='text-xs text-gray-400 truncate'>
                      {S.positions.find(p => p.id === s.positionId)?.name || '—'}
                      {S.departments.find(d => d.id === s.departmentId) && <> · {S.departments.find(d => d.id === s.departmentId).name}</>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                </button>
              ))}
            </div>
          </Section>
        )
      })()}

      {/* Grade */}
      <Section title='Grade (Position Class & Individual Class)'>
        {(() => {
          const ic = grade(form.individualClassId)
          let cmpBadge = null
          if (g && ic) {
            if (g.id === ic.id)    cmpBadge = <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600'>PC = IC</span>
            else if (ic.id > g.id) cmpBadge = <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700'>IC &gt; PC</span>
            else                   cmpBadge = <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700'>IC &lt; PC</span>
          }
          return (
            <div className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field label='Grade / PC (Position Class)'>
                  <GradeSelect value={form.gradeId} onChange={e => setForm(f => ({ ...f, gradeId: +e.target.value }))} grades={S.grades} placeholder='-- Pilih PC --' />
                </Field>
                {gradeCard(g, 'PC')}
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field label='IC (Individual Class)'>
                  <GradeSelect value={form.individualClassId} onChange={e => setForm(f => ({ ...f, individualClassId: +e.target.value }))} grades={S.grades} placeholder='-- Pilih IC --' />
                  <p className='text-xs text-gray-400 mt-1'>
                    {t('Grade melekat pada karyawan secara pribadi. Umumnya sama dengan PC.', 'Grade personally attached to the employee (Individual Class). Usually the same as PC.')}
                  </p>
                </Field>
                {gradeCard(ic, 'IC')}
              </div>
              {cmpBadge && (
                <div className='flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5'>
                  <span className='text-xs text-gray-500 font-medium'>{t('Perbandingan PC ↔ IC:', 'PC ↔ IC Comparison:')}</span>
                  {cmpBadge}
                  {g && ic && g.id !== ic.id && (
                    <span className='text-xs text-gray-400'>PC: <strong>{g.code}</strong> · IC: <strong>{ic.code}</strong></span>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </Section>

      {/* Employment Info */}
      <Section title='Employment Info'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <Field label='NIK'>
            <Input value={form.nik} onChange={e => setForm(f => ({ ...f, nik: e.target.value }))} />
          </Field>
          <Field label={t('Tipe Kepegawaian', 'Employment Type')}>
            <Select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))} options={EMP_TYPES} />
          </Field>
          <Field label='Status'>
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={['Active','Inactive','Terminated','Resigned']} />
          </Field>
          <Field label={t('Join Date *', 'Join Date *')}>
            <Input type='date' value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
          </Field>
          <Field label={t('End Date', 'End Date')}>
            <Input type='date' value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </Field>
          {/* System role: read-only — managed via System Administration → User Management */}
          <Field label={t('Role (System)', 'Role (System)')}>
            <div className='flex items-center h-9'>
              <span className='text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg capitalize'>{emp.role || '—'}</span>
              <span className='ml-2 text-xs text-gray-400'>{t('Ubah via Sysadmin', 'Change via Sysadmin')}</span>
            </div>
          </Field>
        </div>
      </Section>

      <button onClick={saveAll}
        className='px-6 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90'
        style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
        <Icon e='💾' size={14} className='inline align-[-2px]' /> {t('Simpan Employment', 'Save Employment')}
      </button>

      {/* Additional Assignment Info — Philippines only */}
      {isPHL && (
        <div className='border border-gray-200 rounded-xl overflow-hidden'>
          <button type='button' onClick={() => setShowAdditional(v => !v)}
            className='w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition text-left'>
            <span className='text-xs font-bold text-gray-700 uppercase tracking-wide'><Icon e='💼' size={14} className='inline align-[-2px]' /> Additional Assignment Info</span>
            <span className={`text-gray-500 text-xs transition-transform duration-200 ${showAdditional ? 'rotate-180' : ''}`}><Icon e='▼' size={15} /></span>
          </button>
          {showAdditional && (
            <div className='px-5 py-4 space-y-3'>
              <div className='grid grid-cols-[160px_1fr] items-center gap-3'>
                <span className='text-xs font-semibold text-gray-600'>Currency <span className='text-red-500'>*</span></span>
                <select value={form.currency || ''} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white'>
                  <option value=''>-- Select --</option>
                  {CURRENCY_LOV.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {[
                ['basicSalary','Basic Salary',true,false],
                ['salaryAdjustment','Salary Adjustment',false,false],
                ['promotionAllowance','Promotion Allowance',false,false],
                ['meals','Meals',false,false],
                ['communication','Communication',false,true],
                ['gasCard','Gas Card',false,false],
                ['tollAndParking','Toll and Parking',false,false],
                ['medical','Medical',false,true],
              ].map(([key, label, required, highlighted]) => (
                <div key={key} className='grid grid-cols-[160px_1fr] items-center gap-3'>
                  <span className={`text-xs font-semibold ${highlighted ? 'text-blue-600' : 'text-gray-600'}`}>
                    {label}{required && <span className='text-red-500 ml-0.5'>*</span>}
                  </span>
                  <input type='number' min='0' value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                </div>
              ))}
              <div className='pt-1'>
                <button onClick={saveAll}
                  className='px-5 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90'
                  style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                  <Icon e='💾' size={14} className='inline align-[-2px]' /> {t('Simpan Additional Info', 'Save Additional Info')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <HistorySection emp={emp} S={S} grade={grade} flash={flash}
        addHistory={addHistory} updateHistory={updateHistory} deleteHistory={deleteHistory} />
    </div>
  )
}
