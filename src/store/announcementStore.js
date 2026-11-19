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

export const PRIORITY_CONFIG = {
  normal: {
    label: 'Normal',
    tone: 'neutral',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-slate-100',
  },
  important: {
    label: 'Penting',
    tone: 'warning',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    borderClass: 'border-amber-200 bg-amber-50/20',
  },
  urgent: {
    label: 'Darurat',
    tone: 'danger',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
    borderClass: 'border-rose-300 bg-rose-50/25',
  },
}

export const DISPLAY_MODES = {
  card: 'Widget Dashboard',
  banner: 'Top Banner Alert',
  modal: 'Pop-up Modal Dialog',
}

export const TARGET_ROLE_OPTIONS = [
  { value: '*', label: 'Semua Peran (All Roles)' },
  { value: 'employee', label: 'Staff / Employee' },
  { value: 'manager', label: 'Manager / Atasan' },
  { value: 'hr', label: 'HR Specialist' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'superadmin', label: 'Superadmin / IT' },
]

export const TARGET_LOCATION_OPTIONS = [
  { value: '*', label: 'Semua Lokasi (All Locations)' },
  { value: 'ho', label: 'Head Office (HO)' },
  { value: 'gudang', label: 'Gudang (Warehouse)' },
  { value: 'sales', label: 'Area Sales' },
  { value: 'livestream', label: 'Livestream Manhattan' },
]

const today = () => new Date().toISOString().slice(0, 10)

const SEED = [
  {
    id: 1, title: 'Penyesuaian Jam Kerja Ramadan',
    body: 'Selama bulan Ramadan, jam kerja menjadi 08.00–16.00 WIB. Istirahat pukul 12.00–12.30. Berlaku untuk seluruh rekan di {location}.',
    category: 'Kebijakan', pinned: true, active: true,
    startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-01-05',
    targetRoles: ['*'],
    targetDepartments: ['*'],
    targetLocations: ['*'],
    priority: 'important',
    displayMode: 'card',
    requireAck: false,
    acknowledgedBy: [],
  },
  {
    id: 2, title: 'Medical Check-Up Tahunan 2026',
    body: 'Halo {name}, pendaftaran MCU tahunan dibuka sampai 31 Agustus 2026. Silakan daftar melalui HRBP unit {dept}.',
    category: 'Acara', pinned: false, active: true,
    startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-02-10',
    targetRoles: ['*'],
    targetDepartments: ['*'],
    targetLocations: ['*'],
    priority: 'normal',
    displayMode: 'card',
    requireAck: false,
    acknowledgedBy: [],
  },
  {
    id: 3, title: 'Pemeliharaan Sistem Payroll',
    body: 'Sistem payroll tidak dapat diakses pada Sabtu, 15 Agustus 2026 pukul 22.00–02.00 WIB untuk pemeliharaan terjadwal.',
    category: 'Sistem', pinned: false, active: true,
    startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-03-01',
    targetRoles: ['*'],
    targetDepartments: ['*'],
    targetLocations: ['*'],
    priority: 'normal',
    displayMode: 'card',
    requireAck: false,
    acknowledgedBy: [],
  },
]

let _id = SEED.length + 1

/**
 * Live = switched on and within its date window. An empty date means open-ended.
 */
export function isLive(a, on = today()) {
  if (!a || !a.active) return false
  if (a.startDate && a.startDate > on) return false
  if (a.endDate && a.endDate < on) return false
  return true
}

/**
 * Status for the admin table — distinguishes "not yet" from "expired"
 */
export function announcementStatus(a, on = today()) {
  if (!a || !a.active) return 'Nonaktif'
  if (a.startDate && a.startDate > on) return 'Terjadwal'
  if (a.endDate && a.endDate < on) return 'Kedaluwarsa'
  return 'Aktif'
}

/**
 * Interpolasi variabel template dinamis ({name}, {dept}, {location}, {role}, {today})
 */
