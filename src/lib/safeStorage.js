import { createJSONStorage } from 'zustand/middleware'

// A localStorage wrapper whose writes never throw. This app persists a lot of
// state, so localStorage can hit the browser quota; a failing setItem must not
// crash the page. On failure we degrade to in-memory state for the session.
const safeLocalStorage = {
  getItem: (name) => {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null }
    catch { return null }
  },
  setItem: (name, value) => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, value) }
    catch { /* quota exceeded / private mode — keep working in-memory */ }
  },
  removeItem: (name) => {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name) }
    catch { /* ignore */ }
  },
}

// Drop-in `storage` option for zustand's persist middleware.
export const safeJSONStorage = () => createJSONStorage(() => safeLocalStorage)
