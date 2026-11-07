'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const TEAM_BOARD = [
  { rank:1, name:'Dewi Sari', position:'HR Specialist', points:1250, badges:12, completed:18, cpd:120, streak:45 },
  { rank:2, name:'Siti Nurhaliza', position:'Marketing Analyst', points:980, badges:9, completed:14, cpd:88, streak:22 },
  { rank:3, name:'Ahmad Fauzi', position:'Sr Financial Analyst', points:875, badges:8, completed:12, cpd:72, streak:30 },
  { rank:4, name:'Rizky Pratama', position:'IT Engineer', points:420, badges:3, completed:5, cpd:24, streak:7 },
  { rank:5, name:'Budi Rahayu', position:'Operations Supervisor', points:210, badges:2, completed:2, cpd:8, streak:2 },
]

const COMPANY_BOARD = [
  { rank:1, name:'Tim Finance', dept:'Finance', points:6800, members:12 },
  { rank:2, name:'Tim IT', dept:'IT', points:5900, members:15 },
  { rank:3, name:'Tim HR', dept:'HR', points:5400, members:8 },
  { rank:4, name:'Tim Anda', dept:'Operations', points:3735, members:5, isMyTeam:true },
  { rank:5, name:'Tim Legal', dept:'Legal', points:2900, members:6 },
]

export default function MssLeaderboardPage() {
  const t = useT()
  const [tab, setTab] = useState('my-team')

  const rankIcon = (r) => r===1?'🥇':r===2?'🥈':r===3?'🥉':`#${r}`
  const rankBg = (r) => r===1?'bg-yellow-50 border-yellow-200':r===2?'bg-gray-50 border-gray-200':r===3?'bg-amber-50 border-amber-200':'bg-white border-gray-100'

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Team Leaderboard','Team Leaderboard')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Peringkat learning anggota tim Anda dan perbandingan antar departemen.','Learning rankings of your team members and cross-department comparisons.')}</p>

      <div className='p-5 rounded-xl text-white mb-6' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs text-white/70'>{t('Peringkat Tim Anda','Your Team Ranking')}</div>
            <div className='text-3xl font-bold mt-0.5'>#4 {t('dari 12 tim','of 12 teams')}</div>
            <div className='text-sm text-white/80 mt-0.5'>{t('Tim Operations','Operations Team')}</div>
          </div>
          <div className='grid grid-cols-3 gap-6 text-center'>
            {[['3,735',t('Total Poin','Total Points')],['5 '+t('orang','people'),t('Anggota Aktif','Active Members')],['51%',t('Compliance Rate','Compliance Rate')]].map(([v,l])=>(
              <div key={l}><div className='text-xl font-bold'>{v}</div><div className='text-xs text-white/70'>{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div className='flex gap-2 mb-6'>
        {[['my-team',t('Tim Saya','My Team')],['cross-dept',t('Antar Departemen','Cross-Department')]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab===key?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={tab===key?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'my-team' && (
        <div className='space-y-2'>
          {TEAM_BOARD.map(u=>(
            <div key={u.rank} className={`flex items-center gap-4 rounded-xl p-4 border transition hover:shadow-md ${rankBg(u.rank)}`}>
              <div className='w-10 text-center font-bold text-lg'>
                {u.rank<=3 ? rankIcon(u.rank) : <span className='text-gray-500 text-base'>#{u.rank}</span>}
              </div>
              <div className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0'
                style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                {u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div className='flex-1'>
                <div className='font-semibold text-gray-800'>{u.name}</div>
                <div className='text-xs text-gray-400'>{u.position}</div>
              </div>
              <div className='grid grid-cols-5 gap-4 text-center text-xs'>
                {[[u.points,t('Poin 🏅','Points 🏅')],[u.badges,t('Badge 🏆','Badges 🏆')],[u.completed,t('Selesai 📚','Completed 📚')],[u.cpd,'CPD ⭐'],[u.streak+'d',t('Streak 🔥','Streak 🔥')]].map(([v,l])=>(
                  <div key={l}><div className='font-bold text-gray-800'>{v}</div><div className='text-gray-400 text-xs'>{l}</div></div>
                ))}
              </div>
            </div>
          ))}

          <div className='mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4'>
            <h3 className='font-semibold text-blue-700 mb-2 text-sm'><Icon e='💡' size={14} className='inline align-[-2px]' /> {t('Insight Tim','Team Insights')}</h3>
            <ul className='text-xs text-blue-600 space-y-1'>
              <li>• <b>Dewi Sari</b> {t('adalah top learner tim dengan 1.250 poin dan 45 hari streak!','is the top team learner with 1,250 points and a 45-day streak!')}</li>
              <li>• <b>Budi Rahayu & Rizky Pratama</b> {t('perlu dorongan — progress masih jauh di bawah rata-rata tim.','need encouragement — progress is still far below team average.')}</li>
              <li>• {t('Rata-rata CPD tim:','Team CPD average:')} <b>62 points</b> — {t('di bawah target 80 pts per kuartal.','below the 80 pts per quarter target.')}</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'cross-dept' && (
        <div>
          <div className='space-y-2 mb-4'>
            {COMPANY_BOARD.map(d=>(
              <div key={d.rank} className={`flex items-center gap-4 rounded-xl p-4 border transition ${d.isMyTeam?'border-red-300 bg-red-50':rankBg(d.rank)}`}>
                <div className='w-10 text-center font-bold text-lg'>
                  {d.rank<=3 ? rankIcon(d.rank) : <span className='text-gray-500 text-base'>#{d.rank}</span>}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <div className='font-semibold text-gray-800'>{d.name}</div>
                    {d.isMyTeam && <span className='text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold'>{t('Tim Anda','Your Team')}</span>}
                  </div>
                  <div className='text-xs text-gray-400'>{d.dept} · {d.members} {t('anggota','members')}</div>
                </div>
                <div className='text-right'>
                  <div className='font-bold text-gray-800'>{d.points.toLocaleString('id-ID')} pts</div>
                  <div className='text-xs text-gray-400'>{(d.points/d.members).toFixed(0)} {t('pts/orang','pts/person')}</div>
                </div>
                <div className='w-32'>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div className={`h-2 rounded-full ${d.isMyTeam?'bg-red-500':'bg-blue-400'}`}
                      style={{width:`${d.points/COMPANY_BOARD[0].points*100}%`}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className='bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700'>
            <Icon e='💡' size={14} className='inline align-[-2px]' /> {t('Tim Anda berada di peringkat','Your team is ranked')} <b>#4</b>. {t('Perlu','Need')} <b>{(COMPANY_BOARD[2].points - COMPANY_BOARD[3].points).toLocaleString('id-ID')} {t('poin lagi','more points')}</b> {t('untuk naik ke peringkat 3.','to rise to rank 3.')}
          </div>
        </div>
      )}
    </div>
  )
}
