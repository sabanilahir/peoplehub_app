import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

export const PA_ACTIONS = [
  'Promote',
  'Transfer',
  'Demote',
  'Transfer Across Company',
  'Terminate',
  'Rehire',
  'Change Employment Type',
  'Extend Contract',
]

export const PA_REASONS = {
  'Promote':                  ['Performance-Based', 'Merit Promotion', 'Acting Assignment', 'Structural Change'],
  'Transfer':                 ['Internal Transfer', 'Interdepartmental Transfer', 'Business Need', 'Relocation', 'Restructuring'],
  'Demote':                   ['Performance Issue', 'Disciplinary Action', 'Voluntary Demotion', 'Restructuring'],
  'Transfer Across Company':  ['Intercompany Transfer', 'Business Restructure', 'Employee Request', 'Acquisition'],
  'Terminate':                ['Resignation', 'End of Contract', 'Retirement', 'Layoff / Redundancy', 'Dismissal', 'Mutual Agreement', 'Death'],
  'Rehire':                   ['Rehire After Resignation', 'Rehire After Contract End', 'Reinstatement', 'New Position'],
  'Change Employment Type':   ['Conversion from Contract', 'Conversion to Contract', 'Business Need', 'Mutual Agreement'],
  'Extend Contract':          ['Performance', 'Business Need', 'Project Extension', 'Mutual Agreement'],
}

export const PA_ACTION_COLOR = {
  'Promote':                  'bg-red-100 text-red-700',
  'Transfer':                 'bg-blue-100 text-blue-700',
  'Demote':                   'bg-orange-100 text-orange-700',
  'Transfer Across Company':  'bg-indigo-100 text-indigo-700',
  'Terminate':                'bg-red-100 text-red-700',
  'Rehire':                   'bg-green-100 text-green-700',
  'Change Employment Type':   'bg-cyan-100 text-cyan-700',
  'Extend Contract':          'bg-teal-100 text-teal-700',
}

export const PA_ACTION_ICON = {
  'Promote':                  '⬆️',
  'Transfer':                 '↔️',
  'Demote':                   '⬇️',
  'Transfer Across Company':  '🏢',
  'Terminate':                '🚪',
  'Rehire':                   '🔄',
  'Change Employment Type':   '📋',
  'Extend Contract':          '📅',
}

export const PA_STATUS_COLOR = {
  'Draft':     'bg-gray-100 text-gray-600',
  'Submitted': 'bg-yellow-100 text-yellow-700',
  'Approved':  'bg-blue-100 text-blue-700',
  'Rejected':  'bg-red-100 text-red-700',
  'Applied':   'bg-green-100 text-green-700',
}

// Maps PA action to the action value stored in employee history
export const PA_TO_HIST = {
  'Promote':                  'Promotion',
  'Transfer':                 'Transfer',
  'Demote':                   'Demotion',
  'Transfer Across Company':  'Transfer',
  'Terminate':                'Termination',
  'Rehire':                   'Hire',
  'Change Employment Type':   'Data Change',
  'Extend Contract':          'Data Change',
}

const pad3 = n => String(n).padStart(3, '0')

