'use client'
import { useRouter } from 'next/navigation'
import { useOvertimeStore } from '@/store/overtimeStore'
import { useStructureStore } from '@/store/structureStore'
import { useT } from '@/store/languageStore'
import {
  PageHeader, StatCard, SectionCard, DataTable, Tr, Td,
  ActionButton, StatusBadge, EmptyState,
} from '@/components/ui'

// Compact "2 names then +N" summary — same convention used by the
// onboarding/offboarding auto-assign criteria pages.
const namesSummary = (ids, items, allLabel) => {
  if (!ids?.length) return allLabel
  const names = ids.map(id => items.find(i => i.id === id)?.name).filter(Boolean)
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

export default function EligibilityGroupListPage() {
  const t = useT()
  const router = useRouter()
  const { eligibilityGroups, overtimeMatrices, deleteGroup } = useOvertimeStore()
  const { companies, departments } = useStructureStore()

  const flowSteps = (g) => {
    const steps = [t('Plan', 'Plan')]
    if (!g.autoApprovePlan) steps.push(t('Approval', 'Approval'))
    steps.push(t('Realisasi', 'Realization'))
    if (!g.autoApproveRealization) steps.push(t('Approval', 'Approval'))
    return steps.join(' → ')
  }
  const compensationLabel = (g) => g.compensationType === 'Overtime Allowance'
    ? `${t('Overtime Allowance', 'Overtime Allowance')} · ${overtimeMatrices.find(m => m.id === g.matrixId)?.name || t('belum pilih matrix', 'no matrix selected')}`
    : t('Compensatory Leave', 'Compensatory Leave')

  const activeCount = eligibilityGroups.filter(g => g.active).length

  return (
    <div>
      <PageHeader
        icon='🧩'
        title={t('Eligibility Group', 'Eligibility Group')}
        subtitle={t(
          'Kelompok kebijakan lembur: siapa yang eligible, alur prosesnya, dan bagaimana dikompensasi.',
          'Overtime policy groups: who is eligible, the process flow, and how it gets compensated.',
        )}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard tone='brand' icon='🧩' label={t('Total Group', 'Total Groups')} value={String(eligibilityGroups.length)} />
        <StatCard tone='green' icon='✅' label={t('Group Aktif', 'Active Groups')} value={String(activeCount)} />
        <StatCard tone='blue'  icon='📐' label={t('Overtime Matrix', 'Overtime Matrix')} value={String(overtimeMatrices.length)}
          hint={t('Kelola di menu Overtime Matrix', 'Manage under Overtime Matrix')} />
      </div>

      <div className='mb-4 flex justify-end'>
        <button onClick={() => router.push('/hr/time-labour/eligibility-group/new')}
          className='flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90'
          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
          + {t('Tambah Eligibility Group', 'Add Eligibility Group')}
        </button>
      </div>

      <SectionCard bodyClass='p-0'>
        {eligibilityGroups.length === 0 ? (
          <div className='p-5'>
            <EmptyState icon='🧩' title={t('Belum ada Eligibility Group.', 'No Eligibility Groups yet.')}
              description={t('Tambahkan group pertama untuk mengatur kebijakan lembur.', 'Add your first group to configure an overtime policy.')} />
          </div>
        ) : (
          <DataTable
            className='rounded-none shadow-none ring-0'
            columns={[
              t('Nama Group', 'Group Name'), 'PT', t('Departemen', 'Department'),
              t('Alur', 'Flow'), t('Kompensasi', 'Compensation'), 'Status', { label: t('Aksi', 'Action'), align: 'right' },
            ]}
          >
            {eligibilityGroups.map(g => (
              <Tr key={g.id}>
                <Td className='font-semibold text-gray-800'>{g.name}</Td>
                <Td className='text-xs text-gray-600'>{namesSummary(g.companyIds, companies, t('Semua Company', 'All Companies'))}</Td>
                <Td className='text-xs text-gray-600'>{namesSummary(g.departmentIds, departments, t('Semua Departemen', 'All Departments'))}</Td>
                <Td className='text-xs text-gray-600'>{flowSteps(g)}</Td>
                <Td className='text-xs text-gray-600'>{compensationLabel(g)}</Td>
                <Td>
                  <StatusBadge tone={g.active ? 'success' : 'neutral'}>
                    {g.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}
                  </StatusBadge>
                </Td>
                <Td align='right'>
                  <div className='flex justify-end gap-2'>
                    <ActionButton size='sm' variant='secondary' onClick={() => router.push(`/hr/time-labour/eligibility-group/${g.id}`)}>
                      {t('Edit', 'Edit')}
                    </ActionButton>
                    <button onClick={() => deleteGroup(g.id)}
                      className='rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100'>
                      {t('Hapus', 'Delete')}
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </div>
  )
}
