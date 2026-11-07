'use client'
import Icon from '@/components/ui/Icon'
import { useT } from '@/store/languageStore'

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

const LEADERBOARD = [
  { rank:1, name:'Budi Santoso', dept:'Operations', points:1250, badges:8 },
  { rank:2, name:'Sari Dewi', dept:'HR', points:1180, badges:7 },
  { rank:3, name:'Ahmad Fauzi', dept:'Finance', points:1050, badges:6 },
  { rank:4, name:'Anda', dept:'HR', points:450, badges:4, isMe:true },
  { rank:5, name:'Dewi Sari', dept:'Marketing', points:380, badges:3 },
]

export default function AchievementsPage() {
  const t = useT()
  const myPoints = 450
  const myBadges = BADGES.filter(b=>b.earned).length

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>My Achievement & Badge</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Badge, poin, dan pencapaian learning Anda.','Your badges, points, and learning achievements.')}</p>


      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-4'>
          <div className='bg-white rounded-xl p-6 shadow-sm'>
            <h2 className='font-bold text-gray-700 mb-4'><Icon e='🏆' size={14} className='inline align-[-2px]' /> Badge Collection</h2>
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
              {BADGES.map(b=>(
                <div key={b.id} className={`text-center p-4 rounded-xl border transition ${b.earned?'border-yellow-200 bg-gradient-to-b from-yellow-50 to-white':'border-gray-200 bg-gray-50 opacity-60'}`}>
                  <div className={`text-3xl mb-2 ${b.earned?'':'grayscale'}`}><Icon e={b.icon} size={16} /></div>
                  <div className={`text-xs font-bold mb-0.5 ${b.earned?'text-gray-700':'text-gray-400'}`}>{b.name}</div>
                  <div className='text-xs text-gray-400 mb-1'>{b.desc}</div>
                  <div className={`text-xs font-semibold ${b.earned?'text-yellow-600':'text-gray-400'}`}>{b.points} pts</div>
                  {b.earned && <div className='text-xs text-green-600 mt-1'><Icon e='✅' size={14} className='inline align-[-2px]' /> {b.date}</div>}
                  {!b.earned && b.progress !== undefined && (
                    <div className='mt-2'>
                      <div className='flex justify-between text-xs text-gray-400 mb-0.5'><span>{b.progress}/{b.target}</span></div>
                      <div className='w-full bg-gray-200 rounded-full h-1.5'><div className='h-1.5 rounded-full bg-red-400' style={{ width:`${(b.progress/b.target)*100}%` }}></div></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='bg-white rounded-xl p-6 shadow-sm'>
          <h2 className='font-bold text-gray-700 mb-4'><Icon e='🏅' size={14} className='inline align-[-2px]' /> Leaderboard</h2>
          <div className='space-y-3'>
            {LEADERBOARD.map(item=>(
              <div key={item.rank} className={`flex items-center gap-3 p-3 rounded-xl ${item.isMe?'bg-red-50 border border-red-200':'hover:bg-gray-50'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${item.rank===1?'bg-yellow-400 text-white':item.rank===2?'bg-gray-400 text-white':item.rank===3?'bg-orange-400 text-white':'bg-gray-200 text-gray-600'}`}>{item.rank}</div>
                <div className='flex-1'>
                  <div className={`text-sm font-semibold ${item.isMe?'text-red-700':'text-gray-700'}`}>{item.name} {item.isMe&&t('(Anda)','(You)')}</div>
                  <div className='text-xs text-gray-400'>{item.dept}</div>
                </div>
                <div className='text-right'>
                  <div className='text-sm font-bold text-gray-700'>{item.points} pts</div>
                  <div className='text-xs text-gray-400'>{item.badges} badges</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
