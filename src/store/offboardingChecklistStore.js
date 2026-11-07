import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'
import { addDays, todayStr } from '@/lib/offboarding'

// Two owners of offboarding activities
export const OFFBOARDING_CATEGORIES = ['HR', 'Atasan Langsung']

// Execution status of an activity (used by the offboarding tracker)
export const OFFBOARDING_STATUSES = ['Not Started', 'In Progress', 'Complete']

// Template auto-seeded the first time HR opens the checklist for an employee
// whose resignation has been approved. `dueOffset` = days relative to the Last
// Working Day (positive = before LWD, negative = after) → deadline auto-computed.
// Employee-facing offboarding tasks — the things the resigning employee must
// personally do before leaving. Category marks who the task is coordinated with:
//   'HR'              → returned to / verified by HR & support functions
//   'Atasan Langsung' → done together with the direct manager
const DEFAULT_TEMPLATE = [
  // ── Bersama HR / fungsi pendukung ─────────────────────────────────────────
  { category: 'HR', title: 'Kembalikan ID Card & Access Card', description: 'Serahkan ID card dan kartu akses gedung ke HR/security', picName: 'Rina Wulandari', remark: 'Serahkan ke resepsionis/security',       dueOffset: 0 },
  { category: 'HR', title: 'Kembalikan Laptop & Perangkat IT',  description: 'Kembalikan laptop, charger, dan perangkat kerja lain',  picName: 'Andi Pratama',   remark: 'Pastikan data pribadi sudah dibackup',  dueOffset: 0 },
  { category: 'HR', title: 'Kembalikan Aset Perusahaan',        description: 'Kunci, loker, seragam, dan aset lain milik perusahaan', picName: 'Rina Wulandari', remark: 'Cek daftar aset yang dipinjam',          dueOffset: 0 },
  { category: 'HR', title: 'Lapor ke Payroll untuk Settlement', description: 'Konfirmasi data rekening & komponen gaji akhir/THP',    picName: 'Budi Hartono',   remark: 'Pastikan nomor rekening masih aktif',   dueOffset: -7 },
  { category: 'HR', title: 'Lengkapi Dokumen Klaim BPJS/JHT',   description: 'Siapkan dokumen untuk klaim JHT BPJS Ketenagakerjaan',   picName: 'Sari Melati',    remark: 'Koordinasi dengan HR',                  dueOffset: -5 },
  { category: 'HR', title: 'Selesaikan Kewajiban Finansial',    description: 'Lunasi pinjaman, cash advance, dan reimbursement',      picName: 'Dewi Lestari',   remark: 'Minta bukti lunas dari Finance',        dueOffset: 3 },
  // ── Bersama Atasan Langsung ───────────────────────────────────────────────
  { category: 'Atasan Langsung', title: 'Serah Terima Pekerjaan & Dokumen', description: 'Serahkan file, dokumen proyek, dan kredensial kerja',  picName: '', remark: 'Upload ke shared drive tim',      dueOffset: 3 },
  { category: 'Atasan Langsung', title: 'Knowledge Transfer ke Tim',        description: 'Transfer pengetahuan ke pengganti / rekan tim',        picName: '', remark: 'Minimal beberapa sesi dokumentasi', dueOffset: 5 },
  { category: 'Atasan Langsung', title: 'Kembalikan Akses & Kredensial Tim', description: 'Kembalikan akses sistem/tools tim ke atasan',          picName: '', remark: 'Termasuk akun bersama',           dueOffset: 1 },
  { category: 'Atasan Langsung', title: 'Isi Exit Clearance & Pamitan',     description: 'Konfirmasi clearance ke atasan dan pamitan ke tim',    picName: '', remark: 'Sesuai kebijakan tim',            dueOffset: 2 },
]

const nextId = (items) => items.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0) + 1
const dueFrom = (lwd, offset) => (lwd ? addDays(lwd, -(offset || 0)) : '')

// ── Demo seed: offboarding cases with realistic progress ──────────────────────
// So the monitor and each employee's checklist show real progress instead of a
// flat 0%. `dueOffset` is relative to each case's Last Working Day.
const buildSeed = (employeeId, lwd, statusMap, startId, completedAt) =>
  DEFAULT_TEMPLATE.map((t, i) => {
    const status = statusMap[t.title] || 'Not Started'
    return {
      ...t, employeeId, deadline: dueFrom(lwd, t.dueOffset),
      status, evidence: '', completedAt: status === 'Complete' ? completedAt : '', id: startId + i,
    }
  })

// Employee 93 — urgent case near completion (LWD 31 Jul 2026, ~2 weeks out).
const SEED_93 = buildSeed(93, '2026-07-31', {
  'Kembalikan ID Card & Access Card':   'Complete',
  'Kembalikan Laptop & Perangkat IT':   'Complete',
  'Kembalikan Aset Perusahaan':         'Complete',
  'Lapor ke Payroll untuk Settlement':  'Complete',
  'Selesaikan Kewajiban Finansial':     'Complete',
  'Serah Terima Pekerjaan & Dokumen':   'Complete',
  'Knowledge Transfer ke Tim':          'Complete',
  'Kembalikan Akses & Kredensial Tim':  'Complete',
  'Lengkapi Dokumen Klaim BPJS/JHT':    'In Progress',
  'Isi Exit Clearance & Pamitan':       'In Progress',
}, 1, '2026-07-10')

