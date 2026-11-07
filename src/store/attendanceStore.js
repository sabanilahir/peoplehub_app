// src/store/attendanceStore.js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'
import { localDateStr } from '@/lib/workSchedule'

const today = new Date()
// Local calendar date, not toISOString() — that converts to UTC first, which
// silently rolls WIB (UTC+7) dates back a day for roughly the first 7 hours
// of every day.
const fmt = localDateStr

// Generate seed attendance untuk 14 hari terakhir (demo fallback)
const genRecords = () => {
  const employees = [
    { id: 1, name: 'Budi Santoso' },
    { id: 2, name: 'Dewi Rahayu' },
    { id: 5, name: 'Sari Indah' },
  ]
  const records = []
  let _id = 1
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue
    const ds = fmt(d)
    employees.forEach(emp => {
      const rand = Math.random()
      const status = rand < 0.8 ? 'Present' : rand < 0.9 ? 'Late' : 'Absent'
      records.push({
        id: _id++,
        userId:   emp.id,
        empId:    emp.id,
        name:     emp.name,
        date:     ds,
        checkIn:  status !== 'Absent' ? (status === 'Late' ? '09:15' : '08:00') : null,
        checkOut: status !== 'Absent' ? '17:00' : null,
        status,
      })
    })
  }
  return records
}

// ✅ FIX: counter dimulai jauh di atas seed (seed max ~42 records),
// dan akan di-bump lagi setelah hydration via onRehydrateStorage.
let _id = 1000

export const todayStr = () => localDateStr(new Date())

// Helper: tulis ke DB secara fire-and-forget (best-effort)
async function persistToDb(method, path, body) {
  if (typeof window === 'undefined') return
  try {
    await fetch(path, {
      method,
      headers: body != null ? { 'content-type': 'application/json' } : undefined,
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch {}
}

export const useAttendanceStore = create(persist(
  (set, get) => ({
    records: genRecords(),

    addRecord: (r) => {
      const newRecord = { id: _id++, ...r }
      set((s) => ({ records: [...s.records, newRecord] }))
      // Write-through ke DB
      persistToDb('POST', '/api/attendance', {
        empId:    r.userId ?? r.empId,
        date:     r.date,
        checkIn:  r.checkIn  ?? null,
        checkOut: r.checkOut ?? null,
        status:   r.status   ?? 'Present',
      })
    },

    updateRecord: (id, d) => {
      set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...d } : r)) }))
      // Write-through ke DB (best-effort)
      persistToDb('PUT', `/api/attendance/${id}`, d)
    },

    // One record per employee per day — Clock In creates it, Clock Out fills
    // in the other half.
    recordFor: (userId, date = todayStr()) =>
      get().records.find(r => r.userId === userId && r.date === date) || null,

    // Clock In: satu kali per hari per user (clock-in pertama yang berlaku)
    clockIn: (userId, name, time, { date = todayStr(), status = 'Present' } = {}) => {
      set((s) => {
        const existing = s.records.find(r => r.userId === userId && r.date === date)
        if (existing) {
          // Never overwrite an earlier clock-in; the first one of the day stands.
          if (existing.checkIn && existing.checkIn !== '-') return s
          // Update record yang ada (belum punya checkIn)
          persistToDb('PUT', `/api/attendance/${existing.id}`, { checkIn: time, status })
          return {
            records: s.records.map(r =>
              r === existing ? { ...r, checkIn: time, status } : r
            ),
          }
        }
        // Buat record baru
        const newId = _id++
        const newRecord = { id: newId, userId, empId: userId, name, date, checkIn: time, checkOut: null, status }
        persistToDb('POST', '/api/attendance', { empId: userId, date, checkIn: time, status })
        return { records: [...s.records, newRecord] }
      })
    },

    // Clock Out: isi checkOut pada record hari ini
    clockOut: (userId, time, { date = todayStr() } = {}) => {
      set((s) => {
        const existing = s.records.find(r => r.userId === userId && r.date === date)
        if (existing) {
          persistToDb('PUT', `/api/attendance/${existing.id}`, { checkOut: time })
        }
        return {
          records: s.records.map(r =>
            r.userId === userId && r.date === date ? { ...r, checkOut: time } : r,
          ),
        }
      })
    },
  }),
  {
    name: 'hcm-attendance-v1',
    storage: createJSONStorage(() => dbStorage),

    // ✅ FIX bug duplicate key:
    // Setelah hydration dari localStorage/DB, bump _id ke atas max id yang sudah ada
    onRehydrateStorage: () => (state) => {
      if (!state) return
      const maxId = (state.records || []).reduce((m, r) => Math.max(m, r.id ?? 0), 0)
      if (maxId >= _id) _id = maxId + 1
    },
  }
))

// ─── Hydrate dari DB saat pertama load ────────────────────────────────────────
// Prioritas: DB via /api/attendance → fallback ke seed lokal
// Hanya dijalankan sekali di client (window flag guard)
if (typeof window !== 'undefined' && !window.__kpbAttendanceLoaded) {
  window.__kpbAttendanceLoaded = true
  const load = async () => {
    try {
      const r = await fetch('/api/attendance')
      if (r.ok) {
        const rows = await r.json()
        if (Array.isArray(rows) && rows.length > 0) {
          // Normalize: DB pakai empId, store pakai userId
          return rows.map(row => ({
            ...row,
            userId:   row.empId,
            checkIn:  row.checkIn  ?? null,
            checkOut: row.checkOut ?? null,
          }))
        }
      }
    } catch {}
    return null // null = pakai seed lokal
  }
  load().then(rows => {
    if (!rows) return
    useAttendanceStore.setState(s => {
      const seen = new Set(s.records.map(r => `${r.userId}-${r.date}`))
      const add  = rows.filter(r => !seen.has(`${r.userId}-${r.date}`))
      // Bump _id counter agar tidak overlap dengan id dari DB
      const maxId = rows.reduce((m, r) => Math.max(m, r.id ?? 0), 0)
      if (maxId >= _id) _id = maxId + 1
      return { records: [...s.records, ...add] }
    })
  }).catch(() => { window.__kpbAttendanceLoaded = false })
}
