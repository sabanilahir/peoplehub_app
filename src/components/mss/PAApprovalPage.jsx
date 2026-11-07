'use client'
import Icon from '@/components/ui/Icon'
import { useState, useMemo } from 'react'
import { useAuthStore }              from '@/store/authStore'
import { useEmployeeStore }          from '@/store/employeeStore'
import { useStructureStore }         from '@/store/structureStore'
import { usePersonnelActionStore, PA_ACTION_ICON, PA_STATUS_COLOR } from '@/store/personnelActionStore'
import { useT } from '@/store/languageStore'

const GRADIENT = {
  'Promote':                 'from-red-700 to-violet-600',
  'Transfer':                'from-blue-700 to-blue-600',
  'Demote':                  'from-orange-700 to-orange-600',
  'Transfer Across Company': 'from-indigo-700 to-indigo-600',
  'Terminate':               'from-red-700 to-red-600',
  'Rehire':                  'from-green-700 to-green-600',
  'Change Employment Type':  'from-cyan-700 to-cyan-600',
  'Extend Contract':         'from-teal-700 to-teal-600',
}

const ACTION_DESC = {
  'Promote':                 { id: 'Kenaikan posisi dan/atau grade karyawan',   en: 'Employee position and/or grade promotion' },
  'Transfer':                { id: 'Mutasi antar departemen (satu perusahaan)', en: 'Interdepartmental transfer (same company)' },
  'Demote':                  { id: 'Penurunan posisi atau grade karyawan',       en: 'Employee position or grade demotion' },
  'Transfer Across Company': { id: 'Mutasi lintas perusahaan dalam group',       en: 'Cross-company transfer within group' },
  'Terminate':               { id: 'Pemutusan hubungan kerja',                   en: 'Employment termination' },
  'Rehire':                  { id: 'Rekrutmen kembali mantan karyawan',          en: 'Re-employment of former employee' },
  'Change Employment Type':  { id: 'Ubah jenis kepegawaian (kontrak ↔ tetap)',  en: 'Change employment type (contract ↔ permanent)' },
  'Extend Contract':         { id: 'Perpanjangan kontrak kerja',                 en: 'Extension of employment contract' },
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

export default function PAApprovalPage({ action }) {
  const t = useT()
  const { currentUser }  = useAuthStore()
  const { employees }    = useEmployeeStore()
  const { positions, departments, companies, grades } = useStructureStore()
  const { pas, updatePA } = usePersonnelActionStore()

  const [selected,    setSelected]    = useState(null)
  const [rejectId,    setRejectId]    = useState(null)
  const [rejectNote,  setRejectNote]  = useState('')
  const [msg,         setMsg]         = useState(null)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const teamIds = useMemo(() => {
    if (currentUser?.role === 'superadmin') return employees.map(e => e.id)
    return employees.filter(e => e.managerId === currentUser?.id).map(e => e.id)
  }, [employees, currentUser])

  const myPAs = useMemo(() =>
    pas
      .filter(p => p.action === action && teamIds.includes(p.employeeId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [pas, action, teamIds]
  )

  const pending = myPAs.filter(p => p.status === 'Submitted')
  const history = myPAs.filter(p => ['Approved', 'Rejected', 'Applied'].includes(p.status))

  const empData  = id => employees.find(x => x.id === Number(id))
  const posLabel = id => positions.find(x => x.id === Number(id))?.name || '—'
  const grLabel  = id => { const g = grades.find(x => x.id === Number(id)); return g ? `${String(g.id).padStart(2,'0')} — ${g.name}` : '—' }
  const deptName = id => departments.find(x => x.id === Number(id))?.name || '—'
  const coName   = id => companies.find(x => x.id === Number(id))?.name || '—'

  const handleApprove = (pa) => {
    updatePA(pa.id, { status: 'Approved' })
    flash(t('PA disetujui.', 'PA approved.'))
    setSelected(null)
  }

  const handleReject = (pa) => {
    if (!rejectNote.trim()) return flash(t('Masukkan alasan penolakan.', 'Enter rejection reason.'), 'error')
    updatePA(pa.id, { status: 'Rejected', rejectNote })
    flash(t('PA ditolak.', 'PA rejected.'))
    setRejectId(null)
    setRejectNote('')
    setSelected(null)
  }

  const icon     = PA_ACTION_ICON[action] || '📋'
  const gradient = GRADIENT[action] || 'from-violet-700 to-red-600'
  const desc     = t(ACTION_DESC[action]?.id || '', ACTION_DESC[action]?.en || '')

  return (
    <div className='min-h-screen bg-gray-50'>

      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} text-white px-8 py-6`}>
        <div className='flex items-center gap-3'>
          <span className='text-4xl'>{icon}</span>
          <div>
            <h1 className='text-2xl font-bold'>{t('Approval', 'Approval')} — {action}</h1>
            <p className='text-white/70 text-sm mt-0.5'>{desc}</p>
          </div>
        </div>
        <div className='grid grid-cols-3 gap-4 mt-4'>
          {[
            [t('Perlu Disetujui', 'Needs Approval'),       pending.length,                                              'bg-yellow-400/30'],
            [t('Disetujui',       'Approved'),              myPAs.filter(p => p.status === 'Approved').length,          'bg-green-400/30'],
            [t('Ditolak',         'Rejected'),              myPAs.filter(p => p.status === 'Rejected').length,          'bg-red-400/30'],
          ].map(([l, v, c]) => (
            <div key={l} className={`${c} rounded-xl px-4 py-3`}>
              <p className='text-xs text-white/70'>{l}</p>
              <p className='text-2xl font-bold'>{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className='px-8 py-6 space-y-6'>

        {/* Pending Approval */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-5 py-4 border-b border-gray-50 flex items-center gap-2'>
            <span className='text-amber-500'><Icon e='⏳' size={15} /></span>
            <p className='font-bold text-gray-900'>{t('Menunggu Persetujuan', 'Pending Approval')}</p>
            <span className='ml-auto text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full'>{pending.length}</span>
          </div>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                {['PA Number', t('Karyawan','Employee'), t('Dari Posisi','From Position'), t('Ke Posisi','To Position'), 'Effective Date', t('Aksi','Action')].map(h => (
                  <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className='text-center py-12 text-gray-400'>
                    <div className='text-3xl mb-2'>{icon}</div>
                    <p className='text-sm'>{t('Tidak ada PA menunggu persetujuan', 'No PA pending approval')}</p>
                  </td>
                </tr>
              ) : pending.map(pa => {
                const e = empData(pa.employeeId)
                return (
                  <tr key={pa.id} className='hover:bg-gray-50/50 cursor-pointer' onClick={() => setSelected(pa)}>
                    <td className='px-4 py-3'>
                      <span className='font-mono text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded'>{pa.paNumber}</span>
                    </td>
                    <td className='px-4 py-3'>
                      <div>
                        <p className='font-semibold text-gray-800 text-xs'>{e?.name || '—'}</p>
                        <p className='text-xs text-gray-400'>{deptName(pa.fromDepartmentId)}</p>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-500'>{posLabel(pa.fromPositionId)}</td>
                    <td className='px-4 py-3 text-xs font-semibold text-gray-800'>{posLabel(pa.toPositionId)}</td>
                    <td className='px-4 py-3 text-xs text-gray-600'>{pa.effectiveDate || '—'}</td>
                    <td className='px-4 py-3' onClick={ev => ev.stopPropagation()}>
                      {rejectId === pa.id ? (
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                            placeholder={t('Alasan penolakan…','Rejection reason…')}
                            className='px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-red-400 w-32'
                            onClick={ev => ev.stopPropagation()} />
                          <button onClick={() => handleReject(pa)}
                            className='px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600'>
                            {t('Tolak','Reject')}
                          </button>
                          <button onClick={() => { setRejectId(null); setRejectNote('') }}
                            className='px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200'>
                            {t('Batal','Cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className='flex gap-2'>
                          <button onClick={() => handleApprove(pa)}
                            className='px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition'>
                            <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Setuju','Approve')}
                          </button>
                          <button onClick={() => { setRejectId(pa.id); setRejectNote('') }}
                            className='px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition'>
                            <Icon e='✗' size={14} className='inline align-[-2px]' /> {t('Tolak','Reject')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Decision History */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-5 py-4 border-b border-gray-50 flex items-center gap-2'>
            <span><Icon e='📋' size={15} /></span>
            <p className='font-bold text-gray-900'>{t('Riwayat Keputusan','Decision History')}</p>
            <span className='ml-auto text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full'>{history.length}</span>
          </div>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                {['PA Number', t('Karyawan','Employee'), t('Dari Posisi','From Position'), t('Ke Posisi','To Position'), 'Effective Date', 'Status'].map(h => (
                  <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {history.length === 0 ? (
                <tr><td colSpan={6} className='text-center py-8 text-gray-400 text-sm'>{t('Belum ada riwayat','No history yet')}</td></tr>
              ) : history.map(pa => {
                const e = empData(pa.employeeId)
                return (
                  <tr key={pa.id} className='hover:bg-gray-50/50 cursor-pointer' onClick={() => setSelected(pa)}>
                    <td className='px-4 py-3'>
                      <span className='font-mono text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded'>{pa.paNumber}</span>
                    </td>
                    <td className='px-4 py-3'>
                      <p className='font-semibold text-gray-800 text-xs'>{e?.name || '—'}</p>
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-500'>{posLabel(pa.fromPositionId)}</td>
                    <td className='px-4 py-3 text-xs text-gray-700'>{posLabel(pa.toPositionId)}</td>
                    <td className='px-4 py-3 text-xs text-gray-600'>{pa.effectiveDate || '—'}</td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PA_STATUS_COLOR[pa.status] || 'bg-gray-100 text-gray-600'}`}>{pa.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (() => {
        const e = empData(selected.employeeId)
        return (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden'>

              <div className='flex items-center justify-between px-6 py-4 border-b flex-shrink-0'>
                <div className='flex items-center gap-3'>
                  <span className='text-2xl'>{icon}</span>
                  <div>
                    <h2 className='font-bold text-gray-900'>{selected.paNumber}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PA_STATUS_COLOR[selected.status] || ''}`}>{selected.status}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className='w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400'><Icon e='✕' size={15} /></button>
              </div>

              <div className='overflow-y-auto flex-1 px-6 py-5 space-y-4'>
                <div className='bg-violet-50 rounded-xl p-4'>
                  <p className='text-xs font-bold text-violet-500 uppercase tracking-wider mb-2'>{t('Karyawan','Employee')}</p>
                  <p className='font-bold text-gray-900'>{e?.name || '—'}</p>
                  <p className='text-xs text-gray-500'>{e?.nik} · {deptName(selected.fromDepartmentId)}</p>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-gray-50 rounded-xl p-3'>
                    <p className='text-xs font-bold text-gray-400 uppercase mb-2'>FROM</p>
                    <p className='text-sm font-semibold text-gray-700'>{posLabel(selected.fromPositionId)}</p>
                    <p className='text-xs text-gray-400 mt-0.5'>{grLabel(selected.fromGradeId)}</p>
                    <p className='text-xs text-gray-400'>{coName(selected.fromCompanyId)}</p>
                    <p className='text-xs text-gray-400'>{deptName(selected.fromDepartmentId)}</p>
                    {selected.fromEndDate && <p className='text-xs text-gray-400 mt-0.5'>End: {selected.fromEndDate}</p>}
                  </div>
                  <div className='bg-blue-50 rounded-xl p-3'>
                    <p className='text-xs font-bold text-blue-400 uppercase mb-2'>TO</p>
                    <p className='text-sm font-semibold text-blue-700'>{posLabel(selected.toPositionId)}</p>
                    <p className='text-xs text-blue-400 mt-0.5'>{grLabel(selected.toGradeId)}</p>
                    <p className='text-xs text-blue-400'>{coName(selected.toCompanyId)}</p>
                    <p className='text-xs text-blue-400'>{deptName(selected.toDepartmentId)}</p>
                    {selected.toEndDate && <p className='text-xs text-blue-400 mt-0.5'>End: {selected.toEndDate}</p>}
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <RV label='Effective Date' value={selected.effectiveDate} />
                  <RV label='Reason'         value={selected.reason} />
                </div>
                {selected.note && <RV label='Note' value={selected.note} />}
                {selected.rejectNote && (
                  <div className='bg-red-50 rounded-xl px-4 py-3'>
                    <p className='text-xs font-semibold text-red-400 mb-1'>{t('Alasan Penolakan','Rejection Reason')}</p>
                    <p className='text-sm text-red-600'>{selected.rejectNote}</p>
                  </div>
                )}
                {selected.appliedAt && (
                  <div className='bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700'>
                    <Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Diterapkan pada','Applied on')} <strong>{selected.appliedAt}</strong>
                  </div>
                )}
              </div>

              <div className='flex items-center justify-between px-6 py-4 border-t bg-gray-50 flex-shrink-0'>
                <button onClick={() => setSelected(null)}
                  className='px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100'>
                  {t('Tutup','Close')}
                </button>
                {selected.status === 'Submitted' && (
                  <div className='flex gap-2'>
                    <button
                      onClick={() => { setSelected(null); setRejectId(selected.id); setRejectNote('') }}
                      className='px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100'>
                      <Icon e='✗' size={14} className='inline align-[-2px]' /> {t('Tolak','Reject')}
                    </button>
                    <button
                      onClick={() => handleApprove(selected)}
                      className='px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow'>
                      <Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Setuju','Approve')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {msg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>{msg.text}
        </div>
      )}
    </div>
  )
}
