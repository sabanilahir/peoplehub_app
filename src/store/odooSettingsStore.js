import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Helper to normalize Odoo URL
const normalizeUrl = (url) => {
  if (!url) return ''
  return url.replace(/\/odoo$/, '').replace(/\/$/, '')
}

const DEFAULT = {
  odooUrl: '',
  odooDb: '',
  odooUser: '',
  odooApiKey: '',
  odooEmployeeModel: 'hr.employee',
  syncEnabled: false,
  lastSyncAt: null,
  autoSyncInterval: 0, // minutes, 0 = disabled
}

export const useOdooSettingsStore = create(
  persist(
    (set, get) => ({
      ...DEFAULT,

      // Initialize - normalize stored URL
      _init: () => {
        const state = get()
        if (state.odooUrl && (state.odooUrl.endsWith('/odoo') || state.odooUrl.endsWith('/'))) {
          set({ odooUrl: normalizeUrl(state.odooUrl) })
        }
      },

      // Update settings - auto-normalize URL
      setOdooUrl: (v) => set({ odooUrl: normalizeUrl(v) }),
      setOdooDb: (v) => set({ odooDb: v }),
      setOdooUser: (v) => set({ odooUser: v }),
      setOdooApiKey: (v) => set({ odooApiKey: v }),
      setOdooEmployeeModel: (v) => set({ odooEmployeeModel: v }),
      setSyncEnabled: (v) => set({ syncEnabled: v }),
      setAutoSyncInterval: (v) => set({ autoSyncInterval: v }),

      // Test connection - now uses server-side API
      testConnection: async () => {
        const { odooUrl, odooDb, odooUser, odooApiKey } = get()
        if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
          return { success: false, message: 'Semua field harus diisi' }
        }

        try {
          // Call server-side API to test connection (avoids CORS issues)
          const apiUrl = `/api/odoo/test?odooUrl=${encodeURIComponent(odooUrl)}&odooDb=${encodeURIComponent(odooDb)}&odooUser=${encodeURIComponent(odooUser)}&odooApiKey=${encodeURIComponent(odooApiKey)}`
          
          const response = await fetch(apiUrl)
          const data = await response.json()
          
          if (data.success) {
            return { success: true, message: 'Koneksi berhasil!' }
          } else {
            return { success: false, message: data.error || 'Authentication failed' }
          }
        } catch (error) {
          console.error('[ODOO TEST] Error:', error)
          return { success: false, message: 'Gagal terhubung: ' + error.message }
        }
      },

      // Sync employees from Odoo
      syncEmployees: async () => {
        const { odooUrl, odooDb, odooUser, odooApiKey } = get()
        if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
          return { success: false, message: 'Konfigurasi belum lengkap', employees: [] }
        }

        try {
          // Call API untuk sync dari Odoo
          const apiUrl = `/api/odoo/employees?odooUrl=${encodeURIComponent(odooUrl)}&odooDb=${encodeURIComponent(odooDb)}&odooUser=${encodeURIComponent(odooUser)}&odooApiKey=${encodeURIComponent(odooApiKey)}`
          
          const response = await fetch(apiUrl)
          const result = await response.json()

          if (result.success) {
            set({ lastSyncAt: new Date().toISOString() })
            return { 
              success: true, 
              message: result.message,
              employees: result.data ? [result.data] : []
            }
          } else {
            return { success: false, message: result.error, employees: [] }
          }
        } catch (error) {
          return { success: false, message: 'Gagal sync: ' + error.message, employees: [] }
        }
      },

      // Reset to defaults
      reset: () => set(DEFAULT),
    }),
    { name: 'hcm-odoo-settings' }
  )
)