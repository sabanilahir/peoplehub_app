'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRecruitmentStore, isPublished } from '@/store/recruitmentStore'
import { useStructureStore } from '@/store/structureStore'
import { useBrandingStore } from '@/store/brandingStore'

// Public, unauthenticated job board — lives outside (protected), so it gets
// none of the app shell (sidebar/topbar/auth redirect). A requisition shows
// up here only when isPublished() says so: status 'Posted External' and
// inside its publish date window. "Lamar Sekarang" goes to a dedicated page
// (/careers/apply/[id]) rather than a modal — with 6+ mandatory documents
// the form is genuinely long and a modal just clips it.

function JobCard({ req, deptName, companyName, highlighted }) {
  return (
    <div id={`job-${req.id}`}
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${highlighted ? 'ring-2 ring-red-300' : 'ring-gray-100'}`}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-base font-bold text-gray-800'>{req.publicTitle || req.positionTitle}</h3>
          <p className='mt-1 text-sm text-gray-500'>{deptName} · {companyName}</p>
          <div className='mt-2 flex flex-wrap gap-2'>
            <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600'>{req.employmentType}</span>
            <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600'>{deptName}</span>
          </div>
          {req.jobDescription && (
            <p className='mt-3 max-w-xl whitespace-pre-wrap text-sm text-gray-500'>{req.jobDescription}</p>
          )}
        </div>
        <Link href={`/careers/apply/${req.id}`}
          className='shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md'
          style={{ background: 'linear-gradient(135deg,#052B52,#039299)' }}>
          Lamar Sekarang
        </Link>
      </div>
    </div>
  )
}

const BRAND = 'linear-gradient(135deg,#052B52,#039299)'
const isExternalLink = (url) => /^https?:\/\//i.test(url)

function CareersBody() {
  const params = useSearchParams()
  const highlightId = params.get('req') ? Number(params.get('req')) : null

  const { requisitions } = useRecruitmentStore()
  const { departments, companies } = useStructureStore()
  const {
    loginLogo, careerHeroImage, careerHeroTitle, careerHeroSubtitle,
    careerFooterImage, careerFooterText, careerNavLinks,
  } = useBrandingStore()

  const [mounted, setMounted] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => {
    setMounted(true)
    if (highlightId) {
      // Give the list a tick to render before scrolling to the deep-linked job.
      setTimeout(() => document.getElementById(`job-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
    }
  }, [highlightId])

  const live = requisitions.filter(r => isPublished(r))
  const deptName = (id) => departments.find(d => d.id === id)?.name || '—'
  const companyName = (id) => companies.find(c => c.id === id)?.name || '—'

  const needle = q.trim().toLowerCase()
  const shown = needle
    ? live.filter(r => `${r.id} ${r.publicTitle || r.positionTitle} ${deptName(r.departmentId)} ${companyName(r.companyId)}`.toLowerCase().includes(needle))
    : live

  // Guard against SSR/CSR hydration mismatch — these all come from a
  // persisted store, so the server always renders the store's initial
  // defaults while the client may rehydrate customized values.
  const navLinks = mounted ? careerNavLinks : []
  const heroImage = mounted ? careerHeroImage : null
  const heroTitle = mounted ? careerHeroTitle : 'Karir di Rans PeopleHub'
  const heroSubtitle = mounted ? careerHeroSubtitle : 'Temukan peluang karir yang sesuai untukmu.'
  const footerImage = mounted ? careerFooterImage : null
  const footerText = mounted ? careerFooterText : 'Rans PeopleHub — Human Capital Management System'

  const NavLink = ({ link, className }) => (
    isExternalLink(link.url)
      ? <a href={link.url} target='_blank' rel='noopener noreferrer' className={className}>{link.label}</a>
      : <a href={link.url} className={className}>{link.label}</a>
  )

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Sticky top nav */}
      <nav className='sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur'>
        <div className='mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5'>
          <div className='flex items-center gap-2.5'>
            <img src={mounted && loginLogo ? loginLogo : '/logos/Rans PeopleHub.png'} alt='' className='h-8 w-8 rounded-lg object-contain' />
            <span className='text-sm font-bold text-gray-800'>Rans PeopleHub</span>
          </div>
          <div className='flex items-center gap-5'>
            {navLinks.map(link => (
              <NavLink key={link.id} link={link} className='hidden text-sm font-medium text-gray-600 hover:text-teal-700 sm:inline' />
            ))}
            <a href='#lowongan'
              className='shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90'
              style={{ background: BRAND }}>
              Lihat Lowongan
            </a>
          </div>
        </div>
      </nav>

      {/* Hero banner */}
      <header className='relative overflow-hidden'
        style={heroImage
          ? { backgroundImage: `linear-gradient(135deg, rgba(5,43,82,.88), rgba(3,146,153,.82)), url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: BRAND }}>
        <div className='mx-auto max-w-3xl px-6 py-16 text-center sm:py-20'>
          <h1 className='text-3xl font-bold text-white sm:text-4xl'>{heroTitle}</h1>
          <p className='mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base'>{heroSubtitle}</p>
        </div>
      </header>

      <main id='lowongan' className='mx-auto max-w-3xl px-6 py-10'>
        {live.length > 0 && (
          <div className='relative mb-5'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'
              className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'>
              <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder='Cari posisi, departemen, atau perusahaan…'
              className='w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100' />
          </div>
        )}

        <p className='mb-5 text-sm font-medium text-gray-500'>
          {needle ? `${shown.length} dari ${live.length} lowongan cocok dengan pencarian.` : `${live.length} lowongan tersedia saat ini.`}
        </p>

        {live.length === 0 ? (
          <div className='rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100'>
            <p className='text-4xl'>🗂️</p>
            <p className='mt-3 font-semibold text-gray-700'>Belum ada lowongan terbuka saat ini.</p>
            <p className='mt-1 text-sm text-gray-400'>Silakan kembali lagi di lain waktu.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className='rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100'>
            <p className='text-4xl'>🔍</p>
            <p className='mt-3 font-semibold text-gray-700'>Tidak ada lowongan yang cocok.</p>
            <p className='mt-1 text-sm text-gray-400'>Coba kata kunci lain.</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {shown.map(req => (
              <JobCard key={req.id} req={req} deptName={deptName(req.departmentId)} companyName={companyName(req.companyId)}
                highlighted={req.id === highlightId} />
            ))}
          </div>
        )}
      </main>

      {/* Footer banner */}
      <footer className='relative mt-8 overflow-hidden'
        style={footerImage
          ? { backgroundImage: `linear-gradient(135deg, rgba(5,43,82,.9), rgba(3,146,153,.85)), url(${footerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: '#052B52' }}>
        <div className='mx-auto max-w-3xl px-6 py-10 text-center'>
          <p className='text-sm font-semibold text-white'>{footerText}</p>
          {navLinks.length > 0 && (
            <div className='mt-3 flex flex-wrap justify-center gap-4'>
              {navLinks.map(link => (
                <NavLink key={link.id} link={link} className='text-xs font-medium text-white/75 hover:text-white' />
              ))}
            </div>
          )}
          <p className='mt-4 text-[11px] text-white/50'>© {new Date().getFullYear()} Rans PeopleHub</p>
        </div>
      </footer>
    </div>
  )
}

export default function CareersPage() {
  return (
    <Suspense fallback={null}>
      <CareersBody />
    </Suspense>
  )
}
