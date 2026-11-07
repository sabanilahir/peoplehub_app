'use client'
import { useState, useMemo } from 'react'
import { useShiftStore }    from '@/store/shiftStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT }             from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td, SearchBar,
  FilterBar, FilterPill, FormField, Input, Select, ActionButton, StatusBadge, EmptyState,
} from '@/components/ui'
import { shiftFor, dayNameOf } from '@/lib/workSchedule'

const PAGE = 50
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function ScheduleAssignmentPage() {
  const t = useT()
  const { shifts, patterns, schedules, assignments, addAssignment, deleteAssignment } = useShiftStore()
  const { employees } = useEmployeeStore()

  const [q, setQ]         = useState('')
  const [filter, setFilter] = useState('all')     // all | unscheduled | scheduled
  const [limit, setLimit]  = useState(PAGE)
  const [modal, setModal]  = useState(null)       // { userId, name, scheduleId, startDate }
  const [msg, setMsg]      = useState(null)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const date = todayStr()
  const chain = { assignments, schedules, patterns, shifts }
  const activeEmps = useMemo(() => employees.filter(e => e.status === 'Active'), [employees])

  // One row per employee — the effective assignment for today, plus the shift
  // that actually resolves from it. This is exactly what Clock In/Out reads,
  // so what shows here is what the employee will see.
  const rows = useMemo(() => activeEmps.map(e => {
    const assignment = assignments
      .filter(a => a.userId === e.id && (!a.startDate || a.startDate <= date))
      .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0] || null
    return {
      emp: e,
      assignment,
      schedule: assignment ? schedules.find(s => s.id === assignment.scheduleId) : null,
      todayShift: shiftFor(e.id, date, chain),
    }
  }), [activeEmps, assignments, schedules, patterns, shifts, date])

  const withSchedule = rows.filter(r => r.assignment).length
  const without = rows.length - withSchedule

  const needle = q.trim().toLowerCase()
  const shown = rows.filter(r => {
    if (filter === 'unscheduled' && r.assignment) return false
    if (filter === 'scheduled' && !r.assignment) return false
    if (needle && !r.emp.name.toLowerCase().includes(needle) && !String(r.emp.nik || '').toLowerCase().includes(needle)) return false
    return true
  })

  const openAssign = (row) => setModal({
    userId: String(row.emp.id), name: row.emp.name,
    scheduleId: String(row.assignment?.scheduleId || schedules[0]?.id || ''),
    startDate: date,
  })

  const save = () => {
    if (!modal.userId || !modal.scheduleId || !modal.startDate)
      return flash(t('Semua field wajib diisi.', 'All fields are required.'), 'error')
    addAssignment({
      userId: +modal.userId, name: modal.name,
      scheduleId: +modal.scheduleId, startDate: modal.startDate,
    })
    flash(t(`Jadwal untuk ${modal.name} disimpan.`, `Schedule saved for ${modal.name}.`))
    setModal(null)
  }

  return (
    <div>
      {msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl
          ${msg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {msg.type === 'error' ? '⚠' : '✓'} {msg.text}
        </div>
      )}

      <PageHeader
        icon='🗓️'
        title={t('Schedule Assignment', 'Schedule Assignment')}
        subtitle={t(
          'Tentukan jadwal kerja tiap karyawan. Jadwal inilah yang tampil dan menilai keterlambatan di halaman Clock In/Out.',
          "Set each employee's work schedule. This is what Clock In/Out shows and grades lateness against.",
        )}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard tone='brand' icon='👥' label={t('Karyawan Aktif', 'Active Employees')} value={String(rows.length)} />
        <StatCard tone='green' icon='✅' label={t('Sudah Terjadwal', 'Scheduled')} value={String(withSchedule)} />
        <StatCard tone={without ? 'red' : 'gray'} icon='⚠️'
          label={t('Belum Terjadwal', 'Not Scheduled')} value={String(without)}
          hint={t('Jam mereka tidak dinilai', 'Their times are not graded')} />
      </div>

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex-1'>
          <SearchBar value={q} onChange={setQ} placeholder={t('Cari nama atau NIK…', 'Search name or NIK…')} />
        </div>
        <FilterBar>
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
            {t('Semua', 'All')} ({rows.length})
          </FilterPill>
          <FilterPill active={filter === 'unscheduled'} onClick={() => setFilter('unscheduled')}>
            {t('Belum Terjadwal', 'Not Scheduled')} ({without})
          </FilterPill>
          <FilterPill active={filter === 'scheduled'} onClick={() => setFilter('scheduled')}>
            {t('Sudah Terjadwal', 'Scheduled')} ({withSchedule})
          </FilterPill>
        </FilterBar>
      </div>

      <SectionCard bodyClass='p-0'>
        {shown.length === 0 ? (
          <div className='p-5'>
            <EmptyState icon='🗓️' title={t('Tidak ada karyawan cocok.', 'No matching employees.')} />
          </div>
        ) : (
          <>
            <DataTable
              className='rounded-none shadow-none ring-0'
              columns={[
                t('Karyawan', 'Employee'),
                t('Jadwal Kerja', 'Work Schedule'),
                { label: t('Shift Hari Ini', "Today's Shift"), align: 'center' },
                { label: t('Berlaku Sejak', 'Effective From'), align: 'center' },
                { label: '', align: 'right' },
              ]}
            >
              {shown.slice(0, limit).map(({ emp, assignment, schedule, todayShift }) => (
                <Tr key={emp.id}>
                  <Td>
                    <p className='font-semibold text-gray-800'>{emp.name}</p>
                    <p className='text-xs text-gray-400'>{emp.nik || '—'}</p>
                  </Td>
                  <Td>
                    {schedule
                      ? <span className='font-medium text-gray-700'>{schedule.name}</span>
                      : <StatusBadge tone='danger'>{t('Belum ada jadwal', 'No schedule')}</StatusBadge>}
                  </Td>
                  <Td align='center' className='text-xs'>
                    {!assignment
                      ? <span className='text-gray-300'>—</span>
                      : todayShift
                        ? <span className='font-mono font-semibold text-gray-700'>
                            {todayShift.shift.startTime}–{todayShift.shift.endTime}
                          </span>
                        : <span className='text-gray-400'>{t('Libur', 'Day off')}</span>}
                  </Td>
                  <Td align='center' className='text-xs tabular-nums text-gray-500'>
                    {assignment?.startDate || '—'}
                  </Td>
                  <Td align='right'>
                    <div className='flex justify-end gap-2'>
                      <button onClick={() => openAssign({ emp, assignment })}
                        className='text-xs font-semibold text-red-700 hover:underline'>
                        {assignment ? t('Ubah', 'Change') : t('Atur Jadwal', 'Set Schedule')}
                      </button>
                      {assignment && (
                        <button
                          onClick={() => { deleteAssignment(assignment.id); flash(t('Jadwal dihapus.', 'Schedule removed.')) }}
                          className='text-xs font-semibold text-gray-400 hover:text-red-600'>
                          {t('Hapus', 'Remove')}
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </DataTable>
            {shown.length > limit && (
              <div className='border-t border-gray-100 p-4 text-center'>
                <ActionButton variant='secondary' size='sm' onClick={() => setLimit(l => l + PAGE)}>
                  {t(`Tampilkan ${Math.min(PAGE, shown.length - limit)} lagi`,
                     `Show ${Math.min(PAGE, shown.length - limit)} more`)}
                  {' '}({limit}/{shown.length})
                </ActionButton>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={() => setModal(null)}>
          <div className='w-full max-w-md rounded-2xl bg-white shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
              <h2 className='text-base font-bold text-gray-800'>{t('Atur Jadwal Kerja', 'Set Work Schedule')}</h2>
              <button onClick={() => setModal(null)} className='text-xl font-bold leading-none text-gray-400 hover:text-gray-600'>×</button>
            </div>
            <div className='space-y-4 px-6 py-5'>
              <FormField label={t('Karyawan', 'Employee')}>
                <Input value={modal.name} disabled />
              </FormField>
              <FormField label={t('Work Schedule', 'Work Schedule')} required
                hint={t('Dikelola di menu Work Schedule.', 'Managed under the Work Schedule menu.')}>
                <Select value={modal.scheduleId} onChange={e => setModal(m => ({ ...m, scheduleId: e.target.value }))}>
                  <option value=''>— {t('Pilih Schedule', 'Select Schedule')} —</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label={t('Berlaku Sejak', 'Effective From')} required
                hint={t('Jadwal lama tetap tersimpan untuk tanggal sebelumnya.', 'Earlier dates keep the previous schedule.')}>
                <Input type='date' value={modal.startDate}
                  onChange={e => setModal(m => ({ ...m, startDate: e.target.value }))} />
              </FormField>
              {modal.scheduleId && (() => {
                const sc = schedules.find(s => s.id === +modal.scheduleId)
                const pat = sc && patterns.find(p => p.id === sc.patternId)
                if (!pat) return null
                return (
                  <div className='rounded-xl bg-gray-50 p-3 text-xs text-gray-600'>
                    <p className='mb-1 font-semibold text-gray-700'>{t('Pola mingguan', 'Weekly pattern')}: {pat.name}</p>
                    {pat.entries.map(en => {
                      const sh = shifts.find(s => s.id === en.shiftId)
                      return (
                        <p key={en.day} className='flex justify-between'>
                          <span>{en.day}</span>
                          <span className='font-mono'>{sh ? `${sh.startTime}–${sh.endTime}` : '—'}</span>
                        </p>
                      )
                    })}
                    <p className='mt-1 text-gray-400'>
                      {t('Hari lain dianggap libur.', 'Other days count as days off.')}
                    </p>
                  </div>
                )
              })()}
            </div>
            <div className='flex gap-3 px-6 pb-5'>
              <ActionButton onClick={save} className='flex-1' icon='💾'>{t('Simpan', 'Save')}</ActionButton>
              <ActionButton variant='secondary' onClick={() => setModal(null)} className='flex-1'>
                {t('Batal', 'Cancel')}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
