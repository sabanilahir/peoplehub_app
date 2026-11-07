import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getLogins() {
  const users = await prisma.user.findMany({ select: { email: true } });
  const employees = await prisma.employee.findMany({
    where: { email: { not: '' } },
    select: { email: true, personalEmail: true },
    take: 50
  });

  const logins = new Set([
    'admin',
    'administrator',
    'lahir.sabani@gmail.com',
    'lahirsabani@gmail.com',
    'it@gemilang.com',
    'admin@gemilang.com',
    'hrd@gemilang.com',
    'san@dev.odoo.com'
  ]);

  users.forEach(u => u.email && logins.add(u.email));
  employees.forEach(e => {
    if (e.email) logins.add(e.email);
    if (e.personalEmail) logins.add(e.personalEmail);
  });

  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';

  console.log(`Testing ${logins.size} candidate logins against database ${db}...`);

  for (const user of logins) {
    try {
      const res = await fetch(`${baseUrl}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: { service: 'common', method: 'authenticate', args: [db, user, apiKey, {}] },
          id: 1
        })
      });
      const data = await res.json();
      if (data.result) {
        console.log(` SUCCESS! Login: "${user}", UID: ${data.result}`);
        return;
      }
    } catch (e) {
      console.log(`Error on ${user}:`, e.message);
    }
  }
  console.log('No match found among current candidate logins.');
}

getLogins().finally(async () => {
  await prisma.$disconnect();
});

