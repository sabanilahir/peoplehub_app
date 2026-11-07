'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const HISTORY = [
  { id:1, title:'Brevet Pajak A & B', organizer:'IAI Indonesia', date:'2025-04-10', type:'Sertifikasi', duration:'5 hari', cost:7500000, cpd:30, cert:'Brevet-2025.pdf', status:'Verified', keyLearning:'Memahami peraturan perpajakan terbaru dan aplikasinya di perusahaan.', linkedRequest:'', passScore:82 },
  { id:2, title:'Project Management Professional (PMP)', organizer:'PMI Indonesia', date:'2025-02-20', type:'Sertifikasi', duration:'3 hari', cost:15000000, cpd:25, cert:'PMP-cert.pdf', status:'Pending Review', keyLearning:'Sertifikasi PMP internasional — meningkatkan kemampuan manajemen proyek.', linkedRequest:'', passScore:78 },
  { id:3, title:'Workshop Design Thinking', organizer:'Prasetya Mulya', date:'2024-11-15', type:'Workshop', duration:'2 hari', cost:4000000, cpd:16, cert:null, status:'Verified', keyLearning:'Metodologi design thinking untuk inovasi dan problem solving.', linkedRequest:'Req-003', passScore:null },
]

const EMPTY = { title:'', organizer:'', date:'', type:'Workshop', duration:'', cost:'', cpd:'', keyLearning:'', linkedRequest:'', passScore:'', certFile:'' }

