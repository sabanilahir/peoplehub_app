import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

const SEED_HOLIDAYS = [
  { id:1,  country:'ID', name:'Tahun Baru Masehi',      date:'2025-01-01', type:'National', recurring:true  },
  { id:2,  country:'ID', name:'Isra Miraj',              date:'2025-01-27', type:'National', recurring:false },
  { id:3,  country:'ID', name:'Tahun Baru Imlek',        date:'2025-01-29', type:'National', recurring:false },
  { id:4,  country:'ID', name:'Hari Raya Nyepi',         date:'2025-03-29', type:'National', recurring:false },
  { id:5,  country:'ID', name:'Wafat Isa Almasih',       date:'2025-04-18', type:'National', recurring:false },
  { id:6,  country:'ID', name:'Idul Fitri (1)',           date:'2025-03-31', type:'National', recurring:false },
  { id:7,  country:'ID', name:'Idul Fitri (2)',           date:'2025-04-01', type:'National', recurring:false },
  { id:8,  country:'ID', name:'Hari Buruh',              date:'2025-05-01', type:'National', recurring:true  },
  { id:9,  country:'ID', name:'Kenaikan Isa Almasih',    date:'2025-05-29', type:'National', recurring:false },
  { id:10, country:'ID', name:'Idul Adha',               date:'2025-06-06', type:'National', recurring:false },
  { id:11, country:'ID', name:'Tahun Baru Islam',        date:'2025-06-27', type:'National', recurring:false },
  { id:12, country:'ID', name:'Kemerdekaan RI',          date:'2025-08-17', type:'National', recurring:true  },
  { id:13, country:'ID', name:'Maulid Nabi',             date:'2025-09-05', type:'National', recurring:false },
  { id:14, country:'ID', name:'Hari Raya Natal',         date:'2025-12-25', type:'National', recurring:true  },
  { id:15, country:'SG', name:"New Year's Day",          date:'2025-01-01', type:'National', recurring:true  },
  { id:16, country:'SG', name:'Chinese New Year (1)',    date:'2025-01-29', type:'National', recurring:false },
  { id:17, country:'SG', name:'National Day',            date:'2025-08-09', type:'National', recurring:true  },
  { id:18, country:'SG', name:'Christmas Day',           date:'2025-12-25', type:'National', recurring:true  },
]

let _id = SEED_HOLIDAYS.length + 1

export const useHolidayStore = create(persist(
  (set) => ({
    holidays:        SEED_HOLIDAYS.map(h => ({ ...h })),
    selectedCountry: 'ID',
    selectedYear:    new Date().getFullYear(),

    setCountry: (c) => set({ selectedCountry: c }),
    setYear:    (y) => set({ selectedYear: y }),

    addHoliday:    (h)     => set(s => ({ holidays: [...s.holidays, { id: _id++, ...h }] })),
    updateHoliday: (id, d) => set(s => ({ holidays: s.holidays.map(h => h.id === id ? { ...h, ...d } : h) })),
    deleteHoliday: (id)    => set(s => ({ holidays: s.holidays.filter(h => h.id !== id) })),
  }),
  {
    name: 'hcm-holiday-v1',
    storage: createJSONStorage(() => dbStorage),
    // UI-only selections stay device-local; only the holiday list syncs.
    partialize: (s) => ({ holidays: s.holidays }),
  }
))