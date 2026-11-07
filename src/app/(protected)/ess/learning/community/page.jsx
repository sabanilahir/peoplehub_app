'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const COMMUNITIES = [
  { id:1, name:'Data Analytics Guild', category:'Technical', members:142, posts:38, pinned:['Excel Power Query Tips - Share yours!'], myRole:'Member', lastPost:'2 jam lalu', description:'Komunitas untuk sharing ilmu data analytics, BI tools, dan best practice pengolahan data.' },
  { id:2, name:'Leadership Circle', category:'Leadership', members:67, posts:22, pinned:['Buku rekomendasi bulan ini: "The Coaching Habit"'], myRole:'Moderator', lastPost:'1 hari lalu', description:'Ruang diskusi eksklusif bagi para pemimpin untuk berbagi insight dan strategi leadership.' },
  { id:3, name:'IT Security Corner', category:'Technical', members:95, posts:55, pinned:['Prosedur baru: laporan insiden keamanan'], myRole:'Member', lastPost:'5 jam lalu', description:'Forum khusus topik keamanan siber, update threat intelligence, dan sharing best practice.' },
  { id:4, name:'Onboarding Buddies', category:'Onboarding', members:30, posts:12, pinned:['Welcome Kit untuk karyawan baru'], myRole:'Contributor', lastPost:'3 hari lalu', description:'Komunitas pendampingan karyawan baru, sharing pengalaman onboarding dan tips kerja.' },
]

const FEED = [
  { id:1, community:'Data Analytics Guild', author:'Dewi S.', time:'2 jam lalu', content:'Baru nemu cara bikin dynamic chart di Excel tanpa VBA! Check attachment ya 📊', likes:12, comments:5 },
  { id:2, community:'IT Security Corner', author:'Rizky P.', time:'5 jam lalu', content:'Reminder: update password semua akun sebelum akhir bulan sesuai kebijakan baru.', likes:8, comments:2 },
  { id:3, community:'Leadership Circle', author:'Ahmad F.', time:'1 hari lalu', content:'Resume dari workshop Servant Leadership kemarin — ada 3 poin utama yang perlu kita internalisasi…', likes:24, comments:10 },
]

const MY_VIDEOS = [
  { id:1, title:'Tips Pivot Table Advanced', views:234, likes:18, uploaded:'2025-07-15', status:'Published', duration:'8:32' },
  { id:2, title:'Macro VBA untuk Otomasi Laporan', views:178, likes:14, uploaded:'2025-06-28', status:'Published', duration:'12:10' },
  { id:3, title:'Power BI Dashboard Tutorial', views:0, likes:0, uploaded:null, status:'Draft', duration:'—' },
]

const SESSIONS = [
  { id:1, title:'Excel Macro VBA untuk Otomasi Laporan', presenter:'Ahmad Fauzi', dept:'Finance', date:'2025-08-20', time:'14:00-15:30', format:'Hybrid', registered:45, capacity:60, status:'Upcoming', tags:['Excel','Automation','VBA'] },
  { id:2, title:'Tips & Tricks Power BI Dashboard', presenter:'Dewi Sari', dept:'HR', date:'2025-08-10', time:'10:00-11:00', format:'Virtual', registered:38, capacity:50, status:'Upcoming', tags:['Power BI','Dashboard','Analytics'] },
  { id:3, title:'Leadership Lessons from the Field', presenter:'Rizky Pratama', dept:'IT', date:'2025-07-28', time:'13:00-14:30', format:'Offline', registered:25, capacity:30, status:'Completed', tags:['Leadership','Soft Skills'], recording:'https://drive.internal/video123' },
  { id:4, title:'Strategi Negotiasi dalam Procurement', presenter:'Budi Rahayu', dept:'Procurement', date:'2025-07-15', time:'09:00-10:00', format:'Virtual', registered:52, capacity:60, status:'Completed', tags:['Negotiation','Procurement'], recording:'https://drive.internal/video456' },
]

const MY_PROPOSALS = [
  { id:1, title:'Introduction to Python for Non-Programmers', date:'2025-08-25', status:'Approved' },
  { id:2, title:'Mindfulness di Tempat Kerja', date:null, status:'Draft' },
]

