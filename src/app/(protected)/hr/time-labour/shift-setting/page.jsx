'use client'
import { useState }      from 'react'
import { useShiftStore } from '@/store/shiftStore'
import { useT }          from '@/store/languageStore'
import { workHoursDisplay } from '@/utils/attendanceUtils'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td,
  FormField, Input, ActionButton, EmptyState,
} from '@/components/ui'

const BLANK = { name: '', startTime: '', endTime: '', breakMinutes: 60 }
const BRAND = 'linear-gradient(135deg,#052B52,#039299)'

export default function ShiftSettingPage() {
  const t = useT()
  const { shifts, addShift, updateShift, deleteShift } = useShiftStore()
  const [form,      setForm     ] = useState(BLANK)
  const [editing,   setEditing  ] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg,       setMsg      ] = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const openNew    = () => { setEditing(null); setForm(BLANK); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK) }

  const handleSave = () => {
    if (!form.name || !form.startTime || !form.endTime)
      return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    if (editing) {
      updateShift(editing, form)
      flash(t('Shift diperbarui.', 'Shift updated.'))
    } else {
      addShift(form)
      flash(t('Shift ditambahkan.', 'Shift added.'))
    }
    closeModal()
  }

  const handleEdit = (s) => {
    setEditing(s.id)
    setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes })
    setShowModal(true)
  }

  const fields = [
    [t('Nama Shift', 'Shift Name'), 'text',   'name'      ],
    [t('Jam Masuk',  'Start Time'), 'time',   'startTime' ],
    [t('Jam Keluar', 'End Time'),   'time',   'endTime'   ],
  ]

  const avgBreak = shifts.length
    ? Math.round(shifts.reduce((a, s) => a + (s.breakMinutes || 0), 0) / shifts.length)
    : 0

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🕒'
        title={t('Shift Setting', 'Shift Setting')}
        subtitle={t('Kelola definisi shift kerja.', 'Manage work shift definitions.')}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard tone='brand'  label={t('Total Shift', 'Total Shifts')}  value={shifts.length} icon='🕒' />
        <StatCard tone='blue'   label={t('Rata-rata Istirahat', 'Avg Break')} value={`${avgBreak} ${t('mnt', 'min')}`} icon='☕' />
        <StatCard tone='green'  label={t('Shift Aktif', 'Active Shifts')} value={shifts.length} icon='✅' />
      </div>

      <SectionCard
        title={t('Daftar Shift', 'Shift List')}
        icon='🕒'
        bodyClass='p-0'
        actions={
          <button onClick={openNew}
            className='flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition whitespace-nowrap'
            style={{ background: BRAND }}>
            + {t('Tambah Shift', 'Add Shift')}
          </button>
        }
      >
        {shifts.length ? (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[
              t('Nama','Name'),
              t('Jam Masuk','Start'),
              t('Jam Keluar','End'),
              { label: t('Istirahat','Break'), align: 'right' },
              { label: t('Jam Kerja','Work Hours'), align: 'right' },
              { label: t('Aksi','Action'), align: 'right' },
            ]}
          >
            {shifts.map(s => (
              <Tr key={s.id}>
                <Td className='font-medium text-gray-800'>{s.name}</Td>
                <Td>{s.startTime}</Td>
                <Td>{s.endTime}</Td>
                <Td align='right'>{s.breakMinutes} {t('menit', 'min')}</Td>
                <Td align='right'>{workHoursDisplay(s.startTime, s.endTime, s.breakMinutes, t)}</Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <ActionButton size='sm' variant='secondary' onClick={() => handleEdit(s)}>
                      {t('Edit', 'Edit')}
                    </ActionButton>
                    <button onClick={() => { deleteShift(s.id); flash(t('Shift dihapus.', 'Shift deleted.')) }}
                      className='px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100'>
                      {t('Hapus', 'Delete')}
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : (
          <div className='p-5'>
            <EmptyState icon='🕒' title={t('Belum ada shift.', 'No shifts yet.')}
              description={t('Tambahkan shift kerja pertama Anda.', 'Add your first work shift.')} />
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
              <h2 className='text-base font-bold text-gray-800'>
                {editing ? t('Edit Shift', 'Edit Shift') : t('Tambah Shift', 'Add Shift')}
              </h2>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>×</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              {fields.map(([lbl, type, key]) => (
                <FormField key={key} label={lbl} required>
                  <Input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </FormField>
              ))}
              <FormField label={t('Istirahat (menit)', 'Break (minutes)')}>
                <Input type='number' value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: +e.target.value }))} />
              </FormField>
            </div>
            <div className='px-6 pb-5 flex gap-3'>
              <button onClick={handleSave} className='flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition' style={{ background: BRAND }}>
                {editing ? t('Simpan Perubahan', 'Save Changes') : t('Tambah Shift', 'Add Shift')}
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
