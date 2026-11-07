import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveUserRole } from '@/lib/roleResolver'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { id: 'asc' } })
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })

    const userByEmpId = new Map()
    const userByUsername = new Map()
    let maxUserId = 0

    for (const u of users) {
      if (u.employeeId) userByEmpId.set(u.employeeId, u)
      if (u.username) userByUsername.set(String(u.username).toLowerCase(), u)
      if (u.id > maxUserId) maxUserId = u.id
    }

    let createdCount = 0
    let updatedCount = 0

    // Fetch department and position lookups for human-readable labels
    const departments = await prisma.department.findMany()
    const positions = await prisma.position.findMany()
    const deptMap = new Map(departments.map(d => [d.id, d.name]))
    const posMap = new Map(positions.map(p => [p.id, p.name]))

    for (const emp of employees) {
      const empUsername = (emp.nik && emp.nik.trim()) ||
        (emp.email ? emp.email.split('@')[0] : `emp_${emp.id}`)
      const usernameKey = empUsername.toLowerCase()

      const existingByEmpId = userByEmpId.get(emp.id)
      const existingByUsername = userByUsername.get(usernameKey)
      const targetUser = existingByEmpId || existingByUsername

      const deptName = emp.dept || (emp.departmentId ? deptMap.get(emp.departmentId) : '') || ''
      const posName = emp.position || (emp.positionId ? posMap.get(emp.positionId) : '') || ''
      const resolvedRole = resolveUserRole({
        ...emp,
        dept: deptName,
        position: posName,
      })

      if (targetUser) {
        // Ensure employeeId, role, and details are updated accurately
        const currentRole = targetUser.role
        const isProtectedRole = currentRole === 'superadmin' // don't demote superadmin
        const newRole = isProtectedRole ? currentRole : resolvedRole

        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            employeeId: emp.id,
            name: targetUser.name || emp.name,
            email: targetUser.email || emp.email || '',
            dept: deptName || targetUser.dept,
            position: posName || targetUser.position,
            role: newRole,
          }
        })
        updatedCount++
      } else {
        // Create new User account
        maxUserId++
        const newId = maxUserId

        await prisma.user.create({
          data: {
            id: newId,
            username: empUsername,
            password: 'pass123',
            name: emp.name || '',
            role: resolvedRole,
            dept: deptName,
            position: posName,
            email: emp.email || '',
            employeeId: emp.id,
            imported_from: emp.imported_from || 'manual',
          }
        })
        userByEmpId.set(emp.id, { id: newId, username: empUsername })
        userByUsername.set(usernameKey, { id: newId, username: empUsername })
        createdCount++
      }
    }

    const totalUsers = await prisma.user.count()

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai. ${createdCount} user baru dibuat, ${updatedCount} user diperbarui.`,
      stats: {
        totalEmployees: employees.length,
        createdCount,
        updatedCount,
        totalUsers,
      }
    })
  } catch (error) {
    console.error('[Sync Users from Employees] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}

