import { PrismaClient } from '@prisma/client'
import { resolveUserRole } from '../src/lib/roleResolver.js'

const prisma = new PrismaClient()

async function main() {
  console.log('--- 1. Ensuring Roles in PostgreSQL Role Table ---')
  const rolesToEnsure = [
    { name: 'superadmin', label: 'Superadmin', color: '#dc2626', description: 'Akses penuh ke semua fitur sistem', isSystem: true },
    { name: 'hr_manager', label: 'HR Manager', color: '#2563eb', description: 'Manajer HR dengan akses penuh ke modul HR', isSystem: true },
    { name: 'hr', label: 'HR Staff', color: '#7c3aed', description: 'Staff HR dengan akses operasional HR', isSystem: true },
    { name: 'hr_officer', label: 'HR Officer', color: '#0891b2', description: 'Officer HR untuk operasional harian', isSystem: true },
    { name: 'manager', label: 'Manager', color: '#059669', description: 'Manager dengan akses MSS dan tim', isSystem: true },
    { name: 'supervisor', label: 'Supervisor / Coordinator', color: '#0891b2', description: 'Supervisor & Koordinator tim dengan akses MSS', isSystem: true },
    { name: 'senior_staff', label: 'Senior Staff', color: '#6366f1', description: 'Senior Staff operasional & lead teknis', isSystem: true },
    { name: 'staff', label: 'Staff', color: '#d97706', description: 'Staff operasional dengan akses ESS', isSystem: true },
    { name: 'employee', label: 'Employee', color: '#64748b', description: 'Karyawan umum dengan akses ESS', isSystem: true },
  ]

  for (const r of rolesToEnsure) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {
        label: r.label,
        color: r.color,
        description: r.description,
        isSystem: r.isSystem,
      },
      create: {
        name: r.name,
        label: r.label,
        color: r.color,
        description: r.description,
        isSystem: r.isSystem,
        permissions: [],
      },
    })
  }
  console.log('Roles successfully ensured in DB.')

  console.log('--- 2. Reading Employees and Resolving Roles ---')
  const employees = await prisma.employee.findMany()
  console.log(`Total employees to process: ${employees.length}`)

  let updatedEmployees = 0
  let updatedUsers = 0

  const roleCounts = {}

  for (const emp of employees) {
    // Preserve superadmin or specific manual admin roles
    if (emp.role === 'superadmin') {
      roleCounts['superadmin'] = (roleCounts['superadmin'] || 0) + 1
      continue
    }

    const newRole = resolveUserRole(emp)
    roleCounts[newRole] = (roleCounts[newRole] || 0) + 1

    if (emp.role !== newRole) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { role: newRole },
      })
      updatedEmployees++
    }

    // Sync to user record if exists
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: emp.id },
          { id: emp.id },
          ...(emp.nik ? [{ username: emp.nik }] : []),
        ],
      },
    })

    if (user && user.role !== 'superadmin' && user.role !== newRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: newRole },
      })
      updatedUsers++
    }
  }

  console.log('Role distribution after sync:', roleCounts)
  console.log(`Updated ${updatedEmployees} employee records and ${updatedUsers} user records.`)

  // Check Addis, Rini, Nico
  const testEmps = await prisma.employee.findMany({
    where: {
      OR: [
        { name: { contains: 'Addis', mode: 'insensitive' } },
        { name: { contains: 'Rini', mode: 'insensitive' } },
        { name: { contains: 'Nico', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, jobPosition: true, role: true },
  })
  console.log('Sample key employees after sync:', testEmps)
}

main().finally(() => prisma.$disconnect())
