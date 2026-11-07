'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const EVENTS = [
  { id:1, date:'2025-08-05', title:'K3 & Keselamatan Kerja — Batch 3', type:'Mandatory', format:'Offline', participants:['Budi Rahayu'], location:'Ruang Training Lt.3', time:'09:00-17:00' },
  { id:2, date:'2025-08-10', title:'Tips & Tricks Power BI Dashboard', type:'Sharing Session', format:'Virtual', participants:['Dewi Sari'], location:'MS Teams', time:'10:00-11:00' },
  { id:3, date:'2025-08-15', title:'AWS Solutions Architect — Exam Day', type:'Certification', format:'Offline', participants:['Rizky Pratama'], location:'AWS Test Center', time:'08:00-12:00' },
  { id:4, date:'2025-08-20', title:'Leadership Fundamentals L1 — Batch 5', type:'Development', format:'Hybrid', participants:['Ahmad Fauzi','Siti Nurhaliza'], location:'Ruang Serbaguna', time:'08:00-17:00' },
  { id:5, date:'2025-08-22', title:'Excel Macro VBA — Sharing Session', type:'Sharing Session', format:'Hybrid', participants:['Ahmad Fauzi'], location:'Ruang Meeting B', time:'14:00-15:30' },
  { id:6, date:'2025-08-28', title:'GCG & Compliance — Assessment Deadline', type:'Mandatory', format:'Self-Paced', participants:['Ahmad Fauzi','Dewi Sari','Siti Nurhaliza'], location:'LMS Online', time:'All Day' },
  { id:7, date:'2025-09-01', title:'Digital Marketing Advanced', type:'Development', format:'Virtual', participants:['Siti Nurhaliza'], location:'Zoom', time:'09:00-12:00' },
  { id:8, date:'2025-09-10', title:'K3 Expert Certification', type:'Certification', format:'Offline', participants:['Budi Rahayu'], location:'BNSP Test Center', time:'08:00-17:00' },
]

const TYPE_COLORS = { Mandatory:'bg-red-100 text-red-700 border-red-200', Development:'bg-blue-100 text-blue-700 border-blue-200', Certification:'bg-green-100 text-green-700 border-green-200', 'Sharing Session':'bg-red-100 text-red-700 border-red-200', Elective:'bg-gray-100 text-gray-600 border-gray-200' }
const TYPE_DOT = { Mandatory:'bg-red-500', Development:'bg-blue-500', Certification:'bg-green-500', 'Sharing Session':'bg-red-500', Elective:'bg-gray-400' }

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function TeamCalendarPage() {
  const t = useT()
  const [month, setMonth] = useState(7)
  const [year, setYear] = useState(2025)
  const [selectedDate, setSelectedDate] = useState(null)

  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return EVENTS.filter(e=>e.date===dateStr)
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const allEvents = EVENTS.filter(e=>{
    const d = new Date(e.date)
    return d.getMonth()===month && d.getFullYear()===year
  })

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Team Learning Calendar', 'Team Learning Calendar')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Jadwal training, sertifikasi, dan sharing session anggota tim Anda bulan ini.', 'Training, certification, and sharing session schedule for your team this month.')}</p>

      <div className='flex items-center gap-3 mb-6'>
        <button onClick={()=>{ if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)}} className='w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center'>‹</button>
        <span className='font-bold text-gray-800 text-lg w-44 text-center'>{MONTHS[month]} {year}</span>
        <button onClick={()=>{ if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)}} className='w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center'>›</button>
        <div className='ml-auto flex gap-3 flex-wrap'>
          {Object.entries(TYPE_DOT).map(([label,c])=>(
            <div key={label} className='flex items-center gap-1.5 text-xs text-gray-500'>
              <span className={`w-2.5 h-2.5 rounded-full ${c}`}></span>{label}
            </div>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 bg-white rounded-xl p-5 shadow-sm'>
          <div className='grid grid-cols-7 mb-2'>
            {[t('Min','Sun'),t('Sen','Mon'),t('Sel','Tue'),t('Rab','Wed'),t('Kam','Thu'),t('Jum','Fri'),t('Sab','Sat')].map((d,i)=>(
              <div key={i} className='text-center text-xs font-semibold text-gray-400 py-2'>{d}</div>
            ))}
          </div>
          <div className='grid grid-cols-7 gap-1'>
            {Array.from({length:firstDay}).map((_,i)=>(
              <div key={`e-${i}`} className='h-14'></div>
            ))}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day = i+1
              const dayEvents = getEventsForDate(day)
              const isSelected = selectedDate===day
              const isToday = day===5 && month===7 && year===2025
              return (
                <button key={day} onClick={()=>setSelectedDate(isSelected?null:day)}
                  className={`h-14 rounded-lg p-1 text-left transition border ${isSelected?'border-red-400 bg-red-50':dayEvents.length>0?'border-gray-200 hover:border-red-200 bg-white':'border-transparent bg-gray-50'}`}>
                  <div className={`text-xs font-bold mb-1 ${isToday?'w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center':isSelected?'text-red-700':'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className='flex flex-wrap gap-0.5'>
                    {dayEvents.slice(0,2).map((ev,j)=>(
                      <span key={j} className={`w-2 h-2 rounded-full ${TYPE_DOT[ev.type]||'bg-gray-400'}`}></span>
                    ))}
                    {dayEvents.length>2 && <span className='text-xs text-gray-400'>+{dayEvents.length-2}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          {selectedEvents.length > 0 ? (
            <div className='space-y-3'>
              <h3 className='font-bold text-gray-700'><Icon e='📅' size={14} className='inline align-[-2px]' /> {selectedDate} {MONTHS[month]}</h3>
              {selectedEvents.map(ev=>(
                <div key={ev.id} className={`bg-white rounded-xl p-4 shadow-sm border ${TYPE_COLORS[ev.type]}`}>
                  <div className='font-semibold text-gray-800 text-sm mb-1'>{ev.title}</div>
                  <div className='space-y-1 text-xs text-gray-500'>
                    <div><Icon e='🕐' size={14} className='inline align-[-2px]' /> {ev.time}</div>
                    <div><Icon e='📍' size={14} className='inline align-[-2px]' /> {ev.location}</div>
                    <div><Icon e='💻' size={14} className='inline align-[-2px]' /> {ev.format}</div>
                    <div><Icon e='👥' size={14} className='inline align-[-2px]' /> {ev.participants.join(', ')}</div>
                  </div>
                  <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[ev.type]}`}>{ev.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className='bg-white rounded-xl p-5 shadow-sm'>
              <h3 className='font-bold text-gray-700 mb-4'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Event Bulan Ini', 'Events This Month')} ({allEvents.length})</h3>
              <div className='space-y-2'>
                {allEvents.sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>(
                  <div key={ev.id} className='flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50'>
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[ev.type]}`}></span>
                    <div>
                      <div className='text-xs font-semibold text-gray-700 line-clamp-1'>{ev.title}</div>
                      <div className='text-xs text-gray-400'>{ev.date} · {ev.participants.length} {t('peserta', 'participants')}</div>
                    </div>
                  </div>
                ))}
                {allEvents.length===0 && <p className='text-xs text-gray-400 text-center py-4'>{t('Tidak ada event bulan ini', 'No events this month')}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
