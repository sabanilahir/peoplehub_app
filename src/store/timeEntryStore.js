import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Raw time entries ingested from an external time-tracking integration
// (CSV drop) — employeeNumber is matched against Employee.nik at import
// time; employeeId/employeeName are resolved snapshots so the list still
// reads correctly even if the employee record later changes.
const SEED_ENTRIES = [
  { id: 1, employeeNumber: 'ENG-001', employeeId: 1, employeeName: 'Budi Santoso',
    startDate: '2026-08-24', startTime: '08:02', endDate: '2026-08-24', endTime: '17:15',
    batchId: 'seed', batchLabel: 'Contoh data awal', importedAt: '2026-08-24T09:00:00.000Z' },
  { id: 2, employeeNumber: 'ENG-MGR-02', employeeId: 2, employeeName: 'Dewi Rahayu',
    startDate: '2026-08-24', startTime: '08:45', endDate: '2026-08-24', endTime: '18:30',
    batchId: 'seed', batchLabel: 'Contoh data awal', importedAt: '2026-08-24T09:00:00.000Z' },
  { id: 3, employeeNumber: 'EXT-9999', employeeId: null, employeeName: null,
    startDate: '2026-08-24', startTime: '09:00', endDate: '2026-08-24', endTime: '16:00',
    batchId: 'seed', batchLabel: 'Contoh data awal', importedAt: '2026-08-24T09:00:00.000Z' },
]

let _entryId = SEED_ENTRIES.length + 1

export const useTimeEntryStore = create(persist(
  (set) => ({
    timeEntries: SEED_ENTRIES.map(x => ({ ...x })),

    addEntries: (rows) => set(s => ({
      timeEntries: [...s.timeEntries, ...rows.map(r => ({ id: _entryId++, ...r }))],
    })),
    deleteEntry: (id) => set(s => ({ timeEntries: s.timeEntries.filter(x => x.id !== id) })),
    deleteBatch: (batchId) => set(s => ({ timeEntries: s.timeEntries.filter(x => x.batchId !== batchId) })),
  }),
  { name: 'hcm-time-entries-v1', storage: createJSONStorage(() => dbStorage) }
))
