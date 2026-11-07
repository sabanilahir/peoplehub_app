'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const LEADERBOARD = [
  { rank:1, name:'Dewi Sari', dept:'HR', points:1250, badges:12, completed:18, streak:45, avatar:'DS', change:0 },
  { rank:2, name:'Ahmad Fauzi', dept:'Finance', points:1180, badges:10, completed:16, streak:30, avatar:'AF', change:1 },
  { rank:3, name:'Siti Nurhaliza', dept:'Marketing', points:1050, badges:9, completed:14, streak:22, avatar:'SN', change:-1 },
  { rank:4, name:'Rizky Pratama', dept:'IT', points:980, badges:8, completed:13, streak:18, avatar:'RP', change:2 },
  { rank:5, name:'Budi Rahayu', dept:'Operations', points:870, badges:7, completed:11, streak:14, avatar:'BR', change:0 },
  { rank:6, name:'Maya Indira', dept:'Legal', points:820, badges:6, completed:10, streak:10, avatar:'MI', change:1 },
  { rank:7, name:'Eko Wahyudi', dept:'Finance', points:760, badges:5, completed:9, streak:8, avatar:'EW', change:-2 },
  { rank:8, name:'Fitri Handayani', dept:'HR', points:700, badges:5, completed:8, streak:6, avatar:'FH', change:3 },
  { rank:9, name:'Joko Susilo', dept:'IT', points:640, badges:4, completed:7, streak:5, avatar:'JS', change:0 },
  { rank:10, name:'Yuni Astuti', dept:'Marketing', points:590, badges:4, completed:6, streak:4, avatar:'YA', change:-1 },
]

const MY_RANK = { rank:23, name:'Anda', dept:'Finance', points:420, badges:3, completed:5, streak:7, avatar:'MY' }

const BADGES = [
  { id:1, name:'Course Champion', icon:'🎓', desc:'Selesaikan 1 course', points:50, earned:true, date:'2025-01-15' },
  { id:2, name:'Top Scorer', icon:'⭐', desc:'Nilai assessment >= 90%', points:100, earned:true, date:'2025-01-15' },
  { id:3, name:'Perfect Attendance', icon:'🏆', desc:'Kehadiran 100% di semua sesi', points:75, earned:true, date:'2025-01-15' },
  { id:4, name:'7-Day Streak', icon:'🔥', desc:'Belajar 7 hari berturut-turut', points:30, earned:true, date:'2025-04-10' },
  { id:5, name:'Learning Pioneer', icon:'💡', desc:'Raih 50 CPD Points', points:200, earned:false, progress:30, target:50 },
  { id:6, name:'Knowledge Sharer', icon:'🌟', desc:'Publish 3 sharing session', points:150, earned:false, progress:1, target:3 },
  { id:7, name:'30-Day Streak', icon:'💪', desc:'Belajar 30 hari berturut-turut', points:100, earned:false, progress:7, target:30 },
  { id:8, name:'Specialization Master', icon:'🎯', desc:'Selesaikan 1 specialization', points:300, earned:false, progress:0, target:1 },
]

