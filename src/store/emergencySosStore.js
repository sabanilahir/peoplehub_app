import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Emergency SOS alerts — any logged-in user can trigger one from the topbar
// button (fire, workplace accident, medical, security, etc.), optionally with
// a short video captured on the spot. HR/Superadmin (and the reporter's direct
// manager, read-only) get notified and review each alert as 'Valid' or
// 'Flagged' (misuse) — see /hr/emergency-sos.

export const SOS_CATEGORIES = ['Kebakaran', 'Kecelakaan Kerja', 'Medis', 'Keamanan', 'Lainnya']
export const SOS_MAX_VIDEO_SECONDS = 20
// A 20s clip at a modest bitrate comfortably fits under this; capped mainly
// to stop a runaway recording (e.g. codec fallback with no time limit) from
// producing something absurd.
export const SOS_MAX_BYTES = 20 * 1024 * 1024 // 20 MB

let _id = 1

export const useEmergencySosStore = create(persist(
  (set, get) => ({
    // { id, employeeId, employeeName, category, videoDataUrl, videoType, videoSize,
    //   createdAt, status: 'Pending'|'Valid'|'Flagged', reviewedBy, reviewedByName, reviewedAt, reviewNote }
    alerts: [],

    addAlert: (a) => set(s => ({ alerts: [{ id: _id++, status: 'Pending', ...a }, ...s.alerts] })),
    reviewAlert: (id, patch) => set(s => ({
      alerts: s.alerts.map(a => a.id === id ? { ...a, ...patch } : a),
    })),
    deleteAlert: (id) => set(s => ({ alerts: s.alerts.filter(a => a.id !== id) })),
  }),
  {
    name: 'hcm-emergency-sos-v1',
    storage: createJSONStorage(() => dbStorage),
    onRehydrateStorage: () => (state) => {
      if (state) state.alerts = []
      _id = 1
    },
  },
))
