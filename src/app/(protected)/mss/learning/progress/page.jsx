'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const PROGRESS_DATA = [
  { name:'Ahmad Fauzi', dept:'Finance', courses:[
    { name:'K3 Dasar', progress:100, status:'Completed', score:88 },
    { name:'GCG Compliance', progress:25, status:'In Progress', score:null },
    { name:'Leadership L1', progress:60, status:'In Progress', score:null },
  ]},
  { name:'Dewi Sari', dept:'HR', courses:[
    { name:'K3 Dasar', progress:100, status:'Completed', score:92 },
    { name:'GCG Compliance', progress:60, status:'In Progress', score:null },
    { name:'Data Analytics for HR', progress:100, status:'Completed', score:95 },
  ]},
  { name:'Budi Rahayu', dept:'Operations', courses:[
    { name:'K3 Dasar', progress:0, status:'Overdue', score:null },
    { name:'GCG Compliance', progress:0, status:'Not Started', score:null },
  ]},
  { name:'Siti Nurhaliza', dept:'Marketing', courses:[
    { name:'K3 Dasar', progress:100, status:'Completed', score:85 },
    { name:'GCG Compliance', progress:40, status:'In Progress', score:null },
    { name:'Leadership L1', progress:80, status:'In Progress', score:null },
  ]},
  { name:'Rizky Pratama', dept:'IT', courses:[
    { name:'GCG Compliance', progress:0, status:'Overdue', score:null },
    { name:'AWS Solutions Architect', progress:35, status:'In Progress', score:null },
  ]},
]

const statusColor = { Completed:'bg-green-50 text-green-700', 'In Progress':'bg-blue-50 text-blue-700', 'Not Started':'bg-gray-100 text-gray-500', Overdue:'bg-red-50 text-red-700' }

export default function TeamProgressPage() {
  const t = useT()
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = PROGRESS_DATA.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))

  const getOverall = (courses) => {
    const sum = courses.reduce((a,c)=>a+c.progress,0)
    return Math.round(sum/courses.length)
  }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Team Learning Progress','Team Learning Progress')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Pantau perkembangan belajar tiap anggota tim secara detail.','Monitor each team member\'s learning progress in detail.')}</p>


      <div className='mb-4'>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Cari nama anggota tim...','Search team member name...')}
          className='w-full max-w-80 px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
      </div>

      <div className='space-y-3'>
        {filtered.map(p=>(
          <div key={p.name} className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
            <button className='w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left'
              onClick={()=>setSelected(selected===p.name?null:p.name)}>
              <div className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0'
                style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                {p.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div className='flex-1'>
                <div className='font-semibold text-gray-800'>{p.name}</div>
                <div className='text-xs text-gray-400'>{p.dept} · {p.courses.length} {t('courses ditugaskan','courses assigned')}</div>
              </div>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <div className='w-24 bg-gray-200 rounded-full h-2'>
                    <div className='h-2 rounded-full bg-red-500' style={{width:`${getOverall(p.courses)}%`}}></div>
                  </div>
                  <span className='text-sm font-bold text-gray-700'>{getOverall(p.courses)}%</span>
                </div>
                {p.courses.some(c=>c.status==='Overdue') && (
                  <span className='text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold'>{t('Overdue','Overdue')}</span>
                )}
                <span className='text-gray-400'>{selected===p.name?'▲':'▼'}</span>
              </div>
            </button>

            {selected === p.name && (
              <div className='border-t border-gray-100 px-5 pb-4 pt-3'>
                <div className='space-y-3'>
                  {p.courses.map(c=>(
                    <div key={c.name} className={`flex items-center gap-4 rounded-lg px-4 py-3 ${c.status==='Overdue'?'bg-red-50/50':c.status==='Completed'?'bg-green-50/30':'bg-gray-50'}`}>
                      <div className='flex-1'>
                        <div className='font-medium text-gray-700 text-sm'>{c.name}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[c.status]}`}>
                        {c.status==='Completed' ? t('Selesai','Completed') : c.status==='In Progress' ? t('Sedang Berjalan','In Progress') : c.status==='Overdue' ? t('Terlambat','Overdue') : t('Belum Dimulai','Not Started')}
                      </span>
                      <div className='flex items-center gap-2 w-32'>
                        <div className='flex-1 bg-gray-200 rounded-full h-1.5'>
                          <div className={`h-1.5 rounded-full ${c.status==='Overdue'?'bg-red-400':'bg-red-500'}`} style={{width:`${c.progress}%`}}></div>
                        </div>
                        <span className='text-xs font-bold text-gray-600 w-8 text-right'>{c.progress}%</span>
                      </div>
                      {c.score && <span className='text-xs font-bold text-green-700 w-12 text-right'><Icon e='⭐' size={14} className='inline align-[-2px]' /> {c.score}</span>}
                      {!c.score && <span className='text-xs text-gray-300 w-12 text-right'>—</span>}
                      <button className='px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100'>{t('Remind','Remind')}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
