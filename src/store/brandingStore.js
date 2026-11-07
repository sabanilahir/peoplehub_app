import { create } from "zustand"
import { persist } from "zustand/middleware"

export const DEFAULT_BRAND_LOGO = '/logos/san-logo.png'

const DEFAULT = {
  companyName: "San PeopleHub",
  iconColor: "#052B52",
  footerText: "© 2026 San PeopleHub. All rights reserved.",
  topbarLogo: '/logos/san-logo.png',
  loginLogo: '/logos/san-logo.png',
  favicon: null,
}

export const PRESET_THEMES = [
  { key: 'default', name: 'Default Corporate', gradient: 'linear-gradient(135deg, #052B52, #039299)' },
  { key: 'ramadan', name: 'Ramadan Kareem', gradient: 'linear-gradient(135deg, #0B3C2D, #D4AF37)' },
  { key: 'independence', name: 'HUT RI Merdeka', gradient: 'linear-gradient(135deg, #B91C1C, #DC2626)' },
  { key: 'newyear', name: 'Tahun Baru', gradient: 'linear-gradient(135deg, #1E1B4B, #6366F1)' },
]

export const BG_CONSTRAINTS = {
  maxWidth: 1920,
  maxHeight: 1080,
  maxSizeMB: 5,
  maxSizeBytes: 5 * 1024 * 1024,
  acceptedExt: '.png, .jpg, .jpeg, .webp',
  acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
}

export const LOGO_CONSTRAINTS = {
  maxWidth: 400,
  maxHeight: 200,
  maxSizeMB: 2,
  maxSizeBytes: 2 * 1024 * 1024,
  acceptedExt: ".png, .jpg, .jpeg, .svg, .webp",
  acceptedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
}

export const useBrandingStore = create(
  persist(
    (set) => ({
      ...DEFAULT,
      setCompanyName: (v) => set({ companyName: v }),
      setIconColor: (v) => set({ iconColor: v }),
      setFooterText: (v) => set({ footerText: v }),
      setTopbarLogo: (v) => set({ topbarLogo: v }),
      setLoginLogo: (v) => set({ loginLogo: v }),
      setFavicon: (v) => set({ favicon: v }),
      removeTopbarLogo: () => set({ topbarLogo: '/logos/san-logo.png' }),
      removeLoginLogo: () => set({ loginLogo: '/logos/san-logo.png' }),
      removeFavicon: () => set({ favicon: null }),
      reset: () => set(DEFAULT),
    }),
    {
      name: "hcm-branding",
      migrate: (persistedState) => {
        if (persistedState) {
          if (!persistedState.companyName || persistedState.companyName === 'Rans PeopleHub') {
            persistedState.companyName = 'San PeopleHub'
          }
          if (typeof persistedState.footerText === 'string') {
            persistedState.footerText = persistedState.footerText
              .replace(/Rans PeopleHub/g, 'San PeopleHub')
              .replace(/Â©/g, '©')
          }
          // Jika logo masih kosong atau merujuk ke logo lama, migrasikan ke san-logo.png
          if (!persistedState.topbarLogo || persistedState.topbarLogo.includes('manusistem') || persistedState.topbarLogo.includes('Rans')) {
            persistedState.topbarLogo = '/logos/san-logo.png'
          }
          if (!persistedState.loginLogo || persistedState.loginLogo.includes('manusistem') || persistedState.loginLogo.includes('Rans')) {
            persistedState.loginLogo = '/logos/san-logo.png'
          }
        }
        return persistedState
      },
      version: 2,
    }
  )
)
