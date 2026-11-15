'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/store/languageStore'

const SUBPAGE_INFO = {
  'promote':                 { label: 'Promote', icon: '⬆️', desc: 'Kenaikan Posisi & Grade' },
  'transfer':                { label: 'Transfer', icon: '↔️', desc: 'Mutasi Internal' },
  'demote':                  { label: 'Demote', icon: '⬇️', desc: 'Penurunan Posisi' },
  'transfer-across-company': { label: 'Transfer Across Company', icon: '🏢', desc: 'Mutasi Lintas Perusahaan' },
  'terminate':               { label: 'Terminate', icon: '🚪', desc: 'Terminasi / Resign' },
  'rehire':                  { label: 'Rehire', icon: '🔄', desc: 'Perekrutan Kembali' },
  'change-employment-type':  { label: 'Change Employment Type', icon: '📋', desc: 'Ubah Jenis Kepegawaian' },
  'extend-contract':         { label: 'Extend Contract', icon: '📅', desc: 'Perpanjangan Kontrak' },
  'offboarding-monitor':     { label: 'Offboarding Monitor', icon: '🚪', desc: 'Exit Clearance & Tracking' },
  'offboarding-overview':    { label: 'Offboarding', icon: '🚪', desc: 'Portal Terpadu Karyawan Keluar' },
  'offboarding-approval':    { label: 'Persetujuan Offboarding', icon: '✅', desc: 'Antrean Persetujuan Resign' },
  'offboarding-checklist':   { label: 'Offboarding Checklist', icon: '📋', desc: 'Master Checklist Tugas' },
  'offboarding-auto-assign': { label: 'Auto Assign Offboarding', icon: '⚡', desc: 'Distribusi Checklist Otomatis' },
  'offboarding-notify':      { label: 'Departments to Notify', icon: '📨', desc: 'Notifikasi Departemen' },
  'exit-interview':          { label: 'Exit Interview', icon: '📝', desc: 'Wawancara Akhir Kerja' },
}

export default function PersonnelActionLayout({ children }) {
  const pathname = usePathname()
  const t = useT()

  // Hanya tampilkan top navigation bar jika sedang berada di dalam sub menu
  const isSubPage = pathname && pathname !== '/hr/employee/personnel-action' && pathname.startsWith('/hr/employee/personnel-action')

  const segments = pathname ? pathname.split('/').filter(Boolean) : []
  const currentSlug = segments[segments.length - 1] || ''
  const pageInfo = SUBPAGE_INFO[currentSlug] || {
    label: currentSlug.replace(/-/g, ' '),
    icon: '📄',
    desc: '',
  }

  return (
    <div className='relative'>
      {isSubPage && (
        <div className='bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 sm:px-8 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs'>
          {/* Sisi Kiri: Tombol Back & Breadcrumb */}
          <div className='flex items-center gap-3 min-w-0'>
            <Link
              href='/hr/employee/personnel-action'
              className='inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-red-700 bg-gray-100/90 hover:bg-red-50 hover:border-red-200 border border-gray-200 px-3.5 py-1.5 rounded-xl transition-all shadow-xs group flex-shrink-0'
            >
              <span className='group-hover:-translate-x-1 transition-transform font-bold text-sm leading-none'>←</span>
              <span>{t('Kembali ke Personnel Action', 'Back to Personnel Action')}</span>
            </Link>

            <span className='text-gray-300 hidden sm:inline select-none'>/</span>

            <div className='hidden sm:flex items-center gap-1.5 text-xs text-gray-600 truncate'>
              <span className='text-base leading-none'>{pageInfo.icon}</span>
              <span className='font-bold text-gray-900 capitalize'>{pageInfo.label}</span>
              {pageInfo.desc && (
                <span className='text-gray-400 text-[11px] font-normal hidden md:inline'>
                  ({pageInfo.desc})
                </span>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Pintasan ke Hub Utama */}
          <div className='flex items-center gap-3 text-xs'>
            <Link
              href='/hr/employee/personnel-action'
              className='hidden sm:inline-flex items-center gap-1.5 text-gray-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition'
            >
              <span>📋</span>
              <span>Personnel Action Hub</span>
            </Link>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
