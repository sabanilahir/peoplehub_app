const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeptCol() {
  const emps = await prisma.employee.findMany({
    where: { odoo_id: { in: ['523', '607', '518', '5'] } },
    select: { id: true, name: true, odoo_id: true, departmentId: true, dept: true }
  });
  console.log("DB emps:", emps);

  // Check what structure.departments map would return for these departmentIds:
  // In structureStore, SEED_DEPARTMENTS has id 1..10:
  // 1: Frontend
  // 2: Backend
  // 3: DevOps
  // 4: Procurement
  // 5: HR Operations
  // 6: HR Operations
  // 7: Web Development
  // 8: Mobile Development
  // 9: QA & Testing
  // 10: HR Operations
  for (const e of emps) {
    console.log(`Emp ${e.name} (odoo_id: ${e.odoo_id}): dept in DB="${e.dept}", departmentId=${e.departmentId}`);
  }
}

checkDeptCol().catch(console.error).finally(() => prisma.$disconnect());

