'use client'
import { useEffect } from 'react'
import { useBrandingStore, DEFAULT_BRAND_LOGO } from '@/store/brandingStore'

export default function DynamicFavicon() {
  const favicon = useBrandingStore((s) => s.favicon)
  const topbarLogo = useBrandingStore((s) => s.topbarLogo)
  const currentLogo = favicon || topbarLogo || DEFAULT_BRAND_LOGO

  useEffect(() => {
    if (!currentLogo || typeof document === 'undefined') return

    // Update existing icon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']")
    if (existingLinks.length > 0) {
      existingLinks.forEach(link => {
        link.href = currentLogo
      })
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = currentLogo
      document.head.appendChild(link)
    }
  }, [currentLogo])

  return null
}

