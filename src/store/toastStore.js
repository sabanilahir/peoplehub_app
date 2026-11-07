import { create } from 'zustand'

export const useToastStore = create((set, get) => ({
  toasts: [],

  show: (message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, duration)
  },

  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
