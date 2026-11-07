'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const NOTIFS = [
  { id:1, type:'Approval Request', icon:'📋', title:'Budi Rahayu mengajukan external training', body:'Request: K3 Expert Certification (BNSP) — Rp 5.000.000. Perlu persetujuan Anda.', time:'1 jam lalu', read:false, urgent:true },
  { id:2, type:'Overdue Alert', icon:'⚠️', title:'2 anggota tim punya mandatory training OVERDUE', body:'Budi Rahayu & Rizky Pratama belum menyelesaikan training wajib. Deadline sudah terlewat.', time:'2 jam lalu', read:false, urgent:true },
  { id:3, type:'Cert Approval', icon:'🏆', title:'Perlu approval sertifikat: Ahmad Fauzi', body:'Ahmad Fauzi menyelesaikan "GCG & Compliance" dengan score 88. Approval Anda diperlukan.', time:'3 jam lalu', read:false },
  { id:4, type:'Behavior Eval', icon:'📝', title:'Deadline evaluasi perilaku dalam 5 hari', body:'Evaluasi pasca-training untuk Ahmad Fauzi & Siti Nurhaliza deadline 15 Agustus.', time:'1 hari lalu', read:true },
  { id:5, type:'Progress Update', icon:'📈', title:'Dewi Sari menyelesaikan 3 course minggu ini', body:'Dewi Sari memperoleh 45 CPD points baru. Tim Anda berprestasi!', time:'2 hari lalu', read:true },
  { id:6, type:'IDP Review', icon:'🎯', title:'IDP Ahmad Fauzi menunggu review Anda', body:'Ahmad Fauzi telah menyusun IDP Q3 2025. Review dan berikan feedback sebelum 20 Agustus.', time:'3 hari lalu', read:true },
  { id:7, type:'System Alert', icon:'🔔', title:'Laporan learning bulanan tersedia', body:'Laporan tim untuk Juli 2025 sudah bisa diunduh dari halaman Team Learning Report.', time:'1 minggu lalu', read:true },
]

const TYPE_COLORS = { 'Approval Request':'bg-blue-50 text-blue-700', 'Overdue Alert':'bg-red-50 text-red-700', 'Cert Approval':'bg-green-50 text-green-700', 'Behavior Eval':'bg-red-50 text-red-700', 'Progress Update':'bg-teal-50 text-teal-700', 'IDP Review':'bg-indigo-50 text-indigo-700', 'System Alert':'bg-gray-100 text-gray-600' }

export default function MssNotificationsPage() {
  const t = useT()
  const [notifs, setNotifs] = useDbState('mss-learning-notifications', NOTIFS)
  const [filter, setFilter] = useState('Semua')

  const markRead = (id) => setNotifs(p=>p.map(n=>n.id===id?{...n,read:true}:n))
  const markAllRead = () => setNotifs(p=>p.map(n=>({...n,read:true})))
  const deleteNotif = (id) => setNotifs(p=>p.filter(n=>n.id!==id))

  const types = ['Semua','Approval Request','Overdue Alert','Cert Approval','Behavior Eval','Progress Update']
  const filtered = notifs.filter(n=>filter==='Semua'||n.type===filter)
  const unread = notifs.filter(n=>!n.read).length

  return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <h1 className='text-2xl font-bold text-gray-800'>{t('Manager Notification Center', 'Manager Notification Center')}</h1>
        {unread > 0 && <span className='text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-bold'>{unread} {t('belum dibaca', 'unread')}</span>}
      </div>
      <p className='text-gray-500 text-sm mb-6'>{t('Notifikasi terkait tim, approval, dan alert yang memerlukan tindakan Anda.', 'Notifications related to your team, approvals, and alerts that require your action.')}</p>

      <div className='flex flex-wrap gap-2 mb-4'>
        {types.map(type=>(
          <button key={type} onClick={()=>setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter===type?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={filter===type?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {type==='Semua'?t('Semua','All'):type}
          </button>
        ))}
        {unread > 0 && (
          <button onClick={markAllRead} className='ml-auto text-xs font-semibold text-red-600 hover:underline'>
            {t('Tandai semua dibaca', 'Mark all as read')}
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
                    {n.urgent && <span className='text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold'>URGENT</span>}
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
                  <button onClick={()=>markRead(n.id)} className='text-xs font-semibold text-gray-400 hover:text-gray-600'>{t('Tandai dibaca', 'Mark as read')}</button>
                )}
                {n.type==='Approval Request' && (
                  <button className='text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100'>{t('Review & Approve →', 'Review & Approve →')}</button>
                )}
                {n.type==='Cert Approval' && (
                  <button className='text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100'>{t('Buka Cert Approval →', 'Open Cert Approval →')}</button>
                )}
                {(n.type==='Overdue Alert') && (
                  <button className='text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100'>{t('Kirim Reminder →', 'Send Reminder →')}</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className='text-center py-16 text-gray-400'>
            <div className='text-4xl mb-2'><Icon e='🔔' size={15} /></div>
            <p>{t('Tidak ada notifikasi untuk kategori ini', 'No notifications for this category')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
