'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

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

export default function SkillGapPage() {
  const t = useT()
  const [enrolled, setEnrolled] = useState([])

  const hasGap = SKILL_DATA.filter(s=>s.gap>0)
  const achieved = SKILL_DATA.filter(s=>s.gap===0)

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

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Skill Gap & Recommendation</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Analisa gap kompetensi Anda dan rekomendasi learning untuk pengembangannya.','Analyze your competency gaps and get learning recommendations for development.')}</p>


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
    </div>
  )
}
