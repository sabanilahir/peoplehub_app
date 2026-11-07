import { prisma } from '@/lib/prisma'
import { pickEmployee } from '@/lib/dbMap'

export const dynamic = 'force-dynamic'

const dbDown = () => new Response(JSON.stringify({ error: 'db_unavailable' }), {
  status: 503, headers: { 'content-type': 'application/json' },
})

// GET: all employees. 503 → client falls back to the static /data JSON.
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { id: 'asc' } })
    return Response.json(employees)
  } catch {
    return dbDown()
  }
}

// POST: create one employee (id supplied by the client store) and auto-create login User.
export async function POST(req) {
  try {
    const raw = await req.json()
    const created = await prisma.employee.create({ data: pickEmployee(raw, { withId: true }) })

    // Auto-create User account for this employee if not exists
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { employeeId: created.id },
            ...(created.nik ? [{ username: created.nik }] : []),
          ]
        }
      })

      if (!existingUser) {
        // Resolve department name and position name if provided or referenced
        let deptName = raw.dept || ''
        let posName = raw.position || ''
        if (!deptName && created.departmentId) {
          const d = await prisma.department.findUnique({ where: { id: created.departmentId } })
          if (d) deptName = d.name
        }
        if (!posName && created.positionId) {
          const p = await prisma.position.findUnique({ where: { id: created.positionId } })
          if (p) posName = p.name
        }

        // Determine user ID: prefer employee.id if free, otherwise max + 1
        const conflictId = await prisma.user.findUnique({ where: { id: created.id } })
        let userId = created.id
        if (conflictId) {
          const maxUser = await prisma.user.aggregate({ _max: { id: true } })
          userId = (maxUser._max?.id || 300000) + 1
        }

        // Determine username
        const baseUsername = (created.nik && created.nik.trim()) ||
          (created.email ? created.email.split('@')[0] : `emp_${created.id}`)

        // Check if username already exists, if so append ID
        const existingUsername = await prisma.user.findUnique({ where: { username: baseUsername } })
        const finalUsername = existingUsername ? `${baseUsername}_${created.id}` : baseUsername

        await prisma.user.create({
          data: {
            id: userId,
            username: finalUsername,
            password: 'pass123',
            name: created.name || '',
            role: created.role || 'employee',
            dept: deptName,
            position: posName,
            email: created.email || '',
            employeeId: created.id,
            imported_from: created.imported_from || 'manual',
          }
        })
      }
    } catch (userErr) {
      console.error('[Employee POST] Auto-create user failed (non-blocking):', userErr)
    }

    return Response.json(created, { status: 201 })
  } catch (err) {
    console.error('[Employee POST] Failed:', err)
    return dbDown()
  }
}
