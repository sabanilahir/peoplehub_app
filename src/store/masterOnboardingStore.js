import { create }  from 'zustand'
import { persist } from 'zustand/middleware'
import { persist as dbPersist } from '@/lib/persist'

// ── Seed templates ────────────────────────────────────────────────────────────
// Two ready-to-use templates so the Master Onboarding page isn't empty during
// the demo (HR would normally build these once and reuse them per new hire).
const SEED = [
  {
    id: 1,
    name: 'Onboarding Umum — Karyawan Baru',
    description: 'Induksi umum: profil perusahaan, peraturan, budaya kerja, dan tes induksi. Wajib untuk seluruh karyawan baru.',
    active: true,
    autoAssign: true,
    criteria: { employmentTypes: ['Permanent', 'Contract'], departmentIds: [], companyIds: [], positionIds: [] },
    reviewItems: null,
    mainSections: [
      { id: 'ms_gen', type: 'Onboarding General',
        sections: [{ id: 'sec_gen', label: 'Materi Umum', colorIdx: 0 }],
        items: [
          { id: 'tg1', module: 'Company Profile — Visi, Misi & Sejarah', type: 'Video',                 link: '', assignedTo: 'self', mandatory: true, category: 'sec_gen' },
          { id: 'tg2', module: 'Peraturan Perusahaan & Kode Etik',        type: 'Document (Attachment)',  link: '', assignedTo: 'self', mandatory: true, category: 'sec_gen' },
          { id: 'tg3', module: 'Budaya Perusahaan',                       type: 'Session',               link: '', assignedTo: 'mentor', mandatory: true, category: 'sec_gen' },
          { id: 'tg4', module: 'Good Documentation Practices (GDP)',      type: 'Document (Attachment)',  link: '', assignedTo: 'self', mandatory: true, category: 'sec_gen' },
          { id: 'tg5', module: 'Tes Induksi',                            type: 'Quiz',                  link: '', assignedTo: 'self', mandatory: true, category: 'sec_gen' },
        ],
      },
    ],
    createdAt: '2026-01-05T08:00:00+07:00',
  },
  {
    id: 2,
    name: 'Onboarding Teknis — Operasional',
    description: 'Pembekalan teknis sesuai posisi: job description, SOP/WI, dan on-the-job training di area kerja.',
    active: true,
    autoAssign: false,
    criteria: { employmentTypes: ['Permanent'], departmentIds: [], companyIds: [], positionIds: [] },
    reviewItems: null,
    mainSections: [
      { id: 'ms_tech', type: 'Onboarding Technical',
        sections: [{ id: 'sec_tech', label: 'Materi Teknis', colorIdx: 1 }],
        items: [
          { id: 'tt1', module: 'Job Description & Sistem Penilaian', type: 'Session',              link: '', assignedTo: 'mentor', mandatory: true, category: 'sec_tech' },
          { id: 'tt2', module: 'SOP / WI Terkait Pekerjaan',          type: 'Document (Attachment)', link: '', assignedTo: 'self',   mandatory: true, category: 'sec_tech' },
          { id: 'tt3', module: 'Technical Knowledge Sesuai Posisi',   type: 'Session',              link: '', assignedTo: 'mentor', mandatory: true, category: 'sec_tech' },
          { id: 'tt4', module: 'On-the-Job Training (OJT)',           type: 'Practice',             link: '', assignedTo: 'mentor', mandatory: true, category: 'sec_tech' },
        ],
      },
    ],
    createdAt: '2026-01-06T08:00:00+07:00',
  },
]

// Next id derived from existing templates so it never collides after a reload
// (a module-level counter would reset to its initial value on every page load).
const nextId = (templates) =>
  templates.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1

function migrateTemplate(t) {
  const copy = { ...t }
  if (Array.isArray(copy.mainSections)) {
    copy.mainSections = copy.mainSections.filter(ms => ms.type)
  }
  copy.criteria = {
    employmentTypes: [], departmentIds: [], companyIds: [], positionIds: [],
    ...(copy.criteria ?? {}),
  }
  if (copy.autoAssign === undefined) copy.autoAssign = false
  return copy
}

export const useMasterOnboardingStore = create(
  persist(
    (set) => ({
      templates: SEED,

      addTemplate: (data) => {
        let created
        set(s => {
          created = {
            mainSections: [], reviewItems: null,
            active: true,
            createdAt: new Date().toISOString(),
            ...data,
            id: nextId(s.templates),
          }
          return { templates: [...s.templates, created] }
        })
        dbPersist('/api/onboarding-templates', 'POST', created)   // write-through to DB (best-effort)
        return created.id
      },

      updateTemplate: (id, patch) => {
        set(s => ({
          templates: s.templates.map(t => t.id === id ? { ...t, ...patch } : t),
        }))
        dbPersist(`/api/onboarding-templates/${id}`, 'PUT', patch)
      },

      deleteTemplate: (id) => {
        set(s => ({ templates: s.templates.filter(t => t.id !== id) }))
        dbPersist(`/api/onboarding-templates/${id}`, 'DELETE')
      },
    }),
    {
      name: 'hcm-master-onboarding-v3',
      migrate: (persisted) => {
        const templates = (persisted?.templates ?? SEED).map(migrateTemplate)
        // Repair legacy duplicate ids (caused by a reset id counter) by
        // reassigning unique sequential ids. Template ids are not referenced
        // elsewhere — onboarding records copy template content, not its id.
        templates.forEach((t, i) => { t.id = i + 1 })
        return { ...persisted, templates }
      },
      version: 4,
    }
  )
)

// ─── Hydrate templates from the DB (cross-browser source of truth) ────────────
// When a database is configured, templates saved on any device are loaded here so
// every browser sees the same set. Behaviour is deliberately non-destructive:
//   • API down (503 / no DB)  → keep whatever localStorage restored (offline mode).
//   • DB has templates        → adopt the DB set as the shared source of truth.
//   • DB empty but this browser
//     has local templates      → one-time backfill: push them up so other browsers
//                                can see them (migrates pre-DB localStorage data).
if (typeof window !== 'undefined' && !window.__kpbTemplatesLoaded) {
  window.__kpbTemplatesLoaded = true
  fetch('/api/onboarding-templates')
    .then(r => (r.ok ? r.json() : null))
    .then(list => {
      if (!Array.isArray(list)) return
      const local = useMasterOnboardingStore.getState().templates
      if (list.length > 0) {
        useMasterOnboardingStore.setState({ templates: list.map(migrateTemplate) })
      } else if (local.length > 0) {
        local.forEach(t => dbPersist('/api/onboarding-templates', 'POST', t))
      }
    })
    .catch(() => { window.__kpbTemplatesLoaded = false })
}
