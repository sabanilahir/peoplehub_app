import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Master Document Types — configured under System Admin > Settings, consumed
// by the Personal Document tab on Employee Data. Each type controls which
// extra metadata fields get captured when someone uploads a document of that
// type (a work contract cares about its validity window; a KTP scan mostly
// doesn't), and whether the type is mandatory (used to flag missing required
// documents per employee).

const SEED_TYPES = [
  { id: 1, name: 'KTP', title: 'Kartu Tanda Penduduk', mandatory: true, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false },
    customFieldLabel: '' },
  { id: 2, name: 'NPWP', title: 'Nomor Pokok Wajib Pajak', mandatory: true, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false },
    customFieldLabel: '' },
  { id: 3, name: 'Kartu Keluarga', title: 'Kartu Keluarga', mandatory: true, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: false, note: false, customField: false },
    customFieldLabel: '' },
  { id: 4, name: 'Ijazah', title: 'Ijazah Pendidikan Terakhir', mandatory: true, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false },
    customFieldLabel: '' },
  { id: 5, name: 'CV / Resume', title: 'CV / Resume', mandatory: true, active: true,
    fields: { issuedDate: false, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false },
    customFieldLabel: '' },
  { id: 6, name: 'Kontrak Kerja', title: 'Kontrak Kerja (PKWT/PKWTT)', mandatory: false, active: true,
    fields: { issuedDate: false, effectiveStartDate: true, effectiveEndDate: true, note: true, customField: false },
    customFieldLabel: '' },
  { id: 7, name: 'Kartu BPJS Kesehatan', title: 'Kartu BPJS Kesehatan', mandatory: false, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: false, note: false, customField: false },
    customFieldLabel: '' },
  { id: 8, name: 'Kartu BPJS Ketenagakerjaan', title: 'Kartu BPJS Ketenagakerjaan', mandatory: false, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: false, note: false, customField: false },
    customFieldLabel: '' },
  { id: 9, name: 'Sertifikat', title: 'Sertifikat / Pelatihan', mandatory: false, active: true,
    fields: { issuedDate: true, effectiveStartDate: false, effectiveEndDate: true, note: true, customField: true },
    customFieldLabel: 'Lembaga Penerbit' },
  { id: 10, name: 'Lainnya', title: 'Dokumen Lainnya', mandatory: false, active: true,
    fields: { issuedDate: false, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false },
    customFieldLabel: '' },
]

const EMPTY_FIELDS = { issuedDate: false, effectiveStartDate: false, effectiveEndDate: false, note: true, customField: false }

let _id = SEED_TYPES.length + 1

export const useDocumentTypeStore = create(persist(
  (set, get) => ({
    types: SEED_TYPES.map(x => ({ ...x, fields: { ...x.fields } })),

    addType: (t) => set(s => ({
      types: [...s.types, { id: _id++, mandatory: false, active: true, customFieldLabel: '', ...t, fields: { ...EMPTY_FIELDS, ...(t.fields || {}) } }],
    })),
    updateType: (id, patch) => set(s => ({
      types: s.types.map(x => x.id === id ? { ...x, ...patch, fields: patch.fields ? { ...x.fields, ...patch.fields } : x.fields } : x),
    })),
    removeType: (id) => set(s => ({ types: s.types.filter(x => x.id !== id) })),
  }),
  {
    name: 'hcm-document-types-v1',
    storage: createJSONStorage(() => dbStorage),
    onRehydrateStorage: () => (state) => {
      if (state?.types?.length) _id = Math.max(0, ...state.types.map(x => x.id)) + 1
    },
  },
))
