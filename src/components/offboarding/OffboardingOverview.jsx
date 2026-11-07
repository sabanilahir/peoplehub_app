'use client'
import { useState } from 'react'
import { useT } from '@/store/languageStore'
import OffboardingApproval from '@/components/offboarding/OffboardingApproval'
import OffboardingMonitor  from '@/components/offboarding/OffboardingMonitor'

const svg = (children, size = 16) => (props) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor'
    strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...props}>{children}</svg>
)
const IcCheck = svg(<><path d='M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' /><circle cx='8.5' cy='7' r='4' /><polyline points='17 11 19 13 23 9' /></>)
const IcGauge = svg(<><path d='M12 2a10 10 0 0110 10' /><path d='M12 2A10 10 0 002 12' /><path d='M12 12l4.5-4.5' /><circle cx='12' cy='12' r='2' /></>)

/**
 * Single entry-point that unifies "Persetujuan Offboarding" (approvals) and
 * "Offboarding Monitor" under one menu, switchable by a tab — so HR has fewer
 * offboarding menu items to hop between.
 */
export default function OffboardingOverview({ initialTab = 'approval' }) {
  const t = useT()
  const [tab, setTab] = useState(initialTab)

  const tabs = [
    { id: 'approval', label: t('Persetujuan Offboarding', 'Offboarding Approval'), icon: <IcCheck /> },
    { id: 'monitor',  label: t('Offboarding Monitor', 'Offboarding Monitor'),      icon: <IcGauge /> },
  ]

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-6 pt-8'>
        <div className='inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm'>
          {tabs.map(x => (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === x.id ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
              {x.icon} {x.label}
            </button>
          ))}
        </div>
      </div>
      {/* Each panel renders its own full-page layout below the tab bar */}
      <div className='-mt-2'>
        {tab === 'approval' ? <OffboardingApproval /> : <OffboardingMonitor />}
      </div>
    </div>
  )
}
