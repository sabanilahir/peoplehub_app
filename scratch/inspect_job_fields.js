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
          [[['name', 'ilike', 'ARI TEGAR RIAWAN']]],
          { fields: ['id', 'name', 'job_id', 'job_title', 'department_id', 'work_location_id'] }
        ]
      },
      id: 2
    })
  });
  const data = await res.json();
  console.log('Sample Ari Tegar (from Odoo):', JSON.stringify(data.result, null, 2));

  // Also sample 5 random employees
  const res2 = await fetch(jsonRpcUrl, {
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
          { fields: ['id', 'name', 'job_id', 'job_title'], limit: 5 }
        ]
      },
      id: 3
    })
  });
  const data2 = await res2.json();
  console.log('Sample 5 employees job_id & job_title:', JSON.stringify(data2.result, null, 2));

  await prisma.$disconnect();
}
main().catch(console.error);

