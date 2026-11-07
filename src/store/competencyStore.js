import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'
import { IDP_METHODS, blankItem } from '@/store/idpStore'
import { useStructureStore } from '@/store/structureStore'

// ─── Competency Catalog & Position Profile ────────────────────────────────────
// Katalog kompetensi (master) + pemetaan kompetensi ke posisi (expected level).
// Dipakai IDP: kompetensi karyawan otomatis mengikuti profil posisinya.

export const COMPETENCY_CATEGORIES = ['Leadership', 'Core', 'Technical', 'Behavioral']
export const LEVEL_LABELS = { 1:'Basic', 2:'Developing', 3:'Proficient', 4:'Advanced', 5:'Expert' }

// ─── Competency Dictionary taxonomy (Add Competency form) ─────────────────────
// Domain kompetensi, tingkat kemahiran (Proficiency Alignment), dan Key Behavior.
export const COMPETENCY_DOMAINS = [
  'Core Competencies', 'Strategic Competencies', 'Soft Competencies', 'Functional Competencies',
]
// 5 tingkat Proficiency Alignment (level → label).
export const PROFICIENCY_ALIGNMENTS = [
  { level: 1, label: 'Familiar'   },
  { level: 2, label: 'Imitative'  },
  { level: 3, label: 'Operative'  },
  { level: 4, label: 'Complex'    },
  { level: 5, label: 'Conceptual' },
]
export const KEY_BEHAVIORS = ['A', 'B', 'C']

// Pemetaan Domain (form baru) ↔ category (dipakai IDP / Position Profile).
export const DOMAIN_TO_CATEGORY = {
  'Core Competencies':       'Core',
  'Strategic Competencies':  'Leadership',
  'Soft Competencies':       'Behavioral',
  'Functional Competencies': 'Technical',
}
export const CATEGORY_TO_DOMAIN = {
  Leadership:  'Strategic Competencies',
  Core:        'Core Competencies',
  Technical:   'Functional Competencies',
  Behavioral:  'Soft Competencies',
}

// Builder baris kosong untuk form.
export const blankScopeRow  = () => ({ descId: '', descEn: '' })
export const blankAlignments = () =>
  PROFICIENCY_ALIGNMENTS.map(a => ({
    level: a.level, label: a.label,
    behaviors: KEY_BEHAVIORS.map(k => ({ key: k, descId: '', descEn: '' })),
  }))

let _cid = 100
const cid = () => _cid++

const SEED_CATALOG = [
  { id: 1,  code: 'LDR01', name: 'Strategic Thinking',   category: 'Leadership', domain: 'Strategic Competencies',  description: 'Kemampuan menyusun arah & rencana strategis jangka panjang.' },
  { id: 2,  code: 'LDR02', name: 'People Management',     category: 'Leadership', domain: 'Strategic Competencies',  description: 'Mengelola, mengembangkan, dan memotivasi tim.' },
  { id: 3,  code: 'LDR03', name: 'Decision Making',       category: 'Leadership', domain: 'Strategic Competencies',  description: 'Mengambil keputusan tepat berbasis data & risiko.' },
  { id: 4,  code: 'COR01', name: 'Communication',         category: 'Core',       domain: 'Core Competencies',       description: 'Komunikasi efektif lisan & tulisan.' },
  { id: 5,  code: 'COR02', name: 'Collaboration',         category: 'Core',       domain: 'Core Competencies',       description: 'Bekerja sama lintas tim untuk hasil bersama.' },
  { id: 6,  code: 'COR03', name: 'Problem Solving',       category: 'Core',       domain: 'Core Competencies',       description: 'Menganalisis dan menyelesaikan masalah.' },
  { id: 7,  code: 'COR04', name: 'Adaptability',          category: 'Core',       domain: 'Core Competencies',       description: 'Fleksibel terhadap perubahan.' },
  { id: 8,  code: 'TEC01', name: 'Software Engineering',  category: 'Technical',  domain: 'Functional Competencies', description: 'Perancangan & pengembangan perangkat lunak.' },
  { id: 9,  code: 'TEC02', name: 'Data Analysis',         category: 'Technical',  domain: 'Functional Competencies', description: 'Analisis data untuk pengambilan keputusan.' },
  { id: 10, code: 'TEC03', name: 'Financial Analysis',    category: 'Technical',  domain: 'Functional Competencies', description: 'Analisis keuangan & pelaporan.' },
  { id: 11, code: 'TEC04', name: 'System Design',         category: 'Technical',  domain: 'Functional Competencies', description: 'Merancang arsitektur sistem skala besar.' },
  { id: 12, code: 'BEH01', name: 'Integrity',             category: 'Behavioral', domain: 'Soft Competencies',       description: 'Menjunjung etika & kejujuran.' },
  { id: 13, code: 'BEH02', name: 'Customer Focus',        category: 'Behavioral', domain: 'Soft Competencies',       description: 'Berorientasi pada kebutuhan pelanggan.' },
]

