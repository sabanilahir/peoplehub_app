'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useBrandingStore } from '@/store/brandingStore'
import { TALENT_ONLY_ROLES } from '@/constants/roles'
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [fieldErr, setFieldErr] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { login } = useAuthStore()
  const { loginLogo, companyName, footerText } = useBrandingStore()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const cleanU = String(username || '').trim()
    const cleanP = String(password || '').trim()

    const errs = {
      username: cleanU ? '' : 'Silakan masukkan username Anda',
      password: cleanP ? '' : 'Silakan masukkan password Anda',
    }
    setFieldErr(errs)
    if (errs.username || errs.password) return

    setLoading(true)
    setError('')

    try {
      const ok = await login(cleanU, cleanP)
      if (ok) {
        const currentUser = useAuthStore.getState().currentUser
        const role = currentUser?.role
        const userDept = String(currentUser?.dept || '')

        const RESTRICTED_HOME = {
          learning: '/hr/learning/certificate',
          ob_admin: '/hr/onboarding/tracker',
          ob_manager: '/mss/approve-onboarding',
          ob_employee: '/ess/onboarding',
          of_admin: '/hr/employee/personnel-action/offboarding-monitor',
          of_manager: '/mss/offboarding',
          of_employee: '/ess/offboarding',
        }

        let dest =
          RESTRICTED_HOME[role] ??
          (TALENT_ONLY_ROLES.includes(role) ? '/hr/talent/key-position' : '/dashboard')

        // Jika host livestream login, arahkan langsung ke portal livestream
        if (userDept.toLowerCase().includes('livestream')) {
          dest = '/ess/livestream'
        }

        // Simpan cookie dan localStorage secara sinkron & eksplisit
        document.cookie = 'hcm-auth=1; path=/; max-age=86400'
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('hcm-user', JSON.stringify(currentUser))
            localStorage.setItem('hcm-auth', JSON.stringify({ state: { currentUser, realUser: null }, version: 0 }))
          } catch (e) {}
        }

        window.location.href = dest
      } else {
        setError('Username atau password salah. Silakan periksa kembali.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Terjadi kendala saat login: ' + err.message)
      setLoading(false)
    }
  }

  const brandName = companyName === 'Rans PeopleHub' ? 'San PeopleHub' : (companyName || 'San PeopleHub')

  return (
    <div className='relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 overflow-hidden'>
      {/* 1. Full Page Background Image (Luxury Beauty Theme) */}
      <img
        src='/logos/san-beauty-bg.jpg'
        alt='Background'
        className='fixed inset-0 h-full w-full object-cover object-center select-none pointer-events-none'
      />
      {/* Dynamic Overlay Gradient */}
      <div className='fixed inset-0 bg-gradient-to-tr from-stone-950/80 via-stone-900/55 to-rose-950/45 backdrop-blur-[1px]' />

      {/* 2. Main Login Container */}
      <div className='relative z-10 w-full max-w-[420px] flex flex-col items-center my-auto'>
        <div className='w-full rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-white/50 overflow-hidden'>
          {/* Top Brand Accent Line - Gold to Rose Gold to Burgundy */}
          <div
            className='h-1.5 w-full'
            style={{
              background: 'linear-gradient(90deg, #D4AF37 0%, #E5A89B 50%, #87233D 100%)',
            }}
          />

          <div className='p-6 sm:p-8'>
            {/* Logo */}
            <div className='mb-4 flex justify-center'>
              <img
                src={mounted && loginLogo ? loginLogo : '/logos/san-logo.png'}
                alt={brandName}
                className='h-18 sm:h-20 max-w-[220px] w-auto object-contain drop-shadow-sm transition-transform duration-200'
              />
            </div>

            {/* Greeting Header */}
            <div className='mb-6 text-center space-y-1'>
              <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-gray-900'>
                Selamat Datang
              </h1>
              <p className='text-xs sm:text-sm text-gray-500 font-medium'>
                Masuk ke sistem {brandName}
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleLogin} action='#' method='POST' className='space-y-4'>
              {/* Username Input */}
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1.5'>
                  Username
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400'>
                    <User className='w-4 h-4' />
                  </div>
                  <input
                    type='text'
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setFieldErr((p) => ({ ...p, username: '' }))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleLogin(e)
                      }
                    }}
                    placeholder='Masukkan username Anda'
                    disabled={loading}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition duration-150 border ${
                      fieldErr.username
                        ? 'border-red-400 bg-red-50/50'
                        : 'border-gray-200 bg-gray-50/50 focus:border-[#C59B27] focus:bg-white focus:ring-4 focus:ring-amber-500/10'
                    }`}
                  />
                </div>
                {fieldErr.username && (
                  <p className='text-xs font-medium text-red-500 mt-1 pl-1'>{fieldErr.username}</p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='block text-xs font-semibold text-gray-700'>
                    Password
                  </label>
                </div>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400'>
                    <Lock className='w-4 h-4' />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setFieldErr((p) => ({ ...p, password: '' }))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleLogin(e)
                      }
                    }}
                    placeholder='Masukkan password Anda'
                    disabled={loading}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition duration-150 border ${
                      fieldErr.password
                        ? 'border-red-400 bg-red-50/50'
                        : 'border-gray-200 bg-gray-50/50 focus:border-[#C59B27] focus:bg-white focus:ring-4 focus:ring-amber-500/10'
                    }`}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPass((v) => !v)}
                    className='absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition'
                  >
                    {showPass ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </button>
                </div>
                {fieldErr.password && (
                  <p className='text-xs font-medium text-red-500 mt-1 pl-1'>{fieldErr.password}</p>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className='rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2'>
                  <span className='h-1.5 w-1.5 rounded-full bg-red-500 shrink-0' />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button - Luxury Burgundy & Warm Gold */}
              <button
                type='button'
                onClick={handleLogin}
                disabled={loading}
                className='w-full mt-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:opacity-95 transform active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer'
                style={{
                  background: 'linear-gradient(135deg, #4A1525 0%, #7A1C38 55%, #B8860B 100%)',
                }}
              >
                <span>{loading ? 'Sedang Memproses...' : 'Masuk ke Sistem'}</span>
                {!loading && <ArrowRight className='w-4 h-4' />}
              </button>
            </form>
          </div>
        </div>

        {/* Footer / Copyright di bawah kartu */}
        <div className='mt-6 text-center'>
          <p className='text-xs text-white/75 font-medium drop-shadow-sm'>
            {mounted && footerText
              ? footerText.replace(/Rans PeopleHub/g, 'San PeopleHub').replace(/Â©/g, '©')
              : `© 2026 ${brandName}. All rights reserved.`}
          </p>
        </div>
      </div>
    </div>
  )
}
