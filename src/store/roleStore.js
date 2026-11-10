import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

export const ROLE_ICONS = {
  superadmin: '⚙️',
  hr_manager: '👔',
  hr: '🗂️',
  hr_officer: '📋',
  manager: '👥',
  supervisor: '🎖️',
  senior_staff: '⭐',
  staff: '👤',
  employee: '👤',
  director: '🏛️',
  finance: '💰',
}

export const DEFAULT_ROLES = [
  { id: 1, key: 'superadmin', name: 'superadmin', label: 'Superadmin', desc: 'Akses penuh ke semua fitur sistem', color: '#dc2626', icon: '⚙️', isSystem: true },
  { id: 2, key: 'hr_manager', name: 'hr_manager', label: 'HR Manager', desc: 'Manajer HR dengan akses penuh ke modul HR', color: '#2563eb', icon: '👔', isSystem: true },
  { id: 3, key: 'hr',         name: 'hr',         label: 'HR Staff',   desc: 'Staff HR dengan akses operasional HR', color: '#7c3aed', icon: '🗂️', isSystem: true },
  { id: 4, key: 'hr_officer', name: 'hr_officer', label: 'HR Officer', desc: 'Officer HR untuk operasional harian', color: '#0891b2', icon: '📋', isSystem: true },
  { id: 5, key: 'manager',    name: 'manager',    label: 'Manager',    desc: 'Manager dengan akses MSS dan tim', color: '#059669', icon: '👥', isSystem: true },
  { id: 6, key: 'supervisor', name: 'supervisor', label: 'Supervisor / Coordinator', desc: 'Supervisor & Koordinator tim dengan akses MSS', color: '#0891b2', icon: '🎖️', isSystem: true },
  { id: 7, key: 'senior_staff', name: 'senior_staff', label: 'Senior Staff', desc: 'Senior Staff operasional & lead teknis', color: '#6366f1', icon: '⭐', isSystem: true },
  { id: 8, key: 'staff',      name: 'staff',      label: 'Staff',      desc: 'Staff operasional dengan akses ESS', color: '#d97706', icon: '👤', isSystem: true },
  { id: 9, key: 'employee',   name: 'employee',   label: 'Employee',   desc: 'Karyawan umum dengan akses ESS', color: '#64748b', icon: '👤', isSystem: true },
]

export const useRoleStore = create(
  persist(
    (set, get) => ({
      roles: DEFAULT_ROLES,
      isLoading: false,
      error: null,

      fetchRoles: async () => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/roles')
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map(r => ({
              id: r.id,
              key: r.key || r.name,
              name: r.name || r.key,
              label: r.label,
              desc: r.desc || r.description || '',
              description: r.description || r.desc || '',
              color: r.color || '#666666',
              icon: ROLE_ICONS[r.key || r.name] || '🛡️',
              isSystem: !!r.isSystem,
              permissions: r.permissions || [],
            }))
            set({ roles: formatted, isLoading: false })
            return formatted
          }
        } catch (err) {
          console.warn('[useRoleStore] Gagal fetch roles dari API, menggunakan cache lokal:', err)
          set({ isLoading: false })
        }
        return get().roles
      },

      addRole: async (form) => {
        const key = (form.key || form.name || '').trim().toLowerCase()
        const label = (form.label || '').trim()
        const newRole = {
          id: Date.now(),
          key,
          name: key,
          label,
          desc: form.desc || form.description || '',
          color: form.color || '#3b82f6',
          icon: ROLE_ICONS[key] || '🛡️',
          isSystem: false,
        }

        // Optimistic update
        set(s => ({
          roles: [...s.roles.filter(r => r.key !== key), newRole]
        }))

        try {
          const res = await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRole),
          })
          if (res.ok) {
            const saved = await res.json()
            set(s => ({
              roles: s.roles.map(r => r.key === key ? { ...r, id: saved.id } : r)
            }))
          }
        } catch (e) {
          console.error('[useRoleStore] Gagal POST ke /api/roles:', e)
        }
        return newRole
      },

      updateRole: async (id, form) => {
        const key = (form.key || form.name || '').trim().toLowerCase()
        set(s => ({
          roles: s.roles.map(r => r.id === id ? {
            ...r,
            ...form,
            key: key || r.key,
            name: key || r.name,
            icon: ROLE_ICONS[key || r.key] || r.icon || '🛡️'
          } : r)
        }))

        try {
          await fetch(`/api/roles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        } catch (e) {
          console.error(`[useRoleStore] Gagal PUT ke /api/roles/${id}:`, e)
        }
      },

      deleteRole: async (id) => {
        set(s => ({
          roles: s.roles.filter(r => r.id !== id)
        }))

        try {
          await fetch(`/api/roles/${id}`, {
            method: 'DELETE',
          })
        } catch (e) {
          console.error(`[useRoleStore] Gagal DELETE ke /api/roles/${id}:`, e)
        }
      },

      getRole: (keyOrId) => {
        return get().roles.find(r => r.key === keyOrId || r.name === keyOrId || r.id === keyOrId)
      },
    }),
    {
      name: 'hcm-roles',
      storage: createJSONStorage(() => dbStorage),
    }
  )
)
