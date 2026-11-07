import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const SEED_SHIFTS = [
  { id:1, name:'Morning',   startTime:'08:00', endTime:'17:00', breakMinutes:60 },
  { id:2, name:'Afternoon', startTime:'13:00', endTime:'22:00', breakMinutes:60 },
  { id:3, name:'Night',     startTime:'22:00', endTime:'07:00', breakMinutes:60 },
]

const SEED_PATTERNS = [
  { id:1, name:'Standard 5-Day', entries:[
    { day:'Monday',    shiftId:1 },
    { day:'Tuesday',   shiftId:1 },
    { day:'Wednesday', shiftId:1 },
    { day:'Thursday',  shiftId:1 },
    { day:'Friday',    shiftId:1 },
  ]},
  { id:2, name:'Rotating 6-Day', entries:[
    { day:'Monday',    shiftId:1 },
    { day:'Tuesday',   shiftId:1 },
    { day:'Wednesday', shiftId:2 },
    { day:'Thursday',  shiftId:2 },
    { day:'Friday',    shiftId:1 },
    { day:'Saturday',  shiftId:1 },
  ]},
]

const SEED_SCHEDULES = [
  { id:1, name:'Office Regular',    patternId:1, effectiveDate:'2025-01-01' },
  { id:2, name:'Engineering Shift', patternId:2, effectiveDate:'2025-01-01' },
]

const SEED_ASSIGNMENTS = [
  { id:1, userId:1, name:'Budi Santoso', scheduleId:1, startDate:'2025-01-01' },
  { id:2, userId:2, name:'Dewi Rahayu',  scheduleId:1, startDate:'2025-01-01' },
  { id:3, userId:5, name:'Sari Indah',   scheduleId:2, startDate:'2025-03-01' },
]

let _sId=SEED_SHIFTS.length+1, _pId=SEED_PATTERNS.length+1,
    _scId=SEED_SCHEDULES.length+1, _aId=SEED_ASSIGNMENTS.length+1

export const useShiftStore = create(persist(
  (set) => ({
    shifts:      SEED_SHIFTS.map(s=>({...s})),
    patterns:    SEED_PATTERNS.map(p=>({...p})),
    schedules:   SEED_SCHEDULES.map(s=>({...s})),
    assignments: SEED_ASSIGNMENTS.map(a=>({...a})),

    addShift:    (s) => set(st=>({ shifts:      [...st.shifts,      { id:_sId++,  ...s }] })),
    updateShift: (id,d)=> set(st=>({ shifts:    st.shifts.map(s=>s.id===id?{...s,...d}:s) })),
    deleteShift: (id)=>   set(st=>({ shifts:    st.shifts.filter(s=>s.id!==id) })),

    addPattern:    (p) => set(st=>({ patterns:  [...st.patterns,    { id:_pId++,  ...p }] })),
    deletePattern: (id)=>  set(st=>({ patterns: st.patterns.filter(p=>p.id!==id) })),

    addSchedule:    (s) => set(st=>({ schedules:  [...st.schedules,    { id:_scId++, ...s }] })),
    deleteSchedule: (id)=>  set(st=>({ schedules: st.schedules.filter(s=>s.id!==id) })),

    addAssignment:    (a) => set(st=>({ assignments: [...st.assignments, { id:_aId++, ...a }] })),
    deleteAssignment: (id)=>  set(st=>({ assignments: st.assignments.filter(a=>a.id!==id) })),
  }),
  { name: 'hcm-shift-v1', storage: createJSONStorage(() => dbStorage) }
))
