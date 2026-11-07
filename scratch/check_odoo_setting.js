const fs = require('fs');

async function testOdooAddress() {
  const odooUrl = process.env.ODOO_URL || 'https://odoo.manusistem.com';
  const odooDb = process.env.ODOO_DB || 'manusistem';
  // Check env or settings in DB
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'ARI TEGAR', mode: 'insensitive' } }
  });
  console.log('Employee in db:', emp.id, emp.odoo_id);

  // Let's find odoo settings or test fetch
  const setting = await prisma.systemSetting.findMany({
    where: { key: { startsWith: 'odoo' } }
  });
  console.log('Odoo settings:', setting);
}

testOdooAddress().catch(console.error);

