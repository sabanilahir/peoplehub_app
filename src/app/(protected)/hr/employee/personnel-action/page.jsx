'use client'
import Icon from '@/components/ui/Icon'
import Link from 'next/link'
import { usePersonnelActionStore, PA_ACTION_COLOR, PA_ACTION_ICON, PA_STATUS_COLOR } from '@/store/personnelActionStore'
import { useEmployeeStore } from '@/store/employeeStore'
import { useT } from '@/store/languageStore'

const ALL_ACTIONS = (t) => [
  { key: 'Promote',                href: 'promote',                desc: t('Kenaikan posisi & grade karyawan', 'Position & grade promotion'),             color: 'border-red-200 hover:border-red-400' },
  { key: 'Transfer',               href: 'transfer',               desc: t('Mutasi antar departemen (satu perusahaan)', 'Transfer within company'),        color: 'border-blue-200 hover:border-blue-400' },
  { key: 'Demote',                 href: 'demote',                 desc: t('Penurunan posisi atau grade karyawan', 'Position or grade demotion'),          color: 'border-orange-200 hover:border-orange-400' },
  { key: 'Transfer Across Company',href: 'transfer-across-company',desc: t('Mutasi lintas perusahaan dalam group', 'Transfer across group companies'),     color: 'border-indigo-200 hover:border-indigo-400' },
  { key: 'Terminate',              href: 'terminate',              desc: t('Pemutusan hubungan kerja & pengunduran diri (Resign)', 'Employment termination & Resignation'), color: 'border-red-200 hover:border-red-400' },
  { key: 'Rehire',                 href: 'rehire',                 desc: t('Rekrutmen kembali mantan karyawan', 'Re-hire former employee'),                color: 'border-green-200 hover:border-green-400' },
  { key: 'Change Employment Type', href: 'change-employment-type', desc: t('Ubah jenis kepegawaian (kontrak ↔ tetap)', 'Change employment type'),          color: 'border-cyan-200 hover:border-cyan-400' },
  { key: 'Extend Contract',        href: 'extend-contract',        desc: t('Perpanjangan masa berlaku kontrak kerja (PKWT)', 'Extend employment contract period'), color: 'border-teal-200 hover:border-teal-400' },
]

// Ditampilkan di dashboard Personnel Action: Hanya Terminate dan Extend Contract sesuai kebutuhan operasional
const ACTIONS = (t) => [
  { key: 'Terminate',              href: 'terminate',              desc: t('Pemutusan hubungan kerja & pengunduran diri (Resign)', 'Employment termination & Resignation'), color: 'border-red-200 hover:border-red-400' },
  { key: 'Extend Contract',        href: 'extend-contract',        desc: t('Perpanjangan masa berlaku kontrak kerja (PKWT)', 'Extend employment contract period'), color: 'border-teal-200 hover:border-teal-400' },
]

