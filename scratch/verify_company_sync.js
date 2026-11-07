const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanyMapping() {
  const gemilangCompany = await prisma.company.findFirst({
    where: { name: { contains: 'Gemilang', mode: 'insensitive' } }
  });
  console.log("Gemilang Company in DB:", gemilangCompany);

  const emps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { id: true, name: true, companyId: true }
  });
  const withComp = emps.filter(e => e.companyId != null);
  console.log(`Odoo employees with companyId: ${withComp.length} / ${emps.length}`);
  console.log("Sample employee:", withComp[0]);
}

checkCompanyMapping().catch(console.error).finally(() => prisma.$disconnect());

