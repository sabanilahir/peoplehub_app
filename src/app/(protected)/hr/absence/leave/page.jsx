'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AbsenceLeaveRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/hr/apply-leave')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gray-500">Mengarahkan ke Manajemen Cuti...</p>
      </div>
    </div>
  )
}

