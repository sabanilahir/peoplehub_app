const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  OVERTIME_REQUEST_BPMN_XML,
  DEFAULT_OVERTIME_FORMS,
} = require('../src/lib/flowable/definitions/overtimeRequestBpmn.js');

async function main() {
  const existing = await prisma.workflowDefinition.findFirst({
    where: { key: 'overtime-request-process' },
  });

  if (existing) {
    const updated = await prisma.workflowDefinition.update({
      where: { id: existing.id },
      data: {
        name: 'Persetujuan Lembur Karyawan',
        xml: OVERTIME_REQUEST_BPMN_XML,
        forms: DEFAULT_OVERTIME_FORMS,
        description:
          'Alur persetujuan lembur karyawan oleh Atasan Langsung (MSS) dan Verifikasi HR Payroll (HO Calculator & Odoo).',
        active: true,
      },
    });
    console.log('Updated Overtime workflow definition with id:', updated.id);
  } else {
    const created = await prisma.workflowDefinition.create({
      data: {
        name: 'Persetujuan Lembur Karyawan',
        key: 'overtime-request-process',
        xml: OVERTIME_REQUEST_BPMN_XML,
        forms: DEFAULT_OVERTIME_FORMS,
        description:
          'Alur persetujuan lembur karyawan oleh Atasan Langsung (MSS) dan Verifikasi HR Payroll (HO Calculator & Odoo).',
        active: true,
      },
    });
    console.log('Created Overtime workflow definition with id:', created.id);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
