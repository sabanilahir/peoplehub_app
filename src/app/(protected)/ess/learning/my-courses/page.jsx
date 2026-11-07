'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const INIT = [
  { id:1, title:'K3 & Keselamatan Kerja Dasar', category:'K3 & Safety', type:'ILT', assigned:'2025-01-05', due:'2025-01-31', completed:'2025-01-15', progress:100, score:90, assignment:'Required', status:'Completed' },
  { id:2, title:'Leadership Fundamentals Level 1', category:'Leadership', type:'Blended', assigned:'2025-04-01', due:'2025-05-31', completed:'', progress:65, score:null, assignment:'Recommendation', status:'In Progress' },
  { id:3, title:'GCG & Compliance Certification', category:'Compliance', type:'Blended', assigned:'2025-07-01', due:'2025-09-30', completed:'', progress:25, score:null, assignment:'Required', status:'In Progress' },
  { id:4, title:'Excel Advanced for HR', category:'Digital Skills', type:'Self-Paced', assigned:'2025-07-01', due:'2025-07-31', completed:'', progress:0, score:null, assignment:'Voluntary', status:'Not Started' },
  { id:5, title:'Pengenalan HCMS System', category:'IT & Digital', type:'Self-Paced', assigned:'2024-10-01', due:'2024-10-31', completed:'2024-10-25', progress:100, score:85, assignment:'Required', status:'Completed' },
]

const FILTER_STATUS = ['All','In Progress','Completed','Not Started','Overdue']

export default function MyCoursesPage() {
  const t = useT()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = INIT.filter(c =>
    (filter==='All' || c.status===filter) &&
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s) => ({ 'Not Started':'bg-gray-100 text-gray-500', 'In Progress':'bg-blue-50 text-blue-700', Completed:'bg-green-50 text-green-700', Overdue:'bg-red-50 text-red-700' }[s])
  const assignColor = (a) => ({ Required:'bg-red-50 text-red-700', Voluntary:'bg-blue-50 text-blue-700', Recommendation:'bg-yellow-50 text-yellow-700' }[a])

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>My Learning / My Courses</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Daftar seluruh course yang sedang atau pernah Anda ikuti.','List of all courses you are taking or have taken.')}</p>


      <div className='bg-white rounded-xl p-6 shadow-sm'>
        <div className='flex flex-wrap gap-3 mb-6'>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Cari course...','Search courses...')}
            className='flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
          <div className='flex gap-1 flex-wrap'>
            {FILTER_STATUS.map(s=>(
              <button key={s} onClick={()=>setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter===s?'bg-red-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          {filtered.map(c=>(
            <div key={c.id} className='border border-gray-200 rounded-xl p-5 hover:border-red-200 hover:shadow-sm transition'>
              <div className='flex items-start justify-between mb-3'>
                <div className='flex-1'>
                  <div className='font-semibold text-gray-800'>{c.title}</div>
                  <div className='flex items-center gap-2 mt-1.5'>
                    <span className='text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full'>{c.category}</span>
                    <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{c.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${assignColor(c.assignment)}`}>{c.assignment}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor(c.status)}`}>{c.status}</span>
              </div>

              <div className='flex items-center gap-4 mb-3'>
                <div className='flex-1'>
                  <div className='flex justify-between text-xs text-gray-500 mb-1'>
                    <span>Progress</span><span className='font-semibold'>{c.progress}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div className='h-2 rounded-full bg-red-500' style={{ width:`${c.progress}%` }}></div>
                  </div>
                </div>
                {c.score && <div className='text-center'><div className='text-xs text-gray-400'>{t('Nilai','Score')}</div><div className='text-lg font-bold text-gray-700'>{c.score}</div></div>}
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex gap-4 text-xs text-gray-500'>
                  <span><Icon e='📅' size={14} className='inline align-[-2px]' /> Assigned: {c.assigned}</span>
                  <span><Icon e='⏰' size={14} className='inline align-[-2px]' /> Due: {c.due}</span>
                  {c.completed && <span><Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Selesai:','Completed:')} {c.completed}</span>}
                </div>
                {c.status !== 'Completed' && (
                  <button className='px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition'
                    style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
                    {c.status==='Not Started'?t('Mulai Belajar','Start Learning'):t('Lanjutkan','Continue')}
                  </button>
                )}
                {c.status === 'Completed' && (
                  <button className='px-4 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100'>
                    <Icon e='📄' size={14} className='inline align-[-2px]' /> {t('Lihat Sertifikat','View Certificate')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
