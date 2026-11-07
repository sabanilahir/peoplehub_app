import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Company announcements shown on the Home page (ESS Dashboard) and maintained
// under HR Administration → Settings → Announcement.

export const ANNOUNCEMENT_CATEGORIES = ['Umum', 'Kebijakan', 'Acara', 'Sistem', 'Darurat']

export const CATEGORY_TONE = {
  Umum:      'bg-gray-100 text-gray-700',
  Kebijakan: 'bg-blue-100 text-blue-700',
  Acara:     'bg-emerald-100 text-emerald-700',
  Sistem:    'bg-violet-100 text-violet-700',
  Darurat:   'bg-red-100 text-red-700',
}

const today = () => new Date().toISOString().slice(0, 10)

const SEED = [
  {
    id: 1, title: 'Penyesuaian Jam Kerja Ramadan',
    body: 'Selama bulan Ramadan, jam kerja menjadi 08.00–16.00 WIB. Istirahat pukul 12.00–12.30. Berlaku untuk seluruh karyawan kantor pusat dan cabang.',
    category: 'Kebijakan', pinned: true, active: true,
    startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-01-05',
  },
  {
    id: 2, title: 'Medical Check-Up Tahunan 2026',
    body: 'Pendaftaran MCU tahunan dibuka sampai 31 Agustus 2026. Silakan daftar melalui HR Business Partner masing-masing unit.',
    category: 'Acara', pinned: false, active: true,
    startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-02-10',
  },
  {
    id: 3, title: 'Pemeliharaan Sistem Payroll',
    body: 'Sistem payroll tidak dapat diakses pada Sabtu, 15 Agustus 2026 pukul 22.00–02.00 WIB untuk pemeliharaan terjadwal.',
    category: 'Sistem', pinned: false, active: true,
    startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-03-01',
  },
]

let _id = SEED.length + 1

// Live = switched on and within its date window. An empty date means open-ended.
export function isLive(a, on = today()) {
  if (!a.active) return false
  if (a.startDate && a.startDate > on) return false
  if (a.endDate && a.endDate < on) return false
  return true
}

// Status for the admin table — distinguishes "not yet" from "expired" so an
// announcement that isn't showing explains why.
export function announcementStatus(a, on = today()) {
  if (!a.active) return 'Nonaktif'
  if (a.startDate && a.startDate > on) return 'Terjadwal'
  if (a.endDate && a.endDate < on) return 'Kedaluwarsa'
  return 'Aktif'
}

export const useAnnouncementStore = create(persist(
  (set, get) => ({
    announcements: SEED.map(a => ({ ...a })),

    // Pinned first, then newest — the order the Home widget renders them in.
    getLive: () => get().announcements
      .filter(a => isLive(a))
      .sort((a, b) => (b.pinned - a.pinned) || String(b.createdAt).localeCompare(String(a.createdAt))),

    addAnnouncement: (a) => set((s) => ({
      announcements: [
        ...s.announcements,
        {
          id: _id++, title: '', body: '', category: 'Umum', pinned: false, active: true,
          startDate: '', endDate: '', createdAt: today(), ...a,
        },
      ],
    })),

    updateAnnouncement: (id, patch) => set((s) => ({
      announcements: s.announcements.map(a => (a.id === id ? { ...a, ...patch } : a)),
    })),

    removeAnnouncement: (id) => set((s) => ({
      announcements: s.announcements.filter(a => a.id !== id),
    })),
  }),
  {
    name: 'hcm-announcements-v1',
    storage: createJSONStorage(() => dbStorage),
    // Keep the id counter ahead of anything restored from the database.
    onRehydrateStorage: () => (state) => {
      if (state?.announcements?.length) {
        _id = Math.max(0, ...state.announcements.map(a => a.id)) + 1
      }
    },
  },
))
