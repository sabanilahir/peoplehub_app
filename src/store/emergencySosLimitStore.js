import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Throttles how many Emergency SOS alerts can go through within a rolling
// time window — during a mass event (earthquake, building evacuation) the
// first few reporters already represent everyone else, so the rest are
// blocked from flooding HR/Superadmin with duplicate alerts.
// Configured under System Admin > Settings > Batas SOS Serentak.

export const useEmergencySosLimitStore = create(persist(
  (set) => ({
    enabled: true,
    maxPerWindow: 5,
    windowMinutes: 15,
    setConfig: (patch) => set(patch),
  }),
  {
    name: 'hcm-emergency-sos-limit-v1',
    storage: createJSONStorage(() => dbStorage),
  },
))
