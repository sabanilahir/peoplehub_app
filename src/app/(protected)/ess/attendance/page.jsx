'use client'
import { useAuthStore }       from '@/store/authStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import { useT } from '@/store/languageStore'
import { PageHeader, StatCard, DataTable, Tr, Td, StatusBadge, EmptyState } from '@/components/ui'

const STATUS_TONE = {
  Present: 'success',
  Late:    'warning',
  Absent:  'danger',
  Leave:   'info',
}

const STAT_TONE = {
  Present: 'green',
  Late:    'orange',
  Absent:  'red',
  Leave:   'blue',
}

const STAT_ICON = {
  Present: '✅',
  Late:    '⏰',
  Absent:  '🚫',
  Leave:   '🏖️',
}

export default function AttendancePage() {
  const t = useT()
  const { currentUser } = useAuthStore()
  const { records }     = useAttendanceStore()

  const mine = records
    .filter(r => r.userId === currentUser?.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const summary = {
    Present: mine.filter(r => r.status === 'Present').length,
    Late:    mine.filter(r => r.status === 'Late').length,
    Absent:  mine.filter(r => r.status === 'Absent').length,
    Leave:   mine.filter(r => r.status === 'Leave').length,
  }

  const statusLabel = {
    Present: t('Hadir', 'Present'),
    Late:    t('Terlambat', 'Late'),
    Absent:  t('Absen', 'Absent'),
    Leave:   t('Cuti', 'Leave'),
  }

  return (
    <div>
      <PageHeader
        icon='🕒'
        title={t('My Attendance', 'My Attendance')}
        subtitle={t('Rekap kehadiran kamu 14 hari terakhir.', 'Your attendance summary for the last 14 days.')}
      />

      {/* Summary */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        {Object.entries(summary).map(([status, count]) => (
          <StatCard
            key={status}
            label={statusLabel[status]}
            value={count}
            icon={STAT_ICON[status]}
            tone={STAT_TONE[status]}
          />
        ))}
      </div>

      {/* Table */}
      {mine.length ? (
        <DataTable
          columns={[
            { label: t('Tanggal', 'Date') },
            { label: t('Check In', 'Check In') },
            { label: t('Check Out', 'Check Out') },
            { label: 'Status' },
          ]}
        >
          {mine.map(r => (
            <Tr key={r.id}>
              <Td className='font-medium text-gray-800'>{r.date}</Td>
              <Td>{r.checkIn || '—'}</Td>
              <Td>{r.checkOut || '—'}</Td>
              <Td>
                <StatusBadge tone={STATUS_TONE[r.status]}>
                  {statusLabel[r.status] ?? r.status}
                </StatusBadge>
              </Td>
            </Tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          icon='📅'
          title={t('Belum ada data kehadiran.', 'No attendance records yet.')}
          description={t('Catatan kehadiran kamu akan muncul di sini.', 'Your attendance records will appear here.')}
        />
      )}
    </div>
  )
}
