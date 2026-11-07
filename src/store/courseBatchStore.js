import { create }  from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const INIT = [
  { id:1, batch_name:'Batch 1 - K3 Dasar Jan 2025',       course:'K3 & Keselamatan Kerja Dasar',      method:'Instructor Led Training (ILT)', start_date:'2025-01-15', end_date:'2025-01-15', instructor:'Budi Santoso', location:'Ruang Training A Lt.3', capacity:30, enrolled:28, status:'Completed' },
  { id:2, batch_name:'Batch 2 - K3 Dasar Mar 2025',       course:'K3 & Keselamatan Kerja Dasar',      method:'Instructor Led Training (ILT)', start_date:'2025-03-10', end_date:'2025-03-10', instructor:'Budi Santoso', location:'Ruang Training A Lt.3', capacity:30, enrolled:25, status:'Completed' },
  { id:3, batch_name:'Batch 1 - Leadership L1 Q2 2025',   course:'Leadership Fundamentals Level 1',   method:'Blended Learning',               start_date:'2025-04-01', end_date:'2025-05-31', instructor:'Sari Dewi',   location:'Hybrid',              capacity:25, enrolled:22, status:'Completed' },
  { id:4, batch_name:'Batch 1 - Excel HR Juli 2025',      course:'Excel Advanced for HR',             method:'Self-Paced',                     start_date:'2025-07-01', end_date:'2025-07-31', instructor:'Self-Paced',  location:'Online',              capacity:50, enrolled:38, status:'In Progress' },
  { id:5, batch_name:'Batch 1 - GCG Compliance Agt 2025', course:'GCG & Compliance Certification',    method:'Blended Learning',               start_date:'2025-08-01', end_date:'2025-09-30', instructor:'Ahmad Fauzi', location:'Hybrid',              capacity:40, enrolled:12, status:'Open' },
]

let _nextId = 6

export const useCourseBatchStore = create(
  persist(
    (set) => ({
      batches: INIT,

      addBatch: (data) =>
        set(s => ({ batches: [...s.batches, { ...data, id: _nextId++, enrolled: 0 }] })),

      updateBatch: (id, patch) =>
        set(s => ({ batches: s.batches.map(b => b.id === id ? { ...b, ...patch } : b) })),

      deleteBatch: (id) =>
        set(s => ({ batches: s.batches.filter(b => b.id !== id) })),
    }),
    { name: 'hcm-course-batch-v1', storage: createJSONStorage(() => dbStorage) }
  )
)
