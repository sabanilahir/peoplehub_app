// scripts/seed_approver_matrix.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Applying 2-Tier Approval Matrix to Database ---')

  // Explicit mappings from User Excel
  const explicitMatrix = [
    { id: 300098, name: 'Melyta Hasty', app1Id: 300090, app2Id: 300060 }, // Raul -> Devita
    { id: 300090, name: 'MOH. RAUL AMARULLAH', app1Id: 300090, app2Id: 300060 }, // Raul (self) -> Devita
    { id: 300166, name: 'Vidya Shevina', app1Id: 300090, app2Id: 300060 }, // Raul -> Devita
    { id: 300049, name: 'Asyuni Simanjuntak', app1Id: 300090, app2Id: 300060 }, // Raul -> Devita
    { id: 300147, name: 'SHERLY OKTAVIANI', app1Id: 300170, app2Id: 300143 }, // Wanda -> Ronny
    { id: 300067, name: 'Elza Mourine Clarista', app1Id: 300150, app2Id: 300116 }, // Sandy -> Novi Atien
    { id: 300160, name: 'Tarono', app1Id: 300150, app2Id: 300116 }, // Sandy -> Novi Atien
    { id: 300171, name: 'Warsito', app1Id: 300150, app2Id: 300116 }, // Sandy -> Novi Atien
    { id: 300155, name: 'Sofyan Hadi', app1Id: 300150, app2Id: 300116 }, // Sandy -> Novi Atien
    { id: 300131, name: 'Rakhmat Hidayat', app1Id: 300150, app2Id: 300116 }, // Sandy -> Novi Atien
    // Demo accounts
    { id: 1, name: 'Budi Santoso', app1Id: 2, app2Id: 3 }, // Dewi -> Rina
    { id: 2, name: 'Dewi Rahayu', app1Id: 2, app2Id: 3 }, // Dewi (self) -> Rina
    { id: 4, name: 'Ahmad Fauzi', app1Id: 2, app2Id: 3 }, // Dewi -> Rina
  ]

  for (const item of explicitMatrix) {
    try {
      await prisma.employee.update({
        where: { id: item.id },
        data: {
          approver1Id: item.app1Id,
          approver2Id: item.app2Id,
        },
      })
      console.log(`✅ [OK] Updated ${item.name} (ID ${item.id}) -> App1: ${item.app1Id}, App2: ${item.app2Id}`)
    } catch (e) {
      console.error(`❌ Failed for ${item.name}:`, e.message)
    }
  }

  // Find HR Manager fallback
  const hrManager = await prisma.employee.findFirst({
    where: {
      OR: [
        { jobPosition: { contains: 'HR', mode: 'insensitive' } },
        { dept: { contains: 'HR', mode: 'insensitive' } },
        { role: 'hr_manager' },
        { id: 300116 }, // Novi Atien
      ],
    },
  })
  const fallbackHrId = hrManager ? hrManager.id : 300116

  // Populate any other employee with managerId -> fallback
  const remaining = await prisma.employee.findMany({
    where: {
      approver1Id: null,
    },
    select: { id: true, name: true, managerId: true },
  })

  console.log(`Found ${remaining.length} other employees without explicit matrix. Applying intelligent defaults...`)
  for (const emp of remaining) {
    const app1 = emp.managerId || emp.id
    const app2 = fallbackHrId
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        approver1Id: app1,
        approver2Id: app2,
      },
    })
  }

  console.log('🎉 2-Tier Approval Matrix has been successfully populated for all employees!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

