import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const todayStr = () => new Date().toISOString().split('T')[0]

// Tracks which department notifications have been sent, per employee.
// Keyed by `${employeeId}:${deptKey}`.
export const useOffboardingNotifyStore = create(
  persist(
    (set, get) => ({
      // Demo seed: employee 93 fully notified (4/4, urgent case) and employee 96
      // partially notified (GA & IT → 2/4) so the monitor isn't a flat 0/4.
      sends: {
        '93:GA':  { status: 'Sent', scheduledDate: '2026-07-24', sentAt: '2026-07-05' },
        '93:IT':  { status: 'Sent', scheduledDate: '2026-07-24', sentAt: '2026-07-05' },
        '93:REM': { status: 'Sent', scheduledDate: '2026-07-24', sentAt: '2026-07-05' },
        '93:FIN': { status: 'Sent', scheduledDate: '2026-07-24', sentAt: '2026-07-05' },
        '96:GA':  { status: 'Sent', scheduledDate: '2026-08-24', sentAt: '2026-07-15' },
        '96:IT':  { status: 'Sent', scheduledDate: '2026-08-24', sentAt: '2026-07-15' },
      },

      getSend: (employeeId, dept) => get().sends[`${employeeId}:${dept}`] || null,

      markSent: (employeeId, dept, scheduledDate) =>
        set(s => ({
          sends: {
            ...s.sends,
            [`${employeeId}:${dept}`]: { status: 'Sent', scheduledDate: scheduledDate || '', sentAt: todayStr() },
          },
        })),

      markAllSent: (employeeId, depts, scheduledDate) =>
        set(s => {
          const next = { ...s.sends }
          const sentAt = todayStr()
          ;(depts || []).forEach(d => { next[`${employeeId}:${d}`] = { status: 'Sent', scheduledDate: scheduledDate || '', sentAt } })
          return { sends: next }
        }),

      resetSend: (employeeId, dept) =>
        set(s => {
          const next = { ...s.sends }
          delete next[`${employeeId}:${dept}`]
          return { sends: next }
        }),
    }),
    { name: 'hcm-offboarding-notify-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
