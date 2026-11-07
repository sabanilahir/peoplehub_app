'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'
import { HISTORY_ACTIONS, HISTORY_REASONS, ACTION_COLOR } from '@/store/employeeStore'
import { Field, Input, Select, Section, GradeSelect, selectClass } from './EmployeeShared'

const HIST_BLANK = { effectiveDate:'', effectiveSeq:1, action:'', reason:'', companyId:'', departmentId:'', positionId:'', gradeId:'', note:'' }

export default function HistorySection({ emp, S, grade, flash, addHistory, updateHistory, deleteHistory }) {
  const [form,     setForm    ] = useState(HIST_BLANK)
  const [editing,  setEditing ] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const t = useT()

  const history = [...(emp.history || [])].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate) || b.effectiveSeq - a.effectiveSeq
  )

  const reasons         = HISTORY_REASONS[form.action] || []
  const isTermination   = form.action === 'Termination'

  const handleSave = () => {
    if (!form.effectiveDate || !form.action || !form.reason)
      return flash(t('Effective Date, Action, dan Reason wajib diisi.', 'Effective Date, Action, and Reason are required.'), 'error')
    if (editing) {
      updateHistory(emp.id, editing, form)
      setEditing(null)
      flash(t('History diperbarui.', 'History updated.'))
    } else {
      addHistory(emp.id, form)
      flash(t('History ditambahkan.', 'History added.'))
    }
    setForm(HIST_BLANK)
    setShowForm(false)
  }

  const handleEdit = (h) => {
    setEditing(h.id)
    setForm({
      effectiveDate: h.effectiveDate, effectiveSeq: h.effectiveSeq,
      action: h.action, reason: h.reason,
      companyId: h.companyId || '', departmentId: h.departmentId || '',
      positionId: h.positionId || '', gradeId: h.gradeId || '', note: h.note || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => { setEditing(null); setForm(HIST_BLANK); setShowForm(false) }

  const posName  = id => S.positions.find(p => p.id === +id)?.name  || '-'
  const deptName = id => S.departments.find(d => d.id === +id)?.name || '-'

  return (
    <div className='border-t border-gray-100 pt-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xs font-bold text-gray-500 uppercase tracking-wide'><Icon e='📜' size={14} className='inline align-[-2px]' /> Employment History</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className='px-3 py-1.5 text-white text-xs font-semibold rounded-lg hover:opacity-90'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}
          >
            + {t('Tambah Action', 'Add Action')}
          </button>
        )}
      </div>

      {showForm && (
        <div className='bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5'>
          <h4 className='text-xs font-bold text-gray-600 mb-4'>
            {editing ? t('Edit History', 'Edit History') : t('Tambah Action', 'Add Action')}
          </h4>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-4'>
            <Field label={t('Effective Date *', 'Effective Date *')}>
              <Input type='date' value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
            </Field>
            <Field label={t('Sequence', 'Sequence')}>
              <input type='number' min={1} max={99} value={form.effectiveSeq}
                onChange={e => setForm(f => ({ ...f, effectiveSeq: +e.target.value }))}
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </Field>
            <Field label={t('Action *', 'Action *')}>
              <select value={form.action}
                onChange={e => setForm(f => ({ ...f, action: e.target.value, reason: '' }))}
                className={selectClass}>
                <option value=''>{t('-- Pilih Action --', '-- Select Action --')}</option>
                {HISTORY_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label={t('Reason *', 'Reason *')}>
              <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                disabled={!form.action} className={`${selectClass} disabled:opacity-50`}>
                <option value=''>{t('-- Pilih Reason --', '-- Select Reason --')}</option>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label='Department'>
              <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={selectClass}>
                <option value=''>{t('-- Pilih --', '-- Select --')}</option>
                {S.departments.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label='Position'>
              <select value={form.positionId} onChange={e => setForm(f => ({ ...f, positionId: e.target.value }))} className={selectClass}>
                <option value=''>{t('-- Pilih --', '-- Select --')}</option>
                {S.positions.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label='Grade / PC'>
              <GradeSelect value={form.gradeId} onChange={e => setForm(f => ({ ...f, gradeId: +e.target.value }))} grades={S.grades} />
            </Field>
            <div className='col-span-full'>
              <Field label={t('Catatan', 'Note')}>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder={t('Catatan tambahan (opsional)', 'Additional notes (optional)')}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
              </Field>
            </div>
          </div>

          {isTermination && (
            <div className='flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4'>
              <span className='text-red-500 text-sm flex-shrink-0'><Icon e='⚠️' size={15} /></span>
              <p className='text-xs text-red-600'>
                {t(
                  'Action Termination akan menjadi baris terakhir history karyawan ini. Pastikan reason sudah benar sebelum menyimpan.',
                  'The Termination action will be the last history entry for this employee. Make sure the reason is correct before saving.'
                )}
              </p>
            </div>
          )}

          <div className='flex gap-2'>
            <button
              onClick={handleSave}
              className={`px-5 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90 ${isTermination ? 'bg-red-600' : ''}`}
              style={isTermination ? {} : { background: 'linear-gradient(135deg,#052B52,#039299)' }}
            >
              {editing ? t('Simpan', 'Save') : isTermination ? t('Simpan Termination', 'Save Termination') : t('Tambah', 'Add')}
            </button>
            <button onClick={handleCancel} className='px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200'>
              {t('Batal', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className='text-xs text-gray-400 py-4'>{t('Belum ada history.', 'No history yet.')}</p>
      ) : (
        <div className='relative'>
          <div className='absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200' />
          <div className='space-y-3'>
            {history.map((h, idx) => {
              const g       = grade(h.gradeId)
              const isLast  = idx === 0
              return (
                <div key={h.id} className='flex gap-4'>
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm
                    ${h.action === 'Hire' ? 'bg-green-500 text-white' :
                      h.action === 'Termination' ? 'bg-red-500 text-white' :
                      'bg-white border-2 border-red-300 text-red-600'}`}>
                    {h.action === 'Hire' ? '🚀' : h.action === 'Termination' ? '🔴' : h.effectiveSeq}
                  </div>
                  <div className={`flex-1 border rounded-xl px-4 py-3 ${isLast && h.action !== 'Termination' ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white'}`}>
                    <div className='flex items-start justify-between gap-2 flex-wrap'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ACTION_COLOR[h.action] || 'bg-gray-100 text-gray-600'}`}>
                          {h.action}
                        </span>
                        <span className='text-xs text-gray-500'>{h.reason}</span>
                        {isLast && h.action !== 'Termination' && (
                          <span className='text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full'>
                            {t('Current', 'Current')}
                          </span>
                        )}
                      </div>
                      <div className='flex items-center gap-3 flex-shrink-0'>
                        <span className='text-xs text-gray-400 font-mono'>{h.effectiveDate} · Seq {h.effectiveSeq}</span>
                        <button onClick={() => handleEdit(h)} className='text-xs text-blue-500 hover:text-blue-700 font-semibold'>
                          {t('Edit', 'Edit')}
                        </button>
                        {h.action !== 'Hire' && (
                          <button
                            onClick={() => { deleteHistory(emp.id, h.id); flash(t('History dihapus.', 'History deleted.')) }}
                            className='text-xs text-red-400 hover:text-red-600 font-semibold'
                          >
                            {t('Hapus', 'Delete')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-3 mt-2 text-xs text-gray-500'>
                      {h.departmentId && <span><Icon e='🗂️' size={14} className='inline align-[-2px]' /> {deptName(h.departmentId)}</span>}
                      {h.positionId   && <span><Icon e='📌' size={14} className='inline align-[-2px]' /> {posName(h.positionId)}</span>}
                      {g              && <span><Icon e='🎖️' size={14} className='inline align-[-2px]' /> {g.code} · {g.name}</span>}
                      {h.note         && <span className='text-gray-400 italic'>"{h.note}"</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
