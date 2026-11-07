import { prisma } from '@/lib/prisma'
import { pickOnboardingTemplate, fromOnboardingTemplate } from '@/lib/dbMap'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// PUT: update one template (partial fields).
export async function PUT(req, { params }) {
  try {
    const updated = await prisma.onboardingTemplate.update({
      where: { id: Number(params.id) },
      data: pickOnboardingTemplate(await req.json()),
    })
    return Response.json(fromOnboardingTemplate(updated))
  } catch {
    return dbDown()
  }
}

// DELETE: remove one template.
export async function DELETE(_req, { params }) {
  try {
    await prisma.onboardingTemplate.delete({ where: { id: Number(params.id) } })
    return new Response(null, { status: 204 })
  } catch {
    return dbDown()
  }
}
