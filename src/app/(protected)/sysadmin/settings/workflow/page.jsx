'use client'
import { useState } from 'react'
import { useDbState } from '@/lib/useDbState'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, ActionButton, StatusBadge,
} from '@/components/ui'
import Icon from '@/components/ui/Icon'

const ROLE_OPTIONS = [
  { value: 'Manager',        label: 'Manager',         icon: '👥' },
  { value: 'Senior Manager', label: 'Senior Manager',  icon: '👔' },
  { value: 'HR',             label: 'HR',              icon: '🗂️' },
  { value: 'Director',       label: 'Director',        icon: '🏢' },
  { value: 'Finance',        label: 'Finance',         icon: '💰' },
  { value: 'VP',             label: 'Vice President',  icon: '🎯' },
  { value: 'CEO',            label: 'CEO',             icon: '👑' },
]

const makeLevel = (role) => ({
  id:       Date.now() + Math.random(),
  role,
  icon:     ROLE_OPTIONS.find(r => r.value === role)?.icon ?? '👤',
  required: false,
})

const INITIAL_WORKFLOWS = [
  {
    id: 1, name: 'Leave Request',    icon: '📅', active: true,
    autoApprove: false, notifyEmail: true,
    levels: [
      { id: 11, role: 'Manager',   icon: '👥', required: true  },
      { id: 12, role: 'HR',        icon: '🗂️', required: false },
    ],
  },
  {
    id: 2, name: 'Overtime Request', icon: '⏱️', active: true,
    autoApprove: false, notifyEmail: false,
    levels: [
      { id: 21, role: 'Manager',   icon: '👥', required: true  },
    ],
  },
  {
    id: 3, name: 'Expense Claim',    icon: '💰', active: false,
    autoApprove: false, notifyEmail: true,
    levels: [
      { id: 31, role: 'Manager',   icon: '👥', required: true  },
      { id: 32, role: 'Finance',   icon: '💰', required: false },
      { id: 33, role: 'Director',  icon: '🏢', required: false },
    ],
  },
  {
    id: 4, name: 'Training Request', icon: '📚', active: false,
    autoApprove: false, notifyEmail: false,
    levels: [
      { id: 41, role: 'Manager',   icon: '👥', required: true  },
    ],
  },
]

