const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.odooSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  const baseUrl = settings.url.replace(/\/$/, '').replace(/\/odoo$/, '');
  const jsonRpcUrl = baseUrl + '/jsonrpc';
  
  const auth = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service: 'common', method: 'authenticate', args: [settings.db, settings.user, settings.apiKey, {}] },
      id: 1
    })
  });
  const uid = (await auth.json()).result;

  console.log('Fetching all employees job_id & job_title from Odoo...');
  const res = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          settings.db, uid, settings.apiKey,
          'hr.employee', 'search_read',
          [[]],
          { fields: ['id', 'name', 'job_id', 'job_title'] }
        ]
      },
      id: 2
    })
  });
  const odooEmployees = (await res.json()).result || [];
  console.log(`Received ${odooEmployees.length} employees from Odoo.`);

  const getName = (v) => Array.isArray(v) ? v[1] : (v || '');
  const cleanStr = (v) => (!v || v === false) ? '' : String(v).trim();

  let updated = 0;
  for (const emp of odooEmployees) {
    const jobPosition = getName(emp.job_id);
    const jobTitle = cleanStr(emp.job_title);

    const existing = await prisma.employee.findFirst({
      where: { odoo_id: String(emp.id) }
    });

    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: {
          jobPosition: jobPosition,
          jobTitle: jobTitle,
          position: jobTitle || jobPosition,
        }
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} employees in database with jobPosition & jobTitle.`);

  // Sample check
  const samples = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    take: 5,
    select: { id: true, name: true, jobPosition: true, jobTitle: true, location: true }
  });
  console.table(samples);

  await prisma.$disconnect();
}

main().catch(console.error);

