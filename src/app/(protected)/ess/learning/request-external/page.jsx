'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const INIT_REQUESTS = [
  { id:1, training_name:'AWS Solutions Architect Certification', vendor:'Amazon Web Services', date:'2025-08-15', duration:'3 hari', cost:8500000, objective:'Meningkatkan kemampuan cloud architecture untuk mendukung proyek digitalisasi.', category:'Sertifikasi', status:'Approved', submitted:'2025-07-01', approvedBy:'Budi Santoso', approvedDate:'2025-07-05', recorded:false },
  { id:2, training_name:'Project Management Professional (PMP)', vendor:'PMI Indonesia', date:'2025-09-10', duration:'5 hari', cost:15000000, objective:'Mendapatkan sertifikasi PMP untuk peningkatan kompetensi manajemen proyek.', category:'Sertifikasi', status:'Pending Approval', submitted:'2025-07-10', approvedBy:'', approvedDate:'', recorded:false },
  { id:3, training_name:'Design Thinking Workshop', vendor:'IDEO Indonesia', date:'2025-07-05', duration:'2 hari', cost:5000000, objective:'Menguasai metodologi design thinking untuk inovasi produk.', category:'Workshop', status:'Completed', submitted:'2025-06-01', approvedBy:'Dewi Sari', approvedDate:'2025-06-05', recorded:true },
]

const EMPTY = { training_name:'', vendor:'', date:'', duration:'', cost:'', objective:'', category:'Workshop', justification:'', attachmentNote:'' }

