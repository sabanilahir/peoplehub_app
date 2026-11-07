'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const finishTimerRef = useRef(null)

  const startLoading = () => {
    clearTimeout(timerRef.current)
    clearTimeout(finishTimerRef.current)
    setLoading(true)
    setProgress(20)

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(timerRef.current)
          return 85
        }
        return prev + 15
      })
    }, 180)
  }

  const completeLoading = () => {
    clearInterval(timerRef.current)
    setProgress(100)
    finishTimerRef.current = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 250)
  }

  useEffect(() => {
    const handleDocumentClick = (e) => {
      const target = e.target.closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !target.getAttribute('target') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname
        if (href !== currentUrl && !href.startsWith('#')) {
          setTimeout(() => startLoading(), 0)
        }
      }
    }

    const handleCustomNavigate = () => {
      setTimeout(() => startLoading(), 0)
    }

    document.addEventListener('click', handleDocumentClick, false)
    window.addEventListener('app:navigate-start', handleCustomNavigate)
    return () => {
      document.removeEventListener('click', handleDocumentClick, false)
      window.removeEventListener('app:navigate-start', handleCustomNavigate)
      clearInterval(timerRef.current)
      clearTimeout(finishTimerRef.current)
    }
  }, [pathname])

  useEffect(() => {
    completeLoading()
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-200"
      style={{ opacity: loading || progress === 100 ? 1 : 0 }}
    >
      <div
        className="h-[3px] w-full transition-all duration-200 ease-out shadow-xs"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #D4AF37 0%, #039299 60%, #10b981 100%)',
          boxShadow: '0 0 10px rgba(212, 175, 55, 0.7), 0 0 5px rgba(3, 146, 153, 0.5)',
        }}
      />
    </div>
  )
}
