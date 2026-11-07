'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const CERT_REQUESTS = [
  { id:1, employee:'Ahmad Fauzi', cert:'GCG & Compliance Certification', completedDate:'2025-07-28', score:88, attendance:100, minScore:75, minAttendance:80, status:'Pending', validity:'2 tahun', note:'' },
  { id:2, employee:'Dewi Sari', cert:'Data Analytics Professional', completedDate:'2025-06-15', score:95, attendance:100, minScore:80, minAttendance:90, status:'Approved', validity:'Permanent', note:'Excellent performance' },
  { id:3, employee:'Siti Nurhaliza', cert:'Leadership Fundamentals Certificate', completedDate:'2025-07-20', score:72, attendance:85, minScore:75, minAttendance:80, status:'Pending', validity:'1 tahun', note:'' },
  { id:4, employee:'Rizky Pratama', cert:'K3 Safety Certificate', completedDate:'2025-05-10', score:82, attendance:90, minScore:70, minAttendance:80, status:'Rejected', validity:'1 tahun', note:'Score kurang dari minimum di modul final exam. Perlu remedial.' },
]

export default function CertApprovalPage() {
  const t = useT()
  const [data, setData] = useDbState('mss-learning-cert-approval', CERT_REQUESTS)
  const [note, setNote] = useState({})
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handleAction = (id, action) => {
    setData(prev=>prev.map(d=>d.id===id?{...d, status:action==='approve'?'Approved':'Rejected', note:note[id]||''}:d))
    flash(`Sertifikat ${action==='approve'?'disetujui dan akan diterbitkan':'ditolak'}.`)
    setNote(prev=>{const n={...prev};delete n[id];return n})
  }

  const pending = data.filter(d=>d.status==='Pending')
  const history = data.filter(d=>d.status!=='Pending')

  const isEligible = (d) => d.score >= d.minScore && d.attendance >= d.minAttendance
  const statusColor = { Pending:'bg-yellow-50 text-yellow-700', Approved:'bg-green-50 text-green-700', Rejected:'bg-red-50 text-red-700' }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Certification Approval', 'Certification Approval')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Review dan setujui penerbitan sertifikat untuk anggota tim Anda yang telah memenuhi syarat.', 'Review and approve certificate issuance for your team members who have met the requirements.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}


      {pending.length > 0 && (
        <div className='mb-6'>
          <h2 className='font-bold text-gray-700 mb-4 text-lg'><Icon e='⏳' size={14} className='inline align-[-2px]' /> {t('Menunggu Approval', 'Awaiting Approval')} ({pending.length})</h2>
          <div className='space-y-4'>
            {pending.map(d=>{
              const eligible = isEligible(d)
              return (
                <div key={d.id} className={`bg-white rounded-xl p-5 shadow-sm border ${eligible?'border-green-200':'border-orange-200'}`}>
                  <div className='flex items-start justify-between mb-3'>
                    <div>
                      <div className='font-bold text-gray-800 text-base'>{d.cert}</div>
                      <div className='text-sm font-semibold text-red-700 mt-0.5'>{d.employee}</div>
                      <div className='text-xs text-gray-400 mt-0.5'>{t('Diselesaikan', 'Completed')}: {d.completedDate} · {t('Berlaku', 'Valid')}: {d.validity}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-bold border ${eligible?'bg-green-50 text-green-700 border-green-200':'bg-orange-50 text-orange-700 border-orange-200'}`}>
                      {eligible?t('Eligible','Eligible'):t('Check Requirements','Check Requirements')}
                    </span>
                  </div>

                  <div className='grid grid-cols-2 gap-4 mb-3'>
                    {[[t('Score','Score'), d.score+'%', d.minScore+'% min', d.score>=d.minScore],
                      [t('Kehadiran','Attendance'), d.attendance+'%', d.minAttendance+'% min', d.attendance>=d.minAttendance]].map(([label,val,req,ok])=>(
                      <div key={label} className={`rounded-lg p-3 ${ok?'bg-green-50':'bg-red-50'}`}>
                        <div className='text-xs font-semibold text-gray-600'>{label}</div>
                        <div className={`text-lg font-bold ${ok?'text-green-700':'text-red-700'}`}>{val}</div>
                        <div className='text-xs text-gray-400'>{t('Minimum', 'Minimum')}: {req}</div>
                      </div>
                    ))}
                  </div>

                  <div className='mb-3'>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Catatan (opsional)', 'Notes (optional)')}</label>
                    <input value={note[d.id]||''} onChange={e=>setNote(p=>({...p,[d.id]:e.target.value}))}
                      className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Catatan untuk karyawan...', 'Notes for employee...')} />
                  </div>
                  <div className='flex gap-3'>
                    <button onClick={()=>handleAction(d.id,'approve')}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${eligible?'bg-green-600 text-white hover:bg-green-700':'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                      disabled={!eligible}>
                      {t('Approve & Terbitkan Sertifikat', 'Approve & Issue Certificate')}
                    </button>
                    <button onClick={()=>handleAction(d.id,'reject')} className='flex-1 py-2.5 text-red-600 text-sm font-semibold bg-red-50 rounded-lg hover:bg-red-100 border border-red-200'>
                      {t('Tolak', 'Reject')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className='font-bold text-gray-700 mb-4 text-lg'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Riwayat', 'History')}</h2>
          <div className='bg-white rounded-xl p-6 shadow-sm overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead><tr className='bg-gray-50'>{[t('Karyawan','Employee'),t('Sertifikat','Certificate'),t('Score','Score'),t('Kehadiran','Attendance'),t('Status','Status'),t('Catatan','Notes')].map(h=>(
                <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500'>{h}</th>
              ))}</tr></thead>
              <tbody>{history.map(d=>(
                <tr key={d.id} className='border-t border-gray-100 hover:bg-gray-50'>
                  <td className='px-3 py-2.5 font-medium text-gray-700'>{d.employee}</td>
                  <td className='px-3 py-2.5 text-gray-600 text-xs max-w-40'><div className='line-clamp-2'>{d.cert}</div></td>
                  <td className='px-3 py-2.5 font-semibold text-gray-700'>{d.score}%</td>
                  <td className='px-3 py-2.5 text-gray-500'>{d.attendance}%</td>
                  <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[d.status]}`}>{d.status}</span></td>
                  <td className='px-3 py-2.5 text-xs text-gray-400'>{d.note||'—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
