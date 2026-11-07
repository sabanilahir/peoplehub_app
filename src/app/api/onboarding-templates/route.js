import { prisma } from '@/lib/prisma'
import { pickOnboardingTemplate, fromOnboardingTemplate } from '@/lib/dbMap'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// GET: all templates. 503 → client keeps its localStorage copy.
export async function GET() {
  try {
    const rows = await prisma.onboardingTemplate.findMany({ orderBy: { id: 'asc' } })
    return Response.json(rows.map(fromOnboardingTemplate))
  } catch {
    return dbDown()
  }
}

// POST: create/replace one template (id supplied by the client store).
export async function POST(req) {
  try {
    const body = await req.json()
    const data = pickOnboardingTemplate(body, { withId: true })
    // Upsert so a re-created id (or retry) doesn't 500 on unique-id conflict.
    const { id, ...rest } = data
    const saved = await prisma.onboardingTemplate.upsert({
      where: { id }, create: data, update: rest,
    })
    return Response.json(fromOnboardingTemplate(saved), { status: 201 })
  } catch {
    return dbDown()
  }
}
