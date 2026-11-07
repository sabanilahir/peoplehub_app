import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persist as dbPersist } from '@/lib/persist'

// Seed users (fallback only when DB is unavailable)
const FALLBACK_SEED_USERS = [
  { id:1,  username:'employee',  password:'pass123', name:'Budi Santoso',     role:'employee',   dept:'Engineering',    position:'Software Engineer',        email:'budi@testing.com',    employeeId: 1 },
  { id:2,  username:'manager',   password:'pass123', name:'Dewi Rahayu',      role:'hr_manager', dept:'HR',             position:'HR Manager',               email:'dewi@testing.com',    employeeId: 2 },
  { id:3,  username:'hr',        password:'pass123', name:'Rina Marlina',     role:'hr',         dept:'HR',             position:'HR Specialist',            email:'rina@testing.com',    employeeId: 3 },
  { id:4,  username:'admin',     password:'pass123', name:'Ahmad Fauzi',      role:'superadmin', dept:'IT',             position:'System Administrator',     email:'ahmad@testing.com',   employeeId: 4 },
  { id:5,  username:'hrmanager', password:'pass123', name:'Dewi Rahayu (HR Manager)', role:'hr_manager', dept:'HR',    position:'HR Manager',               email:'hrmanager@testing.com', employeeId: 2 },
  { id:6,  username:'generalmanager', password:'pass123', name:'Ronny Daeng', role:'manager',    dept:'Operations',    position:'Operations Manager',       email:'ronny@testing.com',   employeeId: 300143 },
  { id:300023, username:'melly', password:'password123', name:'Melly', role:'employee', dept:'Livestream', position:'Live Stream Host', email:'melly@testing.com', employeeId: 300023 },
  { id:300024, username:'sevia', password:'password123', name:'Sevia', role:'employee', dept:'Livestream', position:'Live Stream Host', email:'sevia@testing.com', employeeId: 300024 },
  { id:300025, username:'romi',  password:'password123', name:'Romi',  role:'employee', dept:'Livestream', position:'Live Stream Host', email:'romi@testing.com',  employeeId: 300025 },
  { id:300026, username:'rizki', password:'password123', name:'Rizki', role:'employee', dept:'Livestream', position:'Live Stream Host', email:'rizki@testing.com', employeeId: 300026 },
  { id:300027, username:'cecil', password:'password123', name:'Cecil', role:'employee', dept:'Livestream', position:'Live Stream Host', email:'cecil@testing.com', employeeId: 300027 },
  { id:300028, username:'mella', password:'password123', name:'Mella', role:'employee', dept:'Livestream', position:'Live Stream Host', email:'mella@testing.com', employeeId: 300028 },
  { id:200001, username:'odoo-1', password:'pass123', name:'Sample Employee', role:'employee', dept:'General', position:'Staff', email:'odoo1@testing.com', employeeId: 300021 },
]