// Peta positionId → daftar { competencyId, expectedLevel }.
const SEED_POSITION_COMPETENCIES = {
  2:  [{ competencyId:8, expectedLevel:3 }, { competencyId:6, expectedLevel:3 }, { competencyId:4, expectedLevel:3 }, { competencyId:5, expectedLevel:2 }],
  3:  [{ competencyId:8, expectedLevel:4 }, { competencyId:11, expectedLevel:3 }, { competencyId:6, expectedLevel:4 }, { competencyId:4, expectedLevel:3 }],
  4:  [{ competencyId:2, expectedLevel:4 }, { competencyId:3, expectedLevel:3 }, { competencyId:8, expectedLevel:3 }, { competencyId:4, expectedLevel:4 }, { competencyId:5, expectedLevel:4 }],
  6:  [{ competencyId:10, expectedLevel:3 }, { competencyId:9, expectedLevel:3 }, { competencyId:4, expectedLevel:3 }, { competencyId:6, expectedLevel:3 }],
  7:  [{ competencyId:2, expectedLevel:4 }, { competencyId:10, expectedLevel:4 }, { competencyId:3, expectedLevel:3 }, { competencyId:4, expectedLevel:4 }],
  9:  [{ competencyId:1, expectedLevel:4 }, { competencyId:2, expectedLevel:4 }, { competencyId:3, expectedLevel:4 }, { competencyId:11, expectedLevel:3 }],
  12: [{ competencyId:1, expectedLevel:4 }, { competencyId:2, expectedLevel:4 }, { competencyId:10, expectedLevel:4 }, { competencyId:3, expectedLevel:4 }],
  18: [{ competencyId:1, expectedLevel:5 }, { competencyId:2, expectedLevel:4 }, { competencyId:11, expectedLevel:4 }, { competencyId:3, expectedLevel:4 }],
}

// ─── Default profile generator ────────────────────────────────────────────────
// Setiap posisi wajib punya profil kompetensi. Posisi yang belum dipetakan manual
// (Position Profile) otomatis memakai profil default yang diturunkan dari kategori
// grade (Position Class) + Job Family — sehingga posisi baru/impor pun tetap
// punya profil, bukan halaman kosong.

// Kategori grade → level ekspektasi dasar (1–5).
const CATEGORY_BASE_LEVEL = {
  'Board': 4, 'Intern': 1, 'Junior Staff': 1, 'Staff': 2,
  'Senior Staff': 3, 'Specialist': 3, 'Non-Manager': 3,
  'Manager': 4, 'Senior Manager': 4, 'General Manager': 4,
  'VP': 5, 'SVP': 5, 'EVP': 5, 'C-Level': 5,
}
const clampLvl = (n) => Math.max(1, Math.min(5, Math.round(n)))
const isManagerialGrade = (grade) =>
  !!grade && (grade.isMgr || grade.isBoard ||
    ['Manager', 'Senior Manager', 'General Manager', 'VP', 'SVP', 'EVP', 'C-Level', 'Board'].includes(grade.category))

