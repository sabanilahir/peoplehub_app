'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'

const TEAM = ['Ahmad Fauzi','Dewi Sari','Budi Rahayu','Siti Nurhaliza','Rizky Pratama']

const REQUESTS = [
  { id:1, employee:'Rizky Pratama', course:'AWS Solutions Architect Certification', vendor:'Amazon Web Services', date:'2025-08-15', cost:8500000, justification:'Migrasi cloud Q4', status:'Pending Manager', submittedBy:'self' },
  { id:2, employee:'Ahmad Fauzi', course:'Brevet Pajak A & B', vendor:'IAI Indonesia', date:'2025-09-01', cost:7000000, justification:'Persyaratan jabatan Tax Specialist', status:'Pending HR', submittedBy:'manager' },
  { id:3, employee:'Dewi Sari', course:'SHRM-CP Certification', vendor:'SHRM', date:'2025-10-10', cost:18000000, justification:'Peningkatan profesionalisme HR', status:'Approved', submittedBy:'manager' },
]

export default function MssRequestExternalPage() {
  const t = useT()
  const [data, setData] = useDbState('mss-learning-request-external', REQUESTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employee:'', course:'', vendor:'', date:'', cost:'', justification:'' })
  const [msg, setMsg] = useState(null)

  const flash = (text) => { setMsg(text); setTimeout(()=>setMsg(null), 3000) }

  const handleSave = () => {
    if (!form.employee || !form.course || !form.vendor || !form.date) return flash(t('Isi semua field yang wajib.','Please fill in all required fields.'))
    setData(prev=>[...prev, { ...form, id:Date.now(), cost:Number(form.cost)||0, status:'Pending HR', submittedBy:'manager' }])
    flash(t('Request external training berhasil dikirim ke HR.','External training request has been sent to HR.'))
    setShowForm(false)
    setForm({ employee:'', course:'', vendor:'', date:'', cost:'', justification:'' })
  }

  const statusColor = { 'Pending Manager':'bg-yellow-50 text-yellow-700', 'Pending HR':'bg-orange-50 text-orange-700', Approved:'bg-green-50 text-green-700', Rejected:'bg-red-50 text-red-700' }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>{t('Request External Training (Tim)','Request External Training (Team)')}</h1>
      <p className='text-gray-500 text-sm mb-6'>{t('Ajukan permintaan training eksternal untuk anggota tim Anda ke HR/L&D.','Submit external training requests for your team members to HR/L&D.')}</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg}</div>}


      <div className='flex justify-between items-center mb-4'>
        <h2 className='font-bold text-gray-700'><Icon e='📋' size={14} className='inline align-[-2px]' /> Daftar Request</h2>
        <button onClick={()=>setShowForm(!showForm)}
          className='px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90'
          style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>
          + Ajukan Request
        </button>
      </div>

      {showForm && (
        <div className='bg-white rounded-xl p-6 shadow-sm border border-red-200 mb-6'>
          <h3 className='font-bold text-gray-700 mb-4'>Form Request External Training</h3>
          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Karyawan <span className='text-red-500'>*</span></label>
              <select value={form.employee} onChange={e=>setForm(p=>({...p,employee:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400'>
                <option value=''>-- Pilih Karyawan --</option>
                {TEAM.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Nama Training/Sertifikasi <span className='text-red-500'>*</span></label>
              <input value={form.course} onChange={e=>setForm(p=>({...p,course:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Penyelenggara <span className='text-red-500'>*</span></label>
              <input value={form.vendor} onChange={e=>setForm(p=>({...p,vendor:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Tanggal Pelaksanaan <span className='text-red-500'>*</span></label>
              <input type='date' value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Estimasi Biaya (Rp)</label>
              <input type='number' value={form.cost} onChange={e=>setForm(p=>({...p,cost:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Justifikasi Bisnis</label>
              <input value={form.justification} onChange={e=>setForm(p=>({...p,justification:e.target.value}))}
                className='w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400' />
            </div>
          </div>
          <div className='flex gap-3'>
            <button onClick={handleSave} className='px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90' style={{background:'linear-gradient(135deg,#052B52,#039299)'}}>Kirim ke HR</button>
            <button onClick={()=>setShowForm(false)} className='px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>{t('Batal','Cancel')}</button>
          </div>
        </div>
      )}

      <div className='bg-white rounded-xl p-6 shadow-sm overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead><tr className='bg-gray-50'>{['Karyawan','Training/Sertifikasi','Penyelenggara','Tanggal','Biaya','Diajukan Oleh','Status'].map(h=>(
            <th key={h} className='text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap'>{h}</th>
          ))}</tr></thead>
          <tbody>{data.map(d=>(
            <tr key={d.id} className='border-t border-gray-100 hover:bg-gray-50'>
              <td className='px-3 py-2.5 font-medium text-gray-700'>{d.employee}</td>
              <td className='px-3 py-2.5 text-gray-600 text-xs max-w-44'><div className='line-clamp-2'>{d.course}</div></td>
              <td className='px-3 py-2.5 text-gray-500 text-xs'>{d.vendor}</td>
              <td className='px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap'>{d.date}</td>
              <td className='px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap'>Rp {d.cost.toLocaleString('id-ID')}</td>
              <td className='px-3 py-2.5 text-xs'><span className={`px-2 py-0.5 rounded-full font-semibold ${d.submittedBy==='manager'?'bg-red-50 text-red-700':'bg-gray-100 text-gray-500'}`}>{d.submittedBy==='manager'?'Manajer':'Karyawan'}</span></td>
              <td className='px-3 py-2.5'><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[d.status]}`}>{d.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
