import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Batch read: all store states in one request, so the client primes every
// zustand store from a single call on load instead of one per store.
export async function GET() {
  try {
    const rows = await prisma.appState.findMany()
    const map = {}
    for (const r of rows) map[r.key] = r.value
    return Response.json(map)
  } catch {
    return new Response(JSON.stringify({ error: 'db_unavailable' }), {
      status: 503, headers: { 'content-type': 'application/json' },
    })
  }
}
