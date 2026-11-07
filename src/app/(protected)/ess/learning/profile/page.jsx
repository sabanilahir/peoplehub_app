'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

export default function LearningProfilePage() {
  const t = useT()
  const [editMode, setEditMode] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Ahmad Fauzi',
    nik: 'EMP-0042',
    position: 'Senior Financial Analyst',
    dept: 'Finance',
    joinDate: '2019-03-15',
    email: 'ahmad.fauzi@testing.com',
    learningGoal: 'Menjadi Data Analyst berspesialisasi keuangan, menguasai Python dan Power BI dalam 1 tahun.',
    preferredStyle: 'Self-Paced',
    preferredTime: 'Pagi (07:00-09:00)',
    preferredLang: 'Indonesia',
  })
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handleSave = () => {
    flash(t('Profil learning berhasil diperbarui.','Learning profile updated successfully.'))
    setEditMode(false)
  }

  const STATS = [
    { label:t('Course Selesai','Completed Courses'), value:16, icon:'🎓', color:'#7c3aed' },
    { label:'CPD Points', value:'420', icon:'⭐', color:'#d97706' },
    { label:t('Sertifikat','Certificates'), value:3, icon:'🏆', color:'#059669' },
    { label:'Learning Hours', value:'142 jam', icon:'⏱️', color:'#052B52' },
    { label:'Assessments', value:9, icon:'📝', color:'#2563eb' },
    { label:'Learning Streak', value:'7 hari', icon:'🔥', color:'#dc2626' },
  ]

  const INTERESTS = ['Data Analytics', 'Financial Analysis', 'Leadership', 'Excel/VBA', 'Power BI', 'Python']

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Learning Profile</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Ringkasan dan preferensi pembelajaran Anda.','Your learning summary and preferences.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div>
          <div className='bg-white rounded-xl p-6 shadow-sm text-center mb-4'>
            <div className='w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              AF
            </div>
            <h2 className='font-bold text-gray-800 text-lg'>{profile.name}</h2>
            <p className='text-sm text-gray-500'>{profile.position}</p>
            <p className='text-xs text-gray-400'>{profile.dept} · {profile.nik}</p>
            <div className='mt-3 flex justify-center gap-2'>
              <span className='text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold'>Rank #23</span>
              <span className='text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold'>Active Learner</span>
            </div>
            <button onClick={()=>setEditMode(!editMode)}
              className='mt-4 w-full py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition'
              style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              {editMode ? t('Batal Edit','Cancel Edit') : t('Edit Profil','Edit Profile')}
            </button>
          </div>

          <div className='bg-white rounded-xl p-5 shadow-sm'>
            <h3 className='font-semibold text-gray-700 mb-3 text-sm'><Icon e='🎯' size={14} className='inline align-[-2px]' /> {t('Minat Belajar','Learning Interests')}</h3>
            <div className='flex flex-wrap gap-1.5'>
              {INTERESTS.map(i=>(
                <span key={i} className='text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold'>{i}</span>
              ))}
            </div>
          </div>
        </div>

        <div className='lg:col-span-2 space-y-4'>

          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h3 className='font-semibold text-gray-700 mb-4'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Preferensi Belajar','Learning Preferences')}</h3>
            {editMode ? (
              <div className='space-y-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Learning Goal</label>
                  <textarea value={profile.learningGoal} onChange={e=>setProfile(p=>({...p,learningGoal:e.target.value}))} rows={3}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' />
                </div>
                <div className='flex gap-3'>
                  <button onClick={handleSave} className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{t('Simpan','Save')}</button>
                  <button onClick={()=>setEditMode(false)} className='px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>{t('Batal','Cancel')}</button>
                </div>
              </div>
            ) : (
              <div className='space-y-3'>
                {[
                  ['Learning Goal', profile.learningGoal],
                  [t('Gaya Belajar','Learning Style'), profile.preferredStyle],
                  [t('Waktu Favorit','Preferred Time'), profile.preferredTime],
                  [t('Bahasa Konten','Content Language'), profile.preferredLang],
                  ['Email', profile.email],
                  [t('Bergabung Sejak','Member Since'), profile.joinDate],
                ].map(([l,v])=>(
                  <div key={l} className='flex gap-3'>
                    <span className='text-xs font-semibold text-gray-500 w-36 shrink-0'>{l}</span>
                    <span className='text-sm text-gray-700'>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
