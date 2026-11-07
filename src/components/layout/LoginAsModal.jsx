'use client'
import Icon from '@/components/ui/Icon'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEmployeeStore } from '@/store/employeeStore'

const ROLE_LABEL = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR Staff',
  hr_manager: 'HR Manager',
  hr_officer: 'HR Officer',
  superadmin: 'Superadmin',
}
const ROLE_COLOR = {
  employee:   'bg-blue-50 text-blue-700',
  manager:    'bg-purple-50 text-purple-700',
  hr:         'bg-teal-50 text-teal-700',
  hr_manager: 'bg-indigo-50 text-indigo-700',
  hr_officer: 'bg-cyan-50 text-cyan-700',
  superadmin: 'bg-red-50 text-red-700',
}

export default function LoginAsModal({ onClose }) {
  const { userList, currentUser, startProxy } = useAuthStore()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()

  // Exclude currently active user
  const matched = userList
    .filter(u => u.id !== currentUser?.id)
    .filter(u =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q) ||
      (u.dept || '').toLowerCase().includes(q)
    )
  // Cap rendered rows so a large userList (thousands) stays responsive;
  // type to search to narrow down beyond the cap.
  const CAP = 50
  const filtered = matched.slice(0, CAP)
  const moreCount = matched.length - filtered.length

  const handleSelect = (user) => {
    startProxy(user)
    onClose()
    // Reload to re-render sidebar / role-gated content
    window.location.href = '/dashboard'
  }

  return (
    <div className='fixed inset-0 z-[200] bg-black/40 flex items-start justify-center pt-20 px-4'
      onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden'
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className='px-5 pt-5 pb-4 border-b border-gray-100'>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <h2 className='text-base font-bold text-gray-800'><Icon e='🔁' size={14} className='inline align-[-2px]' /> Login As</h2>
              <p className='text-xs text-gray-400 mt-0.5'>Lihat sistem dari sudut pandang pengguna lain</p>
            </div>
            <button onClick={onClose} className='text-gray-400 hover:text-gray-600 transition text-lg leading-none'><Icon e='✕' size={15} /></button>
          </div>
          <div className='flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-teal-400 transition'>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className='shrink-0'>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Cari nama, username, role, jabatan…'
              className='flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400'
            />
            {query && (
              <button onClick={() => setQuery('')} className='text-gray-400 hover:text-gray-600 text-xs'><Icon e='✕' size={15} /></button>
            )}
          </div>
        </div>

        {/* User list */}
        <div className='max-h-80 overflow-y-auto'>
          {filtered.length === 0 ? (
            <div className='py-10 text-center text-gray-400 text-sm'>
              Tidak ada pengguna ditemukan
            </div>
          ) : (
            filtered.map(user => {
              const initials = user.name.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
              return (
                <button key={user.id} onClick={() => handleSelect(user)}
                  className='w-full flex items-center gap-3 px-5 py-3 hover:bg-teal-50 transition text-left border-b border-gray-50 last:border-0 group'>
                  <div className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0'
                    style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                    {initials}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-semibold text-gray-800'>{user.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </div>
                    <div className='text-xs text-gray-400 truncate'>
                      @{user.username}
                      {user.position && <> · {user.position}</>}
                      {user.dept     && <> · {user.dept}</>}
                    </div>
                  </div>
                  <span className='text-gray-300 group-hover:text-teal-600 text-xs shrink-0 transition'>Masuk →</span>
                </button>
              )
            })
          )}
          {moreCount > 0 && (
            <div className='py-3 text-center text-xs text-gray-400'>
              +{moreCount} pengguna lagi — ketik untuk mencari
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2'>
          <span className='text-amber-500 text-sm shrink-0 mt-0.5'><Icon e='⚠️' size={15} /></span>
          <p className='text-xs text-amber-700'>
            Anda akan melihat sistem sepenuhnya dari perspektif pengguna tersebut. Sesi asli Anda tersimpan dan dapat dikembalikan kapan saja.
          </p>
        </div>
      </div>
    </div>
  )
}
