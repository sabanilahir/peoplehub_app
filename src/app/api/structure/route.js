import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Returns the full org structure from the database (grades excluded — the client
// already holds the standard Mercer PC map). Falls back via 503 when DB is absent.
export async function GET() {
  try {
    const [enterprises, divisions, companies, businessUnits, departments, jobFamilies, positions] =
      await Promise.all([
        prisma.enterprise.findMany({ orderBy: { id: 'asc' } }),
        prisma.division.findMany({ orderBy: { id: 'asc' } }),
        prisma.company.findMany({ orderBy: { id: 'asc' } }),
        prisma.businessUnit.findMany({ orderBy: { id: 'asc' } }),
        prisma.department.findMany({ orderBy: { id: 'asc' } }),
        prisma.jobFamily.findMany({ orderBy: { id: 'asc' } }),
        prisma.position.findMany({ orderBy: { id: 'asc' } }),
      ])
    return Response.json({ enterprises, divisions, companies, businessUnits, departments, jobFamilies, positions })
  } catch {
    return new Response(JSON.stringify({ error: 'db_unavailable' }), {
      status: 503, headers: { 'content-type': 'application/json' },
    })
  }
}
