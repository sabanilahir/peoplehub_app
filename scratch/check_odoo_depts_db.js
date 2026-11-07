const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOdooDepts() {
  const odooDepts = await prisma.department.findMany({
    where: { odoo_id: { not: null } }
  });
  console.log("Departments in DB with odoo_id:", odooDepts);

  const emps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, departmentId: true, dept: true }
  });
  const deptCounts = {};
  emps.forEach(e => {
    const dName = e.dept || 'EMPTY';
    deptCounts[dName] = (deptCounts[dName] || 0) + 1;
  });
  console.log("Distinct e.dept in Odoo employees:", deptCounts);
}

checkOdooDepts().catch(console.error).finally(() => prisma.$disconnect());

