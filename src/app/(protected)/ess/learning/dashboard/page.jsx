'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/store/languageStore'

const MY_COURSES = [
  { id:1, title:'K3 & Keselamatan Kerja Dasar', type:'ILT', progress:100, due:'2025-03-31', score:90, status:'Completed' },
  { id:2, title:'Leadership Fundamentals Level 1', type:'Blended', progress:65, due:'2025-05-31', score:null, status:'In Progress' },
  { id:3, title:'GCG & Compliance Certification', type:'Blended', progress:25, due:'2025-09-30', score:null, status:'In Progress' },
  { id:4, title:'Excel Advanced for HR', type:'Self-Paced', progress:0, due:'2025-07-31', score:null, status:'Not Started' },
]

const NOTIFICATIONS = [
  { id:1, type:'reminder', text:'Training "GCG Compliance" due dalam 45 hari', time:'2 jam lalu' },
  { id:2, type:'achievement', text:'Selamat! Anda mendapatkan badge 🎓 Course Champion', time:'1 hari lalu' },
  { id:3, type:'assignment', text:'Training baru ditugaskan: Excel Advanced for HR', time:'3 hari lalu' },
]

export default function MyLearningDashboard() {
  const t = useT()
  const completedCourses = MY_COURSES.filter(c=>c.status==='Completed').length
  const totalPoints = 150

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>My Learning Dashboard</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Selamat datang! Pantau progress belajar, kursus yang ditugaskan, dan pencapaian Anda.','Welcome! Monitor your learning progress, assigned courses, and achievements.')}</p>


      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-4'>
          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='font-bold text-gray-700'><Icon e='📚' size={14} className='inline align-[-2px]' /> My Learning — In Progress</h2>
              <Link href='/ess/learning/my-courses' className='text-xs text-red-600 font-semibold hover:underline'>{t('Lihat Semua →','View All →')}</Link>
            </div>
            <div className='space-y-4'>
              {MY_COURSES.filter(c=>c.status!=='Completed').map(c=>(
                <div key={c.id} className='border border-gray-100 rounded-xl p-4 hover:border-red-200 transition'>
                  <div className='flex items-start justify-between mb-2'>
                    <div>
                      <div className='font-semibold text-gray-700 text-sm'>{c.title}</div>
                      <div className='flex items-center gap-2 mt-1'>
                        <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{c.type}</span>
                        <span className='text-xs text-gray-400'>Due: {c.due}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.status==='In Progress'?'bg-blue-50 text-blue-700':c.status==='Not Started'?'bg-gray-100 text-gray-500':'bg-red-50 text-red-700'}`}>{c.status}</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='flex-1 bg-gray-200 rounded-full h-2'><div className='h-2 rounded-full bg-red-500' style={{ width:`${c.progress}%` }}></div></div>
                    <span className='text-xs font-semibold text-gray-600'>{c.progress}%</span>
                    <button className='px-3 py-1 text-xs font-semibold text-white rounded-lg' style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>
                      {c.status==='Not Started'?t('Mulai','Start'):t('Lanjutkan','Continue')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h2 className='font-bold text-gray-700 mb-4'><Icon e='🏆' size={14} className='inline align-[-2px]' /> {t('Pencapaian Terbaru','Recent Achievements')}</h2>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h2 className='font-bold text-gray-700 mb-4'><Icon e='🔔' size={14} className='inline align-[-2px]' /> {t('Notifikasi Learning','Learning Notifications')}</h2>
            <div className='space-y-3'>
              {NOTIFICATIONS.map(n=>(
                <div key={n.id} className={`flex gap-3 p-3 rounded-lg ${n.type==='reminder'?'bg-yellow-50':n.type==='achievement'?'bg-green-50':'bg-blue-50'}`}>
                  <span className='text-lg'>{n.type==='reminder'?'⏰':n.type==='achievement'?'🏆':'📋'}</span>
                  <div><p className='text-xs font-semibold text-gray-700'>{n.text}</p><p className='text-xs text-gray-400 mt-0.5'>{n.time}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h2 className='font-bold text-gray-700 mb-4'><Icon e='⚡' size={14} className='inline align-[-2px]' /> Quick Access</h2>
            <div className='space-y-2'>
              {[['My Courses','/ess/learning/my-courses'],['Learning Calendar','/ess/learning/calendar'],['My Certificates','/ess/learning/certificates'],['Learning Transcript','/ess/learning/transcript'],['Skill Gap','/ess/learning/skill-gap']].map(([l,h])=>(
                <Link key={h} href={h} className='flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 transition'>
                  <span>{l}</span><span className='ml-auto text-gray-300'><Icon e='→' size={15} /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
