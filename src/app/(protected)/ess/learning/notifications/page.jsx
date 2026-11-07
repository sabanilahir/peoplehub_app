'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const NOTIFS = [
  { id:1, type:'Reminder', icon:'⏰', title:'Course "Power BI Essentials" menunggu Anda', body:'Anda belum menyelesaikan 3 modul lagi. Deadline: 31 Agustus 2025.', time:'2 jam lalu', read:false, link:'/ess/learning/my-courses' },
  { id:2, type:'Certificate', icon:'🏆', title:'Sertifikat GCG & Compliance berhasil diterbitkan!', body:'Sertifikat Anda sudah tersedia. Unduh sekarang dari halaman My Certificates.', time:'1 hari lalu', read:false, link:'/ess/learning/certificates' },
  { id:3, type:'Assessment', icon:'📝', title:'Assessment "Power BI Essentials" siap dikerjakan', body:'Modul 4 telah selesai. Kerjakan assessment untuk melanjutkan.', time:'1 hari lalu', read:false, link:'/ess/learning/assessments' },
  { id:4, type:'Approval', icon:'✅', title:'Request external training Anda disetujui', body:'"AWS Solutions Architect" disetujui oleh manajer Anda. Periksa detailnya.', time:'2 hari lalu', read:true, link:'/ess/learning/request-external' },
  { id:5, type:'Announcement', icon:'📢', title:'Kelas baru tersedia: Python for Data Science', body:'Course baru yang relevan dengan profil Anda telah ditambahkan ke katalog.', time:'3 hari lalu', read:true, link:'/ess/learning/catalog' },
  { id:6, type:'Reminder', icon:'⚠️', title:'MANDATORY TRAINING hampir overdue!', body:'"K3 & Keselamatan Kerja" deadline-nya 7 hari lagi. Selesaikan segera!', time:'3 hari lalu', read:true, link:'/ess/learning/my-courses', urgent:true },
  { id:7, type:'Gamification', icon:'🏅', title:'Badge baru unlocked: "On Fire 🔥"', body:'Selamat! Anda berhasil belajar 7 hari berturut-turut.', time:'5 hari lalu', read:true, link:'/ess/learning/achievements' },
  { id:8, type:'IDP', icon:'🎯', title:'IDP Q3 menunggu persetujuan manajer', body:'Rencana pengembangan Anda sudah dikirim. Tunggu review dari manajer.', time:'1 minggu lalu', read:true, link:'/ess/learning/idp' },
]

const TYPE_OPTS = ['Semua', 'Reminder', 'Certificate', 'Assessment', 'Approval', 'Announcement', 'Gamification', 'IDP']
const TYPE_COLORS = { Reminder:'bg-yellow-50 text-yellow-700', Certificate:'bg-green-50 text-green-700', Assessment:'bg-blue-50 text-blue-700', Approval:'bg-teal-50 text-teal-700', Announcement:'bg-red-50 text-red-700', Gamification:'bg-orange-50 text-orange-700', IDP:'bg-indigo-50 text-indigo-700' }

export default function NotificationsPage() {
  const t = useT()
  const [notifs, setNotifs] = useDbState('ess-learning-notifications', NOTIFS)
  const [filter, setFilter] = useState('Semua')

  const markRead = (id) => setNotifs(p=>p.map(n=>n.id===id?{...n,read:true}:n))
  const markAllRead = () => setNotifs(p=>p.map(n=>({...n,read:true})))
  const deleteNotif = (id) => setNotifs(p=>p.filter(n=>n.id!==id))

  const filtered = notifs.filter(n=>filter==='Semua'||n.type===filter)
  const unread = notifs.filter(n=>!n.read).length

  return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <h1 className='text-2xl font-bold text-gray-800'>Notification Center</h1>
        {unread > 0 && (
          <span className='text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-bold'>{unread} {t('belum dibaca','unread')}</span>
        )}
      </div>
      <p className='text-gray-500 text-sm mb-6'>{t('Semua notifikasi learning, reminder, dan informasi penting Anda.','All your learning notifications, reminders, and important information.')}</p>

      <div className='flex flex-wrap gap-2 mb-4'>
        {TYPE_OPTS.map(typ=>(
          <button key={typ} onClick={()=>setFilter(typ)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter===typ?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={filter===typ?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {typ}
          </button>
        ))}
        {unread > 0 && (
          <button onClick={markAllRead} className='ml-auto text-xs font-semibold text-red-600 hover:underline'>
            {t('Tandai semua dibaca','Mark all read')}
          </button>
        )}
      </div>

      <div className='space-y-2'>
        {filtered.map(n=>(
          <div key={n.id}
            className={`bg-white rounded-xl p-4 shadow-sm border transition flex gap-4 ${!n.read?'border-red-200 bg-red-50/30':n.urgent?'border-red-200 bg-red-50/20':'border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${n.urgent?'bg-red-100':'bg-gray-100'}`}>
              {n.icon}
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className='flex items-center gap-2 mb-0.5'>
                    {!n.read && <span className='w-2 h-2 bg-red-500 rounded-full shrink-0'></span>}
                    <span className='font-semibold text-gray-800 text-sm'>{n.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[n.type]||'bg-gray-100 text-gray-600'}`}>{n.type}</span>
                </div>
                <div className='flex items-center gap-1 shrink-0'>
                  <span className='text-xs text-gray-400'>{n.time}</span>
                  <button onClick={()=>deleteNotif(n.id)} className='text-gray-300 hover:text-red-400 transition ml-2 text-lg leading-none'>×</button>
                </div>
              </div>
              <p className='text-xs text-gray-500 mt-1.5 mb-2'>{n.body}</p>
              <div className='flex gap-2'>
                {!n.read && (
                  <button onClick={()=>markRead(n.id)} className='text-xs font-semibold text-gray-400 hover:text-gray-600'>{t('Tandai dibaca','Mark as read')}</button>
                )}
                <button className='text-xs font-semibold text-red-600 hover:underline'>{t('Lihat Detail →','View Detail →')}</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className='text-center py-16 text-gray-400'>
            <div className='text-4xl mb-2'><Icon e='🔔' size={15} /></div>
            <p>{t('Tidak ada notifikasi untuk kategori ini','No notifications for this category')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
