// Seed script: Insert FALLBACK_SEED_USERS into PostgreSQL
// Run: node prisma/seed-fallback.js

const { PrismaClient } = require('@prisma/client')

const FALLBACK_EMPLOYEES = [
  { id: 1,  name: 'Budi Santoso',     nik: 'EMP-001', email: 'budi@testing.com',    dept: 'Engineering',    position: 'Software Engineer',       status: 'Active', role: 'employee'   },
  { id: 2,  name: 'Dewi Rahayu',     nik: 'EMP-002', email: 'dewi@testing.com',    dept: 'Engineering',    position: 'Engineering Manager',    status: 'Active', role: 'manager'    },
  { id: 3,  name: 'Rina Marlina',     nik: 'EMP-003', email: 'rina@testing.com',    dept: 'HR',             position: 'HR Specialist',          status: 'Active', role: 'hr'         },
  { id: 4,  name: 'Ahmad Fauzi',     nik: 'EMP-004', email: 'ahmad@testing.com',   dept: 'IT',             position: 'System Administrator',   status: 'Active', role: 'superadmin' },
]

const FALLBACK_USERS = [
  { id: 1,  username: 'employee', password: 'pass123', name: 'Budi Santoso',     role: 'employee',   dept: 'Engineering',    position: 'Software Engineer',        email: 'budi@testing.com',    employeeId: 1 },
  { id: 2,  username: 'manager',  password: 'pass123', name: 'Dewi Rahayu',      role: 'manager',    dept: 'Engineering',    position: 'Engineering Manager',      email: 'dewi@testing.com',    employeeId: 2 },
  { id: 3,  username: 'hr',      password: 'pass123', name: 'Rina Marlina',     role: 'hr',         dept: 'HR',             position: 'HR Specialist',            email: 'rina@testing.com',    employeeId: 3 },
  { id: 4,  username: 'admin',   password: 'pass123', name: 'Ahmad Fauzi',      role: 'superadmin', dept: 'IT',             position: 'System Administrator',     email: 'ahmad@testing.com',   employeeId: 4 },
]

async function seed() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Seeding FALLBACK users and employees...\n')
    
    // ── Seed Employees ──────────────────────────────────────────────
    console.log('📋 Seeding Employees...')
    for (const emp of FALLBACK_EMPLOYEES) {
      const existing = await prisma.employee.findUnique({ where: { id: emp.id } })
      if (existing) {
        console.log(`  ⏭️  Employee #${emp.id} (${emp.name}) already exists`)
      } else {
        await prisma.employee.create({
          data: {
            id: emp.id,
            nik: emp.nik,
            name: emp.name,
            email: emp.email,
            dept: emp.dept,
            position: emp.position,
            status: emp.status,
            role: emp.role,
            imported_from: 'fallback',
          }
        })
        console.log(`  ✅ Created Employee #${emp.id}: ${emp.name}`)
      }
    }
    
    // ── Seed Users ─────────────────────────────────────────────────
    console.log('\n👥 Seeding Users...')
    for (const user of FALLBACK_USERS) {
      const existing = await prisma.user.findUnique({ where: { id: user.id } })
      if (existing) {
        console.log(`  ⏭️  User #${user.id} (${user.username}) already exists`)
      } else {
        await prisma.user.create({
          data: {
            id: user.id,
            username: user.username,
            password: user.password,
            name: user.name,
            role: user.role,
            dept: user.dept,
            position: user.position,
            email: user.email,
            employeeId: user.employeeId,
            imported_from: 'fallback',
          }
        })
        console.log(`  ✅ Created User #${user.id}: ${user.username} (${user.role})`)
      }
    }
    
    console.log('\n✅ Seeding complete!')
    console.log('\n📌 Login credentials:')
    console.log('   admin   / pass123  (superadmin)')
    console.log('   manager / pass123  (manager)')
    console.log('   hr      / pass123  (hr)')
    console.log('   employee/ pass123  (employee)')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()