'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const INIT_IDP = [
  { id:1, goal:'Menjadi Team Leader di bidang HR Operations', target_role:'HR Team Leader', target_date:'2026-06-30', category:'Career Development', activities:[
    { name:'Leadership Fundamentals Level 1', type:'Course', status:'In Progress', target:'2025-05-31' },
    { name:'Mentoring dengan HR Manager', type:'Mentoring', status:'Completed', target:'2025-03-31' },
    { name:'Lead project HCMS Implementation', type:'OJT', status:'Planned', target:'2025-12-31' },
  ], progress:45, status:'Active' },
]

const EMPTY_GOAL = { goal:'', target_role:'', target_date:'', category:'Career Development', status:'Active' }

export default function IDPPage() {
  const t = useT()
  const [idps,    setIdps   ] = useDbState('ess-learning-idp', INIT_IDP)
  const [form,    setForm   ] = useState(EMPTY_GOAL)
  const [editing, setEditing] = useState(null)
  const [tab,     setTab    ] = useState('view')
  const [msg,     setMsg    ] = useState(null)

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(()=>setMsg(null), 3000) }

  const handleSave = () => {
    if (!form.goal) return flash(t('Tujuan pengembangan wajib diisi.','Development goal is required.'), 'error')
    if (editing) {
      setIdps(prev=>prev.map(d=>d.id===editing?{...d,...form}:d))
      flash(t('IDP diperbarui.','IDP updated.')); setEditing(null)
    } else {
      setIdps(prev=>[...prev,{id:Date.now(),...form,activities:[],progress:0}])
      flash(t('IDP ditambahkan.','IDP added.'))
    }
    setForm(EMPTY_GOAL); setTab('view')
  }

  const CATEGORIES = ['Career Development','Skill Enhancement','Leadership','Technical Competency','Compliance']

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Individual Development Plan (IDP)</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Rencana pengembangan diri Anda — target karir, aktivitas belajar, dan tracking progress.','Your personal development plan — career targets, learning activities, and progress tracking.')}</p>

      {msg && <div className={`text-xs px-4 py-3 rounded-lg mb-4 ${msg.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-600'}`}>{msg.text}</div>}

      <div className='flex gap-2 mb-6'>
        {[['view','My IDPs'],['create',t('Buat IDP Baru','Create New IDP')]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab===k?'bg-red-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {tab==='view' && (
        <div className='space-y-6'>
          {idps.map(idp=>(
            <div key={idp.id} className='bg-white rounded-xl p-6 shadow-sm'>
              <div className='flex items-start justify-between mb-4'>
                <div>
                  <h3 className='font-bold text-gray-800 text-lg'>{idp.goal}</h3>
                  <div className='flex items-center gap-3 mt-2'>
                    <span className='text-sm text-gray-500'>Target: {idp.target_role}</span>
                    <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{idp.category}</span>
                    <span className='text-xs text-gray-400'>Due: {idp.target_date}</span>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-2xl font-bold text-red-600'>{idp.progress}%</div>
                  <div className='text-xs text-gray-400'>Overall Progress</div>
                </div>
              </div>

              <div className='mb-4'>
                <div className='w-full bg-gray-200 rounded-full h-3'>
                  <div className='h-3 rounded-full bg-gradient-to-r from-red-500 to-blue-500' style={{ width:`${idp.progress}%` }}></div>
                </div>
              </div>

              <h4 className='font-semibold text-gray-700 mb-3 text-sm'><Icon e='📋' size={14} className='inline align-[-2px]' /> Learning Activities</h4>
              <div className='space-y-2'>
                {idp.activities.map((a,i)=>(
                  <div key={i} className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                    <span className='text-lg'>{a.status==='Completed'?'✅':a.status==='In Progress'?'🔵':'⭕'}</span>
                    <div className='flex-1'>
                      <div className='text-sm font-medium text-gray-700'>{a.name}</div>
                      <div className='text-xs text-gray-400'>{a.type} • Target: {a.target}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.status==='Completed'?'bg-green-50 text-green-700':a.status==='In Progress'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
              <div className='flex gap-2 mt-4'>
                <button onClick={()=>{setEditing(idp.id);setForm({goal:idp.goal,target_role:idp.target_role,target_date:idp.target_date,category:idp.category,status:idp.status});setTab('create')}}
                  className='px-4 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100'>{t('Edit IDP','Edit IDP')}</button>
                <button className='px-4 py-2 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100'>{t('Tambah Aktivitas','Add Activity')}</button>
              </div>
            </div>
          ))}
          {idps.length===0 && <div className='bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm'>{t('Belum ada IDP. Buat IDP pertama Anda!','No IDP yet. Create your first IDP!')}</div>}
        </div>
      )}

      {tab==='create' && (
        <div className='bg-white rounded-xl p-6 shadow-sm max-w-2xl'>
          <h2 className='font-bold text-gray-700 mb-4'>{editing?t('Edit IDP','Edit IDP'):t('Buat IDP Baru','Create New IDP')}</h2>
          <div className='flex flex-col gap-4'>
            <div><label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Tujuan Pengembangan','Development Goal')}</label>
              <textarea rows={3} value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder={t('Contoh: Menjadi Team Leader di bidang HR Operations dalam 18 bulan','Example: Become a Team Leader in HR Operations within 18 months')}
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' /></div>
            <div><label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Target Posisi/Role','Target Position/Role')}</label>
              <input value={form.target_role} onChange={e=>setForm(f=>({...f,target_role:e.target.value}))}
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' /></div>
            <div><label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Target Tanggal Tercapai','Target Completion Date')}</label>
              <input type='date' value={form.target_date} onChange={e=>setForm(f=>({...f,target_date:e.target.value}))}
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' /></div>
            <div><label className='block text-xs font-semibold text-gray-600 mb-1'>{t('Kategori','Category')}</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className='flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition'
                style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{editing?t('Simpan Perubahan','Save Changes'):t('Buat IDP','Create IDP')}</button>
              <button onClick={()=>{setEditing(null);setForm(EMPTY_GOAL);setTab('view')}} className='px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200 transition'>{t('Batal','Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
