'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { usePermissionStore } from '@/store/permissionStore'

export default function MssIndexPage() {
  const router = useRouter()
  const { currentUser } = useAuthStore()
  const { hasPermission } = usePermissionStore()

  useEffect(() => {
    const role = currentUser?.role || 'employee'
    if (hasPermission(role, 'mss_leave')) {
      router.replace('/mss/approve-leave')
    } else if (hasPermission(role, 'mss_attendance')) {
      router.replace('/mss/team-attendance')
    } else {
      router.replace('/mss/approve-leave')
    }
  }, [currentUser, hasPermission, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium">Mengarahkan ke modul MSS...</p>
      </div>
    </div>
  )
}