const SEED_PA = [
  {
    id: 1, paNumber: 'PA-2024-001',
    employeeId: 1, action: 'Promote', reason: 'Performance-Based',
    effectiveDate: '2024-07-01', status: 'Applied',
    note: 'Naik ke Senior Software Engineer berdasarkan hasil review tahunan',
    fromCompanyId: 1, fromDivisionId: 1, fromBusinessUnitId: 1, fromDepartmentId: 1,
    fromPositionId: 2, fromGradeId: 20, fromEmploymentType: 'Permanent', fromEndDate: '', fromStatus: 'Active',
    toCompanyId:   1, toDivisionId:   1, toBusinessUnitId:   1, toDepartmentId:   1,
    toPositionId:  3, toGradeId:      30, toEmploymentType: 'Permanent', toEndDate:   '', toStatus: 'Active',
    createdAt: '2024-06-15', appliedAt: '2024-07-01',
  },
  {
    id: 2, paNumber: 'PA-2025-001',
    employeeId: 5, action: 'Extend Contract', reason: 'Business Need',
    effectiveDate: '2025-02-13', status: 'Applied',
    note: 'Perpanjangan kontrak 1 tahun — project Finance ERP masih berjalan',
    fromCompanyId: 2, fromDivisionId: 3, fromBusinessUnitId: 3, fromDepartmentId: 4,
    fromPositionId: 6, fromGradeId: 15, fromEmploymentType: 'Contract', fromEndDate: '2025-02-13', fromStatus: 'Active',
    toCompanyId:   2, toDivisionId:   3, toBusinessUnitId:   3, toDepartmentId:   4,
    toPositionId:  6, toGradeId:      15, toEmploymentType: 'Contract', toEndDate:   '2026-02-12', toStatus: 'Active',
    createdAt: '2025-01-20', appliedAt: '2025-02-13',
  },
  {
    id: 3, paNumber: 'PA-2025-002',
    employeeId: 3, action: 'Transfer', reason: 'Business Need',
    effectiveDate: '2025-07-01', status: 'Draft',
    note: 'Pindah ke department Frontend sesuai kebutuhan proyek',
    fromCompanyId: 1, fromDivisionId: 1, fromBusinessUnitId: 1, fromDepartmentId: 2,
    fromPositionId: 1, fromGradeId: 20, fromEmploymentType: 'Permanent', fromEndDate: '', fromStatus: 'Active',
    toCompanyId:   1, toDivisionId:   1, toBusinessUnitId:   1, toDepartmentId:   1,
    toPositionId:  2, toGradeId:      20, toEmploymentType: 'Permanent', toEndDate:   '', toStatus: 'Active',
    createdAt: '2025-06-01', appliedAt: '',
  },
  {
    id: 4, paNumber: 'PA-2025-003',
    employeeId: 4, action: 'Change Employment Type', reason: 'Conversion from Contract',
    effectiveDate: '2025-09-01', status: 'Draft',
    note: 'Convert ke Permanent setelah 2 tahun kontrak dengan performa baik',
    fromCompanyId: 1, fromDivisionId: 1, fromBusinessUnitId: 2, fromDepartmentId: 3,
    fromPositionId: 5, fromGradeId: 30, fromEmploymentType: 'Contract', fromEndDate: '2025-09-01', fromStatus: 'Active',
    toCompanyId:   1, toDivisionId:   1, toBusinessUnitId:   2, toDepartmentId:   3,
    toPositionId:  5, toGradeId:      30, toEmploymentType: 'Permanent', toEndDate:   '', toStatus: 'Active',
    createdAt: '2025-08-01', appliedAt: '',
  },
  {
    id: 5, paNumber: 'PA-2025-004',
    employeeId: 8, action: 'Transfer Across Company', reason: 'Business Restructure',
    effectiveDate: '2025-10-01', status: 'Submitted',
    note: 'Mutasi antar perusahaan — kebutuhan Finance di NFC',
    fromCompanyId: 1, fromDivisionId: 1, fromBusinessUnitId: 1, fromDepartmentId: 1,
    fromPositionId: 3, fromGradeId: 30, fromEmploymentType: 'Permanent', fromEndDate: '', fromStatus: 'Active',
    toCompanyId:   2, toDivisionId:   3, toBusinessUnitId:   3, toDepartmentId:   4,
    toPositionId:  6, toGradeId:      20, toEmploymentType: 'Permanent', toEndDate:   '', toStatus: 'Active',
    createdAt: '2025-09-10', appliedAt: '',
  },
  {
    id: 6, paNumber: 'PA-2026-001',
    employeeId: 93, action: 'Terminate', reason: 'Voluntary Resign',
    reasonCategory: 'Further Study', rehireEligible: 'Yes',
    noticeDate: '2026-07-01', lastWorkingDay: '2026-07-31', noticeCompliant: true,
    effectiveDate: '2026-07-31', status: 'Approved',
    note: 'Mengundurkan diri untuk melanjutkan pendidikan. Handover ke tim sedang berjalan.',
    fromCompanyId: 1, fromDivisionId: 1, fromBusinessUnitId: 1, fromDepartmentId: 1,
    fromPositionId: 2, fromGradeId: 20, fromEmploymentType: 'Permanent', fromEndDate: '', fromStatus: 'Active',
    toCompanyId:   1, toDivisionId:   1, toBusinessUnitId:   1, toDepartmentId:   1,
    toPositionId:  2, toGradeId:      20, toEmploymentType: 'Permanent', toEndDate:   '2026-07-31', toStatus: 'Inactive',
    submittedByName: 'Onboarding Manager',
    createdAt: '2026-07-01', appliedAt: '',
  },
  {
    id: 7, paNumber: 'PA-2026-002',
    employeeId: 96, action: 'Terminate', reason: 'Voluntary Resign',
    reasonCategory: 'Better Opportunity', rehireEligible: 'Yes',
    noticeDate: '2026-07-10', lastWorkingDay: '2026-08-31', noticeCompliant: true,
    effectiveDate: '2026-08-31', status: 'Approved',
    note: 'Mengundurkan diri karena mendapat kesempatan karier baru. Handover sedang disiapkan.',
    fromCompanyId: 1, fromDivisionId: 1, fromBusinessUnitId: 1, fromDepartmentId: 1,
    fromPositionId: 2, fromGradeId: 20, fromEmploymentType: 'Permanent', fromEndDate: '', fromStatus: 'Active',
    toCompanyId:   1, toDivisionId:   1, toBusinessUnitId:   1, toDepartmentId:   1,
    toPositionId:  2, toGradeId:      20, toEmploymentType: 'Permanent', toEndDate:   '2026-08-31', toStatus: 'Inactive',
    submittedByName: 'Offboarding Manager',
    createdAt: '2026-07-10', appliedAt: '',
  },
]

let _nextId = 20

export const usePersonnelActionStore = create(
  persist(
    (set, get) => ({
      pas:        SEED_PA.map(p => ({ ...p })),
      paCounters: { 2024: 1, 2025: 4, 2026: 2 },

      nextNumber: () => {
        const year = new Date().getFullYear()
        const counters = get().paCounters
        const seq = (counters[year] || 0) + 1
        set(s => ({ paCounters: { ...s.paCounters, [year]: seq } }))
        return `PA-${year}-${pad3(seq)}`
      },

      addPA: (d) => set(s => ({
        pas: [...s.pas, { id: _nextId++, ...d }],
      })),

      updatePA: (id, d) => set(s => ({
        pas: s.pas.map(p => p.id === id ? { ...p, ...d } : p),
      })),

      deletePA: (id) => set(s => ({
        pas: s.pas.filter(p => p.id !== id),
      })),
    }),
    { name: 'pa-store', storage: createJSONStorage(() => dbStorage) }
  )
)
