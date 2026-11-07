// Database-backed storage for zustand `persist`, so a store's state syncs across
// devices. It reads/writes the AppState table via /api/state/<key>, and always
// mirrors to localStorage so the app keeps working offline or when no database
// is configured (the API answers 503 → we fall back to the local copy).
//
// Usage in a store:
//   import { createJSONStorage } from 'zustand/middleware'
//   import { dbStorage } from '@/lib/dbStorage'
//   persist(fn, { name: 'my-store', storage: createJSONStorage(() => dbStorage) })

// Membersihkan cache localStorage jika mendekati kuota 5MB browser
function cleanupStorageIfHigh() {
  if (typeof window === 'undefined') return
  try {
    // 1. Selalu bersihkan key bloat yang tidak perlu disimpan di client
    localStorage.removeItem('hcm-emergency-sos-v1')

    // 2. Hitung total penggunaan
    let total = 0
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) {
        const len = (localStorage.getItem(k) || '').length
        total += len
        keys.push({ key: k, len })
      }
    }

    // Jika total melebihi 2.5 MB, bersihkan store besar non-kritis yang sudah ada di database
    if (total > 2.5 * 1024 * 1024) {
      console.warn(`[dbStorage] LocalStorage usage high (${(total / 1024 / 1024).toFixed(2)} MB). Evicting large cache items...`)
      keys.sort((a, b) => b.len - a.len)
      for (const item of keys) {
        // Jangan hapus sesi autentikasi dan user aktif
        if (item.key === 'hcm-auth' || item.key === 'hcm-user') continue
        if (item.len > 100 * 1024) {
          localStorage.removeItem(item.key)
        }
      }
    }
  } catch (e) {}
}

// Jalankan pembersihan saat inisialisasi di client
if (typeof window !== 'undefined') {
  cleanupStorageIfHigh()
}

const local = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => {
    try {
      // Cegah data raksasa (>150KB) membanjiri kuota 5MB browser (data tetap aman di PostgreSQL)
      if (typeof v === 'string' && v.length > 150000) {
        localStorage.removeItem(k)
        return
      }
      localStorage.setItem(k, v)
    } catch (err) {
      cleanupStorageIfHigh()
      try {
        if (typeof v === 'string' && v.length <= 150000) {
          localStorage.setItem(k, v)
        }
      } catch (retryErr) {}
    }
  },
  del: (k) => { try { localStorage.removeItem(k) } catch {} },
}

// Prime every store from ONE request on load (instead of one fetch per store).
// `primeMap` is a { key: value } snapshot of the whole AppState table; null when
// the database is unreachable, so callers fall back to localStorage.
let primePromise = null
function prime() {
  if (primePromise) return primePromise
  primePromise = fetch('/api/state')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
  return primePromise
}

// Debounce writes per key so rapid state changes collapse into one request.
const timers = {}
const pending = {}
function flush(key, unloading = false) {
  if (!(key in pending)) return Promise.resolve()
  const value = pending[key]
  delete pending[key]
  return fetch(`/api/state/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value }),
    // Only set keepalive for the unload path below — browsers cap keepalive
    // request bodies at ~64KB, which large stores (e.g. payroll with 1000+
    // rows) can exceed, silently failing an otherwise-normal write.
    ...(unloading ? { keepalive: true } : {}),
  }).catch(() => {})
}

// Skip the debounce and write a key immediately, resolving once the PUT
// lands — for actions like an explicit "Save" button, where the caller may
// navigate right after and needs the database to already be caught up.
function flushNow(key) {
  clearTimeout(timers[key])
  return flush(key)
}

// Flush every pending (debounced) write immediately — used on page unload so a
// refresh/navigation can't drop a change and then reload a stale DB copy.
function flushAll() {
  for (const key of Object.keys(pending)) { clearTimeout(timers[key]); flush(key, true) }
}
if (typeof window !== 'undefined' && !window.__kpbDbStorageUnload) {
  window.__kpbDbStorageUnload = true
  window.addEventListener('pagehide', flushAll)
  window.addEventListener('beforeunload', flushAll)
  // Flush when the tab is hidden too (mobile Safari may never fire pagehide).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll() })
}

export const dbStorage = {
  flushNow,

  getItem: async (name) => {
    // Prefer the database (shared across devices); fall back to localStorage.
    const map = await prime()
    if (map) {
      if (map[name] != null) { local.set(name, map[name]); return map[name] }
      // DB reachable but empty for this key → keep the local copy; the next
      // change persists it (and thus reaches other devices).
      return local.get(name)
    }
    return local.get(name)
  },

  setItem: (name, value) => {
    local.set(name, value)
    pending[name] = value
    clearTimeout(timers[name])
    timers[name] = setTimeout(() => flush(name), 400)
  },

  removeItem: (name) => {
    local.del(name)
    clearTimeout(timers[name])
    fetch(`/api/state/${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {})
  },
}
