'use client'
import { useState }           from 'react'
import { useAttendanceStore }  from '@/store/attendanceStore'
import { useEmployeeStore }    from '@/store/employeeStore'
import { useT } from '@/store/languageStore'
import { PageHeader, StatCard, SectionCard, DataTable, Tr, Td, FilterBar, FilterPill, StatusBadge, EmptyState } from '@/components/ui'

const STATUS_STYLE = {
  Present: 'bg-green-100 text-green-700',
  Late:    'bg-yellow-100 text-yellow-700',
  Absent:  'bg-red-100 text-red-700',
  Leave:   'bg-blue-100 text-blue-700',
}

const STATUS_TONE = {
  Present: 'success',
  Late:    'warning',
  Absent:  'danger',
  Leave:   'info',
}

export default function TeamAttendancePage() {
  const t = useT()
  const { records }   = useAttendanceStore()
  const { employees } = useEmployeeStore()

  const dates = [...new Set(records.map(r => r.date))].sort((a,b) => b.localeCompare(a))
  const [selDate, setSelDate] = useState(dates[0] || '')

  const dayRecords = records.filter(r => r.date === selDate)
  const activeEmps = employees.filter(e => e.status === 'Active')

  const summary = (status) => dayRecords.filter(r => r.status === status).length

  const TONES = { Present: 'green', Late: 'orange', Absent: 'red', Leave: 'blue' }

  return (
    <div>
      <PageHeader
        icon='👥'
        title='Team Attendance'
        subtitle={t('Monitor kehadiran tim per hari.', 'Monitor your team attendance by day.')}
      />

      {/* Date picker */}
      <SectionCard
        title={t('Pilih Tanggal', 'Select Date')}
        icon='🗓️'
        className='mb-6'
      >
        {dates.length ? (
          <FilterBar>
            {dates.map(d => (
              <FilterPill key={d} active={selDate === d} onClick={() => setSelDate(d)}>
                {d}
              </FilterPill>
            ))}
          </FilterBar>
        ) : (
          <p className='text-xs text-gray-400'>{t('Belum ada data.', 'No data available.')}</p>
        )}
      </SectionCard>

      {/* Summary */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        {['Present','Late','Absent','Leave'].map(s => (
          <StatCard key={s} label={s} value={summary(s)} tone={TONES[s]} />
        ))}
      </div>

      {/* Table */}
      <SectionCard
        title={`${t('Detail Kehadiran', 'Attendance Detail')} — ${selDate || '—'}`}
        icon='👥'
        bodyClass='p-0'
      >
        <DataTable
          columns={[
            { label: t('Nama', 'Name') },
            { label: t('Check In', 'Check In') },
            { label: t('Check Out', 'Check Out') },
            { label: 'Status' },
          ]}
          className='ring-0 shadow-none rounded-none'
        >
          {activeEmps.length ? activeEmps.map(emp => {
            const rec = dayRecords.find(r => r.userId === emp.id)
            return (
              <Tr key={emp.id}>
                <Td className='font-medium text-gray-800'>{emp.name}</Td>
                <Td className='text-gray-600'>{rec?.checkIn  || '—'}</Td>
                <Td className='text-gray-600'>{rec?.checkOut || '—'}</Td>
                <Td>
                  {rec ? (
                    <StatusBadge tone={STATUS_TONE[rec.status]}>{rec.status}</StatusBadge>
                  ) : (
                    <span className='text-xs text-gray-400'>{t('Tidak ada data', 'No data')}</span>
                  )}
                </Td>
              </Tr>
            )
          }) : (
            <tr>
              <td colSpan={4} className='px-4 py-10'>
                <EmptyState icon='👥' title={t('Tidak ada karyawan aktif.', 'No active employees.')} />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>
    </div>
  )
}