export default function PersonnelActionIndex() {
  const t = useT()
  const { pas }      = usePersonnelActionStore()
  const { employees } = useEmployeeStore()

  // Hanya perhitungkan dan tampilkan aksi Terminate dan Extend Contract
  const relevantPas = pas.filter(p => ['Terminate', 'Extend Contract'].includes(p.action))
  const total   = relevantPas.length
  const draft   = relevantPas.filter(p => p.status === 'Draft').length
  const pending = relevantPas.filter(p => p.status === 'Submitted').length
  const applied = relevantPas.filter(p => p.status === 'Applied').length

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-gradient-to-r from-violet-700 to-red-600 text-white px-8 py-6'>
        <h1 className='text-2xl font-bold'>Personnel Action</h1>
        <p className='text-violet-200 text-sm mt-0.5'>Employee Movement — {t('pilih jenis aksi yang ingin diproses (Terminate / Extend Contract)', 'select action type to process (Terminate / Extend Contract)')}</p>
      </div>

      {/* Action cards: Terminate & Extend Contract */}
      <div className='px-8 py-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {ACTIONS(t).map(a => {
            const count = pas.filter(p => p.action === a.key).length
            const draftCount = pas.filter(p => p.action === a.key && p.status === 'Draft').length
            const submittedCount = pas.filter(p => p.action === a.key && p.status === 'Submitted').length
            return (
              <Link key={a.key} href={`/hr/employee/personnel-action/${a.href}`}
                className={`bg-white rounded-2xl border-2 ${a.color} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-6 flex flex-col gap-4 group`}>
                <div className='flex items-start justify-between'>
                  <span className='text-4xl group-hover:scale-105 transition-transform'>{PA_ACTION_ICON[a.key]}</span>
                  <div className='flex flex-col items-end gap-1'>
                    {draftCount > 0 && <span className='text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full border border-gray-200'>{draftCount} draft</span>}
                    {submittedCount > 0 && <span className='text-xs font-semibold bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full border border-yellow-200'>{submittedCount} pending</span>}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block mb-2 ${PA_ACTION_COLOR[a.key]}`}>{a.key}</span>
                  <p className='text-xs text-gray-500 leading-relaxed'>{a.desc}</p>
                </div>
                <div className='flex items-center justify-between mt-auto pt-3 border-t border-gray-100'>
                  <p className='text-2xl font-bold text-gray-900'>{count} <span className='text-sm font-normal text-gray-400'>PA</span></p>
                  <span className='text-xs font-semibold text-gray-500 group-hover:text-red-600 flex items-center gap-1 transition-colors'>
                    {t('Kelola', 'Manage')} →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Offboarding quick shortcuts */}
      <div className='px-8 grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Link href='/hr/employee/personnel-action/offboarding-overview?tab=monitor'
          className='flex items-center gap-4 bg-white rounded-2xl border-2 border-red-200 hover:border-red-400 shadow-sm hover:shadow-md transition-all p-5 group'>
          <span className='p-3 bg-red-50 text-red-600 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center'>
            <Icon e='userMinus' size={24} />
          </span>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <p className='font-bold text-gray-900'>{t('Offboarding Monitor & Exit Clearance', 'Offboarding Monitor & Exit Clearance')}</p>
              <span className='text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded'>HR / GA</span>
            </div>
            <p className='text-xs text-gray-500 mt-1 line-clamp-2'>{t('Pantau progres clearance karyawan keluar, pengembalian aset, dan terbitkan Paklaring / Surat Pengalaman Kerja.', 'Monitor employee exit clearance, asset returns, and issue experience certificates.')}</p>
          </div>
          <span className='text-red-600 text-sm font-semibold whitespace-nowrap'>{t('Pantau', 'Monitor')} →</span>
        </Link>

        <Link href='/hr/employee/personnel-action/offboarding-checklist'
          className='flex items-center gap-4 bg-white rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all p-5 group'>
          <span className='p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center'>
            <Icon e='clipboardList' size={24} />
          </span>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <p className='font-bold text-gray-900'>{t('Master Offboarding Checklist', 'Master Offboarding Checklist')}</p>
              <span className='text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded'>Config</span>
            </div>
            <p className='text-xs text-gray-500 mt-1 line-clamp-2'>{t('Kelola daftar butir checklist serah terima departemen HR, IT, GA, dan Finance.', 'Manage checklist items for HR, IT, GA, and Finance departments.')}</p>
          </div>
          <span className='text-indigo-600 text-sm font-semibold whitespace-nowrap'>{t('Kelola', 'Manage')} →</span>
        </Link>
      </div>

      {/* Recent activity */}
      <div className='px-8 pb-8 pt-6'>
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
          <div className='px-5 py-4 border-b border-gray-50 flex items-center justify-between'>
            <p className='font-bold text-gray-900'>{t('Aktivitas Terbaru', 'Recent Activity')}</p>
            <p className='text-xs text-gray-400'>{t('10 PA terakhir', 'Last 10 PA')}</p>
          </div>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 border-b'>
                {['PA Number', t('Karyawan','Employee'), 'Action', 'Effective Date', 'Status', t('Dibuat','Created')].map(h => (
                  <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {relevantPas.length === 0 ? (
                <tr><td colSpan={6} className='text-center py-10 text-gray-400 text-sm'>{t('Belum ada data Terminate atau Extend Contract', 'No Terminate or Extend Contract actions yet')}</td></tr>
              ) : [...relevantPas].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map(pa => {
                const e = employees.find(x => x.id === pa.employeeId)
                const act = ALL_ACTIONS(t).find(x => x.key === pa.action)
                return (
                  <tr key={pa.id} className='hover:bg-gray-50/50'>
                    <td className='px-4 py-3'>
                      <Link href={`/hr/employee/personnel-action/${act?.href || ''}`}
                        className='font-mono text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded hover:bg-violet-100 transition-colors'>
                        {pa.paNumber}
                      </Link>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='font-medium text-gray-800'>{e?.name || '—'}</span>
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PA_ACTION_COLOR[pa.action] || 'bg-gray-100 text-gray-600'}`}>
                        {pa.action}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-600'>{pa.effectiveDate || '—'}</td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PA_STATUS_COLOR[pa.status] || ''}`}>{pa.status}</span>
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-400'>{pa.createdAt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
