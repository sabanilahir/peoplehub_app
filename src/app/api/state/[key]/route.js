import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── Cross-device store sync ──────────────────────────────────────────────────
// Generic key-value persistence for the app's zustand stores. Each store keeps
// its serialized state as one AppState row (last-write-wins). If the database
// isn't reachable the client keeps working from localStorage (503 → fallback).

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

export async function GET(_req, { params }) {
  const { key } = await params
  try {
    const row = await prisma.appState.findUnique({ where: { key } })
    return Response.json({ value: row ? row.value : null })
  } catch {
    return dbDown()
  }
}

export async function PUT(req, { params }) {
  const { key } = await params
  try {
    const { value } = await req.json()
    const str = typeof value === 'string' ? value : JSON.stringify(value ?? null)
    await prisma.appState.upsert({
      where:  { key },
      create: { key, value: str },
      update: { value: str },
    })
    return Response.json({ ok: true })
  } catch {
    return dbDown()
  }
}

export async function DELETE(_req, { params }) {
  const { key } = await params
  try {
    await prisma.appState.deleteMany({ where: { key } })
    return Response.json({ ok: true })
  } catch {
    return dbDown()
  }
}
