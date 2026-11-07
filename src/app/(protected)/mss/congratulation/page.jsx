'use client'
import Icon from '@/components/ui/Icon'
import { useState, useEffect }       from 'react'
import { useAuthStore }               from '@/store/authStore'
import { useEmployeeStore }           from '@/store/employeeStore'
import { useEvaluationStore }         from '@/store/evaluationStore'
import { useCongratulationStore }     from '@/store/congratulationStore'
import { useT }                       from '@/store/languageStore'

const HEADER_GRAD = { background: 'linear-gradient(135deg,#052B52,#039299)' }
const PASSED      = 'Passed to be Permanent'

export default function CongratulationPage() {
  const t                         = useT()
  const { currentUser }           = useAuthStore()
  const { employees }             = useEmployeeStore()
  const { evaluations }           = useEvaluationStore()
  const { messages, getMessage, saveMessage } = useCongratulationStore()

  // Employees who report to current user AND have finalDecision = Passed
  const eligibleEmployees = employees.filter(emp => {
    if (emp.managerId !== currentUser?.id) return false
    const ev = evaluations.find(e => e.employeeId === emp.id)
    return ev?.finalDecision === PASSED
  })

  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm]             = useState(null)
  const [msg, setMsg]               = useState(null)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  // Auto-select first eligible employee
  useEffect(() => {
    if (!selectedId && eligibleEmployees.length > 0) {
      setSelectedId(eligibleEmployees[0].id)
    }
  }, [eligibleEmployees.length]) // eslint-disable-line

  // Load form when selection changes
  useEffect(() => {
    if (!selectedId) return
    const saved = getMessage(selectedId)
    setForm({
      contributors:          saved.contributors?.length >= 1 ? [...saved.contributors] : ['', '', '', '', ''],
      messageToContributors: saved.messageToContributors ?? '',
      messageOfSupport:      saved.messageOfSupport      ?? '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, messages])

  const selectedEmp = employees.find(e => e.id === selectedId) ?? null

  const setContributor = (idx, val) =>
    setForm(f => {
      const next = [...f.contributors]
      next[idx] = val
      return { ...f, contributors: next }
    })

  const handleSave = () => {
    if (!selectedId || !form) return
    saveMessage(selectedId, form)
    flash(t('Pesan berhasil disimpan.', 'Message saved successfully.'))
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (eligibleEmployees.length === 0) {
    return (
      <div className='flex items-center justify-center h-[calc(100vh-56px)] bg-gray-100'>
        <div className='text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-sm'>
          <div className='text-4xl mb-3'><Icon e='🎉' size={15} /></div>
          <h2 className='text-base font-bold text-gray-700 mb-2'>
            {t('Belum Ada Karyawan', 'No Eligible Employees')}
          </h2>
          <p className='text-xs text-gray-500'>
            {t(
              'Belum ada karyawan dengan keputusan "Lulus Menjadi Karyawan Tetap".',
              'No employees with a "Passed to be Permanent" final decision yet.'
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-[calc(100vh-56px)] bg-gray-100'>

      {/* ── Left Panel ───────────────────────────────────────────────────── */}
      <aside className='w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden'>
        <div className='px-4 py-3 border-b border-gray-200' style={HEADER_GRAD}>
          <h2 className='text-sm font-bold text-white'>
            <Icon e='🎉' size={14} className='inline align-[-2px]' /> {t('Congratulation Message', 'Congratulation Message')}
          </h2>
          <p className='text-[11px] text-red-200 mt-0.5'>
            {eligibleEmployees.length} {t('karyawan lulus tetap', 'permanent employees')}
          </p>
        </div>

        <div className='overflow-y-auto flex-1'>
          {eligibleEmployees.map(emp => {
            const active   = selectedId === emp.id
            const saved    = getMessage(emp.id)
            const hasMsgSupport = !!(saved.messageOfSupport)
            const ev       = evaluations.find(e => e.employeeId === emp.id)

            return (
              <button
                key={emp.id}
                onClick={() => setSelectedId(emp.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors
                  ${active ? 'bg-red-50 border-l-4 border-l-red-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <p className={`text-xs font-semibold truncate ${active ? 'text-red-800' : 'text-gray-800'}`}>
                      {emp.name}
                    </p>
                    <p className='text-[11px] text-gray-500 mt-0.5'>
                      {t('Bergabung', 'Joined')}: {emp.joinDate || '—'}
                    </p>
                    {ev?.finalEffectiveDate && (
                      <p className='text-[10px] text-green-600 mt-0.5'>
                        {t('Efektif', 'Effective')}: {ev.finalEffectiveDate}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0
                    ${hasMsgSupport ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {hasMsgSupport ? t('Terisi', 'Filled') : t('Kosong', 'Empty')}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <main className='flex-1 overflow-y-auto p-6'>

        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
            msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {msg.text}
          </div>
        )}

        {selectedEmp && form ? (
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-2xl'>

            {/* Card header */}
            <div className='px-6 py-4' style={HEADER_GRAD}>
              <h2 className='text-sm font-bold text-white'>
                <Icon e='🎉' size={14} className='inline align-[-2px]' /> {t('Congratulation Message', 'Congratulation Message')}
              </h2>
              <p className='text-[11px] text-red-200 mt-0.5'>{selectedEmp.name}</p>
            </div>

            <div className='p-6 space-y-5'>

              {/* Employee Name */}
              <div>
                <label className='block text-sm font-bold text-gray-800 mb-1.5'>
                  {t('Employee Name', 'Employee Name')}
                </label>
                <input
                  value={selectedEmp.name}
                  readOnly
                  className='w-full px-4 py-2.5 text-sm rounded border border-gray-200 bg-gray-50 text-gray-700 cursor-default'
                />
              </div>

              {/* Select Contributors */}
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='text-sm font-bold text-gray-800'>
                    {t('Select Contributors', 'Select Contributors')}
                  </label>
                  <button
                    onClick={() => setForm(f => ({ ...f, contributors: [...f.contributors, ''] }))}
                    className='text-xs font-semibold px-2.5 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition'>
                    + {t('Tambah', 'Add')}
                  </button>
                </div>
                <div className='space-y-2'>
                  {form.contributors.map((val, idx) => (
                    <div key={idx} className='flex items-center gap-2'>
                      <select
                        value={val}
                        onChange={e => setContributor(idx, e.target.value)}
                        className='flex-1 px-4 py-2.5 text-sm rounded border border-gray-200 focus:border-red-400 outline-none bg-white text-gray-700'
                      >
                        <option value=''>{t('— Pilih Karyawan —', '— Select Employee —')}</option>
                        {employees
                          .filter(e => e.status === 'Active' && e.id !== selectedId)
                          .map(e => (
                            <option key={e.id} value={String(e.id)}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                      {form.contributors.length > 1 && (
                        <button
                          onClick={() => setForm(f => ({
                            ...f,
                            contributors: f.contributors.filter((_, i) => i !== idx),
                          }))}
                          className='text-red-400 hover:text-red-600 font-bold text-base leading-none flex-shrink-0 px-1'>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Message to Contributors */}
              <div>
                <label className='block text-sm font-bold text-gray-800 mb-1.5'>
                  {t('Message to Contributors', 'Message to Contributors')}
                </label>
                <textarea
                  rows={4}
                  value={form.messageToContributors}
                  onChange={e => setForm(f => ({ ...f, messageToContributors: e.target.value }))}
                  placeholder={t(
                    'Tuliskan pesan singkat yang menyoroti kekuatan karyawan dan bagaimana Anda dapat mendukungnya dalam transisi menjadi karyawan tetap.',
                    'Please leave a short personal message highlighting her strengths and how you can support her as she transitions to full-time.'
                  )}
                  className='w-full px-4 py-2.5 text-sm rounded border border-gray-200 focus:border-red-400 outline-none resize-none text-gray-700 placeholder:text-gray-400'
                />
              </div>

              {/* Message of Support */}
              <div>
                <label className='block text-sm font-bold text-gray-800 mb-1.5'>
                  {t('Message of Support for', 'Message of Support for')} : {selectedEmp.name}
                </label>
                <textarea
                  rows={5}
                  value={form.messageOfSupport}
                  onChange={e => setForm(f => ({ ...f, messageOfSupport: e.target.value }))}
                  placeholder={t('Type here', 'Type here')}
                  className='w-full px-4 py-2.5 text-sm rounded border border-gray-200 focus:border-red-400 outline-none resize-none text-gray-700 placeholder:text-gray-400'
                />
              </div>

              {/* Save button */}
              <div className='flex justify-end pt-1'>
                <button
                  onClick={handleSave}
                  className='px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow transition-opacity hover:opacity-90'
                  style={HEADER_GRAD}
                >
                  <Icon e='💾' size={14} className='inline align-[-2px]' /> {t('Simpan', 'Save')}
                </button>
              </div>

            </div>
          </div>
        ) : (
          <div className='flex items-center justify-center h-48 text-gray-400 text-sm'>
            {t('Pilih karyawan dari daftar kiri.', 'Select an employee from the left panel.')}
          </div>
        )}

      </main>
    </div>
  )
}
