import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'
import { boxScore, TALENT_BOXES } from '@/store/talentReviewStore'
import { TRM_RECORDS } from '@/store/talentSeed'

// ─── Talent Review Meeting (TRM / PRP) ────────────────────────────────────────
// Form untuk evaluasi kinerja & pengembangan serta menyusun Development Plan.
// PRP dikhususkan untuk talent (TB 1, 2, 3, 5) dan successor.

// Rating kinerja berdasar Performance Karya (PK) 100–400.
export const RATING_BANDS = [
  { rating: 'A', pk: '370 – 400', min: 370, kinerja: 'Tinggi' },
  { rating: 'B', pk: '340 – 369', min: 340, kinerja: 'Tinggi' },
  { rating: 'C', pk: '300 – 339', min: 300, kinerja: 'Sedang' },
  { rating: 'D', pk: '250 – 299', min: 250, kinerja: 'Rendah' },
  { rating: 'E', pk: '100 – 249', min: 100, kinerja: 'Rendah' },
]

export const POTENTIAL_OPTIONS = [
  { value: 'Tinggi', col: 3 },
  { value: 'Sedang', col: 2 },
  { value: 'Rendah', col: 1 },
]

export const METHODS = ['Training', 'Coaching', 'Job Assignment', 'Project']

// Deskripsi tiap Talent Box (sesuai panduan 9 boxes talent matrix).
export const TB_DESCRIPTION = {
  1: 'Secara konsisten melakukan pekerjaannya dengan baik. Kompeten dan siap dipromosikan ke posisi dengan tuntutan lebih tinggi.',
  2: 'Secara konsisten melakukan pekerjaannya dengan baik. Mampu dan mau menerima tugas-tugas tambahan dengan tuntutan lebih tinggi.',
  3: 'Melaksanakan dengan baik sebagian besar tuntutan pekerjaannya. Kompeten dan siap menerima tugas-tugas dengan tuntutan lebih tinggi.',
  4: 'Menguasai bidang pekerjaannya dengan baik dan dipandang sebagai ahli oleh sejawatnya. Belum mau/mampu menerima tugas dengan tuntutan lebih tinggi.',
  5: 'Melaksanakan dengan baik sebagian besar tuntutan pekerjaannya. Mau menerima tugas tambahan dengan tuntutan setara atau lebih tinggi.',
  6: 'Umumnya karyawan baru/belum lewat 12 bulan sejak dipromosikan. Kinerja diharapkan meningkat cepat sejalan peningkatan kompetensi.',
  7: 'Melaksanakan dengan baik sebagian besar tuntutan pekerjaannya. Belum mampu/mau menerima tugas tambahan dengan tuntutan setara.',
  8: 'Sebagian pekerjaan dilaksanakan dengan baik, sebagian besar masih kurang. Masih mampu dan mau memperbaiki kinerjanya.',
  9: 'Sebagian pekerjaan dilaksanakan dengan baik, sebagian besar masih kurang. Belum mampu/mau (tidak termotivasi) memperbaiki kinerjanya.',
}

export const ratingFromPK = (pk) => {
  const n = Number(pk); if (!n) return '—'
  return (RATING_BANDS.find(b => n >= b.min)?.rating) || 'E'
}
export const kinerjaLabelFromPK = (pk) => {
  const n = Number(pk); if (!n) return null
  if (n >= 340) return 'Tinggi'
  if (n >= 300) return 'Sedang'
  return 'Rendah'
}
// Level kinerja (baris 9-box) dari PK, dan kolom potensi.
export const kinerjaRow = (pk) => {
  const n = Number(pk); if (!n) return null
  if (n >= 340) return 3
  if (n >= 300) return 2
  return 1
}
export const potentialCol = (pot) => POTENTIAL_OPTIONS.find(p => p.value === pot)?.col ?? null
export const kinerjaLabelFromRow = (row) => row === 3 ? 'Tinggi' : row === 2 ? 'Sedang' : row === 1 ? 'Rendah' : null
export const potentialFromCol = (col) => col === 3 ? 'Tinggi' : col === 2 ? 'Sedang' : col === 1 ? 'Rendah' : ''

// Final Talent Box dari kombinasi kinerja (PK) × potensi.
export const finalTB = (pk, potential) => {
  const k = kinerjaRow(pk), c = potentialCol(potential)
  return (k && c) ? boxScore(k, c) : null
}

export const isTalentTB = (tb) => TALENT_BOXES.includes(tb)

export const useTrmStore = create(
  persist(
    (set) => ({
      // Map: { [employeeId]: TrmRecord }
      records: { ...TRM_RECORDS },

      saveRecord: (employeeId, data) =>
        set(s => ({
          records: {
            ...s.records,
            [employeeId]: {
              ...(s.records[employeeId] || {}),
              ...data,
              updatedAt: new Date().toISOString().split('T')[0],
            },
          },
        })),

      removeRecord: (employeeId) =>
        set(s => {
          const next = { ...s.records }
          delete next[employeeId]
          return { records: next }
        }),
    }),
    { name: 'hcm-trm-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)

export const blankRecord = () => ({
  pkScore: '', potential: '', fitness: '',
  areaStrength: '', areaImprovement: '',
  devShort: [], devLong: [],
  personnelPlan: '', careerObjective: '',
  isSuccessor: false,
  meetingDate: '', reviewedBy: '',
  status: 'Draft', approvedBy: '', approvedAt: '', cycle: null,
})
