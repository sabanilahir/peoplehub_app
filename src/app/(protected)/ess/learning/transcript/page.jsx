'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const TRANSCRIPT = [
  { id:1, course:'K3 & Keselamatan Kerja Dasar', category:'K3 & Safety', type:'ILT', duration:'8 jam', completed:'2025-01-15', score:90, cpd_points:8, certificate:true, assignment:'Required' },
  { id:2, course:'Pengenalan HCMS System', category:'IT & Digital', type:'Self-Paced', duration:'4 jam', completed:'2024-10-25', score:85, cpd_points:3, certificate:true, assignment:'Required' },
  { id:3, course:'Communication Skills Workshop', category:'Soft Skills', type:'ILT', duration:'8 jam', completed:'2024-08-20', score:78, cpd_points:8, certificate:false, assignment:'Voluntary' },
  { id:4, course:'Finance Fundamentals', category:'Finance', type:'Self-Paced', duration:'6 jam', completed:'2024-05-12', score:92, cpd_points:4, certificate:false, assignment:'Voluntary' },
  { id:5, course:'Onboarding Program 2024', category:'HR & People', type:'Blended', duration:'16 jam', completed:'2024-01-30', score:88, cpd_points:12, certificate:true, assignment:'Required' },
]

export default function LearningTranscriptPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const filtered = TRANSCRIPT.filter(rec => rec.course.toLowerCase().includes(search.toLowerCase()))
  const totalCPD = TRANSCRIPT.reduce((a,rec)=>a+rec.cpd_points,0)
  const totalHours = TRANSCRIPT.reduce((a,rec)=>a+parseInt(rec.duration),0)

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Learning Transcript</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Riwayat lengkap seluruh learning yang telah diselesaikan.','Complete history of all learning you have completed.')}</p>


      <div className='bg-white rounded-xl p-6 shadow-sm'>
        <div className='flex items-center justify-between mb-4'>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Cari course...','Search courses...')}
            className='w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
          <button className='px-4 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition'
            style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}><Icon e='⬇️' size={14} className='inline align-[-2px]' /> {t('Export PDF','Export PDF')}</button>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead><tr className='bg-gray-50'>{[t('Course','Course'),t('Kategori','Category'),t('Metode','Method'),t('Durasi','Duration'),t('Selesai','Completed'),t('Nilai','Score'),'CPD Pts',t('Sertifikat','Certificate'),t('Tipe','Type')].map(h=>(
              <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500'>{h}</th>
            ))}</tr></thead>
            <tbody>{filtered.map(rec=>(
              <tr key={rec.id} className='border-t border-gray-100 hover:bg-gray-50'>
                <td className='px-3 py-2.5 font-medium text-gray-700 max-w-40'><div className='line-clamp-2'>{rec.course}</div></td>
                <td className='px-3 py-2.5 text-xs text-gray-500'>{rec.category}</td>
                <td className='px-3 py-2.5'><span className='text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold'>{rec.type}</span></td>
                <td className='px-3 py-2.5 text-gray-500'>{rec.duration}</td>
                <td className='px-3 py-2.5 text-gray-500'>{rec.completed}</td>
                <td className='px-3 py-2.5 font-bold text-gray-700'>{rec.score}</td>
                <td className='px-3 py-2.5 text-gray-500'>{rec.cpd_points} pts</td>
                <td className='px-3 py-2.5'>{rec.certificate?<button className='text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full font-semibold hover:bg-yellow-100'><Icon e='⬇️' size={14} className='inline align-[-2px]' /> Download</button>:<span className='text-gray-400 text-xs'>—</span>}</td>
                <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rec.assignment==='Required'?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700'}`}>{rec.assignment}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