export default function LeaderboardPage() {
  const t = useT()
  const TABS = [t('Leaderboard','Leaderboard'), t('Achievements & Badge','Achievements & Badge')]
  const [tab, setTab] = useState(TABS[0])
  const [period, setPeriod] = useState(t('Bulan Ini','This Month'))
  const [scope, setScope] = useState(t('Semua Departemen','All Departments'))

  const rankColor = (r) => r===1?'text-yellow-500':r===2?'text-gray-400':r===3?'text-amber-600':'text-gray-400'
  const rankBg   = (r) => r===1?'bg-yellow-50 border-yellow-200':r===2?'bg-gray-50 border-gray-200':r===3?'bg-amber-50 border-amber-200':'bg-white border-gray-100'
  const changeIcon = (c) => c>0?'↑':c<0?'↓':'—'
  const changeColor = (c) => c>0?'text-green-600':c<0?'text-red-500':'text-gray-300'

  const myPoints = MY_RANK.points
  const myBadges = BADGES.filter(b=>b.earned).length

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Leaderboard & Achievement','Leaderboard & Achievement')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Lihat posisi Anda, kumpulkan badge, dan terus semangat belajar!','See your rank, collect badges, and keep the learning momentum!')}</p>

      <div className='p-5 rounded-xl text-white mb-6' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl'>{MY_RANK.avatar}</div>
            <div>
              <div className='text-xs text-white/70 mb-0.5'>{t('Posisi Anda','Your Position')}</div>
              <div className='text-3xl font-bold'>#{MY_RANK.rank}</div>
              <div className='text-sm text-white/80'>{MY_RANK.name} · {MY_RANK.dept}</div>
            </div>
          </div>
          <div className='grid grid-cols-4 gap-6 text-center'>
            {[[myPoints+' pts',t('Poin','Points')],[myBadges+' 🏆','Badge'],[MY_RANK.completed,t('Course','Course')],[MY_RANK.streak+t(' hari',' days'),'Streak']].map(([v,l])=>(
              <div key={l}>
                <div className='text-xl font-bold'>{v}</div>
                <div className='text-xs text-white/70'>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
        <>
          <div className='flex gap-3 mb-6 flex-wrap'>
            {[t('Bulan Ini','This Month'),t('Kuartal Ini','This Quarter'),t('Tahun Ini','This Year')].map(p=>(
              <button key={p} onClick={()=>setPeriod(p)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${period===p?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                style={period===p?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
                {p}
              </button>
            ))}
            <select value={scope} onChange={e=>setScope(e.target.value)}
              className='ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white'>
              {[t('Semua Departemen','All Departments'),'Finance','HR','IT','Marketing','Operations'].map(d=><option key={d}>{d}</option>)}
            </select>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2'>
              <div className='space-y-2'>
                {LEADERBOARD.map(u => (
                  <div key={u.rank} className={`flex items-center gap-4 rounded-xl p-4 border transition hover:shadow-md ${rankBg(u.rank)}`}>
                    <div className={`w-8 text-center font-bold text-lg ${rankColor(u.rank)}`}>
                      {u.rank<=3 ? ['🥇','🥈','🥉'][u.rank-1] : `#${u.rank}`}
                    </div>
                    <div className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                      {u.avatar}
                    </div>
                    <div className='flex-1'>
                      <div className='font-semibold text-gray-800 text-sm'>{u.name}</div>
                      <div className='text-xs text-gray-400'>{u.dept}</div>
                    </div>
                    <div className='flex gap-5 text-center text-xs'>
                      <div><div className='font-bold text-gray-800'>{u.points}</div><div className='text-gray-400'>{t('Poin','Points')}</div></div>
                      <div><div className='font-bold text-gray-800'>{u.badges}</div><div className='text-gray-400'>Badge</div></div>
                      <div><div className='font-bold text-gray-800'>{u.completed}</div><div className='text-gray-400'>{t('Selesai','Done')}</div></div>
                      <div><div className='font-bold text-gray-800'>{u.streak}d</div><div className='text-gray-400'>Streak</div></div>
                    </div>
                    <div className={`text-xs font-bold w-8 text-center ${changeColor(u.change)}`}>
                      {changeIcon(u.change)}{u.change!==0?Math.abs(u.change):''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-4'>
              <div className='bg-white rounded-xl p-5 shadow-sm'>
                <h3 className='font-bold text-gray-700 mb-3'><Icon e='📈' size={14} className='inline align-[-2px]' /> {t('Progress ke Rank Berikutnya','Progress to Next Rank')}</h3>
                <div className='text-center mb-3'>
                  <span className='text-3xl font-bold text-gray-800'>#23</span>
                  <span className='text-gray-400 text-sm mx-2'><Icon e='→' size={15} /></span>
                  <span className='text-2xl font-bold text-red-700'>#22</span>
                </div>
                <div className='text-xs text-gray-500 mb-2 text-center'>{t('Butuh','Need')} <span className='font-bold text-red-700'>80 {t('poin','points')}</span> {t('lagi','more')}</div>
                <div className='w-full bg-gray-200 rounded-full h-3'>
                  <div className='h-3 rounded-full' style={{width:'84%',background:'linear-gradient(135deg,#052B52,#039299)'}}></div>
                </div>
                <div className='flex justify-between text-xs text-gray-400 mt-1'>
                  <span>420 pts</span><span>500 pts</span>
                </div>
              </div>
              <div className='bg-white rounded-xl p-5 shadow-sm'>
                <h3 className='font-bold text-gray-700 mb-3'><Icon e='🏆' size={14} className='inline align-[-2px]' /> {t('Badge Saya','My Badges')}</h3>
                <div className='grid grid-cols-2 gap-2'>
                  {BADGES.filter(b=>b.earned).map(b=>(
                    <div key={b.id} className='rounded-lg p-2 text-center border border-yellow-200 bg-yellow-50'>
                      <div className='text-xl mb-0.5'><Icon e={b.icon} size={16} /></div>
                      <div className='text-xs font-semibold text-gray-700 truncate'>{b.name}</div>
                      <div className='text-xs text-yellow-600'>{b.points} pts</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setTab(TABS[1])} className='w-full mt-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100'>
                  {t('Lihat Semua Badge →','View All Badges →')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === TABS[1] && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-xl p-6 shadow-sm'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='font-bold text-gray-700'><Icon e='🏆' size={14} className='inline align-[-2px]' /> Badge Collection</h2>
                <span className='text-sm text-gray-500'>{BADGES.filter(b=>b.earned).length}/{BADGES.length} {t('badge diraih','badges earned')}</span>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                {BADGES.map(b=>(
                  <div key={b.id} className={`text-center p-4 rounded-xl border transition ${b.earned?'border-yellow-200 bg-gradient-to-b from-yellow-50 to-white':'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className={`text-3xl mb-2 ${b.earned?'':'grayscale opacity-50'}`}><Icon e={b.icon} size={16} /></div>
                    <div className={`text-xs font-bold mb-0.5 ${b.earned?'text-gray-700':'text-gray-400'}`}>{b.name}</div>
                    <div className='text-xs text-gray-400 mb-1'>{b.desc}</div>
                    <div className={`text-xs font-semibold ${b.earned?'text-yellow-600':'text-gray-400'}`}>{b.points} pts</div>
                    {b.earned && <div className='text-xs text-green-600 mt-1'><Icon e='✅' size={14} className='inline align-[-2px]' /> {b.date}</div>}
                    {!b.earned && b.progress !== undefined && (
                      <div className='mt-2'>
                        <div className='text-xs text-gray-400 mb-0.5'>{b.progress}/{b.target}</div>
                        <div className='w-full bg-gray-200 rounded-full h-1.5'><div className='h-1.5 rounded-full bg-red-400' style={{width:`${(b.progress/b.target)*100}%`}}></div></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='bg-white rounded-xl p-5 shadow-sm'>
              <h3 className='font-bold text-gray-700 mb-3'><Icon e='📊' size={14} className='inline align-[-2px]' /> {t('Ringkasan Poin','Points Summary')}</h3>
              <div className='space-y-2'>
                {[
                  [t('Total Poin','Total Points'), myPoints+' pts', 'text-red-700'],
                  [t('Badge Diraih','Badges Earned'), myBadges+'/'+BADGES.length, 'text-yellow-600'],
                  [t('Course Selesai','Completed Courses'), MY_RANK.completed, 'text-green-600'],
                  ['Streak Aktif', MY_RANK.streak+t(' hari',' days'), 'text-orange-600'],
                ].map(([label, val, cls])=>(
                  <div key={label} className='flex justify-between items-center py-1.5 border-b border-gray-50'>
                    <span className='text-xs text-gray-500'>{label}</span>
                    <span className={`text-sm font-bold ${cls}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className='bg-white rounded-xl p-5 shadow-sm'>
              <h3 className='font-bold text-gray-700 mb-3'><Icon e='🎯' size={14} className='inline align-[-2px]' /> {t('Badge Berikutnya','Next Badge')}</h3>
              <div className='space-y-3'>
                {BADGES.filter(b=>!b.earned).slice(0,3).map(b=>(
                  <div key={b.id} className='flex items-center gap-3 p-2 bg-gray-50 rounded-lg'>
                    <div className='text-2xl grayscale opacity-50'><Icon e={b.icon} size={16} /></div>
                    <div className='flex-1'>
                      <div className='text-xs font-semibold text-gray-700'>{b.name}</div>
                      <div className='text-xs text-gray-400 mb-1'>{b.desc}</div>
                      {b.progress !== undefined && (
                        <div>
                          <div className='w-full bg-gray-200 rounded-full h-1.5'><div className='h-1.5 rounded-full bg-red-400' style={{width:`${(b.progress/b.target)*100}%`}}></div></div>
                          <div className='text-xs text-gray-400 mt-0.5'>{b.progress}/{b.target}</div>
                        </div>
                      )}
                    </div>
                    <div className='text-xs font-bold text-yellow-600'>{b.points} pts</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
