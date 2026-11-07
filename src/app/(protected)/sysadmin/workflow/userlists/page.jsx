'use client'
import { useState }          from 'react'
import { useStructureStore }  from '@/store/structureStore'
import { useEmployeeStore }   from '@/store/employeeStore'
import { useUserlistStore }   from '@/store/userlistStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, ActionButton, FormField, Input,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'

const SYSTEM_ROLES = [
  { value: 'employee',   label: 'Employee',        icon: '👤' },
  { value: 'manager',    label: 'Manager',          icon: '👥' },
  { value: 'hr',         label: 'HR',               icon: '🗂️' },
  { value: 'superadmin', label: 'Superadmin',       icon: '⚙️' },
]

const TYPE_META = {
  position: { label: 'By Position',    icon: '📌', desc: 'Semua karyawan dengan jabatan tertentu' },
  role:     { label: 'By Role',        icon: '🎭', desc: 'Berdasarkan role sistem (Manager, HR, dll)' },
  employee: { label: 'By Employee ID', icon: '👤', desc: 'Pilih karyawan secara spesifik' },
  sql:      { label: 'By SQL Query',   icon: '🗄️', desc: 'Query SELECT kustom untuk menentukan user' },
}

export default function UserlistsPage() {
  const t = useT()
  const { positions }  = useStructureStore()
  const { employees }  = useEmployeeStore()
  const { userlists, addUserlist, updateUserlist, deleteUserlist } = useUserlistStore()

  const [selected,  setSelected ] = useState(userlists[0]?.id ?? null)
  const [empSearch, setEmpSearch] = useState('')
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const ul     = userlists.find(l => l.id === selected)
  const update = (key, val) => updateUserlist(selected, { [key]: val })

  const toggleArr = (key, val) => {
    const arr = ul[key]
    update(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const addList = () => {
    const newList = { name: `Userlist ${Date.now()}`, type: 'role', roles: [], positionIds: [], employeeIds: [], sql: '' }
    addUserlist(newList)
    // select the newly added one
    setTimeout(() => {
      const store = useUserlistStore.getState()
      const last  = store.userlists[store.userlists.length - 1]
      if (last) setSelected(last.id)
    }, 0)
  }

  const handleDelete = (id) => {
    if (userlists.length <= 1) return
    const remaining = userlists.filter(l => l.id !== id)
    deleteUserlist(id)
    if (selected === id) setSelected(remaining[0].id)
  }

  const handleSave = () => flash('Userlist disimpan.')

  const filteredEmps = employees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.nik.toLowerCase().includes(empSearch.toLowerCase())
  ).slice(0, 50)

  const resolvedCount = () => {
    if (!ul) return 0
    if (ul.type === 'role')     return employees.filter(e => ul.roles.includes(e.role ?? '')).length
    if (ul.type === 'position') return employees.filter(e => ul.positionIds.includes(+e.positionId)).length
    if (ul.type === 'employee') return ul.employeeIds.length
    return null
  }

  const count = resolvedCount()

  return (
    <div>
      <PageHeader
        icon={<Icon name='clipboard' />}
        title='Userlists'
        subtitle='Definisikan daftar user yang digunakan dalam konfigurasi workflow approval.'
      />

      {msg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg mb-4 inline-block ${
          msg.type === 'error'
            ? 'bg-red-50 text-red-600'
            : 'bg-emerald-50 text-emerald-600'
        }`}>
          {msg.text}
        </div>
      )}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6'>
        <StatCard label='Total Userlist' value={userlists.length} icon={<Icon name='clipboard' />} tone='brand' />
        <StatCard label='Karyawan'       value={employees.length} icon={<Icon name='users' />} tone='blue' />
        {count !== null && <StatCard label='Resolved (terpilih)' value={count} icon={<Icon name='check' />} tone='green' hint={ul?.name} />}
      </div>

      <div className='flex gap-6'>

        {/* Left — list panel */}
        <div className='w-56 flex-shrink-0'>
          <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
            <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between'>
              <p className='text-xs font-bold text-gray-500 uppercase tracking-wide'>Userlists</p>
              <button onClick={addList}
                className='w-6 h-6 bg-red-100 text-red-700 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-red-200 transition'>
                +
              </button>
            </div>
            {userlists.map(l => (
              <div key={l.id}
                className={`group flex items-center gap-2 px-4 py-3 cursor-pointer transition border-l-2 ${
                  selected === l.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
                onClick={() => setSelected(l.id)}>
                <span className='flex-shrink-0 text-gray-500'><Icon e={TYPE_META[l.type].icon} size={16} /></span>
                <div className='flex-1 min-w-0'>
                  <div className={`text-sm font-semibold truncate ${selected === l.id ? 'text-red-700' : 'text-gray-700'}`}>
                    {l.name}
                  </div>
                  <div className='text-xs text-gray-400 mt-0.5'>{TYPE_META[l.type].label}</div>
                </div>
                {userlists.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(l.id) }}
                    className='opacity-0 group-hover:opacity-100 w-5 h-5 bg-red-100 text-red-500 rounded flex items-center justify-center text-xs hover:bg-red-200 flex-shrink-0 transition'>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right — detail */}
        {ul && (
          <div className='flex-1 space-y-5 min-w-0'>

            {/* Name + type */}
            <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
              <div className='flex items-start gap-4 flex-wrap'>
                <div className='flex-1 min-w-48'>
                  <label className='block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5'>Nama Userlist</label>
                  <input
                    value={ul.name}
                    onChange={e => update('name', e.target.value)}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 font-semibold text-gray-800'
                  />
                </div>
                {count !== null && (
                  <div className='bg-red-50 border border-red-100 rounded-xl px-5 py-2.5 text-center flex-shrink-0'>
                    <div className='text-2xl font-bold text-red-700'>{count}</div>
                    <div className='text-xs text-red-500 mt-0.5'>Resolved Users</div>
                  </div>
                )}
              </div>

              {/* Type selector */}
              <div className='mt-4'>
                <label className='block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2'>Metode Definisi</label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button key={key} onClick={() => update('type', key)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-center transition ${
                        ul.type === key
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-200 bg-gray-50 hover:border-red-200 hover:bg-red-50/50'
                      }`}>
                      <span className='text-gray-500'><Icon e={meta.icon} size={20} /></span>
                      <span className={`text-xs font-bold ${ul.type === key ? 'text-red-700' : 'text-gray-600'}`}>
                        {meta.label}
                      </span>
                      <span className='text-xs text-gray-400 leading-tight'>{meta.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── By Position ── */}
            {ul.type === 'position' && (
              <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
                <h3 className='text-sm font-bold text-gray-700 mb-3'>
                  <Icon name='position' size={13} className='inline align-[-2px]' /> Pilih Position
                  <span className='ml-2 text-xs font-normal text-gray-400'>{ul.positionIds.length} dipilih</span>
                </h3>
                <div className='grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1'>
                  {positions.map(p => {
                    const checked = ul.positionIds.includes(p.id)
                    return (
                      <label key={p.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition ${
                          checked ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <input type='checkbox' checked={checked}
                          onChange={() => toggleArr('positionIds', p.id)}
                          className='w-4 h-4 accent-red-600 flex-shrink-0' />
                        <div className='min-w-0'>
                          <div className='text-xs font-semibold text-gray-700 truncate'>{p.name}</div>
                          {p.code && <div className='text-xs text-gray-400'>{p.code}</div>}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── By Role ── */}
            {ul.type === 'role' && (
              <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
                <h3 className='text-sm font-bold text-gray-700 mb-3'>
                  <Icon name='role' size={13} className='inline align-[-2px]' /> Pilih Role Sistem
                  <span className='ml-2 text-xs font-normal text-gray-400'>{ul.roles.length} dipilih</span>
                </h3>
                <div className='flex flex-wrap gap-3'>
                  {SYSTEM_ROLES.map(r => {
                    const checked = ul.roles.includes(r.value)
                    return (
                      <button key={r.value} onClick={() => toggleArr('roles', r.value)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition ${
                          checked
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-red-200'
                        }`}>
                        <span className='text-gray-500'><Icon e={r.icon} size={15} /></span>
                        {r.label}
                        {checked && <Icon name='checkSmall' size={12} className='text-red-500' />}
                      </button>
                    )
                  })}
                </div>
                {ul.roles.length > 0 && (
                  <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
                    <p className='text-xs text-gray-500 font-semibold mb-1'>Preview karyawan yang termasuk:</p>
                    <div className='flex flex-wrap gap-1'>
                      {employees.filter(e => ul.roles.includes(e.role ?? '')).slice(0, 10).map(e => (
                        <span key={e.id} className='text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600'>
                          {e.name.split(' ')[0]}
                        </span>
                      ))}
                      {employees.filter(e => ul.roles.includes(e.role ?? '')).length > 10 && (
                        <span className='text-xs text-gray-400 px-1'>+{employees.filter(e => ul.roles.includes(e.role ?? '')).length - 10} lainnya</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── By Employee ID ── */}
            {ul.type === 'employee' && (
              <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
                <h3 className='text-sm font-bold text-gray-700 mb-3'>
                  <Icon name='user' size={13} className='inline align-[-2px]' /> Pilih Karyawan
                  <span className='ml-2 text-xs font-normal text-gray-400'>{ul.employeeIds.length} dipilih</span>
                </h3>
                <input
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  placeholder='Cari nama atau NIK…'
                  className='w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 mb-3'
                />
                <div className='space-y-1.5 max-h-72 overflow-y-auto pr-1'>
                  {filteredEmps.map(e => {
                    const checked = ul.employeeIds.includes(e.id)
                    return (
                      <label key={e.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${
                          checked ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <input type='checkbox' checked={checked}
                          onChange={() => toggleArr('employeeIds', e.id)}
                          className='w-4 h-4 accent-red-600 flex-shrink-0' />
                        <div className='w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 overflow-hidden'
                          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
                          {e.photo
                            ? <img src={e.photo} className='w-full h-full object-cover' />
                            : (e.name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-sm font-semibold text-gray-700 truncate'>{e.name}</div>
                          <div className='text-xs text-gray-400'>{e.nik}</div>
                        </div>
                        {checked && <Icon name='checkSmall' size={13} className='text-red-500 flex-shrink-0' />}
                      </label>
                    )
                  })}
                  {filteredEmps.length === 0 && (
                    <p className='text-sm text-gray-400 text-center py-4'>Tidak ada karyawan ditemukan.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── By SQL ── */}
            {ul.type === 'sql' && (
              <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
                <h3 className='text-sm font-bold text-gray-700 mb-1'><Icon name='archive' size={13} className='inline align-[-2px]' /> SELECT SQL Query</h3>
                <p className='text-xs text-gray-400 mb-3'>
                  Query harus mengembalikan kolom <code className='bg-gray-100 px-1 rounded'>employee_id</code>. Gunakan tabel <code className='bg-gray-100 px-1 rounded'>employees</code>, <code className='bg-gray-100 px-1 rounded'>positions</code>, <code className='bg-gray-100 px-1 rounded'>departments</code>.
                </p>
                <textarea
                  value={ul.sql}
                  onChange={e => update('sql', e.target.value)}
                  rows={8}
                  spellCheck={false}
                  placeholder={`SELECT e.employee_id\nFROM employees e\nJOIN positions p ON e.position_id = p.id\nWHERE p.name LIKE '%Manager%'\n  AND e.status = 'Active'`}
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-red-400 bg-gray-50 resize-y leading-relaxed'
                />
                <div className='mt-3 flex items-center gap-2'>
                  <button
                    onClick={() => flash('Query divalidasi. (Simulasi — tidak terhubung ke database)', 'success')}
                    className='px-4 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition'><Icon e='▶' size={14} className='inline align-[-2px]' /> Validate Query
                  </button>
                  <span className='text-xs text-gray-400'>Pastikan query hanya SELECT — tidak ada INSERT/UPDATE/DELETE.</span>
                </div>
              </div>
            )}

            <div className='flex justify-end'>
              <ActionButton onClick={handleSave}><Icon name='save' size={14} className='inline align-[-2px]' /> Simpan Userlist</ActionButton>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
