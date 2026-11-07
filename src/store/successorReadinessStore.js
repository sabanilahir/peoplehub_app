import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

let _sid = 9100
const genId = () => _sid++

// ─── Successor Readiness Assessment ───────────────────────────────────────────
// Rekomendasi successor (by history/current position) ke key position tujuan.
// Readiness ditentukan otomatis dari kesesuaian kompetensi (competency fitness):
//   >70%  → Short Term  (siap saat ini)
//   50–70% → Medium Term (>1–3 tahun)
//   <50%  → Long Term   (>3–5 tahun)
// Default: apabila belum ada assessment → Long Term.

export const READINESS_LEVELS = [
  {
    value: 'Short', label: 'Short Term', fitRange: '> 70%', tone: 'success',
    definisi: 'Suksesor sudah siap menempati dan diperkirakan berkinerja baik pada key position yang diproyeksikan, sesuai asesmen dan pengamatan kinerja.',
    kriteria: [
      'Kesesuaian kompetensi >70% dengan tuntutan key position',
      'Memiliki pengalaman/paparan di scope fungsional key position',
    ],
  },
  {
    value: 'Medium', label: 'Medium Term', fitRange: '50 – 70%', tone: 'warning',
    definisi: 'Dalam >1–3 tahun suksesor berpotensi menempati key position. Dengan pengembangan terstruktur, kesiapan dapat dipercepat.',
    kriteria: [
      'Kesesuaian kompetensi 50–70% dengan tuntutan key position',
      'Memiliki pengalaman/paparan di sebagian scope fungsional key position',
      'Memerlukan pengembangan ke arah yang lebih strategis',
    ],
  },
  {
    value: 'Long', label: 'Long Term', fitRange: '< 50%', tone: 'neutral',
    definisi: 'Dalam >3–5 tahun suksesor berpotensi menempati key position. Dengan pengembangan terstruktur, kesiapan dapat dipercepat.',
    kriteria: [
      'Kesesuaian kompetensi <50% dengan tuntutan key position',
      'Memiliki pengalaman/paparan di sebagian kecil scope fungsional key position',
      'Memerlukan pengembangan mendalam dan luas di scope fungsional key position',
    ],
  },
]

export const SCOPE_OPTIONS = [
  { value: 'Full',    label: 'Scope penuh' },
  { value: 'Partial', label: 'Sebagian scope' },
  { value: 'Minimal', label: 'Sebagian kecil scope' },
]

// Readiness otomatis dari competency fitness. Default Long Term bila belum dinilai.
export const readinessFromFit = (fit, assessed) => {
  if (!assessed || fit === '' || fit == null) return 'Long'
  const n = Number(fit)
  if (n > 70) return 'Short'
  if (n >= 50) return 'Medium'
  return 'Long'
}

export const readinessMeta = (value) =>
  READINESS_LEVELS.find(l => l.value === value) || READINESS_LEVELS[2]

// ── Seed default successor per Key Position (nama denormalized) ────────────────
const _sc = (id, employeeId, employeeName, currentPosition, competencyFit, scope, emergency = false) =>
  ({ id, employeeId, employeeName, currentPosition, competencyFit, scope, assessed: true, emergency, notes: '' })

export const SEED_SUCCESSORS = {
  21: [
    _sc(9001, 990001, 'Andi Wijaya',      'SVP Corporate Strategy',        45, 'Partial'),
    _sc(9002, 990002, 'Sri Mulyani',      'VP Business Development',        40, 'Minimal'),
  ],
  18: [
    _sc(9003, 990003, 'Bayu Nugroho',     'VP Engineering',                82, 'Full', true),
    _sc(9004, 990004, 'Citra Lestari',    'Senior Manager Engineering',    58, 'Partial'),
  ],
  12: [
    _sc(9005, 990005, 'Dian Permata',     'Finance Controller',            78, 'Full'),
    _sc(9006, 990006, 'Eko Prasetyo',     'Senior Finance Manager',        52, 'Partial'),
  ],
  11: [
    _sc(9007, 990007, 'Fitri Handayani',  'HR Business Partner Lead',      60, 'Partial'),
  ],
  20: [
    _sc(9008, 990008, 'Gilang Ramadhan',  'VP Human Resources',            48, 'Minimal'),
  ],
  9: [
    _sc(9009, 990009, 'Hana Safitri',     'Senior Manager Engineering',    55, 'Partial'),
  ],
  7: [
    _sc(9010, 990010, 'Irfan Maulana',    'Finance Associate Manager',     72, 'Full', true),
  ],
  4: [
    _sc(9011, 990011, 'Joko Santoso',     'Senior Software Engineer',      68, 'Partial'),
  ],
  // Posisi 19 (CFO) sengaja tanpa successor → single point of failure untuk demo.
}

export const useSuccessorReadinessStore = create(
  persist(
    (set) => ({
      // Map: { [keyPositionId]: Successor[] }
      // Successor: { id, employeeId, employeeName, currentPosition, competencyFit, scope, assessed, emergency, notes }
      successors: { ...SEED_SUCCESSORS },

      addSuccessor: (keyPositionId, data) =>
        set(s => ({
          successors: {
            ...s.successors,
            [keyPositionId]: [
              ...(s.successors[keyPositionId] || []),
              {
                id: genId(),
                employeeId:   data.employeeId,
                employeeName: data.employeeName,
                currentPosition: data.currentPosition || '',
                competencyFit: data.competencyFit ?? '',
                scope: data.scope || '',
                assessed: !!data.assessed,
                emergency: !!data.emergency,   // kandidat cover darurat/interim
                notes: data.notes || '',
              },
            ],
          },
        })),

      updateSuccessor: (keyPositionId, id, patch) =>
        set(s => ({
          successors: {
            ...s.successors,
            [keyPositionId]: (s.successors[keyPositionId] || []).map(x =>
              x.id === id ? { ...x, ...patch } : x
            ),
          },
        })),

      removeSuccessor: (keyPositionId, id) =>
        set(s => ({
          successors: {
            ...s.successors,
            [keyPositionId]: (s.successors[keyPositionId] || []).filter(x => x.id !== id),
          },
        })),
    }),
    {
      name: 'hcm-successor-readiness-v1',
      storage: createJSONStorage(() => dbStorage),
      version: 2,
      migrate: (state) => ({ ...state, successors: { ...SEED_SUCCESSORS, ...(state?.successors || {}) } }),
    }
  )
)
