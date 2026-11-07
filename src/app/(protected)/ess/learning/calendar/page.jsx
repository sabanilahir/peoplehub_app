'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const EVENTS = [
  { id:1, title:'Training GCG & Compliance', date:'2025-08-05', time:'08:00 - 17:00', type:'Required Training', location:'Ruang Training A Lt.3', status:'Upcoming' },
  { id:2, title:'Webinar Leadership Skills', date:'2025-08-12', time:'13:00 - 15:00', type:'Voluntary', location:'Zoom Online', status:'Upcoming' },
  { id:3, title:'Quiz Excel Advanced - Deadline', date:'2025-07-31', time:'23:59', type:'Assessment Due', location:'Online LMS', status:'Upcoming' },
  { id:4, title:'K3 Annual Refresher', date:'2025-09-15', time:'08:00 - 12:00', type:'Mandatory', location:'Ruang Training B', status:'Upcoming' },
  { id:5, title:'Leadership Fundamentals - Sesi 3', date:'2025-08-20', time:'09:00 - 16:00', type:'Mandatory', location:'Hybrid', status:'Upcoming' },
]

export default function LearningCalendarPage() {
  const t = useT()
  const [year,  setYear ] = useState(2025)
  const [month, setMonth] = useState(7)
  const [view,  setView ] = useState('list')

  const filtered = EVENTS.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear()===year && d.getMonth()===month
  })

  const typeColor = (typ) => ({ 'Required Training':'bg-red-50 text-red-700', Voluntary:'bg-blue-50 text-blue-700', 'Assessment Due':'bg-yellow-50 text-yellow-700', Mandatory:'bg-red-50 text-red-700' }[typ] || 'bg-gray-100 text-gray-500')

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Learning Calendar</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Jadwal seluruh aktivitas learning, training, assessment, dan deadline Anda.','Schedule of all your learning activities, training, assessments, and deadlines.')}</p>

      <div className='flex flex-wrap gap-3 mb-6'>
        <div className='flex gap-1'>
          {[year-1,year,year+1].map(y=>(
            <button key={y} onClick={()=>setYear(y)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${year===y?'bg-red-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{y}</button>
          ))}
        </div>
        <div className='flex gap-1 flex-wrap'>
          {MONTHS.map((m,i)=>(
            <button key={m} onClick={()=>setMonth(i)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${month===i?'bg-red-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{m}</button>
          ))}
        </div>
        <div className='flex gap-1'>
          {[['list',t('List','List')],['calendar',t('Calendar','Calendar')]].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${view===k?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className='bg-white rounded-xl p-6 shadow-sm'>
        <h2 className='font-bold text-gray-700 mb-4'><Icon e='📅' size={14} className='inline align-[-2px]' /> {MONTHS[month]} {year} — {filtered.length} Event</h2>
        {filtered.length === 0 ? (
          <div className='text-center py-12 text-gray-400'>{t('Tidak ada event learning pada bulan ini.','No learning events this month.')}</div>
        ) : (
          <div className='space-y-3'>
            {filtered.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>(
              <div key={e.id} className='flex gap-4 p-4 border border-gray-100 rounded-xl hover:border-red-200 transition'>
                <div className='text-center min-w-12 bg-red-50 rounded-lg p-2'>
                  <div className='text-xs text-red-500 font-semibold'>{MONTHS[new Date(e.date).getMonth()]}</div>
                  <div className='text-xl font-bold text-red-700'>{new Date(e.date).getDate()}</div>
                </div>
                <div className='flex-1'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <div className='font-semibold text-gray-700'>{e.title}</div>
                      <div className='flex items-center gap-2 mt-1'>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor(e.type)}`}>{e.type}</span>
                        <span className='text-xs text-gray-400'><Icon e='⏰' size={14} className='inline align-[-2px]' /> {e.time}</span>
                        <span className='text-xs text-gray-400'><Icon e='📍' size={14} className='inline align-[-2px]' /> {e.location}</span>
                      </div>
                    </div>
                    <button className='px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100'>{t('Detail','Detail')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
