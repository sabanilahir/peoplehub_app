'use client'
import { useState, useEffect } from 'react'
import { useBrandingStore } from '@/store/brandingStore'

export default function PsychotestPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { loginLogo } = useBrandingStore()
  
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Psikotes Online - Rans PeopleHub</h1>
      <img 
        src={mounted && loginLogo ? loginLogo : '/logos/Rans PeopleHub.png'} 
        alt="Logo" 
        style={{ height: 60, margin: '20px auto' }} 
      />
      <p>Logo dari branding store: {mounted && loginLogo ? 'YA' : 'TIDAK'}</p>
    </div>
  )
}