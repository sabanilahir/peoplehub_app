'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const INIT = [
  { id:1, employee:'Rizky Pratama', dept:'IT', type:'External Training', course:'AWS Solutions Architect Certification', vendor:'Amazon Web Services', date:'2025-08-15', duration:'3 hari', cost:8500000, justification:'Diperlukan untuk mendukung proyek migrasi cloud Q4 2025', status:'Pending', submitted:'2025-07-10' },
  { id:2, employee:'Budi Rahayu', dept:'Operations', type:'External Training', course:'K3 Expert Certification', vendor:'BNSP', date:'2025-09-10', duration:'5 hari', cost:5000000, justification:'Syarat pengajuan jabatan K3 Expert sesuai roadmap karir', status:'Pending', submitted:'2025-07-12' },
  { id:3, employee:'Siti Nurhaliza', dept:'Marketing', type:'Course Enrollment', course:'Digital Marketing Advanced', vendor:'Internal LMS', date:'2025-08-01', duration:'Self-Paced', cost:0, justification:'Mendukung kemampuan digital marketing untuk campaign Q3', status:'Approved', submitted:'2025-07-05', note_manager:'Setuju, sangat relevan' },
  { id:4, employee:'Ahmad Fauzi', dept:'Finance', type:'External Training', course:'CPA Exam Preparation', vendor:'ICAI Indonesia', date:'2025-10-01', duration:'2 hari', cost:12000000, justification:'Persiapan ujian CPA untuk peningkatan profesionalisme', status:'Rejected', submitted:'2025-06-20', note_manager:'Budget sudah habis untuk Q3, coba Q4' },
]

export default function TrainingApprovalPage() {
  const t = useT()
  const [data, setData] = useDbState('mss-learning-approval', INIT)
  const [note, setNote] = useState({})
  const [msg,  setMsg ] = useState(null)

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(()=>setMsg(null), 3000) }

  const handleAction = (id, action) => {
    setData(prev=>prev.map(d=>d.id===id?{...d,status:action==='approve'?'Approved':'Rejected',note_manager:note[id]||''}:d))
    flash(t(`Permintaan ${action==='approve'?'disetujui':'ditolak'}.`,`Request ${action==='approve'?'approved':'rejected'}.`))
    setNote(prev=>{const n={...prev};delete n[id];return n})
  }

  const pending = data.filter(d=>d.status==='Pending')
  const history = data.filter(d=>d.status!=='Pending')

  const statusColor = (s) => ({ Pending:'bg-yellow-50 text-yellow-700', Approved:'bg-green-50 text-green-700', Rejected:'bg-red-50 text-red-700' }[s])

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Pusat Persetujuan Training','Training Approval Center')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Review dan setujui/tolak permintaan training anggota tim Anda.','Review and approve/reject training requests from your team members.')}</p>

      {msg && <div className={`text-xs px-4 py-3 rounded-lg mb-4 ${msg.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-600'}`}>{msg.text}</div>}


      {pending.length > 0 && (
        <div className='mb-6'>
          <h2 className='font-bold text-gray-700 mb-4 text-lg'><Icon e='⏳' size={14} className='inline align-[-2px]' /> {t('Menunggu Approval','Pending Approval')} ({pending.length})</h2>
          <div className='space-y-4'>
            {pending.map(d=>(
              <div key={d.id} className='bg-white rounded-xl p-5 shadow-sm border border-yellow-200'>
                <div className='flex items-start justify-between mb-3'>
                  <div>
                    <div className='font-bold text-gray-800 text-base'>{d.course}</div>
                    <div className='flex items-center gap-3 mt-1'>
                      <span className='text-sm font-semibold text-red-700'>{d.employee}</span>
                      <span className='text-sm text-gray-500'>{d.dept}</span>
                      <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{d.type}</span>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-bold text-gray-800'>Rp {d.cost.toLocaleString('id-ID')}</div>
                    <div className='text-xs text-gray-400'>{d.submitted}</div>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-3 mb-3 text-sm text-gray-500'>
                  <span><Icon e='🏢' size={14} className='inline align-[-2px]' /> {d.vendor}</span>
                  <span><Icon e='📅' size={14} className='inline align-[-2px]' /> {d.date}</span>
                  <span><Icon e='⏱️' size={14} className='inline align-[-2px]' /> {d.duration}</span>
                </div>
                <div className='bg-gray-50 rounded-lg p-3 mb-3'>
                  <div className='text-xs font-semibold text-gray-600 mb-1'>{t('Justifikasi:','Justification:')}</div>
                  <div className='text-sm text-gray-600'>{d.justification}</div>
                </div>
                <div className='mb-3'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Catatan (opsional)','Note (optional)')}</label>
                  <input value={note[d.id]||''} onChange={e=>setNote(prev=>({...prev,[d.id]:e.target.value}))}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Tambahkan catatan untuk karyawan...','Add a note for the employee...')} />
                </div>
                <div className='flex gap-3'>
                  <button onClick={()=>handleAction(d.id,'approve')} className='flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition'><Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Setujui','Approve')}</button>
                  <button onClick={()=>handleAction(d.id,'reject')} className='flex-1 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition border border-red-200'><Icon e='❌' size={14} className='inline align-[-2px]' /> {t('Tolak','Reject')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className='font-bold text-gray-700 mb-4 text-lg'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Riwayat Approval','Approval History')}</h2>
          <div className='bg-white rounded-xl p-6 shadow-sm overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead><tr className='bg-gray-50'>{[t('Karyawan','Employee'),t('Course','Course'),t('Tipe','Type'),t('Biaya','Cost'),t('Tgl Submit','Submit Date'),t('Status','Status'),t('Catatan','Note')].map(h=>(
                <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500'>{h}</th>
              ))}</tr></thead>
              <tbody>{history.map(d=>(
                <tr key={d.id} className='border-t border-gray-100 hover:bg-gray-50'>
                  <td className='px-3 py-2.5 font-medium text-gray-700'>{d.employee}</td>
                  <td className='px-3 py-2.5 text-gray-600 text-xs max-w-40'><div className='line-clamp-2'>{d.course}</div></td>
                  <td className='px-3 py-2.5 text-xs text-gray-500'>{d.type}</td>
                  <td className='px-3 py-2.5 text-gray-500 whitespace-nowrap'>Rp {d.cost.toLocaleString('id-ID')}</td>
                  <td className='px-3 py-2.5 text-gray-500'>{d.submitted}</td>
                  <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor(d.status)}`}>{d.status}</span></td>
                  <td className='px-3 py-2.5 text-gray-400 text-xs'>{d.note_manager||'—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
