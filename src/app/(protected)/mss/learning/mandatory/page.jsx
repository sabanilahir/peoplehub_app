'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const TEAM_MANDATORY = [
  { id:1, employee:'Ahmad Fauzi', nik:'EMP001', course:'GCG & Compliance Certification', due:'2025-09-30', progress:25, status:'In Progress', dept:'Finance' },
  { id:2, employee:'Ahmad Fauzi', nik:'EMP001', course:'K3 & Keselamatan Kerja Dasar', due:'2025-01-31', progress:100, status:'Completed', dept:'Finance' },
  { id:3, employee:'Dewi Sari', nik:'EMP002', course:'K3 & Keselamatan Kerja Dasar', due:'2025-01-31', progress:100, status:'Completed', dept:'HR' },
  { id:4, employee:'Dewi Sari', nik:'EMP002', course:'GCG & Compliance Certification', due:'2025-09-30', progress:60, status:'In Progress', dept:'HR' },
  { id:5, employee:'Budi Rahayu', nik:'EMP003', course:'K3 & Keselamatan Kerja Dasar', due:'2025-03-31', progress:0, status:'Overdue', dept:'Operations' },
  { id:6, employee:'Budi Rahayu', nik:'EMP003', course:'GCG & Compliance Certification', due:'2025-09-30', progress:0, status:'Not Started', dept:'Operations' },
  { id:7, employee:'Rizky Pratama', nik:'EMP005', course:'GCG & Compliance Certification', due:'2025-06-30', progress:0, status:'Overdue', dept:'IT' },
]

const STATUS_OPTS = ['All','Not Started','In Progress','Completed','Overdue']

export default function MandatoryTrainingMonitoringPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const filtered = TEAM_MANDATORY.filter(d =>
    (filterStatus==='All' || d.status===filterStatus) &&
    (d.employee.toLowerCase().includes(search.toLowerCase()) || d.course.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = { total:TEAM_MANDATORY.length, completed:TEAM_MANDATORY.filter(d=>d.status==='Completed').length, overdue:TEAM_MANDATORY.filter(d=>d.status==='Overdue').length, inProgress:TEAM_MANDATORY.filter(d=>d.status==='In Progress').length }
  const rate = Math.round(stats.completed/stats.total*100)

  const statusColor = (s) => ({ 'Not Started':'bg-gray-100 text-gray-500', 'In Progress':'bg-blue-50 text-blue-700', Completed:'bg-green-50 text-green-700', Overdue:'bg-red-50 text-red-700' }[s])

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Mandatory Training Monitoring', 'Mandatory Training Monitoring')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Pantau status training wajib (mandatory/compliance) seluruh anggota tim Anda.', 'Monitor mandatory/compliance training status for all your team members.')}</p>


      {stats.overdue > 0 && (
        <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3'>
          <span className='text-xl'><Icon e='⚠️' size={15} /></span>
          <div>
            <p className='font-semibold text-red-700'>{t(`Perhatian: ${stats.overdue} mandatory training OVERDUE di tim Anda`, `Warning: ${stats.overdue} mandatory training(s) OVERDUE in your team`)}</p>
            <p className='text-xs text-red-500 mt-0.5'>{t('Segera tindaklanjuti agar tidak mempengaruhi compliance perusahaan.', 'Take immediate action to avoid impacting company compliance.')}</p>
          </div>
          <button className='ml-auto px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700'>{t('Kirim Reminder', 'Send Reminder')}</button>
        </div>
      )}

      <div className='bg-white rounded-xl p-6 shadow-sm'>
        <div className='flex flex-wrap gap-3 mb-4'>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Cari nama atau course...', 'Search name or course...')}
            className='flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
          <div className='flex gap-1'>
            {STATUS_OPTS.map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStatus===s?'bg-red-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead><tr className='bg-gray-50'>{[t('Karyawan','Employee'),t('NIK','NIK'),t('Dept','Dept'),t('Course Mandatory','Mandatory Course'),t('Due Date','Due Date'),t('Progress','Progress'),t('Status','Status'),t('Aksi','Action')].map(h=>(
              <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500'>{h}</th>
            ))}</tr></thead>
            <tbody>{filtered.map(d=>(
              <tr key={d.id} className={`border-t border-gray-100 hover:bg-gray-50 ${d.status==='Overdue'?'bg-red-50/30':''}`}>
                <td className='px-3 py-2.5 font-medium text-gray-700'>{d.employee}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs'>{d.nik}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs'>{d.dept}</td>
                <td className='px-3 py-2.5 text-gray-600 max-w-40'><div className='line-clamp-2 text-xs'>{d.course}</div></td>
                <td className='px-3 py-2.5 text-xs whitespace-nowrap'><span className={d.status==='Overdue'?'text-red-600 font-semibold':'text-gray-500'}>{d.due}</span></td>
                <td className='px-3 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <div className='w-16 bg-gray-200 rounded-full h-1.5'><div className={`h-1.5 rounded-full ${d.status==='Overdue'?'bg-red-500':'bg-red-500'}`} style={{ width:`${d.progress}%` }}></div></div>
                    <span className='text-xs text-gray-500'>{d.progress}%</span>
                  </div>
                </td>
                <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor(d.status)}`}>{d.status}</span></td>
                <td className='px-3 py-2.5'><button className='px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100'>{t('Ingatkan', 'Remind')}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