// Employee 96 (Offboarding Employee · OF-EMP-96) — newer mid-clearance case.
const SEED_96 = buildSeed(96, '2026-08-31', {
  'Selesaikan Kewajiban Finansial':    'Complete',
  'Serah Terima Pekerjaan & Dokumen':  'Complete',
  'Kembalikan Akses & Kredensial Tim': 'Complete',
  'Isi Exit Clearance & Pamitan':      'Complete',
  'Lapor ke Payroll untuk Settlement': 'In Progress',
  'Knowledge Transfer ke Tim':         'In Progress',
}, 11, '2026-07-15')

const SEED_CHECKLIST = [...SEED_93, ...SEED_96]

export const useOffboardingChecklistStore = create(
  persist(
    (set, get) => ({
      // { id, employeeId, category, title, description, picName, deadline, remark, status, evidence, completedAt }
      items: SEED_CHECKLIST.map(x => ({ ...x })),

      // Set true once persisted state has been rehydrated. Guards seedForEmployee
      // so it can't reset a persisted employee's checklist during the brief
      // window before hydration (which would wipe saved completion status).
      _hydrated: false,

      forEmployee: (employeeId) =>
        get().items.filter(i => String(i.employeeId) === String(employeeId)),

      addActivity: (data) => {
        let created
        set(s => {
          created = {
            category: 'HR', title: '', description: '', picName: '', deadline: '', remark: '',
            status: 'Not Started', evidence: '', completedAt: '',
            ...data,
            employeeId: Number(data.employeeId),
            id: nextId(s.items),
          }
          return { items: [...s.items, created] }
        })
        return created.id
      },

      updateActivity: (id, patch) =>
        set(s => ({
          items: s.items.map(i => {
            if (i.id !== id) return i
            const next = { ...i, ...patch }
            // Auto-manage completion timestamp
            if (patch.status !== undefined) {
              if (patch.status === 'Complete' && !i.completedAt) next.completedAt = todayStr()
              if (patch.status !== 'Complete') next.completedAt = ''
            }
            return next
          }),
        })),

      deleteActivity: (id) =>
        set(s => ({ items: s.items.filter(i => i.id !== id) })),

      // Distribute a template's activities to an employee. Each deadline is
      // computed from the employee's Last Working Day and the activity's
      // dueOffset. When `replace` is true (default) the employee's existing
      // checklist is cleared first; otherwise the activities are appended.
      //
      // `preserveProgress` (default true) carries over the status, evidence,
      // remark, and completion timestamp of any existing task whose category +
      // title match an incoming template activity. This lets HR change or tweak
      // the template AFTER the employee has already started working without
      // resetting their progress. Tasks that are not in the new template are
      // dropped (that is the point of switching templates); the UI surfaces how
      // many completed tasks that removes before HR confirms.
      applyTemplateToEmployee: (employeeId, activities = [], lwd, { replace = true, templateId = null, templateName = '', preserveProgress = true } = {}) => {
        const eid = Number(employeeId)
        const keyOf = (a) => `${a.category || 'HR'}||${(a.title || '').trim().toLowerCase()}`
        set(s => {
          const mine = s.items.filter(i => i.employeeId === eid)
          const prevByKey = {}
          if (preserveProgress) mine.forEach(i => { prevByKey[keyOf(i)] = i })
          const kept = replace ? s.items.filter(i => i.employeeId !== eid) : s.items
          let maxId = s.items.reduce((m, i) => Math.max(m, Number(i.id) || 0), 0)
          const seeded = activities.map(a => {
            const prev = prevByKey[keyOf(a)]
            return {
              category: a.category || 'HR',
              title: a.title || '',
              description: a.description || '',
              picName: a.picName || '',
              remark: prev?.remark || a.remark || '',
              employeeId: eid,
              deadline: dueFrom(lwd, a.dueOffset),
              status: prev?.status || 'Not Started',
              evidence: prev?.evidence || '',
              completedAt: prev?.completedAt || '',
              templateId, templateName,
              id: ++maxId,
            }
          })
          return { items: [...kept, ...seeded] }
        })
      },

      // Populate the default template once per employee (only if they have none),
      // computing each deadline relative to the Last Working Day.
      seedForEmployee: (employeeId, lwd) => {
        if (!get()._hydrated) return   // wait for persisted state before seeding
        const eid = Number(employeeId)
        set(s => {
          if (s.items.some(i => i.employeeId === eid)) return s
          let id = nextId(s.items)
          const seeded = DEFAULT_TEMPLATE.map(t => ({
            ...t, employeeId: eid, deadline: dueFrom(lwd, t.dueOffset),
            status: 'Not Started', evidence: '', completedAt: '',
            templateId: 1, templateName: 'Standar Offboarding', id: id++,
          }))
          return { items: [...s.items, ...seeded] }
        })
      },
    }),
    {
      name: 'hcm-offboarding-checklist-v1',
      storage: createJSONStorage(() => dbStorage),
      // Don't persist the transient hydration flag.
      partialize: (s) => { const { _hydrated, ...rest } = s; return rest },
      onRehydrateStorage: () => () => { useOffboardingChecklistStore.setState({ _hydrated: true }) },
    }
  )
)
