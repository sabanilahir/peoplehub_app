'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useLanguageStore = create(
  persist(
    (set) => ({
      lang: 'id',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'hcm-language' }
  )
)

// Hook: returns t(id_string, en_string) → picks the right one
export const useT = () => {
  const { lang } = useLanguageStore()
  return (id, en) => lang === 'en' ? en : id
}
