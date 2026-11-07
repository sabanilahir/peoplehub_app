'use client'
// Persistent React state backed by the shared AppState table (Postgres) via
// dbStorage — the same cross-device store used by the zustand `persist` stores.
// Drop-in replacement for useState when the value is domain data that should
// survive refreshes and sync across devices:
//
//   const [rows, setRows] = useDbState('my-page-rows', SEED)
//
// setRows accepts a value or an updater fn, just like useState, and writes the
// new value to the database (mirrored to localStorage) on every change.
import { useState, useEffect, useRef, useCallback } from 'react'
import { dbStorage } from '@/lib/dbStorage'

export function useDbState(key, initial) {
  const [state, setState] = useState(initial)
  const initialRef = useRef(initial)

  // Hydrate once from DB (falls back to localStorage; seeds the DB if empty).
  useEffect(() => {
    let alive = true
    Promise.resolve(dbStorage.getItem(key)).then(raw => {
      if (!alive) return
      if (raw != null) {
        try { setState(JSON.parse(raw)) } catch {}
      } else {
        // No stored value yet → push the seed so every device reads the same data.
        try { dbStorage.setItem(key, JSON.stringify(initialRef.current)) } catch {}
      }
    })
    return () => { alive = false }
  }, [key])

  const set = useCallback((v) => {
    setState(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      try { dbStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return [state, set]
}