export default function WorkflowSettingsPage() {
  const t = useT()
  const [workflows, setWorkflows] = useDbState('sysadmin-settings-workflow', INITIAL_WORKFLOWS)
  const [selected,  setSelected ] = useState(1)
  const [addRole,   setAddRole  ] = useState('Manager')
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const wf = workflows.find(w => w.id === selected)

  const updateWf = (key, val) =>
    setWorkflows(ws => ws.map(w => w.id === selected ? { ...w, [key]: val } : w))

  const updateLevels = (levels) => updateWf('levels', levels)

  const addLevel = () => {
    updateLevels([...wf.levels, makeLevel(addRole)])
  }

  const removeLevel = (id) => {
    if (wf.levels.length <= 1) return
    updateLevels(wf.levels.filter(l => l.id !== id))
  }

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...wf.levels]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    updateLevels(next)
  }

  const moveDown = (idx) => {
    if (idx === wf.levels.length - 1) return
    const next = [...wf.levels]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    updateLevels(next)
  }

  const changeRole = (id, role) => {
    const icon = ROLE_OPTIONS.find(r => r.value === role)?.icon ?? '👤'
    updateLevels(wf.levels.map(l => l.id === id ? { ...l, role, icon } : l))
  }

  const toggleRequired = (id) =>
    updateLevels(wf.levels.map(l => l.id === id ? { ...l, required: !l.required } : l))

  const handleSave = () => flash('Konfigurasi workflow disimpan.')

  return (
    <div>
      <PageHeader
        icon={<Icon name='shuffle' />}
        title='Workflow Settings'
        subtitle='Konfigurasi alur persetujuan untuk setiap jenis permintaan.'
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
        <StatCard label='Total Workflow' value={workflows.length} icon={<Icon name='shuffle' />} tone='brand' />
        <StatCard label='Aktif'          value={workflows.filter(w => w.active).length} icon={<Icon name='check' />} tone='green' />
        <StatCard label='Nonaktif'       value={workflows.filter(w => !w.active).length} icon={<Icon name='square' />} tone='gray' />
      </div>

      <div className='flex gap-6'>

        {/* Left — workflow list */}
        <div className='w-56 flex-shrink-0'>
          <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden'>
            <div className='px-4 py-3 border-b border-gray-100'>
              <p className='text-xs font-bold text-gray-500 uppercase tracking-wide'>Jenis Workflow</p>
            </div>
            {workflows.map(w => (
              <button key={w.id} onClick={() => setSelected(w.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-l-2 ${
                  selected === w.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}>
                <span className='text-gray-500'><Icon e={w.icon} size={18} /></span>
                <div className='flex-1 min-w-0'>
                  <div className={`text-sm font-semibold truncate ${selected === w.id ? 'text-red-700' : 'text-gray-700'}`}>
                    {w.name}
                  </div>
                  <div className={`text-xs mt-0.5 font-medium ${w.active ? 'text-green-500' : 'text-gray-400'}`}>
                    {w.active ? <span className='inline-flex items-center gap-1'><span className='w-1.5 h-1.5 rounded-full bg-green-500' />Aktif</span> : <span className='inline-flex items-center gap-1'><span className='w-1.5 h-1.5 rounded-full bg-gray-300' />Nonaktif</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right — detail config */}
        {wf && (
          <div className='flex-1 space-y-5'>

            {/* Header card */}
            <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 flex items-center gap-4'>
              <span className='text-gray-500'><Icon e={wf.icon} size={30} /></span>
              <div className='flex-1'>
                <h2 className='text-lg font-bold text-gray-800'>{wf.name}</h2>
                <p className='text-xs text-gray-400 mt-0.5'>
                  {wf.levels.length + 1} langkah · {wf.levels.length} level approval
                </p>
              </div>
              <label className='flex items-center gap-2 cursor-pointer'>
                <span className='text-sm font-semibold text-gray-600'>Aktif</span>
                <div className='relative' onClick={() => updateWf('active', !wf.active)}>
                  <div className={`w-11 h-6 rounded-full transition cursor-pointer ${wf.active ? 'bg-red-600' : 'bg-gray-300'}`} />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${wf.active ? 'left-6' : 'left-1'}`} />
                </div>
              </label>
            </div>

            {/* Multi-level approval */}
            <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
              <div className='flex items-center justify-between mb-5'>
                <h3 className='text-sm font-bold text-gray-700'><Icon name='shuffle' size={14} className='inline align-[-2px]' /> Multi-Level Approval</h3>
                <span className='text-xs text-gray-400'>{wf.levels.length} level dikonfigurasi</span>
              </div>

              {/* Flow chain */}
              <div className='flex items-start gap-0 overflow-x-auto pb-2'>

                {/* Step 0 — Submitter (fixed) */}
                <div className='flex items-start gap-0 flex-shrink-0'>
                  <div className='flex flex-col items-center'>
                    <div className='flex flex-col items-center bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 w-28 text-center'>
                      <span className='mb-1 text-gray-500'><Icon name='user' size={20} /></span>
                      <span className='text-xs font-bold text-gray-500 mb-0.5'>Step 1</span>
                      <span className='text-xs font-semibold text-gray-700'>Employee</span>
                      <span className='text-xs text-gray-400 mt-1'>Submitter</span>
                      <span className='mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full'>Fixed</span>
                    </div>
                  </div>
                  <div className='flex items-center h-[108px]'>
                    <span className='text-gray-300 text-lg mx-1'><Icon e='→' size={15} /></span>
                  </div>
                </div>

                {/* Dynamic approval levels */}
                {wf.levels.map((lv, idx) => (
                  <div key={lv.id} className='flex items-start gap-0 flex-shrink-0'>
                    <div className='flex flex-col items-center w-32'>
                      <div className={`flex flex-col items-center border-2 rounded-xl px-3 py-3 w-full text-center relative
                        ${lv.required ? 'border-red-400 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>

                        {/* Up/down controls */}
                        <div className='absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1'>
                          <button onClick={() => moveUp(idx)} disabled={idx === 0}
                            className='w-5 h-5 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs flex items-center justify-center shadow-sm'>
                            <Icon name='arrowUp' size={12} />
                          </button>
                          <button onClick={() => moveDown(idx)} disabled={idx === wf.levels.length - 1}
                            className='w-5 h-5 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs flex items-center justify-center shadow-sm'>
                            <Icon name='arrowDown' size={12} />
                          </button>
                        </div>

                        <span className='mb-1 text-gray-500'><Icon e={lv.icon} size={20} /></span>
                        <span className={`text-xs font-bold mb-1 ${lv.required ? 'text-red-600' : 'text-blue-600'}`}>
                          Step {idx + 2}
                        </span>

                        {/* Role selector */}
                        <select value={lv.role} onChange={e => changeRole(lv.id, e.target.value)}
                          className='w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-1 py-1 outline-none focus:border-red-400 mb-2'>
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>

                        {/* Required toggle */}
                        <button onClick={() => toggleRequired(lv.id)}
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold transition ${
                            lv.required
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                          }`}>
                          {lv.required ? 'Required' : 'Optional'}
                        </button>

                        {/* Remove button */}
                        {wf.levels.length > 1 && (
                          <button onClick={() => removeLevel(lv.id)}
                            className='absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow-sm'>
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    {idx < wf.levels.length - 1 && (
                      <div className='flex items-center h-[108px]'>
                        <span className='text-gray-300 text-lg mx-1'><Icon e='→' size={15} /></span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add level button */}
                <div className='flex items-start gap-0 flex-shrink-0'>
                  <div className='flex items-center h-[108px]'>
                    <span className='text-gray-300 text-lg mx-1'><Icon e='→' size={15} /></span>
                  </div>
                  <div className='flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl w-28 h-[108px] gap-2 hover:border-red-400 hover:bg-red-50 transition group'>
                    <select value={addRole} onChange={e => setAddRole(e.target.value)}
                      className='w-20 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-1 py-1 outline-none focus:border-red-400'>
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button onClick={addLevel}
                      className='text-xs font-bold text-gray-400 group-hover:text-red-600 flex items-center gap-1 transition'>
                      <Icon name='plus' size={14} className='inline align-[-2px]' /> Add Level
                    </button>
                  </div>
                </div>

              </div>

              <div className='mt-4 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3'>
                <span className='flex items-center gap-1.5'>
                  <span className='w-3 h-3 rounded-full bg-red-200 border border-red-400 inline-block' />
                  Required — harus disetujui
                </span>
                <span className='flex items-center gap-1.5'>
                  <span className='w-3 h-3 rounded-full bg-blue-200 border border-blue-300 inline-block' />
                  Optional — bisa di-skip
                </span>
                <span className='ml-auto'>reorder · hapus level</span>
              </div>
            </div>

            {/* Options */}
            <div className='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100'>
              <h3 className='text-sm font-bold text-gray-700 mb-4'><Icon name='settings' size={14} className='inline align-[-2px]' /> Opsi Tambahan</h3>
              <div className='space-y-4'>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input type='checkbox' checked={wf.autoApprove}
                    onChange={e => updateWf('autoApprove', e.target.checked)}
                    className='w-4 h-4 accent-red-600' />
                  <div>
                    <div className='text-sm font-semibold text-gray-700'>Auto-Approve</div>
                    <div className='text-xs text-gray-400'>Permintaan disetujui otomatis tanpa menunggu approver.</div>
                  </div>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input type='checkbox' checked={wf.notifyEmail}
                    onChange={e => updateWf('notifyEmail', e.target.checked)}
                    className='w-4 h-4 accent-red-600' />
                  <div>
                    <div className='text-sm font-semibold text-gray-700'>Notifikasi Email</div>
                    <div className='text-xs text-gray-400'>Kirim email ke approver saat ada permintaan baru.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className='flex justify-end'>
              <ActionButton onClick={handleSave}><Icon name='save' size={14} className='inline align-[-2px]' /> Simpan Perubahan</ActionButton>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
