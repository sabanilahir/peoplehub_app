'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function PageLoadingOverlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const currentPathRef = useRef(pathname)
  const safetyTimerRef = useRef(null)
  const finishTimerRef = useRef(null)

  const startLoading = () => {
    clearTimeout(safetyTimerRef.current)
    clearTimeout(finishTimerRef.current)
    setLoading(true)

    // Safety timeout: jika navigasi berhenti/batal, tutup setelah 20 detik (cukup untuk JIT compile dev mode)
    safetyTimerRef.current = setTimeout(() => {
      setLoading(false)
    }, 20000)
  }

  const finishLoading = () => {
    // Jeda visual 250ms agar transisi terlihat manis dan tidak berkedip
    finishTimerRef.current = setTimeout(() => {
      setLoading(false)
      clearTimeout(safetyTimerRef.current)
    }, 250)
  }

  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Cari elemen link terdekat
      const link = e.target.closest('a')
      if (!link) return

      const href = link.getAttribute('href')
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !link.getAttribute('target') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentPath = window.location.pathname
        if (href !== currentPath && !href.startsWith('#')) {
          // Jadwalkan di event loop berikutnya agar tidak menginterupsi navigasi Next.js Link
          setTimeout(() => startLoading(), 0)
        }
      }
    }

    const handleCustomNavigate = () => {
      setTimeout(() => startLoading(), 0)
    }

    // Gunakan bubbling (false), bukan capture phase (true)!
    document.addEventListener('click', handleDocumentClick, false)
    window.addEventListener('app:navigate-start', handleCustomNavigate)

    return () => {
      document.removeEventListener('click', handleDocumentClick, false)
      window.removeEventListener('app:navigate-start', handleCustomNavigate)
      clearTimeout(safetyTimerRef.current)
      clearTimeout(finishTimerRef.current)
    }
  }, [])

  // Selesai saat pathname berubah (rute baru berhasil masuk)
  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      currentPathRef.current = pathname
      finishLoading()
    }
  }, [pathname, searchParams])

  if (!loading) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-white/75 backdrop-blur-[2px] pointer-events-none transition-all duration-200 animate-in fade-in"
      style={{
        paddingTop: 64, // di bawah header topbar
        paddingLeft: 56, // di sebelah kanan sidebar
      }}
    >
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white shadow-xl border border-gray-100 max-w-xs w-full mx-4 text-center pointer-events-none animate-in zoom-in-95 duration-150">
        {/* Animated Rings & Logo */}
        <div className="relative flex items-center justify-center w-16 h-16 mb-3">
          {/* Ring emas luar */}
          <div className="absolute inset-0 rounded-full border-3 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
          
          {/* Ring teal dalam */}
          <div
            className="absolute inset-1.5 rounded-full border-2 border-[#039299]/20 border-b-[#039299] animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}
          />

          {/* Logo brand di tengah */}
          <div className="relative z-10 w-8 h-8 flex items-center justify-center">
            <img
              src="/logos/san-logo.png"
              alt="Logo"
              className="w-full h-full object-contain drop-shadow-xs animate-pulse"
            />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-800 tracking-tight">
            Memuat Halaman...
          </p>
          <p className="text-xs text-gray-400">
            Menyiapkan tampilan & data menu.
          </p>
        </div>

        {/* Shimmer progress bar */}
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-4">
          <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] via-[#039299] to-[#D4AF37] animate-[shimmer_1.4s_infinite]" />
        </div>
      </div>
    </div>
  )
}