export default function RecordExternalPage() {
  const t = useT()
  const [data, setData] = useDbState('ess-learning-record-external', HISTORY)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handleSave = () => {
    if (!form.title || !form.organizer || !form.date) return flash(t('Isi semua field yang wajib.','Fill in all required fields.'))
    if (editing) {
      setData(prev=>prev.map(d=>d.id===editing?{...d,...form,cost:Number(form.cost)||0,cpd:Number(form.cpd)||0,passScore:form.passScore?Number(form.passScore):null}:d))
      flash(t('Record diperbarui.','Record updated.')); setEditing(null)
    } else {
      setData(prev=>[...prev,{...form,id:Date.now(),cost:Number(form.cost)||0,cpd:Number(form.cpd)||0,passScore:form.passScore?Number(form.passScore):null,cert:form.certFile||null,status:'Pending Review'}])
      flash(t('Record training eksternal berhasil disimpan.','External training record saved.'))
    }
    setShowForm(false); setForm(EMPTY)
  }

  const handleEdit = (item) => {
    setEditing(item.id)
    setForm({ title:item.title, organizer:item.organizer, date:item.date, type:item.type, duration:item.duration, cost:String(item.cost), cpd:String(item.cpd), keyLearning:item.keyLearning||'', linkedRequest:item.linkedRequest||'', passScore:item.passScore?String(item.passScore):'', certFile:item.cert||'' })
    setShowForm(true)
  }

  const statusColor = (s) => ({ Verified:'bg-green-50 text-green-700', 'Pending Review':'bg-yellow-50 text-yellow-700', Rejected:'bg-red-50 text-red-700' }[s])

  const filtered = data.filter(d=>filterStatus==='All'||d.status===filterStatus)
  const totalCPD = data.filter(d=>d.status==='Verified').reduce((a,d)=>a+d.cpd,0)
  const totalCost = data.reduce((a,d)=>a+d.cost,0)
  const totalVerified = data.filter(d=>d.status==='Verified').length

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Record External Training</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Catat dan laporkan pelatihan/sertifikasi eksternal yang sudah Anda ikuti untuk mendapat CPD point.','Record external training/certifications you attended to earn CPD points.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}

      <div className='grid grid-cols-3 gap-4 mb-6'>
        {[
          ['Total CPD (Verified)', totalCPD+' pts', 'from-red-50 to-white border-red-100', 'text-red-700'],
          ['Record Terverifikasi', totalVerified+'/'+data.length, 'from-green-50 to-white border-green-100', 'text-green-700'],
          ['Total Biaya', 'Rp '+totalCost.toLocaleString('id-ID'), 'from-blue-50 to-white border-blue-100', 'text-blue-700'],
        ].map(([label, val, gradient, cls])=>(
          <div key={label} className={`bg-gradient-to-b ${gradient} border rounded-xl p-4 shadow-sm`}>
            <div className='text-xs text-gray-500 mb-1'>{label}</div>
            <div className={`text-lg font-bold ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className='flex justify-between items-center mb-4'>
        <div className='flex gap-2'>
          {['All','Verified','Pending Review','Rejected'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterStatus===s?'text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              style={filterStatus===s?{background:'linear-gradient(135deg,#052B52,#039299)'}:{}}>
              {s==='All'?t('Semua','All'):s}
            </button>
          ))}
        </div>
        <button onClick={()=>{setShowForm(!showForm);setEditing(null);setForm(EMPTY)}}
          className='px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90'
          style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
          {t('+ Tambah Record','+ Add Record')}
        </button>
      </div>

      {showForm && (
        <div className='bg-white rounded-xl p-6 shadow-sm border border-red-200 mb-6'>
          <h3 className='font-bold text-gray-700 mb-4'>{editing?t('Edit Record','Edit Record'):t('Tambah Record Training Eksternal','Add External Training Record')}</h3>
          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div className='col-span-2'>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Judul Training/Sertifikasi','Training/Certification Title')} <span className='text-red-500'>*</span></label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Penyelenggara','Organizer')} <span className='text-red-500'>*</span></label>
              <input value={form.organizer} onChange={e=>setForm(f=>({...f,organizer:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tipe','Type')}</label>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                {['Workshop','Seminar','Sertifikasi','Konferensi','E-Learning','Bootcamp'].map(tp=><option key={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Tanggal Pelaksanaan','Date')} <span className='text-red-500'>*</span></label>
              <input type='date' value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Durasi','Duration')}</label>
              <input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Contoh: 2 hari','E.g. 2 days')} />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Biaya (Rp)','Cost (Rp)')}</label>
              <input type='number' value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder='0' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>CPD Points {t('yang Diklaim','Claimed')}</label>
              <input type='number' value={form.cpd} onChange={e=>setForm(f=>({...f,cpd:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder='0' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Nilai/Score (jika ada)','Score/Grade (if any)')}</label>
              <input type='number' value={form.passScore} onChange={e=>setForm(f=>({...f,passScore:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder='0-100' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Nomor Request Terkait','Linked Request No.')}</label>
              <input value={form.linkedRequest} onChange={e=>setForm(f=>({...f,linkedRequest:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Jika ada request yang diajukan sebelumnya','If request was submitted before')} />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Nama File Sertifikat','Certificate File Name')}</label>
              <input value={form.certFile} onChange={e=>setForm(f=>({...f,certFile:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' placeholder={t('Contoh: AWS-cert-2025.pdf','E.g. AWS-cert-2025.pdf')} />
            </div>
            <div className='col-span-2'>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>{t('Key Learning / Takeaway','Key Learning / Takeaway')}</label>
              <textarea value={form.keyLearning} onChange={e=>setForm(f=>({...f,keyLearning:e.target.value}))} rows={3}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 resize-none'
                placeholder={t('Apa yang Anda pelajari dan bagaimana akan diterapkan di pekerjaan?','What did you learn and how will you apply it at work?')} />
            </div>
          </div>
          <div className='flex gap-3'>
            <button onClick={handleSave} className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>{editing?t('Simpan Perubahan','Save Changes'):t('Simpan Record','Save Record')}</button>
            <button onClick={()=>{setShowForm(false);setEditing(null);setForm(EMPTY)}} className='px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>{t('Batal','Cancel')}</button>
          </div>
        </div>
      )}

      <div className='bg-white rounded-xl p-6 shadow-sm overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-gray-50'>
              {[t('Judul Training','Training Title'),t('Penyelenggara','Organizer'),t('Tipe','Type'),t('Tanggal','Date'),t('Durasi','Duration'),t('Biaya','Cost'),'CPD',t('Score','Score'),t('Sertifikat','Certificate'),'Status',''].map(h=>(
                <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d=>(
              <tr key={d.id} className='border-t border-gray-100 hover:bg-gray-50'>
                <td className='px-3 py-2.5 font-medium text-gray-700 max-w-44'><div className='line-clamp-2'>{d.title}</div></td>
                <td className='px-3 py-2.5 text-gray-600 text-xs'>{d.organizer}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs'>{d.type}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap'>{d.date}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs'>{d.duration}</td>
                <td className='px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap'>Rp {d.cost.toLocaleString('id-ID')}</td>
                <td className='px-3 py-2.5 text-xs font-semibold text-red-700'>{d.cpd} pts</td>
                <td className='px-3 py-2.5 text-xs text-gray-500'>{d.passScore!=null?d.passScore+'%':'—'}</td>
                <td className='px-3 py-2.5'>
                  {d.cert ? <button className='text-xs text-blue-600 hover:underline'><Icon e='📄' size={14} className='inline align-[-2px]' /> {d.cert}</button> : <span className='text-xs text-gray-300'>—</span>}
                </td>
                <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${statusColor(d.status)}`}>{d.status}</span></td>
                <td className='px-3 py-2.5'>
                  <button onClick={()=>handleEdit(d)} className='text-xs text-blue-600 hover:underline whitespace-nowrap'>{t('Edit','Edit')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div className='py-8 text-center text-gray-400 text-sm'>{t('Belum ada record.','No records found.')}</div>}
      </div>
    </div>
  )
}