export default function LearningCommunityPage() {
  const t = useT()
  const MAIN_TABS = [t('Komunitas','Community'), t('Sharing Session','Sharing Session')]
  const [mainTab, setMainTab] = useState(MAIN_TABS[0])

  // Community state
  const COMM_TABS = [t('Komunitas Saya','My Communities'), t('Feed Terbaru','Latest Feed'), t('Publish Video','Publish Video')]
  const [commTab, setCommTab] = useState(COMM_TABS[0])
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [videoCategory, setVideoCategory] = useState('Technical')
  const [liked, setLiked] = useState({})
  const [msg, setMsg] = useState(null)

  // Sharing session state
  const SESS_TABS = [t('Semua Sesi','All Sessions'), t('Akan Datang','Upcoming'), t('Selesai','Completed'), t('Proposal Saya','My Proposals')]
  const [sessTab, setSessTab] = useState(SESS_TABS[0])
  const [registered, setRegistered] = useState({ 1: false, 2: true })
  const [showPropose, setShowPropose] = useState(false)
  const [proposal, setProposal] = useState({ title:'', desc:'', date:'', format:'Virtual', estimatedDuration:'60', targetAudience:'' })

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handlePublish = () => {
    if (!videoTitle.trim()) return flash(t('Judul video wajib diisi.','Video title is required.'))
    flash(t('Video berhasil dikirim untuk review moderator!','Video submitted for moderator review!'))
    setVideoTitle(''); setVideoDesc('')
  }

  const handlePropose = () => {
    if (!proposal.title) return flash(t('Judul sesi wajib diisi.','Session title is required.'))
    flash(t('Proposal sesi sharing berhasil dikirim!','Sharing session proposal submitted!'))
    setShowPropose(false)
    setProposal({ title:'', desc:'', date:'', format:'Virtual', estimatedDuration:'60', targetAudience:'' })
  }

  const upcoming = SESSIONS.filter(s=>s.status==='Upcoming')
  const completed = SESSIONS.filter(s=>s.status==='Completed')

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Community & Sharing Session','Community & Sharing Session')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Bergabung di komunitas, ikuti sharing session, dan bagikan pengetahuan Anda.','Join communities, attend sharing sessions, and share your knowledge.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='flex gap-2 mb-6'>
        {MAIN_TABS.map(t_=>(
          <button key={t_} onClick={()=>setMainTab(t_)}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition ${mainTab===t_?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={mainTab===t_?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {t_}
          </button>
        ))}
      </div>

      {mainTab === MAIN_TABS[0] && (
        <>
          <div className='flex gap-2 mb-6'>
            {COMM_TABS.map(t_=>(
              <button key={t_} onClick={()=>setCommTab(t_)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${commTab===t_?'bg-gray-800 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {t_}
              </button>
            ))}
          </div>

          {commTab === COMM_TABS[0] && (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              {COMMUNITIES.map(c => (
                <div key={c.id} className='bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-red-200 transition'>
                  <div className='flex items-start justify-between mb-2'>
                    <div>
                      <div className='font-bold text-gray-800'>{c.name}</div>
                      <div className='flex items-center gap-2 mt-1'>
                        <span className='text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold'>{c.category}</span>
                        <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{c.myRole}</span>
                      </div>
                    </div>
                    <div className='text-right text-xs text-gray-400'>
                      <div><Icon e='👥' size={14} className='inline align-[-2px]' /> {c.members} members</div>
                      <div><Icon e='💬' size={14} className='inline align-[-2px]' /> {c.posts} posts</div>
                    </div>
                  </div>
                  <p className='text-xs text-gray-500 mb-3'>{c.description}</p>
                  {c.pinned.map(p => (
                    <div key={p} className='text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg mb-2 flex items-center gap-1.5'>
                      <span><Icon e='📌' size={15} /></span><span className='line-clamp-1'>{p}</span>
                    </div>
                  ))}
                  <div className='flex items-center justify-between mt-2'>
                    <span className='text-xs text-gray-400'>{t('Terakhir aktif','Last active')}: {c.lastPost}</span>
                    <button className='px-3 py-1.5 text-xs font-semibold rounded-lg text-white' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{t('Buka Forum →','Open Forum →')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {commTab === COMM_TABS[1] && (
            <div className='max-w-2xl space-y-4'>
              {FEED.map(f => (
                <div key={f.id} className='bg-white rounded-xl p-5 shadow-sm border border-gray-100'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700'>{f.author[0]}</div>
                    <div>
                      <div className='text-sm font-semibold text-gray-700'>{f.author}</div>
                      <div className='flex items-center gap-1.5 text-xs text-gray-400'>
                        <span><Icon e='📌' size={14} className='inline align-[-2px]' /> {f.community}</span><span>·</span><span>{f.time}</span>
                      </div>
                    </div>
                  </div>
                  <p className='text-sm text-gray-700 mb-3'>{f.content}</p>
                  <div className='flex gap-4 text-xs text-gray-500'>
                    <button onClick={() => setLiked(p=>({...p,[f.id]:!p[f.id]}))}
                      className={`flex items-center gap-1 transition ${liked[f.id]?'text-red-600 font-semibold':''}`}>
                      <Icon e='👍' size={14} className='inline align-[-2px]' /> {f.likes + (liked[f.id]?1:0)}
                    </button>
                    <button className='flex items-center gap-1'><Icon e='💬' size={14} className='inline align-[-2px]' /> {f.comments}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {commTab === COMM_TABS[2] && (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <div className='bg-white rounded-xl p-6 shadow-sm'>
                <h2 className='font-bold text-gray-700 mb-4'><Icon e='📤' size={14} className='inline align-[-2px]' /> {t('Upload Video Sharing Session','Upload Sharing Session Video')}</h2>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Judul Video','Video Title')} <span className='text-red-500'>*</span></label>
                    <input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Judul video Anda','Your video title')} />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Kategori','Category')}</label>
                    <select value={videoCategory} onChange={e=>setVideoCategory(e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                      {['Technical','Leadership','Soft Skills','Compliance','Product Knowledge'].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Deskripsi','Description')}</label>
                    <textarea value={videoDesc} onChange={e=>setVideoDesc(e.target.value)} rows={3}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' placeholder={t('Jelaskan isi video Anda...','Describe your video...')} />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('File Video','Video File')}</label>
                    <div className='border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-red-300 transition cursor-pointer'>
                      <div className='text-3xl mb-2'><Icon e='🎬' size={15} /></div>
                      <p className='text-sm text-gray-500'>{t('Klik atau drag & drop file video','Click or drag & drop video file')}</p>
                      <p className='text-xs text-gray-400 mt-1'>MP4, MOV, AVI • Max 500 MB</p>
                    </div>
                  </div>
                  <button onClick={handlePublish} className='w-full py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                    <Icon e='📤' size={14} className='inline align-[-2px]' /> {t('Submit Video','Submit Video')}
                  </button>
                </div>
              </div>

              <div className='bg-white rounded-xl p-6 shadow-sm'>
                <h2 className='font-bold text-gray-700 mb-4'><Icon e='🎬' size={14} className='inline align-[-2px]' /> {t('Video Saya','My Videos')}</h2>
                <div className='space-y-3'>
                  {MY_VIDEOS.map(v => (
                    <div key={v.id} className='border border-gray-200 rounded-lg p-4 hover:border-red-200 transition'>
                      <div className='flex items-start justify-between mb-1'>
                        <div className='font-semibold text-gray-700 text-sm'>{v.title}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${v.status==='Published'?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>{v.status}</span>
                      </div>
                      <div className='flex gap-4 text-xs text-gray-500 mt-1'>
                        <span><Icon e='⏱️' size={14} className='inline align-[-2px]' /> {v.duration}</span>
                        {v.status==='Published' && <><span><Icon e='👁️' size={14} className='inline align-[-2px]' /> {v.views} views</span><span><Icon e='👍' size={14} className='inline align-[-2px]' /> {v.likes}</span><span><Icon e='📅' size={14} className='inline align-[-2px]' /> {v.uploaded}</span></>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {mainTab === MAIN_TABS[1] && (
        <>
          <div className='flex gap-2 mb-6 flex-wrap'>
            {SESS_TABS.map(t_=>(
              <button key={t_} onClick={()=>setSessTab(t_)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sessTab===t_?'bg-gray-800 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {t_}
              </button>
            ))}
            <button onClick={()=>setShowPropose(true)}
              className='ml-auto px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90'
              style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
              {t('+ Usulkan Topik','+ Propose Topic')}
            </button>
          </div>

          {showPropose && (
            <div className='bg-white rounded-xl p-6 shadow-sm border border-red-200 mb-6'>
              <h3 className='font-bold text-gray-700 mb-4'>{t('Usulkan Topik Sharing Session','Propose a Sharing Session Topic')}</h3>
              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className='col-span-2'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Judul Sesi','Session Title')} <span className='text-red-500'>*</span></label>
                  <input value={proposal.title} onChange={e=>setProposal(p=>({...p,title:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                </div>
                <div className='col-span-2'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Deskripsi Singkat','Short Description')}</label>
                  <textarea value={proposal.desc} onChange={e=>setProposal(p=>({...p,desc:e.target.value}))} rows={3}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none' />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tanggal yang Diinginkan','Preferred Date')}</label>
                  <input type='date' value={proposal.date} onChange={e=>setProposal(p=>({...p,date:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Format','Format')}</label>
                  <select value={proposal.format} onChange={e=>setProposal(p=>({...p,format:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                    {['Virtual','Offline','Hybrid'].map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Estimasi Durasi (menit)','Estimated Duration (min)')}</label>
                  <input type='number' value={proposal.estimatedDuration} onChange={e=>setProposal(p=>({...p,estimatedDuration:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Target Peserta','Target Audience')}</label>
                  <input value={proposal.targetAudience} onChange={e=>setProposal(p=>({...p,targetAudience:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Contoh: Semua karyawan, HR Team...','E.g. All employees, HR Team...')} />
                </div>
              </div>
              <div className='flex gap-3'>
                <button onClick={handlePropose} className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{t('Kirim Proposal','Submit Proposal')}</button>
                <button onClick={()=>setShowPropose(false)} className='px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>{t('Batal','Cancel')}</button>
              </div>
            </div>
          )}

          {sessTab === SESS_TABS[3] ? (
            <div className='bg-white rounded-xl p-6 shadow-sm'>
              <h2 className='font-bold text-gray-700 mb-4'><Icon e='📋' size={14} className='inline align-[-2px]' /> {t('Proposal Sesi Saya','My Session Proposals')}</h2>
              <div className='space-y-3'>
                {MY_PROPOSALS.map(p=>(
                  <div key={p.id} className='border border-gray-200 rounded-lg p-4 flex items-center justify-between'>
                    <div>
                      <div className='font-semibold text-gray-700'>{p.title}</div>
                      <div className='text-xs text-gray-400 mt-0.5'>{p.date || t('Tanggal belum ditentukan','Date TBD')}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.status==='Approved'?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              {(sessTab===SESS_TABS[0]?SESSIONS:sessTab===SESS_TABS[1]?upcoming:completed).map(s=>(
                <div key={s.id} className='bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-red-100 transition'>
                  <div className='flex items-start justify-between mb-3'>
                    <div>
                      <h3 className='font-bold text-gray-800'>{s.title}</h3>
                      <div className='flex items-center gap-3 mt-1 text-sm text-gray-500'>
                        <span><Icon e='👤' size={14} className='inline align-[-2px]' /> {s.presenter}</span><span><Icon e='🏢' size={14} className='inline align-[-2px]' /> {s.dept}</span>
                      </div>
                    </div>
                    <div className='text-right'>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status==='Upcoming'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                      <div className='text-xs text-gray-400 mt-1'>{s.format}</div>
                    </div>
                  </div>
                  <div className='flex gap-4 text-xs text-gray-500 mb-3'>
                    <span><Icon e='📅' size={14} className='inline align-[-2px]' /> {s.date}</span><span><Icon e='🕐' size={14} className='inline align-[-2px]' /> {s.time}</span>
                    <span><Icon e='👥' size={14} className='inline align-[-2px]' /> {s.registered}/{s.capacity} {t('peserta','participants')}</span>
                  </div>
                  <div className='flex flex-wrap gap-1 mb-3'>
                    {s.tags.map(tag=><span key={tag} className='text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full'>{tag}</span>)}
                  </div>
                  <div className='flex gap-3'>
                    {s.status==='Upcoming' && (
                      <button onClick={()=>setRegistered(p=>({...p,[s.id]:!p[s.id]}))}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${registered[s.id]?'bg-red-50 text-red-600 border border-red-200':'text-white hover:opacity-90'}`}
                        style={!registered[s.id]?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
                        {registered[s.id]?t('Batal Daftar','Cancel Registration'):t('Daftar Sekarang','Register Now')}
                      </button>
                    )}
                    {s.recording && (
                      <button className='px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100'><Icon e='🎬' size={14} className='inline align-[-2px]' /> {t('Tonton Recording','Watch Recording')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
