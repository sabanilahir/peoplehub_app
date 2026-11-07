'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useT } from '@/store/languageStore'

const ROLES = [
  { id:1, role:'Admin LMS', description:'Akses tertinggi — mengelola keseluruhan sistem LMS secara teknis dan operasional.', permissions:['All System Access','Master Data CRUD','User Management','System Config','Analytics Full Access','Report Export'], users:3, status:'Active' },
  { id:2, role:'Learning Admin (HR/L&D)', description:'Role operasional L&D/HR — mengelola proses pembelajaran dan training di LMS.', permissions:['Course Management','Batch & Activities','Learner Assignment','Assessment & Evaluation','Certificate Management','Report Access'], users:8, status:'Active' },
  { id:3, role:'Trainer / Instructor', description:'Role pengajar/fasilitator — menyampaikan materi dan mengevaluasi peserta.', permissions:['View Assigned Course','Manage Attendance','Grade Assessment','View Learner Progress','Submit Evaluation','Upload Content'], users:25, status:'Active' },
  { id:4, role:'Learner (Employee)', description:'Role peserta/user — mengikuti pembelajaran yang ditugaskan maupun mandiri.', permissions:['View My Courses','Take Assessment','View My Certificates','Download Certificate','Submit Evaluation','Browse Catalog'], users:850, status:'Active' },
  { id:5, role:'Manager / Approver', description:'Role atasan — melakukan approval dan monitoring learning bawahannya.', permissions:['View Team Progress','Approve Training Request','Team Assignment','Team Report','Competency Dashboard','Approve Certification'], users:120, status:'Active' },
]

const ALL_PERMISSIONS = ['All System Access','Master Data CRUD','User Management','System Config','Analytics Full Access','Report Export','Course Management','Batch & Activities','Learner Assignment','Assessment & Evaluation','Certificate Management','Report Access','View Assigned Course','Manage Attendance','Grade Assessment','View Learner Progress','Submit Evaluation','Upload Content','View My Courses','Take Assessment','View My Certificates','Download Certificate','Browse Catalog','View Team Progress','Approve Training Request','Team Assignment','Team Report','Competency Dashboard','Approve Certification']

export default function RolePermissionPage() {
  const t = useT()
  const [data,     setData    ] = useState(ROLES)
  const [selected, setSelected] = useState(null)
  const [tab,      setTab     ] = useState('roles')
  const [msg,      setMsg     ] = useState(null)

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(()=>setMsg(null), 3000) }

  const togglePermission = (roleId, perm) => {
    setData(prev=>prev.map(r=>{
      if (r.id!==roleId) return r
      const perms = r.permissions.includes(perm) ? r.permissions.filter(p=>p!==perm) : [...r.permissions,perm]
      return { ...r, permissions: perms }
    }))
    flash('Permission diperbarui.')
  }

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-1'>Master Role & Permission</h1>
      <p className='text-gray-500 text-sm mb-6'>Pengaturan hak akses dan otorisasi pengguna berdasarkan peran dalam sistem LMS.</p>

      {msg && <div className='text-xs px-4 py-3 rounded-lg mb-4 bg-green-50 text-green-600'>{msg.text}</div>}

      <div className='grid grid-cols-5 gap-3 mb-6'>
        {ROLES.map(r=>(
          <div key={r.id} className={`bg-white rounded-xl p-3 shadow-sm cursor-pointer border-2 transition ${selected===r.id?'border-red-400 bg-red-50':'border-transparent hover:border-red-200'}`}
            onClick={()=>setSelected(selected===r.id?null:r.id)}>
            <div className='text-xl mb-1'>{['⚙️','🎓','👨‍🏫','👤','👔'][r.id-1]}</div>
            <div className='font-semibold text-gray-700 text-xs'>{r.role}</div>
            <div className='text-gray-500 text-xs mt-0.5'>{r.users} users</div>
          </div>
        ))}
      </div>

      {selected && (
        <div className='bg-white rounded-xl p-6 shadow-sm mb-6 border border-red-200'>
          <h2 className='font-bold text-gray-700 mb-1'>{ROLES.find(r=>r.id===selected)?.role}</h2>
          <p className='text-sm text-gray-500 mb-4'>{ROLES.find(r=>r.id===selected)?.description}</p>
          <h3 className='text-xs font-semibold text-gray-600 mb-3'>PERMISSIONS (klik untuk toggle):</h3>
          <div className='flex flex-wrap gap-2'>
            {ALL_PERMISSIONS.map(p=>{
              const hasPermission = ROLES.find(r=>r.id===selected)?.permissions.includes(p)
              return (
                <button key={p} onClick={()=>togglePermission(selected,p)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${hasPermission?'bg-red-100 text-red-700 border border-red-300':'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'}`}>
                  {hasPermission?'✅':''} {p}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className='bg-white rounded-xl p-6 shadow-sm'>
        <h2 className='font-bold text-gray-700 mb-4'><Icon e='📋' size={14} className='inline align-[-2px]' /> Daftar Role LMS</h2>
        <div className='space-y-4'>
          {data.map(r=>(
            <div key={r.id} className='border border-gray-200 rounded-xl p-4 hover:border-red-200 transition'>
              <div className='flex items-start justify-between mb-2'>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>{['⚙️','🎓','👨‍🏫','👤','👔'][r.id-1]}</span>
                    <span className='font-bold text-gray-800'>{r.role}</span>
                    <span className='text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold'>{r.users} users</span>
                    <span className='text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold'>{r.status}</span>
                  </div>
                  <p className='text-xs text-gray-500 mt-1 ml-7'>{r.description}</p>
                </div>
                <button onClick={()=>setSelected(selected===r.id?null:r.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${selected===r.id?'bg-red-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {selected===r.id?'Tutup':'Edit Permission'}
                </button>
              </div>
              <div className='flex flex-wrap gap-1.5 ml-7'>
                {r.permissions.map(p=>(
                  <span key={p} className='text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold'>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
