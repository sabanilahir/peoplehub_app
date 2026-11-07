'use client'
import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

// ─── Submission Point Approval (HR) ─────────────────────────────────────────
// Sisi HR untuk memverifikasi pengajuan poin Participation Point yang dikirim
// karyawan melalui halaman ESS "Submission Point". HR dapat menyetujui atau
// menolak; hanya pengajuan berstatus Approved yang poinnya dihitung.
// Membaca store yang sama dengan halaman ESS (key: ess-learning-submission-point).

const STATUS_STYLE = {
  Approved:  'bg-emerald-50 text-emerald-700',
  Pending:   'bg-amber-50 text-amber-700',
  Rejected:  'bg-red-50 text-red-700',
}

export default function SubmissionApprovalPage() {
  const t = useT()
  const [data, setData] = useDbState('ess-learning-submission-point', [])
  const [filterStatus, setFilterStatus] = useState('Pending')
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const decide = (id, status) => {
    setData(prev => prev.map(d => d.id === id
      ? { ...d, status, verified_at: new Date().toISOString().slice(0,10) }
      : d))
    flash(status==='Approved'
      ? t('Pengajuan disetujui, poin dihitung.','Submission approved, points counted.')
      : t('Pengajuan ditolak.','Submission rejected.'))
  }

  const filtered = data.filter(d => filterStatus==='All' || d.status===filterStatus)
  const totalPending  = data.filter(d=>d.status==='Pending').length
  const totalApproved = data.filter(d=>d.status==='Approved').length
  const pointsApproved = data.filter(d=>d.status==='Approved').reduce((a,d)=>a+(d.point||0),0)

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Verifikasi Submission Point','Submission Point Approval')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Tinjau dan verifikasi pengajuan poin Participation Point dari karyawan. Hanya pengajuan yang disetujui yang poinnya dihitung.','Review and verify employee Participation Point submissions. Only approved submissions count toward points.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='grid grid-cols-3 gap-4 mb-6'>
        {[
          [t('Menunggu Verifikasi','Awaiting Verification'), String(totalPending), 'from-amber-50 to-white border-amber-100', 'text-amber-700'],
          [t('Disetujui','Approved'), String(totalApproved), 'from-emerald-50 to-white border-emerald-100', 'text-emerald-700'],
          [t('Total Poin Disetujui','Total Approved Points'), pointsApproved+' pts', 'from-red-50 to-white border-red-100', 'text-red-700'],
        ].map(([label, val, gradient, cls])=>(
          <div key={label} className={`bg-gradient-to-b ${gradient} border rounded-xl p-4 shadow-sm`}>
            <div className='text-xs text-gray-500 mb-1'>{label}</div>
            <div className={`text-lg font-bold ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className='flex gap-2 mb-4'>
        {['Pending','Approved','Rejected','All'].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterStatus===s?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={filterStatus===s?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
            {s==='All'?t('Semua','All'):s}
          </button>
        ))}
      </div>

      <div className='bg-white rounded-xl p-6 shadow-sm overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-gray-50'>
              {[t('Aktivitas','Activity'),t('Tanggal','Date'),t('Poin','Point'),t('Bukti','Evidence'),t('Deskripsi','Description'),t('Diajukan','Submitted'),'Status',t('Aksi','Action')].map(h=>(
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
                <td className='px-3 py-2.5'>
                  {d.status==='Pending' ? (
                    <div className='flex gap-2 whitespace-nowrap'>
                      <button onClick={()=>decide(d.id,'Approved')} className='text-xs font-semibold text-emerald-600 hover:underline'>{t('Setujui','Approve')}</button>
                      <button onClick={()=>decide(d.id,'Rejected')} className='text-xs font-semibold text-red-600 hover:underline'>{t('Tolak','Reject')}</button>
                    </div>
                  ) : (
                    <span className='text-xs text-gray-400'>{d.verified_at ? t('Diverifikasi ','Verified ')+d.verified_at : '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div className='py-8 text-center text-gray-400 text-sm'>{t('Tidak ada pengajuan.','No submissions.')}</div>}
      </div>
    </div>
  )
}
