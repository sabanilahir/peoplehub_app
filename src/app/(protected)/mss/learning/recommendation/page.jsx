'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const RECOMMENDATIONS = [
  { id:1, employee:'Ahmad Fauzi', basis:'Competency Gap: Leadership', course:'Leadership Fundamentals L1', type:'Development', priority:'High', reason:'Gap 2 level pada kompetensi Leadership. Required untuk target jabatan Finance Manager.', duration:'20 jam', status:'Pending' },
  { id:2, employee:'Ahmad Fauzi', basis:'IDP Goal: Data Analytics', course:'Python for Data Analysis', type:'Development', priority:'Medium', reason:'Sesuai tujuan IDP Q3 2025 untuk meningkatkan kemampuan analisis data.', duration:'25 jam', status:'Pending' },
  { id:3, employee:'Rizky Pratama', basis:'Competency Gap: Communication', course:'Business Communication & Presentation', type:'Development', priority:'High', reason:'Score komunikasi sangat rendah (2/5). Kritikal untuk career progression.', duration:'12 jam', status:'Assigned' },
  { id:4, employee:'Budi Rahayu', basis:'Mandatory Overdue', course:'K3 & Keselamatan Kerja Dasar', type:'Mandatory', priority:'Critical', reason:'Training K3 sudah overdue 4 bulan. Wajib diselesaikan segera.', duration:'8 jam', status:'Pending' },
  { id:5, employee:'Siti Nurhaliza', basis:'Skill Gap: Digital Marketing', course:'Digital Marketing Advanced', type:'Development', priority:'Medium', reason:'Mendukung peningkatan performa kampanye Q4.', duration:'18 jam', status:'Assigned' },
  { id:6, employee:'Dewi Sari', basis:'Certification Track', course:'SHRM-CP Certification Preparation', type:'Certification', priority:'Medium', reason:'Persiapan sertifikasi SHRM untuk profesionalisme HR.', duration:'30 jam', status:'Pending' },
]

const PRIORITY_COLOR = { Critical:'bg-red-100 text-red-700 border-red-200', High:'bg-orange-50 text-orange-700 border-orange-200', Medium:'bg-blue-50 text-blue-700 border-blue-200', Low:'bg-gray-100 text-gray-600 border-gray-200' }
const TYPE_COLOR = { Mandatory:'bg-red-50 text-red-700', Development:'bg-red-50 text-red-700', Certification:'bg-green-50 text-green-700', Elective:'bg-gray-100 text-gray-600' }

export default function RecommendationPage() {
  const t = useT()
  const [recs, setRecs] = useDbState('mss-learning-recommendation', RECOMMENDATIONS)
  const [filter, setFilter] = useState('Semua')
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handleAssign = (id) => {
    setRecs(prev=>prev.map(r=>r.id===id?{...r,status:'Assigned'}:r))
    flash(t('Rekomendasi berhasil di-assign ke karyawan.','Recommendation successfully assigned to employee.'))
  }

  const handleIgnore = (id) => {
    setRecs(prev=>prev.map(r=>r.id===id?{...r,status:'Dismissed'}:r))
  }

  const employees = [...new Set(RECOMMENDATIONS.map(r=>r.employee))]
  const filtered = recs.filter(r=>(filter==='Semua'||r.employee===filter) && r.status!=='Dismissed')

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Learning Recommendation', 'Learning Recommendation')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Rekomendasi kursus yang dihasilkan sistem berdasarkan gap kompetensi dan IDP anggota tim.', 'System-generated course recommendations based on competency gaps and team member IDPs.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}


      <div className='flex gap-2 mb-6 flex-wrap'>
        {['Semua', ...employees].map(e=>(
          <button key={e} onClick={()=>setFilter(e)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${filter===e?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={filter===e?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {e==='Semua'?t('Semua','All'):e}
          </button>
        ))}
      </div>

      <div className='space-y-3'>
        {filtered.map(r=>(
          <div key={r.id} className={`bg-white rounded-xl p-5 shadow-sm border ${PRIORITY_COLOR[r.priority]}`}>
            <div className='flex items-start justify-between mb-2'>
              <div>
                <div className='flex items-center gap-2 mb-1'>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLOR[r.type]}`}>{r.type}</span>
                  {r.status==='Assigned' && <span className='text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold'><Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Assigned','Assigned')}</span>}
                </div>
                <div className='font-bold text-gray-800'>{r.course}</div>
                <div className='text-sm text-gray-500'>{t('untuk', 'for')} <span className='font-semibold text-red-700'>{r.employee}</span></div>
              </div>
              <div className='text-xs text-gray-400 text-right'>
                <div>{t('Durasi','Duration')}: {r.duration}</div>
                <div className='mt-0.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'><Icon e='🎯' size={14} className='inline align-[-2px]' /> {r.basis}</div>
              </div>
            </div>
            <p className='text-xs text-gray-600 mb-3'><Icon e='💡' size={14} className='inline align-[-2px]' /> {r.reason}</p>
            {r.status==='Pending' && (
              <div className='flex gap-2'>
                <button onClick={()=>handleAssign(r.id)}
                  className='px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90'
                  style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                  {t('Assign ke Karyawan','Assign to Employee')}
                </button>
                <button onClick={()=>handleIgnore(r.id)}
                  className='px-4 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200'>
                  {t('Abaikan', 'Dismiss')}
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className='text-center py-12 text-gray-400'>
            <div className='text-4xl mb-2'><Icon e='🎉' size={15} /></div>
            <p>{t('Tidak ada rekomendasi untuk','No recommendations for')} {filter}</p>
          </div>
        )}
      </div>
    </div>
  )
}
