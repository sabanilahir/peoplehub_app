'use client'
import { useState }      from 'react'
import { useShiftStore } from '@/store/shiftStore'
import { useT }          from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, FormField, Input, Select,
  ActionButton, EmptyState,
} from '@/components/ui'

const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const BRAND   = 'linear-gradient(135deg,#052B52,#039299)'
const BLANK_NAME    = ''
const BLANK_ENTRIES = {}

export default function ShiftPatternPage() {
  const t = useT()
  const { shifts, patterns, addPattern, deletePattern } = useShiftStore()
  const [name,      setName     ] = useState(BLANK_NAME)
  const [entries,   setEntries  ] = useState(BLANK_ENTRIES)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const openNew    = () => { setName(BLANK_NAME); setEntries(BLANK_ENTRIES); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setName(BLANK_NAME); setEntries(BLANK_ENTRIES) }

  const dayLabel = (d) => t(
    { Monday:'Senin', Tuesday:'Selasa', Wednesday:'Rabu', Thursday:'Kamis', Friday:'Jumat', Saturday:'Sabtu', Sunday:'Minggu' }[d],
    d
  )

  const handleSave = () => {
    if (!name.trim()) return flash(t('Nama pattern wajib diisi.', 'Pattern name is required.'), 'error')
    const entryArr = DAYS_EN.filter(d => entries[d]).map(d => ({ day: d, shiftId: +entries[d] }))
    if (!entryArr.length) return flash(t('Pilih minimal 1 shift.', 'Select at least 1 shift.'), 'error')
    addPattern({ name, entries: entryArr })
    flash(t('Pattern ditambahkan.', 'Pattern added.'))
    closeModal()
  }

  const shiftName = (id) => shifts.find(s => s.id === id)?.name || '—'

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🔁'
        title={t('Shift Pattern', 'Shift Pattern')}
        subtitle={t('Buat pola shift mingguan untuk karyawan.', 'Create weekly shift patterns for employees.')}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <StatCard tone='brand' label={t('Total Pattern', 'Total Patterns')} value={patterns.length} icon='🔁' />
        <StatCard tone='blue'  label={t('Shift Tersedia', 'Available Shifts')} value={shifts.length} icon='🕒' />
      </div>

      <SectionCard
        title={t('Daftar Pattern', 'Pattern List')}
        icon='🔁'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Pattern', 'Add Pattern')}
          </button>
        }
      >
        {patterns.length ? (
          <div className='flex flex-col gap-4'>
            {patterns.map(p => (
              <SectionCard
                key={p.id}
                title={p.name}
                actions={
                  <button onClick={() => { deletePattern(p.id); flash(t('Pattern dihapus.', 'Pattern deleted.')) }}
                    className='px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100'>
                    {t('Hapus', 'Delete')}
                  </button>
                }
              >
                <div className='grid grid-cols-3 md:grid-cols-4 gap-2'>
                  {p.entries.map((e, i) => (
                    <div key={i} className='bg-red-50 rounded-xl px-3 py-2 text-center'>
                      <div className='text-xs text-gray-500'>{dayLabel(e.day)}</div>
                      <div className='text-xs font-semibold text-red-700'>{shiftName(e.shiftId)}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        ) : (
          <EmptyState icon='🔁' title={t('Belum ada pattern.', 'No patterns yet.')}
            description={t('Buat pola shift mingguan pertama Anda.', 'Create your first weekly shift pattern.')} />
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>{t('Buat Pattern', 'Create Pattern')}</h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label={t('Nama Pattern', 'Pattern Name')} required>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </FormField>
              {DAYS_EN.map(d => (
                <div key={d} className='flex items-center gap-3'>
                  <span className='text-xs font-semibold text-gray-600 w-24'>{dayLabel(d)}</span>
                  <Select value={entries[d] || ''} onChange={e => setEntries(en => ({ ...en, [d]: e.target.value }))} className='flex-1'>
                    <option value=''>— {t('Libur', 'Off')} —</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition' style={{ background: BRAND }}>
                {t('Simpan Pattern', 'Save Pattern')}
              </button>
              <button onClick={closeModal} className='flex-1 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition'>
                {t('Batal', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
