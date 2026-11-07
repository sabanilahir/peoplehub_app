'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const TEAM = ['Ahmad Fauzi','Dewi Sari','Budi Rahayu','Siti Nurhaliza','Rizky Pratama']

const ASSIGNMENTS = [
  { id:1, course:'K3 & Keselamatan Kerja Dasar', type:'Mandatory', assigned:['Ahmad Fauzi','Dewi Sari','Budi Rahayu','Siti Nurhaliza','Rizky Pratama'], deadline:'2025-12-31', note:'Wajib diselesaikan seluruh anggota tim Q4 2025.', status:'Active', created:'2025-07-01' },
  { id:2, course:'Leadership Fundamentals L1', type:'Development', assigned:['Ahmad Fauzi','Siti Nurhaliza'], deadline:'2025-10-31', note:'Persiapan promosi jabatan supervisor.', status:'Active', created:'2025-07-10' },
  { id:3, course:'Data Analytics for Managers', type:'Elective', assigned:['Dewi Sari'], deadline:'2025-11-30', note:'Support kebutuhan analisis HR.', status:'Completed', created:'2025-06-01' },
]

const COURSES = ['K3 & Keselamatan Kerja Dasar','GCG & Compliance Certification','Leadership Fundamentals L1','Excel Advanced','Power BI Essentials','Data Analytics for Managers','Customer Service Excellence','Project Management Basics']

export default function TeamAssignmentPage() {
  const t = useT()
  const [data, setData] = useDbState('mss-learning-assignment', ASSIGNMENTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ course:'', type:'Mandatory', assigned:[], deadline:'', note:'' })
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const toggleMember = (name) => setForm(p=>({...p, assigned:p.assigned.includes(name)?p.assigned.filter(n=>n!==name):[...p.assigned,name]}))

  const handleSave = () => {
    if (!form.course || form.assigned.length===0 || !form.deadline) return flash(t('Isi semua field yang wajib.','Fill in all required fields.'))
    setData(prev=>[...prev, { ...form, id:Date.now(), status:'Active', created:new Date().toISOString().slice(0,10) }])
    flash(t('Assignment training berhasil dibuat.','Training assignment created successfully.'))
    setShowForm(false)
    setForm({ course:'', type:'Mandatory', assigned:[], deadline:'', note:'' })
  }

  const typeColor = { Mandatory:'bg-red-50 text-red-700', Development:'bg-blue-50 text-blue-700', Elective:'bg-green-50 text-green-700' }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Team Training Assignment</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Tugaskan training ke anggota tim Anda secara langsung.','Assign training to your team members directly.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='flex justify-between items-center mb-4'>
        <div className='flex gap-2'>
          {['Active','Completed'].map(s=>(
            <span key={s} className={`text-xs font-semibold px-3 py-1 rounded-full ${s==='Active'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500'}`}>
              {data.filter(d=>d.status===s).length} {s}
            </span>
          ))}
        </div>
        <button onClick={()=>setShowForm(!showForm)}
          className='px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90'
          style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
          {t('+ Buat Assignment','+ Create Assignment')}
        </button>
      </div>

      {showForm && (
        <div className='bg-white rounded-xl p-6 shadow-sm border border-red-200 mb-6'>
          <h3 className='font-bold text-gray-700 mb-4'>{t('Buat Training Assignment','Create Training Assignment')}</h3>
          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Course <span className='text-red-500'>*</span></label>
              <select value={form.course} onChange={e=>setForm(p=>({...p,course:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                <option value=''>-- {t('Pilih Course','Select Course')} --</option>
                {COURSES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tipe','Type')}</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                {['Mandatory','Development','Elective'].map(typ=><option key={typ}>{typ}</option>)}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Deadline <span className='text-red-500'>*</span></label>
              <input type='date' value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Catatan','Note')}</label>
              <input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Opsional','Optional')} />
            </div>
            <div className='col-span-2'>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Ditugaskan ke','Assigned to')} <span className='text-red-500'>*</span></label>
              <div className='flex flex-wrap gap-2'>
                {TEAM.map(name=>(
                  <button key={name} type='button' onClick={()=>toggleMember(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${form.assigned.includes(name)?'bg-red-100 text-red-700 border-red-300':'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}>
                    {form.assigned.includes(name)?'':''}{name}
                  </button>
                ))}
                <button type='button' onClick={()=>setForm(p=>({...p,assigned:TEAM}))}
                  className='px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200'>
                  {t('Pilih Semua','Select All')}
                </button>
              </div>
            </div>
          </div>
          <div className='flex gap-3'>
            <button onClick={handleSave} className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{t('Simpan','Save')}</button>
            <button onClick={()=>setShowForm(false)} className='px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>{t('Batal','Cancel')}</button>
          </div>
        </div>
      )}

      <div className='space-y-4'>
        {data.map(a=>(
          <div key={a.id} className='bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-red-100 transition'>
            <div className='flex items-start justify-between mb-2'>
              <div>
                <div className='font-bold text-gray-800'>{a.course}</div>
                <div className='flex items-center gap-2 mt-1'>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor[a.type]}`}>{a.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.status==='Active'?'bg-blue-50 text-blue-700':'bg-green-50 text-green-700'}`}>{a.status}</span>
                </div>
              </div>
              <div className='text-right text-xs text-gray-400'>
                <div>Deadline: <span className='font-semibold text-gray-600'>{a.deadline}</span></div>
                <div>{t('Dibuat:','Created:')} {a.created}</div>
              </div>
            </div>
            <div className='flex flex-wrap gap-1.5 mb-2'>
              {a.assigned.map(name=>(
                <span key={name} className='text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'>{name}</span>
              ))}
            </div>
            {a.note && <p className='text-xs text-gray-400 mt-1'><Icon e='📝' size={14} className='inline align-[-2px]' /> {a.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