// competencyId teknis per Job Family (id sesuai SEED_JOB_FAMILIES di structureStore).
const JOB_FAMILY_TECH = {
  1: [8, 11],   // Engineering → Software Engineering, System Design
  2: [10, 9],   // Finance → Financial Analysis, Data Analysis
  3: [9],       // Human Resources → Data Analysis
  4: [11, 8],   // Information Technology → System Design, Software Engineering
}

// Turunkan profil kompetensi default untuk sebuah posisi (pure).
export const buildDefaultPositionProfile = (position, grade) => {
  if (!position) return []
  const base = CATEGORY_BASE_LEVEL[grade?.category] ?? 2
  const mgr = isManagerialGrade(grade)
  const out = [
    // Core — untuk semua posisi.
    { competencyId: 4,  expectedLevel: clampLvl(base) },       // Communication
    { competencyId: 5,  expectedLevel: clampLvl(base) },       // Collaboration
    { competencyId: 6,  expectedLevel: clampLvl(base) },       // Problem Solving
    { competencyId: 7,  expectedLevel: clampLvl(base - 1) },   // Adaptability
    // Behavioral — untuk semua posisi.
    { competencyId: 12, expectedLevel: clampLvl(base) },       // Integrity
    { competencyId: 13, expectedLevel: clampLvl(base - 1) },   // Customer Focus
  ]
  // Leadership — hanya peran manajerial ke atas.
  if (mgr) {
    out.push(
      { competencyId: 1, expectedLevel: clampLvl(base) },      // Strategic Thinking
      { competencyId: 2, expectedLevel: clampLvl(base) },      // People Management
      { competencyId: 3, expectedLevel: clampLvl(base) },      // Decision Making
    )
  }
  // Technical — sesuai Job Family.
  ;(JOB_FAMILY_TECH[position.jobFamilyId] || []).forEach(id =>
    out.push({ competencyId: id, expectedLevel: clampLvl(mgr ? base - 1 : base) }))
  return out
}

// Resolusi profil posisi: pemetaan manual bila ada, jika tidak pakai default.
export const resolvePositionCompetencies = (positionId, positionCompetencies) => {
  const explicit = positionCompetencies?.[positionId]
  if (explicit && explicit.length) return explicit
  try {
    const st = useStructureStore.getState()
    const position = st.positions.find(p => p.id === Number(positionId))
    const grade = position && st.grades.find(g => g.id === position.gradeId)
    return buildDefaultPositionProfile(position, grade)
  } catch { return [] }
}

// Bangun daftar kompetensi IDP dari profil posisi (pure).
export const buildIdpCompetencies = (positionId, catalog, positionCompetencies) =>
  resolvePositionCompetencies(positionId, positionCompetencies).map(pc => {
    const c = catalog.find(x => x.id === pc.competencyId)
    return {
      id: `c${pc.competencyId}`,
      competencyId: pc.competencyId,
      name: c ? c.name : `#${pc.competencyId}`,
      category: c?.category || '',
      description: c?.description || '',
      expected: pc.expectedLevel,
      current: '',
      idp: '', detail: {},
      items: IDP_METHODS.reduce((o, m) => { o[m] = blankItem(); return o }, {}),
    }
  })

export const useCompetencyStore = create(
  persist(
    (set) => ({
      catalog: SEED_CATALOG.map(c => ({ ...c })),
      positionCompetencies: { ...SEED_POSITION_COMPETENCIES },

      addCompetency: (data) =>
        set(s => ({ catalog: [...s.catalog, { id: cid(), ...data }] })),
      updateCompetency: (id, patch) =>
        set(s => ({ catalog: s.catalog.map(c => c.id === id ? { ...c, ...patch } : c) })),
      deleteCompetency: (id) =>
        set(s => ({
          catalog: s.catalog.filter(c => c.id !== id),
          positionCompetencies: Object.fromEntries(
            Object.entries(s.positionCompetencies).map(([pid, list]) =>
              [pid, list.filter(x => x.competencyId !== id)])
          ),
        })),

      // Simpan seluruh mapping kompetensi untuk sebuah posisi.
      setPositionCompetencies: (positionId, list) =>
        set(s => ({ positionCompetencies: { ...s.positionCompetencies, [positionId]: list } })),
    }),
    { name: 'hcm-competency-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
