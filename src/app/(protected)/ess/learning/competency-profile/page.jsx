'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const COMPETENCIES = [
  { category:'Core Competencies', items:[
    { name:'Integritas', current:4, target:4, level:'Proficient', desc:'Menjalankan tugas dengan jujur dan bertanggung jawab.' },
    { name:'Teamwork & Collaboration', current:3, target:4, level:'Developing', desc:'Bekerja sama untuk mencapai tujuan bersama.' },
    { name:'Customer Focus', current:4, target:5, level:'Proficient', desc:'Orientasi pada kepuasan pelanggan internal & eksternal.' },
    { name:'Continuous Learning', current:3, target:4, level:'Developing', desc:'Aktif mengembangkan diri dan pengetahuan.' },
  ]},
  { category:'Leadership Competencies', items:[
    { name:'Leading Others', current:2, target:4, level:'Basic', desc:'Membimbing dan menginspirasi anggota tim.' },
    { name:'Strategic Thinking', current:3, target:4, level:'Developing', desc:'Memahami konteks bisnis dan merencanakan ke depan.' },
    { name:'Change Management', current:2, target:3, level:'Basic', desc:'Mengelola dan mengadaptasi perubahan organisasi.' },
  ]},
  { category:'Technical Competencies', items:[
    { name:'Financial Analysis', current:5, target:5, level:'Expert', desc:'Menganalisis data keuangan dan menyusun laporan.' },
    { name:'Data Visualization', current:4, target:5, level:'Proficient', desc:'Menyajikan data secara visual dan mudah dipahami.' },
    { name:'ERP System (SAP)', current:3, target:4, level:'Developing', desc:'Menggunakan SAP untuk kebutuhan operasional keuangan.' },
  ]},
]

const SKILL_DATA = [
  { skill:'Leadership & People Management', current:2, target:4, gap:2, recommended:['Leadership Fundamentals L1','Leadership Advanced L2'], status:'In Progress' },
  { skill:'Data Analysis & Reporting', current:3, target:4, gap:1, recommended:['Excel Advanced for HR','Data Analytics Fundamentals'], status:'Gap' },
  { skill:'HR Operations & Labor Law', current:4, target:5, gap:1, recommended:['HR Law & Regulation Update 2025'], status:'Gap' },
  { skill:'Project Management', current:1, target:3, gap:2, recommended:['Project Management Fundamentals','PMP Preparation'], status:'Gap' },
  { skill:'Digital Literacy & Tools', current:3, target:3, gap:0, recommended:[], status:'Achieved' },
  { skill:'Communication & Presentation', current:4, target:4, gap:0, recommended:[], status:'Achieved' },
  { skill:'K3 & Safety', current:3, target:3, gap:0, recommended:[], status:'Achieved' },
]

const LEVEL_LABELS = ['','Beginner','Basic','Intermediate','Advanced','Expert']
const LEVEL_COLORS = { Expert:'text-green-700 bg-green-50', Proficient:'text-blue-700 bg-blue-50', Developing:'text-yellow-700 bg-yellow-50', Basic:'text-red-700 bg-red-50' }

