'use client'
import Icon from '@/components/ui/Icon'
import { useMemo } from 'react'
import { useOnboardingStore }  from '@/store/onboardingStore'
import { useStructureStore }   from '@/store/structureStore'
import { useT }                from '@/store/languageStore'
import { PageHeader }          from '@/components/ui'

const calcProgress = (ob) => {
  let total = 0, done = 0
  ;(ob.mainSections ?? []).forEach(ms => {
    ;(ms.items ?? []).forEach(i => { total++; if (i.completed) done++ })
    ;(ms.sections ?? []).forEach(s => (s.items ?? []).forEach(i => { total++; if (i.completed) done++ }))
  })
  ;(ob.generalItems ?? []).forEach(i => { total++; if (i.completed) done++ })
  ;(ob.technicalItems ?? []).forEach(i => { total++; if (i.completed) done++ })
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
}

const countOverdue = (ob) => {
  const today = new Date(new Date().toDateString())
  let count = 0
  const check = (i) => { if (!i.completed && i.date && new Date(i.date) < today) count++ }
  ;(ob.mainSections ?? []).forEach(ms => {
    ;(ms.items ?? []).forEach(check)
    ;(ms.sections ?? []).forEach(s => (s.items ?? []).forEach(check))
  })
  ;(ob.generalItems ?? []).forEach(check)
  ;(ob.technicalItems ?? []).forEach(check)
  return count
}

