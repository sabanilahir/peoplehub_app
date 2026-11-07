import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncAllEmployeesFromOdoo() {
  const s = await prisma.odooSettings.findFirst();
  const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '');
  const jsonRpcUrl = `${baseUrl}/jsonrpc`;

  // 1. Authenticate
  const authRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service: 'common', method: 'authenticate', args: [s.db, s.user, s.apiKey, {}] },
      id: 1,
    }),
  });
  const uid = (await authRes.json()).result;
  console.log(`✅ Odoo Authenticated with UID: ${uid}`);

  // 2. Fetch Departments
  const deptRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.department', 'search_read', [[]], { fields: ['id', 'name'], limit: 500 }],
      },
      id: 2,
    }),
  });
  const odooDepts = (await deptRes.json()).result || [];
  const deptMap = {}; // odoo_id -> prisma department id
  for (const d of odooDepts) {
    let local = await prisma.department.findFirst({ where: { name: d.name } });
    if (!local) {
      local = await prisma.department.create({
        data: { name: d.name, odoo_id: String(d.id), last_sync_at: new Date() },
      });
    } else {
      await prisma.department.update({
        where: { id: local.id },
        data: { odoo_id: String(d.id), last_sync_at: new Date() },
      });
    }
    deptMap[d.id] = local.id;
  }
  console.log(`✅ Synced ${odooDepts.length} departments.`);

  // 3. Fetch all employees from Odoo
  const empRes = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          s.db, uid, s.apiKey, 'hr.employee', 'search_read',
          [[]],
          {
            fields: [
              'id', 'name', 'identification_id', 'barcode', 'work_email', 'work_phone', 'mobile_phone',
              'private_email', 'private_phone', 'private_street', 'private_city',
              'birthday', 'sex', 'marital', 'department_id', 'job_id', 'job_title',
              'parent_id', 'work_location_id', 'emergency_contact', 'emergency_phone'
            ],
            limit: 500
          }
        ],
      },
      id: 3,
    }),
  });
  const odooEmps = (await empRes.json()).result || [];
  console.log(`✅ Fetched ${odooEmps.length} employees from Odoo staging.`);

  let matched = 0;
  let created = 0;

  const norm = (str) => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();

  // First pass: match / create employee records
  const odooToPrismaId = {}; // odooId -> prismaId

  for (const odooEmp of odooEmps) {
    const odooIdStr = String(odooEmp.id);
    const nik = (odooEmp.identification_id || odooEmp.barcode || '').trim();
    const name = (odooEmp.name || '').trim();
    const deptName = odooEmp.department_id ? odooEmp.department_id[1] : '';
    const deptId = odooEmp.department_id ? deptMap[odooEmp.department_id[0]] : null;
    const levelJabatan = odooEmp.job_id ? odooEmp.job_id[1] : 'Staff';
    const jobTitle = odooEmp.job_title || (odooEmp.job_id ? odooEmp.job_id[1] : '');
    const workLocId = odooEmp.work_location_id ? String(odooEmp.work_location_id[0]) : null;

    // Find in local DB by odoo_id or NIK or exact name
    let localEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          { odoo_id: odooIdStr },
          ...(nik ? [{ nik: nik }] : []),
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    const updateData = {
      odoo_id: odooIdStr,
      name: name,
      nik: nik || localEmp?.nik || `EMP_${odooEmp.id}`,
      ktp: nik || localEmp?.ktp || '',
      email: odooEmp.work_email || localEmp?.email || '',
      personalEmail: odooEmp.private_email || localEmp?.personalEmail || '',
      phone: odooEmp.mobile_phone || odooEmp.work_phone || localEmp?.phone || '',
      address: odooEmp.private_street || localEmp?.address || '',
      city: odooEmp.private_city || localEmp?.city || '',
      gender: odooEmp.sex === 'male' ? 'Laki-laki' : (odooEmp.sex === 'female' ? 'Perempuan' : (localEmp?.gender || '')),
      maritalStatus: odooEmp.marital || localEmp?.maritalStatus || '',
      birthDate: odooEmp.birthday || localEmp?.birthDate || '',
      dept: deptName || localEmp?.dept || '',
      departmentId: deptId || localEmp?.departmentId,
      jobPosition: levelJabatan || localEmp?.jobPosition || '',
      jobTitle: jobTitle || localEmp?.jobTitle || '',
      odooWorkLocationId: workLocId || localEmp?.odooWorkLocationId,
      imported_from: 'odoo',
      last_sync_at: new Date(),
    };

    if (localEmp) {
      const up = await prisma.employee.update({
        where: { id: localEmp.id },
        data: updateData,
      });
      odooToPrismaId[odooEmp.id] = up.id;
      matched++;
    } else {
      // Create new employee
      const maxEmp = await prisma.employee.aggregate({ _max: { id: true } });
      const newId = Math.max(300200, (maxEmp._max?.id || 300000) + 1);

      const cr = await prisma.employee.create({
        data: {
          id: newId,
          ...updateData,
          status: 'Active',
        },
      });
      odooToPrismaId[odooEmp.id] = cr.id;
      created++;
    }
  }

  // Second pass: link managerId (parent_id)
  let managerLinked = 0;
  for (const odooEmp of odooEmps) {
    if (odooEmp.parent_id && odooToPrismaId[odooEmp.id]) {
      const managerPrismaId = odooToPrismaId[odooEmp.parent_id[0]];
      if (managerPrismaId) {
        await prisma.employee.update({
          where: { id: odooToPrismaId[odooEmp.id] },
          data: { managerId: managerPrismaId },
        });
        managerLinked++;
      }
    }
  }

  console.log(`🎉 Sync Complete: ${matched} matched & updated, ${created} created, ${managerLinked} managers linked.`);
}

syncAllEmployeesFromOdoo().finally(async () => {
  await prisma.$disconnect();
});

