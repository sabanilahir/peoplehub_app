import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ── Offboarding checklist templates ──────────────────────────────────────────
// A template is a reusable set of checklist activities that HR can compose once
// and then distribute to any resigning employee. `dueOffset` = days relative to
// the Last Working Day (positive = before LWD, negative = after); the deadline is
// computed at distribution time from the employee's actual LWD.
//
// template: { id, name, description, activities: [
//   { category, title, description, picName, remark, dueOffset }
// ] }

export const TEMPLATE_ACTIVITY = { category: 'HR', title: '', description: '', picName: '', remark: '', dueOffset: 0 }

const nextId = (arr) => arr.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0) + 1

// Standard, full checklist — employee-facing tasks the resigning employee does.
const STANDARD_ACTIVITIES = [
  { category: 'HR', title: 'Kembalikan ID Card & Access Card', description: 'Serahkan ID card dan kartu akses gedung ke HR/security', picName: 'Rina Wulandari', remark: 'Serahkan ke resepsionis/security',      dueOffset: 0 },
  { category: 'HR', title: 'Kembalikan Laptop & Perangkat IT',  description: 'Kembalikan laptop, charger, dan perangkat kerja lain',  picName: 'Andi Pratama',   remark: 'Backup data pribadi dulu',             dueOffset: 0 },
  { category: 'HR', title: 'Kembalikan Aset Perusahaan',        description: 'Kunci, loker, seragam, dan aset lain milik perusahaan', picName: 'Rina Wulandari', remark: 'Cek daftar aset yang dipinjam',         dueOffset: 0 },
  { category: 'HR', title: 'Lapor ke Payroll untuk Settlement', description: 'Konfirmasi data rekening & komponen gaji akhir/THP',    picName: 'Budi Hartono',   remark: 'Pastikan nomor rekening masih aktif',  dueOffset: -7 },
  { category: 'HR', title: 'Lengkapi Dokumen Klaim BPJS/JHT',   description: 'Siapkan dokumen untuk klaim JHT BPJS Ketenagakerjaan',   picName: 'Sari Melati',    remark: 'Koordinasi dengan HR',                 dueOffset: -5 },
  { category: 'HR', title: 'Selesaikan Kewajiban Finansial',    description: 'Lunasi pinjaman, cash advance, dan reimbursement',      picName: 'Dewi Lestari',   remark: 'Minta bukti lunas dari Finance',       dueOffset: 3 },
  { category: 'Atasan Langsung', title: 'Serah Terima Pekerjaan & Dokumen', description: 'Serahkan file, dokumen proyek, dan kredensial kerja', picName: '', remark: 'Upload ke shared drive tim',      dueOffset: 3 },
  { category: 'Atasan Langsung', title: 'Knowledge Transfer ke Tim',        description: 'Transfer pengetahuan ke pengganti / rekan tim',       picName: '', remark: 'Minimal beberapa sesi dokumentasi', dueOffset: 5 },
  { category: 'Atasan Langsung', title: 'Kembalikan Akses & Kredensial Tim', description: 'Kembalikan akses sistem/tools tim ke atasan',         picName: '', remark: 'Termasuk akun bersama',           dueOffset: 1 },
  { category: 'Atasan Langsung', title: 'Isi Exit Clearance & Pamitan',     description: 'Konfirmasi clearance ke atasan dan pamitan ke tim',   picName: '', remark: 'Sesuai kebijakan tim',            dueOffset: 2 },
]

// Shorter template for contract / probation exits.
const QUICK_ACTIVITIES = [
  { category: 'HR', title: 'Kembalikan ID Card & Access Card', description: 'Serahkan ID card dan kartu akses ke HR/security', picName: 'Rina Wulandari', remark: 'Serahkan ke security',           dueOffset: 0 },
  { category: 'HR', title: 'Kembalikan Laptop & Perangkat IT',  description: 'Kembalikan laptop dan perangkat kerja',         picName: 'Andi Pratama',   remark: 'Backup data pribadi dulu',       dueOffset: 0 },
  { category: 'HR', title: 'Selesaikan Kewajiban Finansial',    description: 'Lunasi pinjaman & reimbursement',               picName: 'Dewi Lestari',   remark: 'Minta bukti lunas dari Finance', dueOffset: 2 },
  { category: 'Atasan Langsung', title: 'Serah Terima Pekerjaan & Dokumen', description: 'Serahkan file & kredensial kerja', picName: '', remark: 'Upload ke shared drive', dueOffset: 2 },
  { category: 'Atasan Langsung', title: 'Isi Exit Clearance & Pamitan',     description: 'Konfirmasi clearance ke atasan',   picName: '', remark: 'Sesuai kebijakan tim',   dueOffset: 1 },
]

const SEED_TEMPLATES = [
  { id: 1, name: 'Standar Offboarding',  description: 'Template lengkap untuk offboarding karyawan tetap.',       activities: STANDARD_ACTIVITIES.map(a => ({ ...a })) },
  { id: 2, name: 'Offboarding Ringkas',  description: 'Versi ringkas untuk karyawan kontrak / masa percobaan.',   activities: QUICK_ACTIVITIES.map(a => ({ ...a })) },
]

export const useOffboardingTemplateStore = create(
  persist(
    (set, get) => ({
      templates: SEED_TEMPLATES.map(t => ({ ...t, activities: t.activities.map(a => ({ ...a })) })),

      getTemplate: (id) => get().templates.find(t => String(t.id) === String(id)) || null,

      addTemplate: (data) => {
        let created
        set(s => {
          created = {
            name: 'Template Baru', description: '',
            ...data,
            activities: (data.activities || []).map(a => ({ ...TEMPLATE_ACTIVITY, ...a })),
            id: nextId(s.templates),
          }
          return { templates: [...s.templates, created] }
        })
        return created.id
      },

      updateTemplate: (id, patch) =>
        set(s => ({
          templates: s.templates.map(t =>
            String(t.id) === String(id)
              ? { ...t, ...patch, activities: (patch.activities ?? t.activities).map(a => ({ ...a })) }
              : t),
        })),

      deleteTemplate: (id) =>
        set(s => ({ templates: s.templates.filter(t => String(t.id) !== String(id)) })),

      duplicateTemplate: (id) => {
        let created
        set(s => {
          const src = s.templates.find(t => String(t.id) === String(id))
          if (!src) return s
          created = {
            ...src,
            id: nextId(s.templates),
            name: `${src.name} (Copy)`,
            activities: src.activities.map(a => ({ ...a })),
          }
          return { templates: [...s.templates, created] }
        })
        return created?.id
      },
    }),
    { name: 'hcm-offboarding-template-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
