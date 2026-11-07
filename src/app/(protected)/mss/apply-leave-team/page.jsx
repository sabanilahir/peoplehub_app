'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useAuthStore }      from '@/store/authStore'
import { useLeaveStore }     from '@/store/leaveStore'
import { useWorkflowStore }  from '@/store/workflowStore'
import { useEmployeeStore }  from '@/store/employeeStore'
import { useStructureStore } from '@/store/structureStore'
import { daysBetween }       from '@/utils/dateUtils'
import { calcLeaveUsed, LEAVE_STATUS_BADGE, validateLeaveForm } from '@/utils/leaveUtils'
import WorkflowMonitor       from '@/components/WorkflowMonitor'
import { useT }              from '@/store/languageStore'

function getAllSubIds(managerId, childMap) {
  const direct = childMap[managerId] || []
  return [...direct, ...direct.flatMap(id => getAllSubIds(id, childMap))]
}

export default function ApplyLeaveTeamPage() {
  const t = useT()
  const { currentUser }                     = useAuthStore()
  const { leaves, leaveTypes, submitLeave } = useLeaveStore()
  const { getLevelsForPage }                = useWorkflowStore()
  const { employees }                       = useEmployeeStore()
  const { positions, departments }          = useStructureStore()

  const [includeIndirect, setIncludeIndirect] = useState(false)
  const [form, setForm] = useState({ empId: '', type: '', start: '', end: '', note: '' })
  const [msg,  setMsg ] = useState(null)

  const activeTypes = leaveTypes.filter(lt => lt.active)

  const childMap = useMemo(() => {
    const map = {}
    employees.forEach(e => {
      if (e.managerId) map[e.managerId] = [...(map[e.managerId] || []), e.id]
    })
    return map
  }, [employees])

  const myId      = currentUser?.id
  const directIds = childMap[myId] || []
  const allSubIds = getAllSubIds(myId, childMap)
  const subIds    = includeIndirect ? allSubIds : directIds
  const subordinates = employees.filter(e => subIds.includes(e.id))
  const selectedEmp  = employees.find(e => e.id === +form.empId)

  const handleSubmit = () => {
    const err = validateLeaveForm(
      { empId: +form.empId || null, type: form.type, start: form.start, end: form.end },
      leaves, leaveTypes, t, true
    )
    if (err) { setMsg({ type: 'error', text: err }); return }
    submitLeave(
      { userId: +form.empId, name: selectedEmp?.name ?? '', workflowName: 'Apply Leave (My Team)', ...form },
      getLevelsForPage('Apply Leave (My Team)')
    )
    setForm({ empId: '', type: '', start: '', end: '', note: '' })
    setMsg({ type: 'success', text: t(`Cuti berhasil diajukan untuk ${selectedEmp?.name}.`, `Leave submitted for ${selectedEmp?.name}.`) })
    setTimeout(() => setMsg(null), 3000)
  }

  const subLeaves = leaves.filter(l => subIds.includes(l.userId)).sort((a, b) => b.id - a.id)

  const posName  = (id) => positions.find(p => p.id === +id)?.name  || '—'
  const deptName = (id) => departments.find(d => d.id === +id)?.name || '—'

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Apply Leave — My Team', 'Apply Leave — My Team')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Ajukan cuti atas nama anggota tim Anda.', 'Submit leave on behalf of your team members.')}</p>

      {/* Scope toggle */}
      <div className='bg-white rounded-xl p-4 shadow-sm mb-6 flex items-center gap-4'>
        <span className='text-sm font-semibold text-gray-700'>{t('Tampilkan subordinate:', 'Show subordinates:')}</span>
        <div className='flex gap-2'>
          {[false, true].map(v => (
            <button key={String(v)} onClick={() => { setIncludeIndirect(v); setForm(f => ({ ...f, empId: '' })) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${
                includeIndirect === v ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-red-200'
              }`}>
              {v ? `${t('Direct + Indirect', 'Direct + Indirect')}` : `${t('Direct Only', 'Direct Only')}`}
            </button>
          ))}
        </div>
        <span className='text-xs text-gray-400 ml-2'>
          {subordinates.length} {t('karyawan', 'employees')} · {directIds.length} {t('direct', 'direct')}
          {includeIndirect && ` · ${allSubIds.length - directIds.length} ${t('indirect', 'indirect')}`}
        </span>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>

        {/* Subordinate list */}
        <div className='bg-white rounded-xl p-5 shadow-sm'>
          <h2 className='text-sm font-bold text-gray-700 mb-3'><Icon e='👥' size={14} className='inline align-[-2px]' /> {t('Daftar Subordinate', 'Subordinate List')}</h2>
          {subordinates.length === 0 ? (
            <p className='text-xs text-gray-400'>{t('Tidak ada subordinate.', 'No subordinates.')}</p>
          ) : (
            <div className='space-y-2 max-h-80 overflow-y-auto pr-1'>
              {subordinates.map(e => {
                const isDirect = directIds.includes(e.id)
                return (
                  <button key={e.id} onClick={() => setForm(f => ({ ...f, empId: String(e.id) }))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition ${
                      form.empId === String(e.id) ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <div className='w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 overflow-hidden'
                      style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                      {e.photo ? <img src={e.photo} className='w-full h-full object-cover' /> : (e.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-xs font-semibold text-gray-800 truncate'>{e.name}</div>
                      <div className='text-xs text-gray-400 truncate'>{posName(e.positionId)}</div>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isDirect ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {isDirect ? t('Direct', 'Direct') : t('Indirect', 'Indirect')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Form */}
        <div className='lg:col-span-2 bg-white rounded-xl p-5 shadow-sm'>
          <h2 className='text-sm font-bold text-gray-700 mb-4'><Icon e='📝' size={14} className='inline align-[-2px]' /> {t('Ajukan Cuti', 'Submit Leave')}</h2>

          {msg && (
            <div className={`text-sm px-4 py-2.5 rounded-lg mb-4 ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {msg.text}
            </div>
          )}

          {selectedEmp && (
            <div className='flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl mb-4'>
              <div className='w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0'
                style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                {selectedEmp.photo ? <img src={selectedEmp.photo} className='w-full h-full object-cover' /> : (selectedEmp.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div>
                <div className='text-sm font-bold text-red-800'>{selectedEmp.name}</div>
                <div className='text-xs text-red-500'>{posName(selectedEmp.positionId)} · {deptName(selectedEmp.departmentId)}</div>
              </div>
              {form.type && (
                <div className='ml-auto text-right'>
                  <div className='text-xs text-gray-500'>{t('Sisa saldo', 'Remaining balance')}</div>
                  <div className='text-lg font-bold text-red-700'>
                    {(() => {
                      const lt = leaveTypes.find(lt => lt.name === form.type)
                      const { approved, pending } = calcLeaveUsed(leaves, +form.empId, form.type)
                      return (lt?.maxDays ?? 0) - approved - pending
                    })()} {t('hari', 'days')}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='grid grid-cols-2 gap-4'>
            <div className='col-span-2'>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Karyawan', 'Employee')}</label>
              <select value={form.empId} onChange={e => setForm(f => ({ ...f, empId: e.target.value }))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                <option value=''>— {t('Pilih Karyawan', 'Select Employee')} —</option>
                {subordinates.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({directIds.includes(e.id) ? t('Direct', 'Direct') : t('Indirect', 'Indirect')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Jenis Cuti', 'Leave Type')}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                <option value=''>— {t('Pilih Jenis', 'Select Type')} —</option>
                {activeTypes.map(lt => {
                  const { approved, pending } = form.empId ? calcLeaveUsed(leaves, +form.empId, lt.name) : { approved: 0, pending: 0 }
                  const sisa = lt.maxDays - approved - pending
                  return (
                    <option key={lt.id} value={lt.name}>
                      {lt.name} ({t('sisa', 'remaining')}: {sisa} {t('hari', 'days')})
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Keterangan', 'Note')}</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder={t('Opsional', 'Optional')}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tanggal Mulai', 'Start Date')}</label>
              <input type='date' value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tanggal Selesai', 'End Date')}</label>
              <input type='date' value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
          </div>

          {form.start && form.end && form.end >= form.start && (
            <p className='text-xs text-red-600 font-semibold mt-2'>
              {t('Durasi', 'Duration')}: {daysBetween(form.start, form.end)} {t('hari kerja', 'working days')}
            </p>
          )}

          <button onClick={handleSubmit}
            className='mt-4 px-6 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition'
            style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
            {t('Ajukan Cuti', 'Submit Leave')}
          </button>
        </div>
      </div>

      {/* History */}
      <div className='bg-white rounded-xl p-6 shadow-sm'>
        <h2 className='text-sm font-bold text-gray-700 mb-4'>
          <Icon e='📄' size={14} className='inline align-[-2px]' /> {t('Riwayat Cuti Tim', 'Team Leave History')}
          <span className='ml-2 text-xs font-normal text-gray-400'>({subLeaves.length} {t('pengajuan', 'submissions')})</span>
        </h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50'>
                {[t('Karyawan','Employee'), t('Jenis','Type'), t('Mulai','Start'), t('Selesai','End'), t('Hari','Days'), t('Keterangan','Note'), 'Status'].map(h => (
                  <th key={h} className='text-left px-4 py-2.5 text-xs font-semibold text-gray-500'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subLeaves.length ? subLeaves.map(l => (
                <tr key={l.id} className='border-t border-gray-100 hover:bg-gray-50'>
                  <td className='px-4 py-2.5 font-medium'>{l.name}</td>
                  <td className='px-4 py-2.5'>{l.type}</td>
                  <td className='px-4 py-2.5'>{l.start}</td>
                  <td className='px-4 py-2.5'>{l.end}</td>
                  <td className='px-4 py-2.5'>{daysBetween(l.start, l.end)}</td>
                  <td className='px-4 py-2.5 text-gray-500'>{l.note || '—'}</td>
                  <td className='px-4 py-2.5'>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEAVE_STATUS_BADGE[l.status] || ''}`}>{l.status}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className='px-4 py-8 text-center text-gray-400 text-sm'>{t('Belum ada pengajuan dari tim.', 'No team leave submissions yet.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {subLeaves.length > 0 && (
        <div className='mt-6'>
          <WorkflowMonitor leaves={subLeaves} title={t('Workflow Monitor — Tim Saya', 'Workflow Monitor — My Team')} />
        </div>
      )}
    </div>
  )
}
