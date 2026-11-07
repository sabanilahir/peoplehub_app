'use client'
import { useState, useMemo } from 'react'
import Icon from '@/components/ui/Icon'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'
import { useMasterActivityStore } from '@/store/masterActivityStore'

// ─── Submission Point (Participation Point) ─────────────────────────────────
// Halaman ESS: karyawan mengajukan (submit) perolehan poin berdasarkan
// aktivitas kategori "Participation Point" yang tersedia di Master Activity
// Point (mis. Pengajar, Coaching, Mentoring, Best Student). Setiap pengajuan
// menunggu verifikasi HR sebelum poin dihitung.

const PARTICIPATION_CATEGORY = 'Participation Point'

const EMPTY = { activity_code:'', activity_date:'', description:'', evidence:'' }

const STATUS_STYLE = {
  Approved:  'bg-emerald-50 text-emerald-700',
  Pending:   'bg-amber-50 text-amber-700',
  Rejected:  'bg-red-50 text-red-700',
}

export default function SubmissionPointPage() {
  const t = useT()
  const { activities } = useMasterActivityStore()
  const [data, setData] = useDbState('ess-learning-submission-point', [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  // Daftar aktivitas Participation Point yang aktif (jadi pilihan submit).
  const participationActivities = useMemo(
    () => activities.filter(a => a.category === PARTICIPATION_CATEGORY && a.status === 'Active'),
    [activities])

  const selected = participationActivities.find(a => a.activity_code === form.activity_code)

  const handleSubmit = () => {
    if (!form.activity_code || !form.activity_date) return flash(t('Pilih aktivitas dan isi tanggal.','Select an activity and fill the date.'))
    const act = participationActivities.find(a => a.activity_code === form.activity_code)
    if (!act) return flash(t('Aktivitas tidak valid.','Invalid activity.'))
    setData(prev => [
      ...prev,
      {
        id: Date.now(),
        activity_code: act.activity_code,
        activity_name: act.activity_name,
        point: act.point,
        activity_date: form.activity_date,
        description: form.description,
        evidence: form.evidence,
        status: 'Pending',
        submitted_at: new Date().toISOString().slice(0,10),
      },
    ])
    flash(t('Pengajuan poin berhasil dikirim, menunggu verifikasi.','Point submission sent, awaiting verification.'))
    setShowForm(false); setForm(EMPTY)
  }

  const filtered = data.filter(d => filterStatus==='All' || d.status===filterStatus)
  const totalApproved = data.filter(d=>d.status==='Approved').reduce((a,d)=>a+(d.point||0),0)
  const totalPending  = data.filter(d=>d.status==='Pending').length
  const totalSubmission = data.length

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Submission Point','Submission Point')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Ajukan perolehan poin dari aktivitas Participation Point (mis. Pengajar, Coaching, Mentoring). Pengajuan akan diverifikasi oleh HR sebelum poin dihitung.','Submit points earned from Participation Point activities (e.g. Trainer, Coaching, Mentoring). Submissions are verified by HR before points count.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='grid grid-cols-3 gap-4 mb-6'>
        {[
          [t('Poin Disetujui','Approved Points'), totalApproved+' pts', 'from-red-50 to-white border-red-100', 'text-red-700'],
          [t('Menunggu Verifikasi','Awaiting Verification'), String(totalPending), 'from-amber-50 to-white border-amber-100', 'text-amber-700'],
          [t('Total Pengajuan','Total Submissions'), String(totalSubmission), 'from-blue-50 to-white border-blue-100', 'text-blue-700'],
        ].map(([label, val, gradient, cls])=>(
          <div key={label} className={`bg-gradient-to-b ${gradient} border rounded-xl p-4 shadow-sm`}>
            <div className='text-xs text-gray-500 mb-1'>{label}</div>
            <div className={`text-lg font-bold ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className='flex justify-between items-center mb-4'>
        <div className='flex gap-2'>
          {['All','Pending','Approved','Rejected'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterStatus===s?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              style={filterStatus===s?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
              {s==='All'?t('Semua','All'):s}
            </button>
          ))}
        </div>
        <button onClick={()=>{setShowForm(!showForm);setForm(EMPTY)}}
          className='px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90'
          style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
          {t('+ Ajukan Poin','+ Submit Point')}
        </button>
      </div>

      {showForm && (
        <div className='bg-white rounded-xl p-6 shadow-sm border border-red-200 mb-6'>
          <h3 className='font-bold text-gray-700 mb-4'>{t('Ajukan Poin Partisipasi','Submit Participation Point')}</h3>
          {participationActivities.length === 0 ? (
            <div className='text-sm text-gray-400 py-4'>{t('Belum ada aktivitas Participation Point yang aktif. Hubungi HR.','No active Participation Point activities. Contact HR.')}</div>
          ) : (
            <>
              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className='col-span-2'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Aktivitas','Activity')} <span className='text-red-500'>*</span></label>
                  <select value={form.activity_code} onChange={e=>setForm(f=>({...f,activity_code:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                    <option value=''>{t('— Pilih aktivitas —','— Select activity —')}</option>
                    {participationActivities.map(a=>(
                      <option key={a.activity_code} value={a.activity_code}>{a.activity_name} (+{a.point} pts)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Poin','Point')}</label>
                  <div className='w-full px-3 py-2.5 border border-gray-100 bg-gray-50 rounded-lg text-sm text-gray-700 font-semibold'>
                    {selected ? `+${selected.point} pts` : '—'}
                  </div>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tanggal Aktivitas','Activity Date')} <span className='text-red-500'>*</span></label>
                  <input type='date' value={form.activity_date} onChange={e=>setForm(f=>({...f,activity_date:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
                </div>
                <div className='col-span-2'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Nama File Bukti','Evidence File Name')}</label>
                  <input value={form.evidence} onChange={e=>setForm(f=>({...f,evidence:e.target.value}))}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
                    placeholder={t('Contoh: sertifikat-pengajar.pdf','E.g. trainer-certificate.pdf')} />
                </div>
                <div className='col-span-2'>
                  <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Deskripsi / Keterangan','Description / Notes')}</label>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none'
                    placeholder={t('Jelaskan aktivitas partisipasi yang Anda lakukan.','Describe the participation activity you did.')} />
                </div>
              </div>
              <div className='flex gap-3'>
                <button onClick={handleSubmit} className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{t('Kirim Pengajuan','Submit')}</button>
                <button onClick={()=>{setShowForm(false);setForm(EMPTY)}} className='px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>{t('Batal','Cancel')}</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className='bg-white rounded-xl p-6 shadow-sm overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-gray-50'>
              {[t('Aktivitas','Activity'),t('Tanggal','Date'),t('Poin','Point'),t('Bukti','Evidence'),t('Deskripsi','Description'),t('Diajukan','Submitted'),'Status'].map(h=>(
                <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d=>(
              <tr key={d.id} className='border-t border-gray-100 hover:bg-gray-50'>
                <td className='px-3 py-2.5 font-medium text-gray-700'>{d.activity_name}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap'>{d.activity_date}</td>
                <td className='px-3 py-2.5 text-xs font-semibold text-red-700 whitespace-nowrap'>+{d.point} pts</td>
                <td className='px-3 py-2.5'>
                  {d.evidence ? <span className='text-xs text-blue-600'><Icon e='📄' size={14} className='inline align-[-2px]' /> {d.evidence}</span> : <span className='text-xs text-gray-300'>—</span>}
                </td>
                <td className='px-3 py-2.5 text-gray-500 text-xs max-w-52'><div className='line-clamp-2'>{d.description||'—'}</div></td>
                <td className='px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap'>{d.submitted_at}</td>
                <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_STYLE[d.status]||'bg-gray-100 text-gray-600'}`}>{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div className='py-8 text-center text-gray-400 text-sm'>{t('Belum ada pengajuan poin.','No point submissions yet.')}</div>}
      </div>
    </div>
  )
}
