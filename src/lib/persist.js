// Best-effort write-through to the DB API. Fire-and-forget: the in-memory store is
// the source of truth for UX; this just persists the change when a database is
// configured. If there is no DB (API responds 503) or the request fails, it is
// silently ignored so the app keeps working exactly as before.
export function persist(url, method, body) {
  if (typeof window === 'undefined') return
  try {
    fetch(url, {
      method,
      headers: body != null ? { 'content-type': 'application/json' } : undefined,
      body: body != null ? JSON.stringify(body) : undefined,
    }).catch(() => {})
  } catch {}
}
