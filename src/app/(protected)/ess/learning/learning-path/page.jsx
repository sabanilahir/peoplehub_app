'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const PATHS = [
  {
    id: 1, title: 'Data Analyst Career Path', category: 'Technical', level: 'Intermediate',
    duration: '6 bulan', totalCourses: 8, completedCourses: 3, enrolled: true, progress: 37,
    description: 'Jalur karir lengkap untuk menjadi Data Analyst profesional, dari Excel hingga Python & BI tools.',
    courses: [
      { name: 'Excel Fundamentals', status: 'Completed', duration: '8 jam' },
      { name: 'SQL for Data Analysis', status: 'Completed', duration: '12 jam' },
      { name: 'Excel Advanced & Power Query', status: 'Completed', duration: '10 jam' },
      { name: 'Power BI Essentials', status: 'In Progress', duration: '15 jam' },
      { name: 'Python for Data Science', status: 'Locked', duration: '20 jam' },
      { name: 'Statistics for Business', status: 'Locked', duration: '10 jam' },
      { name: 'Machine Learning Basics', status: 'Locked', duration: '18 jam' },
      { name: 'Capstone Project: Business Dashboard', status: 'Locked', duration: '8 jam' },
    ],
    badge: '📊', skills: ['Excel', 'SQL', 'Power BI', 'Python', 'Statistics'],
  },
  {
    id: 2, title: 'Leadership & Management Foundation', category: 'Soft Skills', level: 'Beginner',
    duration: '3 bulan', totalCourses: 5, completedCourses: 0, enrolled: false, progress: 0,
    description: 'Program pengembangan kompetensi leadership dasar untuk calon pemimpin masa depan perusahaan.',
    courses: [
      { name: 'Leadership Mindset', status: 'Not Started', duration: '6 jam' },
      { name: 'Communication & Presentation', status: 'Locked', duration: '8 jam' },
      { name: 'Team Building & Motivation', status: 'Locked', duration: '10 jam' },
      { name: 'Decision Making & Problem Solving', status: 'Locked', duration: '8 jam' },
      { name: 'Coaching & Mentoring', status: 'Locked', duration: '12 jam' },
    ],
    badge: '👔', skills: ['Leadership', 'Communication', 'Coaching', 'Decision Making'],
  },
  {
    id: 3, title: 'Compliance & GCG Mastery', category: 'Compliance', level: 'All Levels',
    duration: '2 bulan', totalCourses: 4, completedCourses: 4, enrolled: true, progress: 100,
    description: 'Jalur wajib pemahaman Good Corporate Governance, etika bisnis, dan kepatuhan regulasi.',
    courses: [
      { name: 'GCG Fundamentals', status: 'Completed', duration: '4 jam' },
      { name: 'Code of Conduct & Business Ethics', status: 'Completed', duration: '5 jam' },
      { name: 'Anti-Korupsi & Gratifikasi', status: 'Completed', duration: '6 jam' },
      { name: 'Compliance Assessment', status: 'Completed', duration: '2 jam' },
    ],
    badge: '⚖️', skills: ['GCG', 'Compliance', 'Ethics', 'Regulation'],
  },
]

export default function LearningPathPage() {
  const t = useT()
  const [selected, setSelected] = useState(null)
  const [enrolled, setEnrolled] = useState({ 1: true, 3: true })

  const statusColor = (s) => ({
    'Completed': 'text-green-600 bg-green-50',
    'In Progress': 'text-blue-600 bg-blue-50',
    'Not Started': 'text-gray-500 bg-gray-100',
    'Locked': 'text-gray-300 bg-gray-50',
  }[s] || 'text-gray-500 bg-gray-100')

  const statusIcon = (s) => ({ Completed:'✅', 'In Progress':'🔵', 'Not Started':'⭕', Locked:'🔒' }[s] || '⭕')

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Learning Path</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Ikuti jalur pembelajaran terstruktur untuk mencapai tujuan karir Anda.','Follow a structured learning path to achieve your career goals.')}</p>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-5'>
        {PATHS.map(p => (
          <div key={p.id} className={`bg-white rounded-xl shadow-sm border-2 transition cursor-pointer ${selected===p.id?'border-red-400':'border-transparent hover:border-red-100'}`}
            onClick={() => setSelected(selected===p.id?null:p.id)}>
            <div className='p-5'>
              <div className='flex items-start justify-between mb-3'>
                <div className='text-3xl'>{p.badge}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.progress===100?'bg-green-50 text-green-700':enrolled[p.id]?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500'}`}>
                  {p.progress===100?t('Selesai','Completed'):enrolled[p.id]?t('Terdaftar','Enrolled'):t('Belum Daftar','Not Enrolled')}
                </span>
              </div>
              <h3 className='font-bold text-gray-800 mb-1'>{p.title}</h3>
              <div className='flex items-center gap-2 mb-2'>
                <span className='text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full'>{p.category}</span>
                <span className='text-xs text-gray-400'>·</span>
                <span className='text-xs text-gray-400'>{p.level}</span>
              </div>
              <p className='text-xs text-gray-500 mb-3 line-clamp-2'>{p.description}</p>
              <div className='flex items-center gap-4 text-xs text-gray-500 mb-3'>
                <span><Icon e='📚' size={14} className='inline align-[-2px]' /> {p.totalCourses} courses</span>
                <span><Icon e='⏱️' size={14} className='inline align-[-2px]' /> {p.duration}</span>
              </div>

              {enrolled[p.id] && (
                <div className='mb-3'>
                  <div className='flex items-center justify-between text-xs mb-1'>
                    <span className='text-gray-500'>{p.completedCourses}/{p.totalCourses} {t('selesai','completed')}</span>
                    <span className='font-bold text-gray-700'>{p.progress}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div className={`h-2 rounded-full ${p.progress===100?'bg-green-500':'bg-red-500'}`} style={{width:`${p.progress}%`}}></div>
                  </div>
                </div>
              )}

              <div className='flex flex-wrap gap-1 mb-3'>
                {p.skills.slice(0,3).map(s=>(
                  <span key={s} className='text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'>{s}</span>
                ))}
                {p.skills.length>3 && <span className='text-xs text-gray-400'>+{p.skills.length-3}</span>}
              </div>

              {!enrolled[p.id] && (
                <button onClick={e=>{e.stopPropagation();setEnrolled(prev=>({...prev,[p.id]:true}))}}
                  className='w-full py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition'
                  style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                  {t('Daftar Sekarang','Enroll Now')}
                </button>
              )}
              {enrolled[p.id] && p.progress < 100 && (
                <button className='w-full py-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition'>
                  {t('Lanjutkan →','Continue →')}
                </button>
              )}
            </div>

            {selected === p.id && (
              <div className='border-t border-gray-100 px-5 pb-5 pt-4'>
                <h4 className='text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide'>{t('Daftar Course','Course List')}</h4>
                <div className='space-y-2'>
                  {p.courses.map((c, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${c.status==='Locked'?'opacity-50':''}`}>
                      <span className='text-base'>{statusIcon(c.status)}</span>
                      <div className='flex-1'>
                        <div className='text-sm font-medium text-gray-700'>{c.name}</div>
                        <div className='text-xs text-gray-400'>{c.duration}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor(c.status)}`}>{c.status}</span>
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
