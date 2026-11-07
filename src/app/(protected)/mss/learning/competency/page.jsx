'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const TEAM_COMP = [
  { name:'Ahmad Fauzi', position:'Senior Financial Analyst', competencies:{ 'Integritas':4,'Teamwork':3,'Financial Analysis':5,'Leadership':2,'Communication':3,'Problem Solving':4 }},
  { name:'Dewi Sari', position:'HR Specialist', competencies:{ 'Integritas':5,'Teamwork':4,'HR Management':4,'Leadership':3,'Communication':5,'Problem Solving':3 }},
  { name:'Budi Rahayu', position:'Operations Supervisor', competencies:{ 'Integritas':4,'Teamwork':4,'Operations Mgmt':3,'Leadership':2,'Communication':3,'Problem Solving':3 }},
  { name:'Siti Nurhaliza', position:'Marketing Analyst', competencies:{ 'Integritas':4,'Teamwork':3,'Digital Marketing':4,'Leadership':2,'Communication':4,'Problem Solving':4 }},
  { name:'Rizky Pratama', position:'IT Engineer', competencies:{ 'Integritas':3,'Teamwork':3,'Technical Skill':5,'Leadership':1,'Communication':2,'Problem Solving':5 }},
]

const COMP_KEYS = ['Integritas','Teamwork','Leadership','Communication','Problem Solving']
const COLOR_MAP = { 5:'bg-green-500', 4:'bg-blue-500', 3:'bg-yellow-500', 2:'bg-orange-400', 1:'bg-red-500' }
const LABEL_MAP = { 5:'Expert', 4:'Proficient', 3:'Developing', 2:'Basic', 1:'Novice' }
const TEXT_MAP = { 5:'text-green-700 bg-green-50', 4:'text-blue-700 bg-blue-50', 3:'text-yellow-700 bg-yellow-50', 2:'text-orange-700 bg-orange-50', 1:'text-red-700 bg-red-50' }

export default function TeamCompetencyPage() {
  const t = useT()
  const [selected, setSelected] = useState(null)

  const teamAvg = (key) => {
    const scores = TEAM_COMP.map(m=>m.competencies[key]).filter(Boolean)
    return (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)
  }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Team Competency Dashboard','Team Competency Dashboard')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Gambaran profil kompetensi seluruh anggota tim Anda.','Overview of the competency profile of all your team members.')}</p>

      {/* Team Average Summary */}
      <div className='bg-white rounded-xl p-6 shadow-sm mb-6'>
        <h2 className='font-bold text-gray-700 mb-4'>{t('Rata-Rata Kompetensi Tim','Team Average Competency')}</h2>
        <div className='grid grid-cols-5 gap-4'>
          {COMP_KEYS.map(k=>{
            const avg = parseFloat(teamAvg(k))
            const level = avg>=4.5?5:avg>=3.5?4:avg>=2.5?3:avg>=1.5?2:1
            return (
              <div key={k} className='text-center'>
                <div className='relative w-16 h-16 mx-auto mb-2'>
                  <svg viewBox='0 0 36 36' className='w-16 h-16 -rotate-90'>
                    <circle cx='18' cy='18' r='15.9' fill='none' stroke='#e5e7eb' strokeWidth='3'/>
                    <circle cx='18' cy='18' r='15.9' fill='none' stroke='#7c3aed' strokeWidth='3'
                      strokeDasharray={`${avg/5*100} 100`} strokeLinecap='round'/>
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <span className='text-sm font-bold text-gray-800'>{avg}</span>
                  </div>
                </div>
                <div className='text-xs font-semibold text-gray-700'>{k}</div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${TEXT_MAP[level]}`}>{LABEL_MAP[level]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team Grid */}
      <h2 className='font-bold text-gray-700 mb-3'>{t('Profil Kompetensi per Anggota','Competency Profile per Member')}</h2>
      <div className='space-y-3'>
        {TEAM_COMP.map(m=>(
          <div key={m.name} className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
            <button className='w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left'
              onClick={()=>setSelected(selected===m.name?null:m.name)}>
              <div className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0'
                style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                {m.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div className='flex-1'>
                <div className='font-semibold text-gray-800'>{m.name}</div>
                <div className='text-xs text-gray-400'>{m.position}</div>
              </div>
              <div className='flex gap-3'>
                {COMP_KEYS.slice(0,4).map(k=>{
                  const v = m.competencies[k]||0
                  return (
                    <div key={k} className='text-center w-12'>
                      <div className='w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white mb-0.5' style={{background:v>=4?'#059669':v>=3?'#d97706':v>=2?'#f97316':'#dc2626'}}>
                        {v}
                      </div>
                      <div className='text-xs text-gray-400 truncate'>{k.split(' ')[0]}</div>
                    </div>
                  )
                })}
              </div>
              <span className='text-gray-400 ml-2'>{selected===m.name?'▲':'▼'}</span>
            </button>

            {selected===m.name && (
              <div className='border-t border-gray-100 px-5 pb-5 pt-4'>
                <div className='grid grid-cols-2 gap-3'>
                  {Object.entries(m.competencies).map(([key,val])=>(
                    <div key={key} className='flex items-center gap-3'>
                      <div className='w-32 text-xs font-medium text-gray-700 shrink-0'>{key}</div>
                      <div className='flex-1 bg-gray-200 rounded-full h-2'>
                        <div className={`h-2 rounded-full ${COLOR_MAP[val]}`} style={{width:`${val/5*100}%`}}></div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TEXT_MAP[val]} shrink-0`}>{LABEL_MAP[val]}</span>
                    </div>
                  ))}
                </div>
                <div className='mt-4 pt-3 border-t border-gray-100 flex gap-3'>
                  <div className='flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg'>
                    <span><Icon e='⚠️' size={15} /></span>
                    <span>{Object.values(m.competencies).filter(v=>v<=2).length} {t('kompetensi perlu dikembangkan','competencies need development')}</span>
                  </div>
                  <button className='px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                    {t('Lihat Rekomendasi Kursus', 'View Course Recommendations')} →
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
