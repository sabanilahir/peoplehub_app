'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const TEAM_EVALS = [
  { id:1, employee:'Ahmad Fauzi', course:'Leadership Fundamentals L1', completedDate:'2025-07-15', evalDeadline:'2025-08-15', status:'Pending', type:'Kirkpatrick Level 3' },
  { id:2, employee:'Dewi Sari', course:'Data Analytics for HR', completedDate:'2025-06-20', evalDeadline:'2025-07-20', status:'Submitted', type:'Kirkpatrick Level 3', score:4.2 },
  { id:3, employee:'Siti Nurhaliza', course:'Leadership Fundamentals L1', completedDate:'2025-07-15', evalDeadline:'2025-08-15', status:'Pending', type:'Kirkpatrick Level 3' },
]

const BEHAVIORS = [
  'Menerapkan konsep yang dipelajari di pekerjaan sehari-hari',
  'Menunjukkan peningkatan kualitas hasil kerja setelah pelatihan',
  'Berbagi pengetahuan yang diperoleh kepada rekan tim',
  'Menggunakan pendekatan/metode baru dalam menghadapi masalah',
  'Konsisten menerapkan kebiasaan baru yang dipelajari',
]

export default function BehaviorEvalPage() {
  const t = useT()
  const [evals, setEvals] = useDbState('mss-learning-behavior-eval', TEAM_EVALS)
  const [selected, setSelected] = useState(null)
  const [scores, setScores] = useState({})
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handleSubmit = (id) => {
    if (Object.keys(scores).length < BEHAVIORS.length) return flash(t('Isi semua penilaian perilaku.','Please fill in all behavior evaluations.'))
    const avg = (Object.values(scores).reduce((a,b)=>a+b,0)/BEHAVIORS.length).toFixed(1)
    setEvals(prev=>prev.map(e=>e.id===id?{...e,status:'Submitted',score:Number(avg)}:e))
    flash(t('Evaluasi perilaku berhasil dikirim!','Behavior evaluation successfully submitted!'))
    setSelected(null)
    setScores({})
    setComment('')
  }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Team Behavior Evaluation (Kirkpatrick L3)', 'Team Behavior Evaluation (Kirkpatrick L3)')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Evaluasi penerapan perilaku (on-the-job behavior) anggota tim setelah menyelesaikan pelatihan.', 'Evaluate the on-the-job behavior application of team members after completing training.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3'>
        <span className='text-2xl'>ℹ️</span>
        <div>
          <p className='font-semibold text-blue-700 text-sm'>{t('Tentang Kirkpatrick Level 3 — Behavior','About Kirkpatrick Level 3 — Behavior')}</p>
          <p className='text-xs text-blue-600 mt-0.5'>{t('Evaluasi ini mengukur apakah peserta menerapkan pengetahuan dan keterampilan yang diperoleh dari pelatihan di lingkungan kerja nyata. Dilakukan oleh atasan langsung 30 hari setelah pelatihan selesai.', 'This evaluation measures whether participants apply the knowledge and skills gained from training in the real work environment. Conducted by direct supervisors 30 days after training completion.')}</p>
        </div>
      </div>


      <div className='space-y-4'>
        {evals.map(e=>(
          <div key={e.id} className='bg-white rounded-xl shadow-sm border border-gray-100'>
            <div className='flex items-center justify-between px-5 py-4'>
              <div>
                <div className='font-bold text-gray-800'>{e.employee}</div>
                <div className='text-sm text-gray-500 mt-0.5'>{e.course}</div>
                <div className='flex items-center gap-3 mt-1 text-xs text-gray-400'>
                  <span>{t('Selesai', 'Completed')}: {e.completedDate}</span>
                  <span>{t('Deadline eval', 'Eval deadline')}: {e.evalDeadline}</span>
                  <span className='bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold'>{e.type}</span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                {e.score && <span className='text-sm font-bold text-green-700'><Icon e='⭐' size={14} className='inline align-[-2px]' /> {e.score}/5</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${e.status==='Pending'?'bg-yellow-50 text-yellow-700':'bg-green-50 text-green-700'}`}>
                  {e.status==='Pending' ? t('Pending', 'Pending') : t('Submitted', 'Submitted')}
                </span>
                {e.status==='Pending' && (
                  <button onClick={()=>setSelected(selected===e.id?null:e.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${selected===e.id?'bg-gray-100 text-gray-600':'text-white hover:opacity-90'}`}
                    style={selected!==e.id?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
                    {selected===e.id ? t('Tutup', 'Close') : t('Evaluasi', 'Evaluate')}
                  </button>
                )}
              </div>
            </div>

            {selected === e.id && (
              <div className='border-t border-gray-100 px-5 pb-5 pt-4'>
                <h4 className='text-sm font-bold text-gray-700 mb-4'>{t('Penilaian Perilaku (1=Sangat Rendah, 5=Sangat Tinggi)', 'Behavior Rating (1=Very Low, 5=Very High)')}</h4>
                <div className='space-y-4 mb-4'>
                  {BEHAVIORS.map((b,i)=>(
                    <div key={i}>
                      <p className='text-sm text-gray-700 mb-2'>{i+1}. {b}</p>
                      <div className='flex gap-2'>
                        {[1,2,3,4,5].map(s=>(
                          <button key={s} onClick={()=>setScores(p=>({...p,[i]:s}))}
                            className={`w-10 h-10 rounded-lg text-sm font-bold transition border ${scores[i]===s?'bg-red-600 text-white border-red-600':'bg-gray-100 text-gray-600 border-gray-200 hover:bg-red-50 hover:border-red-300'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className='mb-4'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Catatan Tambahan (opsional)', 'Additional Notes (optional)')}</label>
                  <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' placeholder={t('Contoh perilaku konkret yang diamati...', 'Examples of concrete behaviors observed...')} />
                </div>
                <button onClick={()=>handleSubmit(e.id)}
                  className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                  {t('Submit Evaluasi', 'Submit Evaluation')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
