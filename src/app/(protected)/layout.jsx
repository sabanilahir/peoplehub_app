'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DynamicSidebar from '@/components/layout/DynamicSidebar'
import GlobalSearch from '@/components/layout/GlobalSearch'
import NotificationBell from '@/components/layout/NotificationBell'
import EmergencySosButton from '@/components/layout/EmergencySosButton'
import Toast from '@/components/layout/Toast'
import NavigationProgressBar from '@/components/layout/NavigationProgressBar'
import PageLoadingOverlay from '@/components/layout/PageLoadingOverlay'
import { useBrandingStore } from '@/store/brandingStore'
import { roleLabel } from '@/constants/roles'
import { runStateBackfill } from '@/lib/stateBackfill'

const topbarHeight = 64

export default function ProtectedLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentUser, logout, _hydrated } = useAuthStore()
  const { companyName, topbarLogo } = useBrandingStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      try {
        // Bebaskan kuota localStorage dari bloat data lama
        localStorage.removeItem('hcm-emergency-sos-v1')
        const toRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k !== 'hcm-auth' && k !== 'hcm-user') {
            const val = localStorage.getItem(k)
            if (val && val.length > 200000) {
              toRemove.push(k)
            }
          }
        }
        toRemove.forEach(k => localStorage.removeItem(k))
      } catch (e) {}
    }
  }, [])

  // Double-check session from localStorage if memory is still hydrating
  useEffect(() => {
    if (!mounted) return

    if (!currentUser && typeof window !== 'undefined') {
      try {
        const rawUser = localStorage.getItem('hcm-user')
        if (rawUser) {
          const u = JSON.parse(rawUser)
          if (u && u.id) {
            useAuthStore.setState({ currentUser: u, _hydrated: true })
            return
          }
        }
        const rawAuth = localStorage.getItem('hcm-auth')
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth)
          if (parsed?.state?.currentUser) {
            useAuthStore.setState({ currentUser: parsed.state.currentUser, _hydrated: true })
            return
          }
        }
      } catch (e) {}

      // Jika benar-benar tidak ada sesi setelah jeda singkat, arahkan ke login
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().currentUser) {
          router.replace('/login')
        }
      }, 400)
      return () => clearTimeout(timer)
    }

    if (currentUser) {
      runStateBackfill()
    }
  }, [currentUser, mounted])

  // Cek active user dari store atau synchronous localStorage hanya jika sudah mounted
  const activeUser = currentUser || (mounted && typeof window !== 'undefined' ? (() => {
    try {
      const u = localStorage.getItem('hcm-user')
      return u ? JSON.parse(u) : null
    } catch (e) { return null }
  })() : null)

  // Verifikasi izin akses rute (Route Guarding)
  useEffect(() => {
    if (!mounted || !activeUser) return
    const role = activeUser.role || 'employee'
    if (role === 'superadmin') return

    // Route umum yang selalu bebas diakses oleh semua pengguna login
    const isCommonRoute = pathname === '/dashboard' || pathname === '/preferences' || pathname === '/change-password'
    if (isCommonRoute) return

    // Proteksi rute Sysadmin:
    // - superadmin: Akses penuh ke seluruh sub-rute /sysadmin
    // - hr_manager: Diizinkan mengakses modul kebijakan kerja & cuti (work-location & leave-workflow)
    if (pathname.startsWith('/sysadmin')) {
      const isHrAllowedSysadminRoute =
        pathname.startsWith('/sysadmin/settings/work-location') ||
        pathname.startsWith('/sysadmin/leave-workflow')

      if (role === 'superadmin') {
        // Full access
      } else if (role === 'hr_manager' && isHrAllowedSysadminRoute) {
        // Diizinkan khusus kebijakan HR
      } else {
        router.replace('/dashboard')
        return
      }
    }

    // Proteksi rute MSS (khusus manager, hr_manager, superadmin)
    if (pathname.startsWith('/mss') && !['manager', 'hr_manager', 'superadmin'].includes(role)) {
      router.replace('/dashboard')
      return
    }

    // Proteksi rute HR (khusus role hr, hr_officer, hr_manager, superadmin)
    if (pathname.startsWith('/hr') && !['hr', 'hr_officer', 'hr_manager', 'superadmin'].includes(role)) {
      router.replace('/dashboard')
      return
    }
  }, [pathname, activeUser, mounted, router])

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  if (!mounted || !activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-500">Memverifikasi sesi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationProgressBar />
      <PageLoadingOverlay />
      <header
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 border-b border-[#04203d] shadow-sm text-white"
        style={{
          height: topbarHeight,
          background: 'linear-gradient(90deg, #052B52 0%, #064273 60%, #039299 100%)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src={topbarLogo || '/logos/san-logo.png'}
              alt={companyName || 'Logo'}
              className="h-9 w-auto max-w-[130px] object-contain rounded bg-white/95 p-0.5 shadow-xs"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fb = document.getElementById('brand-initial-fallback')
                if (fb) fb.style.display = 'flex'
              }}
            />
            <div
              id="brand-initial-fallback"
              className="w-8 h-8 rounded-lg items-center justify-center font-bold text-[#052B52] bg-white shadow-sm text-sm"
              style={{ display: 'none' }}
            >
              {(companyName || 'HCM')[0]?.toUpperCase()}
            </div>
            <span className="font-bold text-white text-base tracking-tight hidden md:block">
              {companyName === 'Rans PeopleHub' ? 'San PeopleHub' : (companyName || 'San PeopleHub')}
            </span>
          </div>
          <div className="hidden md:block">
            <GlobalSearch />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <NotificationBell />
          {/* EmergencySosButton disembunyikan sesuai permintaan */}
          {/* <EmergencySosButton /> */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition text-white"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#052B52] bg-white shadow-sm">
                {(activeUser?.name || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{activeUser?.name}</div>
                <div className="text-[11px] text-teal-200 capitalize leading-tight">{roleLabel(activeUser?.role)}</div>
              </div>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl py-1.5 z-50 border border-gray-100 text-gray-700">
                <button onClick={() => { setUserMenuOpen(false); router.push('/preferences') }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Preferensi Beranda</button>
                <button onClick={() => { setUserMenuOpen(false); router.push('/change-password') }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Ganti Password</button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Keluar</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-64px)]" style={{ paddingTop: topbarHeight, paddingLeft: 56 }}>
        <DynamicSidebar />
        <main className="flex-1 px-6 py-6 w-full">
          {children}
        </main>
      </div>
      <Toast />
    </div>
  )
}