export default function RequestExternalTrainingPage() {
  const t = useT()
  const [requests, setRequests] = useDbState('ess-learning-request-external', INIT_REQUESTS)
  const [form,    setForm    ] = useState(EMPTY)
  const [step,    setStep    ] = useState('list')
  const [msg,     setMsg     ] = useState(null)
  const [recordId, setRecordId] = useState(null)

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(()=>setMsg(null), 4000) }

  const handleSubmit = () => {
    if (!form.training_name || !form.vendor || !form.date) return flash(t('Nama training, vendor, dan tanggal wajib diisi.','Training name, vendor, and date are required.'), 'error')
    if (!form.objective) return flash(t('Tujuan/objektif training wajib diisi.','Training objective is required.'), 'error')
    setRequests(prev=>[...prev, { id:Date.now(), ...form, cost:Number(form.cost)||0, status:'Pending Approval', submitted:new Date().toISOString().slice(0,10), approvedBy:'', approvedDate:'', recorded:false }])
    flash(t('Pengajuan training eksternal berhasil dikirim.','External training request submitted successfully.'))
    setForm(EMPTY)
    setStep('list')
  }

  const handleMarkRecorded = (id) => {
    setRequests(prev=>prev.map(r=>r.id===id?{...r,recorded:true}:r))
    flash(t('Tandai sebagai sudah direcord. Buka halaman Record External untuk menambahkan detail.','Marked as recorded. Open Record External page to add details.'))
  }

  const statusColor = (s) => ({
    Draft:'bg-gray-100 text-gray-500',
    'Pending Approval':'bg-yellow-50 text-yellow-700',
    Approved:'bg-green-50 text-green-700',
    Rejected:'bg-red-50 text-red-700',
    Completed:'bg-blue-50 text-blue-700',
  }[s] || 'bg-gray-100 text-gray-500')

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Request External Training</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Ajukan permintaan mengikuti training/sertifikasi eksternal. Setelah selesai, rekam hasilnya di Record External.','Submit a request for external training/certification. After completion, record the results in Record External.')}</p>

      {msg && <div className={`text-xs px-4 py-3 rounded-lg mb-4 ${msg.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-600'}`}>{msg.text}</div>}

      {step==='list' && (
        <>
          <div className='flex justify-between items-center mb-4 flex-wrap gap-3'>
            <div className='flex gap-3 flex-wrap'>
              {[
                [t('Total','Total'), requests.length, 'text-gray-800'],
                [t('Pending','Pending'), requests.filter(r=>r.status==='Pending Approval').length, 'text-yellow-700'],
                [t('Approved','Approved'), requests.filter(r=>r.status==='Approved').length, 'text-green-700'],
                [t('Selesai','Completed'), requests.filter(r=>r.status==='Completed').length, 'text-blue-700'],
              ].map(([l,v,cls])=>(
                <div key={l} className='bg-white rounded-xl px-4 py-3 shadow-sm text-center min-w-16'>
                  <div className='text-xs text-gray-500'>{l}</div>
                  <div className={`font-bold ${cls}`}>{v}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setStep('form')} className='px-5 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{t('+ Buat Pengajuan Baru','+ Create New Request')}</button>
          </div>

          <div className='space-y-4'>
            {requests.map(r=>(
              <div key={r.id} className='bg-white rounded-xl p-5 shadow-sm border border-gray-100'>
                <div className='flex items-start justify-between mb-2'>
                  <div>
                    <div className='font-bold text-gray-800'>{r.training_name}</div>
                    <div className='text-sm text-gray-500 mt-0.5'>{r.vendor} • {r.category} • {r.date} • {r.duration}</div>
                    {r.objective && <div className='text-xs text-gray-400 mt-1 line-clamp-2'><Icon e='🎯' size={14} className='inline align-[-2px]' /> {r.objective}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${statusColor(r.status)}`}>{r.status}</span>
                </div>
                <div className='flex items-center justify-between mt-3'>
                  <span className='text-sm font-semibold text-gray-700'>Rp {r.cost.toLocaleString('id-ID')}</span>
                  <div className='flex items-center gap-2'>
                    {r.approvedBy && <span className='text-xs text-gray-400'>{t('Disetujui oleh','Approved by')}: {r.approvedBy}</span>}
                    <span className='text-xs text-gray-400'>{t('Diajukan:','Submitted:')} {r.submitted}</span>
                    {(r.status==='Approved' || r.status==='Completed') && !r.recorded && (
                      <button onClick={()=>handleMarkRecorded(r.id)}
                        className='px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90'
                        style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
                        <Icon e='📝' size={14} className='inline align-[-2px]' /> {t('Record Hasil','Record Result')}
                      </button>
                    )}
                    {r.recorded && (
                      <span className='text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold'><Icon e='✅' size={14} className='inline align-[-2px]' /> {t('Sudah Direcord','Recorded')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className='mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3'>
            <span className='text-xl'><Icon e='💡' size={15} /></span>
            <p className='text-xs text-blue-600'>{t('Setelah training selesai dan status Approved/Completed, klik "Record Hasil" lalu pergi ke halaman','After training is completed and status is Approved/Completed, click "Record Result" then go to the')} <span className='font-semibold'>{t('Record External Training','Record External Training')}</span> {t('untuk mencatat sertifikat dan CPD point.','to log certificates and CPD points.')}</p>
          </div>
        </>
      )}

      {step==='form' && (
        <div className='bg-white rounded-xl p-6 shadow-sm max-w-2xl'>
          <div className='flex items-center gap-3 mb-6'>
            <button onClick={()=>setStep('list')} className='text-gray-400 hover:text-gray-600'>{t('Kembali','Back')}</button>
            <h2 className='font-bold text-gray-700'>{t('Form Pengajuan External Training','External Training Request Form')}</h2>
          </div>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Nama Training/Sertifikasi','Training/Certification Name')} <span className='text-red-500'>*</span></label>
                <input value={form.training_name} onChange={e=>setForm(f=>({...f,training_name:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Nama training atau sertifikasi','Training or certification name')} />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Vendor/Penyelenggara','Vendor/Organizer')} <span className='text-red-500'>*</span></label>
                <input value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Kategori','Category')}</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                  {['Workshop','Seminar','Sertifikasi','Konferensi','E-Learning','Bootcamp'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tanggal Pelaksanaan','Training Date')} <span className='text-red-500'>*</span></label>
                <input type='date' value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Durasi','Duration')}</label>
                <input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Contoh: 2 hari','Example: 2 days')} />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Biaya (Rp)','Cost (Rp)')}</label>
                <input type='number' value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder='0' />
              </div>
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tujuan/Objektif Training','Training Objective')} <span className='text-red-500'>*</span></label>
                <textarea value={form.objective} onChange={e=>setForm(f=>({...f,objective:e.target.value}))} rows={3}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none'
                  placeholder={t('Jelaskan tujuan mengikuti training ini dan kaitannya dengan pekerjaan Anda...','Explain why you want to attend this training and how it relates to your work...')} />
              </div>
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Justifikasi Kebutuhan','Business Justification')}</label>
                <textarea value={form.justification} onChange={e=>setForm(f=>({...f,justification:e.target.value}))} rows={2}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none'
                  placeholder={t('Bagaimana training ini mendukung target kerja atau kompetensi jabatan Anda?','How does this training support your work targets or role competencies?')} />
              </div>
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Catatan Lampiran','Attachment Note')}</label>
                <input value={form.attachmentNote} onChange={e=>setForm(f=>({...f,attachmentNote:e.target.value}))}
                  className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'
                  placeholder={t('Brochure/proposal tersedia di... (opsional)','Brochure/proposal available at... (optional)')} />
              </div>
            </div>
          </div>
          <div className='flex gap-3 mt-6'>
            <button onClick={handleSubmit} className='flex-1 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition'
              style={{ background:'linear-gradient(135deg,#052B52,#039299)' }}>{t('Submit Pengajuan','Submit Request')}</button>
            <button onClick={()=>{
              if (!form.training_name) return flash(t('Nama training wajib diisi untuk disimpan sebagai Draft.','Training name is required to save as Draft.'), 'error')
              setRequests(prev=>[...prev,{id:Date.now(),...form,cost:Number(form.cost)||0,status:'Draft',submitted:new Date().toISOString().slice(0,10),approvedBy:'',approvedDate:'',recorded:false}])
              setForm(EMPTY); setStep('list'); flash(t('Disimpan sebagai Draft.','Saved as Draft.'))
            }} className='px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200 transition'>{t('Simpan Draft','Save Draft')}</button>
            <button onClick={()=>setStep('list')} className='px-5 py-2.5 bg-gray-50 text-gray-500 text-sm font-semibold rounded-lg hover:bg-gray-100 transition'>{t('Batal','Cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
