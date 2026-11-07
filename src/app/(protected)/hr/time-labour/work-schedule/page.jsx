'use client'
import { useState }      from 'react'
import { useShiftStore } from '@/store/shiftStore'
import { useT }          from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td,
  FormField, Input, Select, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { name: '', patternId: '', effectiveDate: '' }
const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

export default function WorkSchedulePage() {
  const t = useT()
  const { schedules, patterns, addSchedule, deleteSchedule } = useShiftStore()
  const [form,      setForm     ] = useState(BLANK)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const openNew    = () => { setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setForm(BLANK) }

  const handleSave = () => {
    if (!form.name || !form.patternId || !form.effectiveDate)
      return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    addSchedule({ ...form, patternId: +form.patternId })
    flash(t('Work schedule ditambahkan.', 'Work schedule added.'))
    closeModal()
  }

  const patternName = (id) => patterns.find(p => p.id === id)?.name || '—'

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='📆'
        title={t('Work Schedule', 'Work Schedule')}
        subtitle={t('Buat jadwal kerja berdasarkan shift pattern.', 'Create work schedules based on shift patterns.')}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <StatCard tone='brand' label={t('Total Schedule', 'Total Schedules')} value={schedules.length} icon='📆' />
        <StatCard tone='blue'  label={t('Pattern Tersedia', 'Available Patterns')} value={patterns.length} icon='🔁' />
      </div>

      <SectionCard
        title={t('Daftar Schedule', 'Schedule List')}
        icon='📆'
        bodyClass='p-0'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Schedule', 'Add Schedule')}
          </button>
        }
      >
        {schedules.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[
              t('Nama','Name'),
              t('Pattern','Pattern'),
              t('Efektif Mulai','Effective From'),
              { label: t('Aksi','Action'), align: 'right' },
            ]}
          >
            {schedules.map(s => (
              <Tr key={s.id}>
                <Td className='font-medium text-gray-800'>{s.name}</Td>
                <Td>{patternName(s.patternId)}</Td>
                <Td>{s.effectiveDate}</Td>
                <Td align='right'>
                  <button onClick={() => { deleteSchedule(s.id); flash(t('Schedule dihapus.', 'Schedule deleted.')) }}
                    className='px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100'>
                    {t('Hapus', 'Delete')}
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='📆' title={t('Belum ada schedule.', 'No schedules yet.')}
              description={t('Buat work schedule pertama Anda.', 'Create your first work schedule.')} />
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>{t('Buat Schedule', 'Create Schedule')}</h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <FormField label={t('Nama Schedule', 'Schedule Name')} required>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </FormField>
              <FormField label={t('Shift Pattern', 'Shift Pattern')} required>
                <Select value={form.patternId} onChange={e => setForm(f => ({ ...f, patternId: e.target.value }))}>
                  <option value=''>— {t('Pilih Pattern', 'Select Pattern')} —</option>
                  {patterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Tanggal Efektif', 'Effective Date')} required>
                <Input type='date' value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
              </FormField>
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition' style={{ background: BRAND }}>
                {t('Tambah Schedule', 'Add Schedule')}
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