export function interpolateAnnouncement(text, userContext = {}) {
  if (!text || typeof text !== 'string') return text || ''
  const name = userContext.name || userContext.user?.name || 'Karyawan'
  const dept = userContext.dept || userContext.user?.dept || 'Umum'
  const location = userContext.locationName || userContext.location || 'Kantor'
  const role = userContext.role || userContext.user?.role || 'Staff'

  const d = new Date()
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const todayStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`

  return text
    .replace(/\{name\}|\{\{name\}\}/gi, name)
    .replace(/\{dept\}|\{\{dept\}\}/gi, dept)
    .replace(/\{location\}|\{\{location\}\}/gi, location)
    .replace(/\{role\}|\{\{role\}\}/gi, role)
    .replace(/\{today\}|\{\{today\}\}|\{date\}|\{\{date\}\}/gi, todayStr)
}

/**
 * Cek apakah pengumuman relevan dan boleh tampil untuk user yang sedang aktif
 */
export function isLiveForUser(a, userContext = {}, on = today()) {
  if (!isLive(a, on)) return false

  // Jika tidak ada user context, izinkan (fallback)
  if (!userContext || Object.keys(userContext).length === 0) return true

  const userRole = String(userContext.role || userContext.user?.role || '').toLowerCase()
  const userDept = String(userContext.dept || userContext.user?.dept || '').toLowerCase()
  const userLoc = String(userContext.location || userContext.workLocationCode || '').toLowerCase()

  // 1. Cek Target Roles
  const targetRoles = Array.isArray(a.targetRoles) && a.targetRoles.length > 0 ? a.targetRoles : ['*']
  if (!targetRoles.includes('*')) {
    const matchedRole = targetRoles.some((r) => r.toLowerCase() === userRole)
    if (!matchedRole) return false
  }

  // 2. Cek Target Departments
  const targetDepts = Array.isArray(a.targetDepartments) && a.targetDepartments.length > 0 ? a.targetDepartments : ['*']
  if (!targetDepts.includes('*')) {
    const matchedDept = targetDepts.some((d) => {
      const cleanD = d.toLowerCase()
      return userDept.includes(cleanD) || cleanD.includes(userDept)
    })
    if (!matchedDept) return false
  }

  // 3. Cek Target Locations
  const targetLocs = Array.isArray(a.targetLocations) && a.targetLocations.length > 0 ? a.targetLocations : ['*']
  if (!targetLocs.includes('*')) {
    const matchedLoc = targetLocs.some((l) => l.toLowerCase() === userLoc)
    if (!matchedLoc) return false
  }

  return true
}

export const useAnnouncementStore = create(persist(
  (set, get) => ({
    announcements: SEED.map(a => ({ ...a })),

    // Pinned first, then newest — the order the Home widget renders them in.
    getLive: (userContext = null) => {
      return get().announcements
        .filter(a => userContext ? isLiveForUser(a, userContext) : isLive(a))
        .sort((a, b) => {
          // Priority weighting: urgent > important > normal
          const pWeight = { urgent: 3, important: 2, normal: 1 }
          const pDiff = (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1)
          if (pDiff !== 0) return pDiff

          return (b.pinned - a.pinned) || String(b.createdAt).localeCompare(String(a.createdAt))
        })
    },

    addAnnouncement: (a) => set((s) => ({
      announcements: [
        ...s.announcements,
        {
          id: _id++,
          title: '',
          body: '',
          category: 'Umum',
          pinned: false,
          active: true,
          startDate: '',
          endDate: '',
          createdAt: today(),
          targetRoles: ['*'],
          targetDepartments: ['*'],
          targetLocations: ['*'],
          priority: 'normal',
          displayMode: 'card',
          requireAck: false,
          acknowledgedBy: [],
          ...a,
        },
      ],
    })),

    updateAnnouncement: (id, patch) => set((s) => ({
      announcements: s.announcements.map(a => (a.id === id ? { ...a, ...patch } : a)),
    })),

    removeAnnouncement: (id) => set((s) => ({
      announcements: s.announcements.filter(a => a.id !== id),
    })),

    acknowledgeAnnouncement: (id, userId) => set((s) => ({
      announcements: s.announcements.map((a) => {
        if (a.id !== id) return a
        const currentAcks = Array.isArray(a.acknowledgedBy) ? a.acknowledgedBy : []
        if (currentAcks.includes(userId)) return a
        return { ...a, acknowledgedBy: [...currentAcks, userId] }
      }),
    })),
  }),
  {
    name: 'hcm-announcements-v2',
    storage: createJSONStorage(() => dbStorage),
    // Keep the id counter ahead of anything restored from the database.
    onRehydrateStorage: () => (state) => {
      if (state?.announcements?.length) {
        _id = Math.max(0, ...state.announcements.map(a => a.id)) + 1
      }
    },
  },
))
