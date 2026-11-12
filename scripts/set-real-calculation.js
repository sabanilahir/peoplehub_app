const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.appState.findUnique({
    where: { key: 'payroll_salary_breakdown_config' },
  });

  if (row && row.value) {
    const config = JSON.parse(row.value);
    config.roundingStep = 1;
    config.updatedAt = new Date().toISOString();

    const updated = await prisma.appState.update({
      where: { key: 'payroll_salary_breakdown_config' },
      data: { value: JSON.stringify(config) },
    });
    console.log('Successfully updated appState payroll_salary_breakdown_config to roundingStep: 1');
    console.log('New config:', updated.value);
  } else {
    console.log('No existing appState found, nothing to update.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