export const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      realUser:    null,
      userList: [],
      _hydrated: false,

      setHydrated: () => set({ _hydrated: true }),

      login: async (username, password) => {
        const uClean = String(username || '').trim().toLowerCase()
        const pClean = String(password || '').trim()

        if (!uClean || !pClean) return false

        // 1. Cek userList dari state + fallback seed users (cocokkan username ATAU email)
        const dbUsers = get().userList || []
        const allUsers = [...dbUsers, ...FALLBACK_SEED_USERS]

        let user = allUsers.find(
          u => (String(u.username || '').trim().toLowerCase() === uClean || String(u.email || '').trim().toLowerCase() === uClean) &&
               String(u.password || '').trim() === pClean
        )

        // 2. Jika belum ketemu di memori lokal, fetch langsung dari DB (/api/users)
        if (!user && typeof window !== 'undefined') {
          try {
            const res = await fetch('/api/users')
            if (res.ok) {
              const rows = await res.json()
              if (Array.isArray(rows) && rows.length > 0) {
                set({ userList: rows })
                user = rows.find(
                  u => (String(u.username || '').trim().toLowerCase() === uClean || String(u.email || '').trim().toLowerCase() === uClean) &&
                       String(u.password || '').trim() === pClean
                )
              }
            }
          } catch (e) {
            console.error('[AuthStore] Login fetch users error:', e)
          }
        }

        if (!user) return false

        if (typeof document !== 'undefined') {
          document.cookie = 'hcm-auth=1; path=/; max-age=86400'
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('hcm-user', JSON.stringify(user))
            localStorage.setItem('hcm-auth', JSON.stringify({ state: { currentUser: user, realUser: null }, version: 0 }))
          } catch (e) {}
        }

        set({ currentUser: user, realUser: null, _hydrated: true })
        return true
      },

      logout: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'hcm-auth=; path=/; max-age=0'
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('hcm-user')
            localStorage.removeItem('hcm-auth')
          } catch (e) {}
        }
        set({ currentUser: null, realUser: null })
      },

      startProxy: (targetUser) => {
        const real = get().realUser || get().currentUser
        set({ realUser: real, currentUser: targetUser })
      },

      endProxy: () => {
        const real = get().realUser
        if (real) set({ currentUser: real, realUser: null })
      },

      addUser: (u) => { set(s => ({ userList: [...s.userList, u] })); dbPersist('/api/users', 'POST', u) },
      updateUser: (id, d) => { set(s => ({ userList: s.userList.map(u => u.id===id ? {...u,...d} : u) })); dbPersist(`/api/users/${id}`, 'PUT', d) },
      deleteUser: (id) => { set(s => ({ userList: s.userList.filter(u => u.id !== id) })); dbPersist(`/api/users/${id}`, 'DELETE') },

      createEmployeeWithUser: async (formData) => {
        const { name, email, department, position, role, nik, password } = formData
        
        let empId
        try {
          const empRes = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name || '',
              nik: nik || `EMP-${Date.now()}`,
              email: email || '',
              department: department || '',
              position: position || '',
              status: 'Active',
              role: role || 'employee',
              imported_from: 'manual',
            })
          })
          
          if (empRes.ok) {
            const emp = await empRes.json()
            empId = emp.id
          }
        } catch (e) {
          console.error('[AuthStore] Failed to create employee:', e)
        }

        if (!empId) {
          const maxId = get().userList.reduce((m, u) => Math.max(m, u.id || 0), 0)
          empId = maxId + 1
        }

        const maxId = get().userList.reduce((m, u) => Math.max(m, u.id || 0), 0)
        const newUser = {
          id: maxId + 1,
          username: nik || `USER-${Date.now()}`,
          password: password || 'pass123',
          name: name || '',
          role: role || 'employee',
          dept: department || '',
          position: position || '',
          email: email || '',
          employeeId: empId,
          imported_from: 'manual',
        }
        
        get().addUser(newUser)
        return { success: true, user: newUser, employeeId: empId }
      },

      bulkCreateEmployeesWithUsers: async (list) => {
        const results = []
        for (const item of list) {
          try {
            const result = await get().createEmployeeWithUser(item)
            results.push({ success: true, ...result })
          } catch (e) {
            results.push({ success: false, error: e.message, data: item })
          }
        }
        return results
      },
    }),
    {
      name: 'hcm-auth',
      partialize: (s) => ({ currentUser: s.currentUser, realUser: s.realUser }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)

// Hydrate users from PostgreSQL database
if (typeof window !== 'undefined' && !window.__kpbUsersLoaded) {
  window.__kpbUsersLoaded = true
  
  const load = async () => {
    try { 
      const r = await fetch('/api/users'); 
      if (r.ok) { 
        const rows = await r.json(); 
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map(e => ({
            ...e,
            importedFrom: e.imported_from,
            odooId: e.odoo_id,
          }))
        }
      } 
    } catch (e) {
      console.warn('[AuthStore] DB unavailable:', e.message)
    }
    return FALLBACK_SEED_USERS
  }
  
  load()
    .then(dbUsers => {
      useAuthStore.setState(s => {
        if (dbUsers.length > 0) {
          return { userList: dbUsers }
        }
        return { userList: FALLBACK_SEED_USERS }
      })
    })
    .catch(() => { 
      useAuthStore.setState({ userList: FALLBACK_SEED_USERS })
      window.__kpbUsersLoaded = false 
    })
}
