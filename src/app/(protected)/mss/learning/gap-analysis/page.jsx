'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const GAP_DATA = [
  { name:'Ahmad Fauzi', position:'Senior Financial Analyst', target_position:'Finance Manager',
    gaps:[
      { competency:'Leadership', current:2, target:4, gap:2, courses:['Leadership Fundamentals L1','Advanced Leadership Workshop'] },
      { competency:'Strategic Thinking', current:2, target:4, gap:2, courses:['Strategic Planning for Managers'] },
      { competency:'Teamwork', current:3, target:4, gap:1, courses:['Team Building & Collaboration'] },
    ]},
  { name:'Rizky Pratama', position:'IT Engineer', target_position:'Senior IT Engineer',
    gaps:[
      { competency:'Communication', current:2, target:4, gap:2, courses:['Business Communication','Presentation Skills'] },
      { competency:'Leadership', current:1, target:3, gap:2, courses:['Leadership Fundamentals L1'] },
    ]},
  { name:'Budi Rahayu', position:'Operations Supervisor', target_position:'Operations Manager',
    gaps:[
      { competency:'Operations Mgmt', current:3, target:5, gap:2, courses:['Advanced Operations Management','Lean Six Sigma'] },
      { competency:'Leadership', current:2, target:4, gap:2, courses:['Leadership Fundamentals L1'] },
      { competency:'Strategic Thinking', current:2, target:4, gap:2, courses:['Strategic Planning'] },
    ]},
]

export default function GapAnalysisPage() {
  const t = useT()
  const [selected, setSelected] = useState(GAP_DATA[0].name)

  const person = GAP_DATA.find(p=>p.name===selected)
  const totalGap = person ? person.gaps.reduce((a,g)=>a+g.gap,0) : 0
  const totalCourses = person ? [...new Set(person.gaps.flatMap(g=>g.courses))].length : 0

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Competency Gap Analysis', 'Competency Gap Analysis')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Identifikasi kesenjangan kompetensi anggota tim terhadap target jabatan mereka.', 'Identify competency gaps of team members against their target positions.')}</p>

      <div className='flex gap-2 mb-6 flex-wrap'>
        {GAP_DATA.map(p=>(
          <button key={p.name} onClick={()=>setSelected(p.name)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selected===p.name?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={selected===p.name?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {p.name}
          </button>
        ))}
      </div>

      {person && (
        <>
          <div className='bg-white rounded-xl p-5 shadow-sm mb-4 flex items-center gap-4'>
            <div className='w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white'
              style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              {person.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
            </div>
            <div className='flex-1'>
              <div className='font-bold text-gray-800'>{person.name}</div>
              <div className='text-sm text-gray-500'>
                {person.position}
                <span className='mx-2 text-gray-300'><Icon e='→' size={15} /></span>
                <span className='text-red-700 font-semibold'>{person.target_position}</span>
              </div>
            </div>
            <div className='grid grid-cols-3 gap-6 text-center'>
              {[[totalGap, t('Total Gap', 'Total Gap'),'⚠️'],[person.gaps.length, t('Kompetensi Gap', 'Gap Competencies'),'📊'],[totalCourses, t('Kursus Rekomendasi', 'Recommended Courses'),'📚']].map(([v,l,i])=>(
                <div key={l}>
                  <div className='text-xl font-bold text-gray-800'>{i} {v}</div>
                  <div className='text-xs text-gray-400'>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className='space-y-4'>
            {person.gaps.map(g=>(
              <div key={g.competency} className='bg-white rounded-xl p-5 shadow-sm border border-yellow-100'>
                <div className='flex items-start justify-between mb-3'>
                  <div>
                    <div className='font-bold text-gray-800'>{g.competency}</div>
                    <div className='text-xs text-gray-400 mt-0.5'>{t('Gap', 'Gap')}: {g.gap} {t('level perlu ditingkatkan', 'levels need improvement')}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${g.gap>=2?'bg-red-50 text-red-700':'bg-yellow-50 text-yellow-700'}`}>
                    {g.gap>=2 ? t('Prioritas Tinggi', 'High Priority') : t('Perlu Perhatian', 'Needs Attention')}
                  </span>
                </div>

                <div className='mb-4'>
                  <div className='flex justify-between text-xs mb-1'>
                    <span className='text-gray-500'>{t('Saat ini', 'Current')}: <b>{g.current}/5</b></span>
                    <span className='text-red-700 font-semibold'>{t('Target', 'Target')}: <b>{g.target}/5</b></span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-4 relative'>
                    <div className='h-4 rounded-full bg-red-400' style={{width:`${g.current/5*100}%`}}></div>
                    <div className='absolute top-0 h-4 bg-green-400 rounded-r-full opacity-40'
                      style={{left:`${g.current/5*100}%`, width:`${g.gap/5*100}%`}}></div>
                    <div className='absolute top-0 h-4 w-0.5 bg-red-600' style={{left:`${g.target/5*100}%`}}></div>
                  </div>
                  <div className='flex justify-between text-xs mt-1'>
                    <span className='text-red-500'>{g.current} (current)</span>
                    <span className='text-red-600'>{g.target} (target)</span>
                  </div>
                </div>

                <div>
                  <div className='text-xs font-semibold text-gray-600 mb-2'><Icon e='📚' size={14} className='inline align-[-2px]' /> {t('Kursus Rekomendasi', 'Recommended Courses')}:</div>
                  <div className='flex flex-wrap gap-2'>
                    {g.courses.map(c=>(
                      <button key={c} className='text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-semibold border border-red-100 hover:bg-red-100 transition'>
                        {c} →
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className='mt-4 bg-white rounded-xl p-5 shadow-sm'>
            <h3 className='font-bold text-gray-700 mb-3'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Ringkasan Tindak Lanjut', 'Follow-Up Summary')}</h3>
            <p className='text-sm text-gray-600 mb-3'>{t('Untuk mempersiapkan', 'To prepare')} <b>{person.name}</b> {t('menuju posisi', 'for the position of')} <b>{person.target_position}</b>, {t('disarankan untuk', 'it is recommended to')}:</p>
            <ol className='list-decimal list-inside space-y-1 text-sm text-gray-600'>
              <li>{t('Daftarkan ke', 'Enroll in')} {totalCourses} {t('kursus yang direkomendasikan di atas', 'recommended courses above')}</li>
              <li>{t('Susun IDP formal dengan target penyelesaian 6–12 bulan', 'Create a formal IDP with a 6–12 month completion target')}</li>
              <li>{t('Lakukan monthly check-in untuk monitor progress gap', 'Conduct monthly check-ins to monitor gap progress')}</li>
            </ol>
            <button className='mt-4 px-5 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              {t('Buat IDP Berdasarkan Gap', 'Create IDP Based on Gap')} →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
