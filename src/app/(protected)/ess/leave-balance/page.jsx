'use client'
import { useAuthStore }  from '@/store/authStore'
import { useLeaveStore } from '@/store/leaveStore'
import { daysBetween }   from '@/utils/dateUtils'
import { useT } from '@/store/languageStore'
import { PageHeader, SectionCard, DataTable, Tr, Td, StatusBadge, EmptyState } from '@/components/ui'

export default function LeaveBalancePage() {
  const t = useT()
  const { currentUser }           = useAuthStore()
  const { leaves, leaveTypes }    = useLeaveStore()

  const myLeaves = leaves.filter(l => l.userId === currentUser?.id)

  const used = (typeName) =>
    myLeaves
      .filter(l => l.type === typeName && l.status === 'Approved')
      .reduce((sum, l) => sum + daysBetween(l.start, l.end), 0)

  const statusTone = (s) => ({ Approved: 'success', Pending: 'warning', Rejected: 'danger' }[s] || 'neutral')

  return (
    <div>
      <PageHeader
        icon='🌴'
        title='Leave Balance'
        subtitle={t('Saldo dan riwayat cuti kamu tahun ini.', 'Your leave balance and history for this year.')}
      />

      {/* Balance cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        {leaveTypes.filter(lt => lt.active).map(lt => {
          const u    = used(lt.name)
          const sisa = lt.maxDays - u
          const pct  = Math.min(100, Math.round((u / lt.maxDays) * 100))
          const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981'
          return (
            <div key={lt.id} className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
              <div className='text-xs font-medium uppercase tracking-wide text-gray-400 mb-2 truncate'>{lt.name}</div>
              <div className='flex items-end gap-1.5 mb-3'>
                <span className='text-3xl font-bold leading-none tracking-tight text-gray-900'>{sisa}</span>
                <span className='text-sm text-gray-400'>/ {lt.maxDays} {t('hari', 'days')}</span>
              </div>
              <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
                <div
                  className='h-2 rounded-full transition-all'
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              <div className='flex justify-between text-xs text-gray-400 mt-2'>
                <span>{t('Terpakai:', 'Used:')} <strong className='text-gray-600'>{u}</strong></span>
                <span>{t('Sisa:', 'Remaining:')} <strong className='text-gray-600'>{sisa}</strong></span>
              </div>
            </div>
          )
        })}
      </div>

      {/* History */}
      <SectionCard title={t('Riwayat Cuti', 'Leave History')} icon='📄' bodyClass='p-0'>
        <DataTable
          columns={[
            { label: t('Jenis', 'Type') },
            { label: t('Mulai', 'Start') },
            { label: t('Selesai', 'End') },
            { label: t('Hari', 'Days'), align: 'right' },
            { label: t('Keterangan', 'Note') },
            { label: 'Status' },
          ]}
          className='ring-0 shadow-none rounded-none'
        >
          {myLeaves.length ? myLeaves.map(l => (
            <Tr key={l.id}>
              <Td className='font-medium text-gray-800'>{l.type}</Td>
              <Td className='text-gray-600'>{l.start}</Td>
              <Td className='text-gray-600'>{l.end}</Td>
              <Td align='right' className='text-gray-600 tabular-nums'>{daysBetween(l.start, l.end)}</Td>
              <Td className='text-gray-500'>{l.note || '—'}</Td>
              <Td><StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge></Td>
            </Tr>
          )) : (
            <tr>
              <td colSpan={6} className='px-4 py-10'>
                <EmptyState icon='📭' title={t('Belum ada riwayat cuti.', 'No leave history yet.')} />
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>
    </div>
  )
}
