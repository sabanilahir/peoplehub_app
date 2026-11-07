import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateSettings() {
  const existing = await prisma.odooSettings.findFirst();
  const data = {
    url: 'https://san-erp-staging-1-40952978.dev.odoo.com',
    db: 'san-erp-staging-1-40952978',
    user: 'lahir',
    apiKey: '8b2fb7c1633252ab439e78fbbeef9f96c06bb135',
    model: 'hr.employee',
    syncEnabled: true,
    updatedAt: new Date(),
  };

  if (existing) {
    const updated = await prisma.odooSettings.update({
      where: { id: existing.id },
      data,
    });
    console.log('✅ OdooSettings updated:', updated);
  } else {
    const created = await prisma.odooSettings.create({
      data: {
        id: 'cmvfv0lk5000093hof8iwf6sh',
        ...data,
      },
    });
    console.log('✅ OdooSettings created:', created);
  }
}

updateSettings().finally(async () => {
  await prisma.$disconnect();
});