export default function LaporanOnboardingPage() {
  const t = useT()
  const { onboardings } = useOnboardingStore()

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear  = now.getFullYear()

  const active    = useMemo(() => onboardings.filter(o => o.workflowStatus === 'Active'), [onboardings])
  const completed = useMemo(() => onboardings.filter(o => o.workflowStatus === 'Completed'), [onboardings])
  const completedThisMonth = useMemo(() => completed.filter(o => {
    if (!o.completedAt) return false
    const d = new Date(o.completedAt)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }), [completed, thisMonth, thisYear])

  const avgProgress = useMemo(() => {
    if (!active.length) return 0
    const sum = active.reduce((acc, ob) => acc + calcProgress(ob).pct, 0)
    return Math.round(sum / active.length)
  }, [active])

  const overdueList = useMemo(() =>
    active.filter(ob => countOverdue(ob) > 0)
      .map(ob => ({ ...ob, overdueCount: countOverdue(ob) }))
      .sort((a, b) => b.overdueCount - a.overdueCount),
  [active])

  const byDept = useMemo(() => {
    const map = {}
    onboardings.forEach(ob => {
      const dept = ob.department || 'Tidak ada'
      if (!map[dept]) map[dept] = { dept, total: 0, active: 0, completed: 0, pctSum: 0 }
      map[dept].total++
      if (ob.workflowStatus === 'Active')    { map[dept].active++;    map[dept].pctSum += calcProgress(ob).pct }
      if (ob.workflowStatus === 'Completed') { map[dept].completed++; map[dept].pctSum += 100 }
    })
    return Object.values(map).map(d => ({
      ...d,
      avgPct: d.total > 0 ? Math.round(d.pctSum / d.total) : 0,
    })).sort((a, b) => b.total - a.total)
  }, [onboardings])

  const KPI = ({ label, value, sub, color = 'text-gray-800' }) => (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
      <p className='text-xs text-gray-400 font-medium mb-1'>{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className='text-xs text-gray-400 mt-1'>{sub}</p>}
    </div>
  )

  return (
    <div className='space-y-6'>
      <PageHeader title={t('Laporan Onboarding', 'Onboarding Report')} subtitle={t('Ringkasan dan analitik program onboarding', 'Onboarding program summary and analytics')} />

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <KPI label={t('Total Onboarding Aktif', 'Total Active')} value={active.length} color='text-blue-600' />
        <KPI label={t('Rata-rata Progress', 'Avg Progress')} value={`${avgProgress}%`} color='text-indigo-600' sub={t('dari semua onboarding aktif', 'across all active')} />
        <KPI label={t('Selesai Bulan Ini', 'Completed This Month')} value={completedThisMonth.length} color='text-green-600' />
        <KPI label={t('Memiliki Item Terlambat', 'With Overdue Items')} value={overdueList.length} color={overdueList.length > 0 ? 'text-red-600' : 'text-gray-800'} />
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
        <h2 className='text-sm font-bold text-gray-700 mb-4'>{t('Progress per Departemen', 'Progress by Department')}</h2>
        {byDept.length === 0 ? (
          <p className='text-sm text-gray-400'>{t('Belum ada data.', 'No data yet.')}</p>
        ) : (
          <div className='space-y-3'>
            {byDept.map(d => (
              <div key={d.dept}>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-sm font-medium text-gray-700'>{d.dept}</span>
                  <div className='flex gap-3 text-xs text-gray-400'>
                    <span>Total: <b className='text-gray-700'>{d.total}</b></span>
                    <span>{t('Aktif','Active')}: <b className='text-blue-600'>{d.active}</b></span>
                    <span>{t('Selesai','Done')}: <b className='text-green-600'>{d.completed}</b></span>
                    <span className='font-semibold text-gray-800'>{d.avgPct}%</span>
                  </div>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-2'>
                  <div className='h-2 rounded-full transition-all'
                    style={{ width: `${d.avgPct}%`, background: 'linear-gradient(135deg,#052B52,#039299)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
        <h2 className='text-sm font-bold text-gray-700 mb-4'>{t('Ringkasan per Departemen', 'Department Summary')}</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100'>
                <th className='text-left py-2 px-3 text-xs font-semibold text-gray-500'>{t('Departemen','Department')}</th>
                <th className='text-center py-2 px-3 text-xs font-semibold text-gray-500'>Total</th>
                <th className='text-center py-2 px-3 text-xs font-semibold text-gray-500'>{t('Aktif','Active')}</th>
                <th className='text-center py-2 px-3 text-xs font-semibold text-gray-500'>{t('Selesai','Completed')}</th>
                <th className='text-center py-2 px-3 text-xs font-semibold text-gray-500'>{t('Rata-rata Progress','Avg Progress')}</th>
              </tr>
            </thead>
            <tbody>
              {byDept.length === 0 && (
                <tr><td colSpan={5} className='py-6 text-center text-sm text-gray-400'>{t('Belum ada data.','No data yet.')}</td></tr>
              )}
              {byDept.map(d => (
                <tr key={d.dept} className='border-b border-gray-50 hover:bg-gray-50'>
                  <td className='py-2 px-3 font-medium text-gray-800'>{d.dept}</td>
                  <td className='py-2 px-3 text-center text-gray-600'>{d.total}</td>
                  <td className='py-2 px-3 text-center text-blue-600 font-semibold'>{d.active}</td>
                  <td className='py-2 px-3 text-center text-green-600 font-semibold'>{d.completed}</td>
                  <td className='py-2 px-3 text-center'>
                    <span className={`font-semibold ${d.avgPct >= 80 ? 'text-green-600' : d.avgPct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {d.avgPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {overdueList.length > 0 && (
        <div className='bg-white rounded-2xl shadow-sm border border-red-100 p-6'>
          <h2 className='text-sm font-bold text-red-700 mb-4'><Icon e='⚠' size={14} className='inline align-[-2px]' /> {t('Onboarding dengan Item Terlambat', 'Onboarding with Overdue Items')}</h2>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100'>
                  <th className='text-left py-2 px-3 text-xs font-semibold text-gray-500'>{t('Karyawan','Employee')}</th>
                  <th className='text-left py-2 px-3 text-xs font-semibold text-gray-500'>{t('Departemen','Department')}</th>
                  <th className='text-left py-2 px-3 text-xs font-semibold text-gray-500'>Supervisor</th>
                  <th className='text-center py-2 px-3 text-xs font-semibold text-gray-500'>{t('Item Terlambat','Overdue Items')}</th>
                  <th className='text-center py-2 px-3 text-xs font-semibold text-gray-500'>Progress</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map(ob => {
                  const prog = calcProgress(ob)
                  return (
                    <tr key={ob.id} className='border-b border-gray-50 hover:bg-red-50'>
                      <td className='py-2 px-3 font-medium text-gray-800'>{ob.employeeName}</td>
                      <td className='py-2 px-3 text-gray-600'>{ob.department}</td>
                      <td className='py-2 px-3 text-gray-600'>{ob.supervisorName}</td>
                      <td className='py-2 px-3 text-center'>
                        <span className='bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold'>
                          {ob.overdueCount}
                        </span>
                      </td>
                      <td className='py-2 px-3 text-center text-sm font-semibold text-gray-700'>
                        {prog.done}/{prog.total} ({prog.pct}%)
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {overdueList.length === 0 && active.length > 0 && (
        <div className='bg-green-50 border border-green-200 rounded-2xl p-5 text-center'>
          <p className='text-green-700 font-semibold text-sm'><Icon e='✓' size={14} className='inline align-[-2px]' /> {t('Tidak ada item yang terlambat saat ini.', 'No overdue items at the moment.')}</p>
        </div>
      )}
    </div>
  )
}
