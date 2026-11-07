'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useEmployeeStore } from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { usePersonnelActionStore, PA_REASONS, PA_STATUS_COLOR, PA_TO_HIST } from '@/store/personnelActionStore'
import { useT } from '@/store/languageStore'

const ACTION = 'Rehire'
const ICON   = '🔄'
const COLOR  = 'from-green-700 to-emerald-600'
const todayStr = () => new Date().toISOString().split('T')[0]

const EMPTY = {
  employeeId: '', reason: '', effectiveDate: '', note: '',
  fromCompanyId: '', fromDivisionId: '', fromBusinessUnitId: '', fromDepartmentId: '',
  fromPositionId: '', fromGradeId: '', fromEmploymentType: '', fromEndDate: '', fromStatus: '',
  toCompanyId: '', toDivisionId: '', toBusinessUnitId: '', toDepartmentId: '',
  toPositionId: '', toGradeId: '', toEmploymentType: 'Permanent', toEndDate: '', toStatus: 'Active',
}

function Field({ label, children }) {
  return <div><p className='text-xs font-semibold text-gray-500 mb-1'>{label}</p>{children}</div>
}
function RV({ label, value }) {
  return (
    <div>
      {label && <p className='text-xs font-semibold text-gray-400 mb-1'>{label}</p>}
      <div className='px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 min-h-[36px]'>
        {value || <span className='text-gray-300'>—</span>}
      </div>
    </div>
  )
}
function Sel({ value, onChange, options, placeholder, disabled = false }) {
  const t = useT()
  const _ph = placeholder ?? t('-- Pilih --', '-- Select --')
  return (
    <select value={value ?? ''} onChange={onChange} disabled={disabled}
      className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white disabled:bg-gray-50 disabled:text-gray-400'>
      <option value=''>{_ph}</option>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}
function Badge({ text, cls }) {
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{text}</span>
}

export default function RehirePage() {
  const { employees, updateEmployee, addHistory } = useEmployeeStore()
  const { positions, grades, companies, divisions, businessUnits, departments } = useStructureStore()
  const { pas, addPA, updatePA, deletePA, nextNumber } = usePersonnelActionStore()

  const t = useT()
  const [search,     setSearch]     = useState('')
  const [fStatus,    setFStatus]    = useState('')
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState({ ...EMPTY, effectiveDate: todayStr() })
  const [msg,        setMsg]        = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const posLabel = id => { const p = positions.find(x => x.id === Number(id)); return p ? `${p.name} (PC${String(p.gradeId).padStart(2,'0')})` : '—' }
  const grLabel  = id => { const g = grades.find(x => x.id === Number(id));   return g ? `PC${String(g.id).padStart(2,'0')} — ${g.name}` : '—' }
  const coName   = id => companies.find(x => x.id === Number(id))?.name || '—'
  const divName  = id => divisions.find(x => x.id === Number(id))?.name || '—'
  const buName   = id => businessUnits.find(x => x.id === Number(id))?.name || '—'
  const dpName   = id => departments.find(x => x.id === Number(id))?.name || '—'
  const empName  = id => employees.find(x => x.id === Number(id))

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const myPAs = useMemo(() => {
    const q = search.toLowerCase()
    return pas.filter(p => {
      if (p.action !== ACTION) return false
      const e = empName(p.employeeId)
      return (!q || e?.name?.toLowerCase().includes(q) || p.paNumber.toLowerCase().includes(q))
        && (!fStatus || p.status === fStatus)
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [pas, search, fStatus, employees])

  // Only Inactive employees for Rehire
  const empOpts = useMemo(() =>
    employees.filter(e => e.status === 'Inactive').map(e => ({ v: e.id, l: `${e.name} — ${e.nik} (Inactive)` })),
    [employees])

  const handleEmpChange = (empId) => {
    const e = employees.find(x => x.id === Number(empId))
    if (!e) { setForm(f => ({ ...f, employeeId: empId })); return }
    setForm(f => ({
      ...f, employeeId: empId,
      fromCompanyId: e.companyId, fromDivisionId: e.divisionId,
      fromBusinessUnitId: e.businessUnitId, fromDepartmentId: e.departmentId,
      fromPositionId: e.positionId, fromGradeId: e.gradeId,
      fromEmploymentType: e.employmentType, fromEndDate: e.endDate || '', fromStatus: e.status,
      toCompanyId: '', toDivisionId: '', toBusinessUnitId: '', toDepartmentId: '',
      toPositionId: '', toGradeId: '',
    }))
  }
  useEffect(() => {
    if (!form.employeeId) return
    const e = employees.find(x => String(x.id) === String(form.employeeId))
    if (!e) return
    setForm(f => ({
      ...f,
      fromCompanyId:      e.companyId,
      fromDivisionId:     e.divisionId,
      fromBusinessUnitId: e.businessUnitId,
      fromDepartmentId:   e.departmentId,
      fromPositionId:     e.positionId,
      fromGradeId:        e.gradeId,
      fromEmploymentType: e.employmentType,
      fromEndDate:        e.endDate || '',
      fromStatus:         e.status,
    }))
  }, [form.employeeId, employees])


  const handleToChange = (field, value) => {
    setForm(f => {
      const u = { ...f, [field]: value }
      if (field === 'toCompanyId') {
        const c = companies.find(x => x.id === Number(value))
        u.toDivisionId = c?.divisionId || ''
        u.toBusinessUnitId = ''; u.toDepartmentId = ''; u.toPositionId = ''; u.toGradeId = ''
      }
      if (field === 'toBusinessUnitId') { u.toDepartmentId = ''; u.toPositionId = ''; u.toGradeId = '' }
      if (field === 'toDepartmentId')   { u.toPositionId = ''; u.toGradeId = '' }
      if (field === 'toPositionId') {
        const p = positions.find(x => x.id === Number(value))
        if (p) u.toGradeId = p.gradeId
      }
      if (field === 'toEmploymentType' && !['Contract','Internship'].includes(value)) {
        u.toEndDate = ''
      }
      return u
    })
  }

  const applyToEmployee = useCallback((pa) => {
    updateEmployee(pa.employeeId, {
      status: 'Active',
      companyId: pa.toCompanyId, divisionId: pa.toDivisionId,
      businessUnitId: pa.toBusinessUnitId, departmentId: pa.toDepartmentId,
      positionId: pa.toPositionId, gradeId: pa.toGradeId,
      employmentType: pa.toEmploymentType,
      endDate: pa.toEndDate || '',
      joinDate: pa.effectiveDate,
    })
    addHistory(pa.employeeId, {
      effectiveDate: pa.effectiveDate, effectiveSeq: 1,
      action: PA_TO_HIST[ACTION], reason: pa.reason,
      companyId: pa.toCompanyId, departmentId: pa.toDepartmentId,
      positionId: pa.toPositionId, gradeId: pa.toGradeId, note: pa.note,
    })
  }, [updateEmployee, addHistory])

  const handleSave = (targetStatus) => {
    if (!form.employeeId)       return flash(t('Pilih karyawan.','Select an employee.'), 'error')
    if (!form.toCompanyId)      return flash(t('Pilih company tujuan.','Select a target company.'), 'error')
    if (!form.toBusinessUnitId) return flash(t('Pilih Business Unit.','Select a Business Unit.'), 'error')
    if (!form.toDepartmentId)   return flash(t('Pilih Department.','Select a Department.'), 'error')
    if (!form.toPositionId)     return flash(t('Pilih posisi baru.','Select a new position.'), 'error')
    if (!form.effectiveDate)    return flash(t('Rehire date wajib diisi.','Rehire date is required.'), 'error')
    if (!form.reason)           return flash(t('Reason wajib dipilih.','Reason is required.'), 'error')
    const pa = { ...form, action: ACTION, status: targetStatus, createdAt: form.createdAt || todayStr(), appliedAt: targetStatus === 'Applied' ? todayStr() : (form.appliedAt || '') }
    if (modal?.mode === 'create') { pa.paNumber = nextNumber(); addPA(pa) } else updatePA(form.id, pa)
    if (targetStatus === 'Applied' && modal?.pa?.status !== 'Applied') applyToEmployee(pa)
    setModal(null)
    flash(targetStatus === 'Applied' ? t('PA Rehire berhasil diterapkan. Status karyawan menjadi Active.','PA Rehire applied successfully. Employee status changed to Active.') : t('PA disimpan.','PA saved.'))
  }

  const isView    = modal?.mode === 'view'
  const isApplied = form.status === 'Applied'
  const stats = { total: myPAs.length, draft: myPAs.filter(p => p.status === 'Draft').length, applied: myPAs.filter(p => p.status === 'Applied').length }

  const coOpts  = companies.map(x => ({ v: x.id, l: x.name }))
  const buOpts  = businessUnits.filter(x => !form.toCompanyId || x.companyId === Number(form.toCompanyId)).map(x => ({ v: x.id, l: x.name }))
  const dpOpts  = departments.filter(x => !form.toBusinessUnitId || x.businessUnitId === Number(form.toBusinessUnitId)).map(x => ({ v: x.id, l: x.name }))
  const posOpts = positions.map(p => ({ v: p.id, l: posLabel(p.id) }))

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className={`bg-gradient-to-r ${COLOR} text-white px-8 py-6`}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <span className='text-4xl'>{ICON}</span>
            <div>
              <h1 className='text-2xl font-bold'>{ACTION}</h1>
              <p className='text-green-200 text-sm mt-0.5'>{t('Rekrutmen kembali mantan karyawan (status: Inactive)','Re-hiring of former employees (status: Inactive)')}</p>
            </div>
          </div>
          <button onClick={() => { setForm({ ...EMPTY, effectiveDate: todayStr() }); setModal({ mode: 'create' }) }}
            className='flex items-center gap-2 bg-white text-green-700 font-semibold px-5 py-2.5 rounded-xl shadow hover:shadow-md transition-all text-sm'>
            + New PA
          </button>
        </div>
      </div>

      <div className='px-8 py-4 bg-white border-b flex gap-3 items-center'>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Cari nama / PA number…', 'Search name / PA number…')}
          className='px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 w-56' />
        <Sel value={fStatus} onChange={e => setFStatus(e.target.value)}
          options={['Draft','Submitted','Approved','Rejected','Applied'].map(s => ({ v: s, l: s }))} placeholder={t('Semua Status', 'All Status')} />
        <span className='ml-auto text-xs text-gray-400'>{myPAs.length} record</span>
      </div>

      <div className='px-8 py-6'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                {['PA Number',t('Karyawan','Employee'),t('Company Baru','New Company'),t('Posisi Baru','New Position'),'Rehire Date','Emp. Type','Status',''].map(h => (
                  <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {myPAs.length === 0 ? (
                <tr><td colSpan={8} className='text-center py-16 text-gray-400'><div className='text-4xl mb-2'>{ICON}</div><p>{t('Belum ada PA Rehire','No Rehire PA yet')}</p></td></tr>
              ) : myPAs.map(pa => {
                const e = empName(pa.employeeId)
                return (
                  <tr key={pa.id} onClick={() => { setForm({ ...pa }); setModal({ mode: 'view', pa }) }}
                    className='hover:bg-green-50/30 cursor-pointer transition-colors'>
                    <td className='px-4 py-3'><span className='font-mono text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded'>{pa.paNumber}</span></td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white' style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                          {(e?.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <div><p className='font-semibold text-gray-800 text-xs'>{e?.name || '—'}</p><p className='text-xs text-gray-400'>{e?.nik}</p></div>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-xs text-green-700 font-semibold'>{coName(pa.toCompanyId)}</td>
                    <td className='px-4 py-3 text-xs text-gray-600'>{posLabel(pa.toPositionId)}</td>
                    <td className='px-4 py-3 text-xs font-semibold text-green-600'>{pa.effectiveDate}</td>
                    <td className='px-4 py-3 text-xs text-gray-600'>{pa.toEmploymentType}</td>
                    <td className='px-4 py-3'><Badge text={pa.status} cls={PA_STATUS_COLOR[pa.status] || 'bg-gray-100 text-gray-600'} /></td>
                    <td className='px-4 py-3 text-right' onClick={ev => ev.stopPropagation()}>
                      <button onClick={() => { setForm({ ...pa }); setModal({ mode: 'edit', pa }) }} disabled={pa.status === 'Applied'}
                        className='text-xs px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed font-medium mr-1'>Edit</button>
                      <button onClick={() => setConfirmDel(pa.id)} disabled={pa.status === 'Applied'}
                        className='text-xs px-2.5 py-1 text-red-500 hover:bg-red-50 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed font-medium'>{t('Hapus','Delete')}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b flex-shrink-0'>
              <div className='flex items-center gap-3'>
                <span className='text-2xl'>{ICON}</span>
                <div>
                  <h2 className='font-bold text-gray-900'>{modal.mode === 'create' ? `New — ${ACTION}` : form.paNumber}</h2>
                  {modal.mode !== 'create' && <Badge text={form.status} cls={PA_STATUS_COLOR[form.status] || ''} />}
                </div>
              </div>
              <button onClick={() => setModal(null)} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
            </div>

            <div className='overflow-y-auto flex-1 px-6 py-5 space-y-5'>
              <Field label={t('Karyawan * (hanya Inactive)','Employee * (Inactive only)')}>
                {isView || modal?.mode === 'edit'
                  ? <RV value={empName(form.employeeId)?.name} />
                  : <Sel value={form.employeeId} onChange={e => handleEmpChange(e.target.value)} options={empOpts} />}
              </Field>
              {empOpts.length === 0 && modal?.mode === 'create' && (
                <div className='bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700'>
                  {t('ℹ️ Tidak ada karyawan dengan status Inactive saat ini.','ℹ️ No employees with Inactive status currently.')}
                </div>
              )}

              {form.employeeId && (
                <div className='bg-gray-50 rounded-xl p-4'>
                  <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3'>{t('Riwayat Terakhir (Inactive)','Last Employment (Inactive)')}</p>
                  <div className='grid grid-cols-2 gap-3'>
                    <RV label={t('Company Sebelumnya','Previous Company')} value={coName(form.fromCompanyId)} />
                    <RV label='Department'         value={dpName(form.fromDepartmentId)} />
                    <RV label={t('Posisi Sebelumnya','Previous Position')}  value={posLabel(form.fromPositionId)} />
                    <RV label='End Date'           value={form.fromEndDate} />
                  </div>
                </div>
              )}

              {form.employeeId && (
                <div>
                  <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3'>{t('TO — Penempatan Baru','TO — New Placement')}</p>
                  <div className='grid grid-cols-2 gap-4'>
                    <Field label='Employment Type *'>
                      {isView || isApplied ? <RV value={form.toEmploymentType} />
                        : <Sel value={form.toEmploymentType} onChange={e => handleToChange('toEmploymentType', e.target.value)}
                            options={['Permanent','Contract','Outsource','Internship'].map(x => ({ v: x, l: x }))} />}
                    </Field>
                    {['Contract','Internship'].includes(form.toEmploymentType) && (
                      <Field label='Contract End Date'>
                        {isView || isApplied ? <RV value={form.toEndDate} />
                          : <input type='date' value={form.toEndDate || ''} onChange={e => setForm(f => ({ ...f, toEndDate: e.target.value }))}
                              className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400' />}
                      </Field>
                    )}
                    <Field label='New Company *'>
                      {isView || isApplied ? <RV value={coName(form.toCompanyId)} />
                        : <Sel value={form.toCompanyId} onChange={e => handleToChange('toCompanyId', e.target.value)} options={coOpts} />}
                    </Field>
                    <Field label='Division (auto)'><RV value={divName(form.toDivisionId)} /></Field>
                    <Field label='Business Unit *'>
                      {isView || isApplied ? <RV value={buName(form.toBusinessUnitId)} />
                        : <Sel value={form.toBusinessUnitId} onChange={e => handleToChange('toBusinessUnitId', e.target.value)} options={buOpts} />}
                    </Field>
                    <Field label='Department *'>
                      {isView || isApplied ? <RV value={dpName(form.toDepartmentId)} />
                        : <Sel value={form.toDepartmentId} onChange={e => handleToChange('toDepartmentId', e.target.value)} options={dpOpts} />}
                    </Field>
                    <Field label='Position *'>
                      {isView || isApplied ? <RV value={posLabel(form.toPositionId)} />
                        : <Sel value={form.toPositionId} onChange={e => handleToChange('toPositionId', e.target.value)} options={posOpts} />}
                    </Field>
                    <Field label='Grade (auto)'><RV value={grLabel(form.toGradeId)} /></Field>
                  </div>
                </div>
              )}

              <div>
                <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3'>{t('Detail PA','PA Details')}</p>
                <div className='grid grid-cols-2 gap-4'>
                  <Field label='Rehire Date *'>
                    {isView || isApplied ? <RV value={form.effectiveDate} />
                      : <input type='date' value={form.effectiveDate || ''} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
                          className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400' />}
                  </Field>
                  <Field label='Reason *'>
                    {isView || isApplied ? <RV value={form.reason} />
                      : <Sel value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                          options={(PA_REASONS[ACTION] || []).map(r => ({ v: r, l: r }))} />}
                  </Field>
                  <div className='col-span-2'>
                    <Field label='Note'>
                      {isView || isApplied ? <RV value={form.note} />
                        : <textarea value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
                            className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none' />}
                    </Field>
                  </div>
                </div>
              </div>
              {form.appliedAt && <div className='bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700'>{t('Diterapkan pada','Applied on')} <strong>{form.appliedAt}</strong></div>}
            </div>

            <div className='flex items-center justify-between px-6 py-4 border-t bg-gray-50 flex-shrink-0'>
              <button onClick={() => setModal(null)} className='px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100'>{isView ? t('Tutup','Close') : t('Batal','Cancel')}</button>
              {!isView && !isApplied && (
                <div className='flex gap-2'>
                  <button onClick={() => handleSave('Draft')} className='px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50'>{t('Simpan Draft','Save Draft')}</button>
                  <button onClick={() => handleSave('Submitted')} className='px-4 py-2 text-sm font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100'>Submit</button>
                  <button onClick={() => handleSave('Applied')} className='px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow'>Apply — Rehire</button>
                </div>
              )}
              {isView && !isApplied && <button onClick={() => setModal({ mode: 'edit', pa: modal.pa })} className='px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow'>Edit PA</button>}
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl p-6 shadow-2xl w-80'>
            <p className='font-bold text-gray-900 mb-2'>{t('Hapus PA ini?','Delete this PA?')}</p>
            <p className='text-sm text-gray-500 mb-5'>{t('Tindakan ini tidak bisa dibatalkan.','This action cannot be undone.')}</p>
            <div className='flex gap-2 justify-end'>
              <button onClick={() => setConfirmDel(null)} className='px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100'>{t('Batal','Cancel')}</button>
              <button onClick={() => { deletePA(confirmDel); setConfirmDel(null); flash(t('PA dihapus.','PA deleted.')) }} className='px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600'>{t('Hapus','Delete')}</button>
            </div>
          </div>
        </div>
      )}
      {msg && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}><span>{msg.type === 'error' ? '⚠️' : '✅'}</span>{msg.text}</div>}
    </div>
  )
}