export default function CompetencyProfilePage() {
  const t = useT()
  const TABS = [t('Profil Kompetensi','Competency Profile'), t('Skill Gap & Rekomendasi','Skill Gap & Recommendations')]
  const [tab, setTab] = useState(TABS[0])
  const [expanded, setExpanded] = useState('Core Competencies')
  const [enrolled, setEnrolled] = useState([])

  const avgScore = (items) => (items.reduce((a,i)=>a+i.current,0)/items.length).toFixed(1)
  const gapCount = (items) => items.filter(i=>i.current<i.target).length

  const levelBar = (current, target) => (
    <div className='flex items-center gap-2 flex-1'>
      <div className='flex gap-1 flex-1'>
        {[1,2,3,4,5].map(l=>(
          <div key={l} className={`flex-1 h-3 rounded-full ${l<=current?'bg-red-500':l<=target?'border-2 border-red-300 bg-red-50':'bg-gray-200'}`}></div>
        ))}
      </div>
      <span className='text-xs text-gray-500 whitespace-nowrap'>{LEVEL_LABELS[current]} <Icon e='→' size={14} className='inline align-[-2px]' /> {LEVEL_LABELS[target]}</span>
    </div>
  )

  const hasGap = SKILL_DATA.filter(s=>s.gap>0)
  const achieved = SKILL_DATA.filter(s=>s.gap===0)

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Kompetensi & Skill Gap','Competency & Skill Gap')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Profil kompetensi dan analisa gap skill Anda beserta rekomendasi learning.','Your competency profile and skill gap analysis with learning recommendations.')}</p>

      <div className='flex gap-2 mb-6'>
        {TABS.map(t_=>(
          <button key={t_} onClick={()=>setTab(t_)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab===t_?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={tab===t_?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {t_}
          </button>
        ))}
      </div>

      {tab === TABS[0] && (
        <div className='space-y-4'>
          {COMPETENCIES.map(c=>(
            <div key={c.category} className='bg-white rounded-xl shadow-sm overflow-hidden'>
              <button className='w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition'
                onClick={()=>setExpanded(expanded===c.category?null:c.category)}>
                <div className='flex items-center gap-3'>
                  <span className='font-bold text-gray-800'>{c.category}</span>
                  <span className='text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'>{c.items.length} {t('kompetensi','competencies')}</span>
                  {gapCount(c.items) > 0 && (
                    <span className='text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full'>{gapCount(c.items)} gap</span>
                  )}
                </div>
                <div className='flex items-center gap-4'>
                  <span className='text-sm font-bold text-gray-600'>Avg: {avgScore(c.items)}/5</span>
                  <span className='text-gray-400'>{expanded===c.category?'▲':'▼'}</span>
                </div>
              </button>

              {expanded === c.category && (
                <div className='border-t border-gray-100 divide-y divide-gray-50'>
                  {c.items.map(item=>(
                    <div key={item.name} className='px-6 py-4'>
                      <div className='flex items-start justify-between mb-2'>
                        <div>
                          <div className='font-semibold text-gray-800'>{item.name}</div>
                          <div className='text-xs text-gray-400 mt-0.5'>{item.desc}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
                      </div>
                      <div className='flex items-center gap-4 mt-3'>
                        <div className='flex-1'>
                          <div className='flex justify-between text-xs mb-1'>
                            <span className='text-gray-500'>Current: <b className='text-gray-800'>{item.current}/5</b></span>
                            <span className='text-gray-500'>Target: <b className={item.current>=item.target?'text-green-600':'text-yellow-600'}>{item.target}/5</b></span>
                          </div>
                          <div className='w-full bg-gray-200 rounded-full h-3 relative'>
                            <div className='h-3 rounded-full bg-red-500' style={{width:`${item.current/5*100}%`}}></div>
                            <div className='absolute top-0 h-3 w-0.5 bg-yellow-400' style={{left:`${item.target/5*100}%`}}></div>
                          </div>
                        </div>
                        {item.current < item.target && (
                          <div className='flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg whitespace-nowrap'>
                            <span><Icon e='⚠️' size={15} /></span><span>Gap {item.target-item.current} level</span>
                          </div>
                        )}
                        {item.current >= item.target && (
                          <div className='flex items-center gap-1 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg'>
                            <span><Icon e='✅' size={15} /></span><span>{t('Tercapai','Achieved')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className='mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3'>
            <span className='text-2xl'><Icon e='💡' size={15} /></span>
            <div>
              <p className='font-semibold text-blue-700'>{t('Rekomendasi Pengembangan','Development Recommendation')}</p>
              <p className='text-xs text-blue-600 mt-0.5'>{t('Berdasarkan gap kompetensi Anda, 3 course disarankan:','Based on your competency gaps, 3 courses are recommended:')} <span className='font-semibold'>Leadership Fundamentals L1</span>, <span className='font-semibold'>Team Building Workshop</span>, {t('dan','and')} <span className='font-semibold'>SAP Financial Module</span>.</p>
            </div>
            <button onClick={()=>setTab(TABS[1])} className='ml-auto px-4 py-2 text-xs font-semibold text-white rounded-lg whitespace-nowrap hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{t('Lihat Skill Gap →','View Skill Gap →')}</button>
          </div>
        </div>
      )}

      {tab === TABS[1] && (
        <div className='space-y-5'>
          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h2 className='font-bold text-gray-700 mb-4'><Icon e='⚠️' size={14} className='inline align-[-2px]' /> {t('Skill dengan Gap — Perlu Ditingkatkan','Skills with Gap — Needs Improvement')}</h2>
            <div className='space-y-5'>
              {hasGap.map(s=>(
                <div key={s.skill} className='p-4 bg-red-50 rounded-xl border border-red-100'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='font-semibold text-gray-800'>{s.skill}</div>
                    <span className='text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full'>Gap: {s.gap} Level</span>
                  </div>
                  <div className='mb-3'>{levelBar(s.current, s.target)}</div>
                  {s.recommended.length > 0 && (
                    <div>
                      <div className='text-xs font-semibold text-gray-600 mb-2'><Icon e='💡' size={14} className='inline align-[-2px]' /> {t('Rekomendasi Learning:','Learning Recommendations:')}</div>
                      <div className='flex flex-wrap gap-2'>
                        {s.recommended.map(r=>(
                          <div key={r} className='flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5'>
                            <span className='text-xs text-gray-700 font-medium'>{r}</span>
                            <button onClick={()=>setEnrolled(prev=>prev.includes(r)?prev:[...prev,r])}
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold transition ${enrolled.includes(r)?'bg-green-100 text-green-700':'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                              {enrolled.includes(r)?t('Enrolled','Enrolled'):t('+ Enroll','+ Enroll')}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h2 className='font-bold text-gray-700 mb-4'><Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Skill Tercapai','Skills Achieved')}</h2>
            <div className='space-y-3'>
              {achieved.map(s=>(
                <div key={s.skill} className='p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between'>
                  <div className='font-medium text-gray-700'>{s.skill}</div>
                  <div className='flex items-center gap-3'>
                    {levelBar(s.current, s.target)}
                    <span className='text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap'><Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Target Tercapai','Target Achieved')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
