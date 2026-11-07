import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useFlowableStore = create(
  persist(
    (set, get) => ({
      // Flowable connection settings
      settings: {
        url: 'http://localhost:8080/flowable-rest',
        uiUrl: 'http://localhost:8080/flowable-ui',
        username: 'admin',
        password: 'test',
        enabled: false,
      },

      // Connection status
      isConnected: false,
      isTesting: false,
      lastTestResult: null,

      // Actions
      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }))
      },

      setConnected: (connected) => set({ isConnected: connected }),
      setTesting: (testing) => set({ isTesting: testing }),
      setLastTestResult: (result) => set({ lastTestResult: result }),

      // Test connection to Flowable
      testConnection: async () => {
        const { settings } = get()
        set({ isTesting: true, lastTestResult: null })

        try {
          const response = await fetch('/api/flowable/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          })

          const result = await response.json()
          set({ 
            isConnected: result.success, 
            lastTestResult: result,
            isTesting: false 
          })
          return result
        } catch (error) {
          const result = { success: false, message: error.message }
          set({ isConnected: false, lastTestResult: result, isTesting: false })
          return result
        }
      },

      // Sync settings to database
      syncToDatabase: async () => {
        const { settings } = get()
        try {
          const response = await fetch('/api/flowable/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          })
          return await response.json()
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      // Load settings from database
      loadFromDatabase: async () => {
        try {
          const response = await fetch('/api/flowable/settings')
          const result = await response.json()
          if (result.success && result.data) {
            set({ settings: result.data })
          }
          return result
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      // Reset to defaults
      resetSettings: () => {
        set({
          settings: {
            url: 'http://localhost:8080/flowable-rest',
            uiUrl: 'http://localhost:8080/flowable-ui',
            username: 'admin',
            password: 'test',
            enabled: false,
          },
          isConnected: false,
          lastTestResult: null
        })
      }
    }),
    {
      name: 'flowable-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
)

export default useFlowableStore
