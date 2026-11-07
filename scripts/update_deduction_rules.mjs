import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.odooSettings.findFirst();
  const baseUrl = s.url.replace(/\/$/, '').replace(/\/odoo$/, '');

  const authRes = await fetch(baseUrl + '/jsonrpc', {
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

  const updates = [
    {
      name: 'Sick Leave',
      ids: [167, 176],
      code: 'Sick Leave',
      inputId: 24,
    },
    {
      name: 'Leave',
      ids: [168, 177],
      code: 'Leave',
      inputId: 25,
    },
    {
      name: 'Half Leave',
      ids: [169, 178],
      code: 'Half Leave',
      inputId: 26,
    },
    {
      name: 'Late',
      ids: [170, 179],
      code: 'Late',
      inputId: 27,
    },
  ];

  for (const u of updates) {
    const pythonCode = `if '${u.code}' in inputs:\n    result = -inputs['${u.code}'].amount\n    result_name = '${u.name}'\nelse:\n    result = 0.0`;
    const res = await fetch(baseUrl + '/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            s.db,
            uid,
            s.apiKey,
            'hr.salary.rule',
            'write',
            [
              u.ids,
              {
                condition_select: 'input',
                condition_other_input_id: u.inputId,
                amount_other_input_id: u.inputId,
                amount_select: 'code',
                amount_python_compute: pythonCode,
              },
            ],
          ],
        },
        id: 2,
      }),
    });
    const result = (await res.json()).result;
    console.log(`Updated rules for ${u.name} (IDs: ${u.ids.join(', ')}):`, result);
  }

  // Clean old test inputs and test all 4 deductions on Payslip 2
  console.log('Testing all 4 deductions on Payslip 2...');
  const oldInputsRes = await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'search_read', [[['payslip_id', '=', 2]]], { fields: ['id'] }],
      },
      id: 3,
    }),
  });
  const oldInputs = (await oldInputsRes.json()).result || [];
  if (oldInputs.length > 0) {
    await fetch(baseUrl + '/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'unlink', [oldInputs.map(x => x.id)]],
        },
        id: 4,
      }),
    });
  }

  // Create 4 deduction test inputs
  const testInputs = [
    { payslip_id: 2, input_type_id: 24, name: 'Sick Leave', amount: 100000 },
    { payslip_id: 2, input_type_id: 25, name: 'Leave', amount: 150000 },
    { payslip_id: 2, input_type_id: 26, name: 'Half Leave', amount: 75000 },
    { payslip_id: 2, input_type_id: 27, name: 'Late', amount: 50000 },
  ];

  for (const inp of testInputs) {
    await fetch(baseUrl + '/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'create', [inp]],
        },
        id: 5,
      }),
    });
  }

  // Compute sheet on Payslip 2
  await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip', 'compute_sheet', [[2]]],
      },
      id: 6,
    }),
  });

  // Read lines
  const linesRes = await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.line', 'search_read', [[['slip_id', '=', 2]]], {
          fields: ['id', 'code', 'name', 'category_id', 'total'],
        }],
      },
      id: 7,
    }),
  });
  const lines = (await linesRes.json()).result;
  console.log('--- Payslip 2 Computed Lines ---');
  for (const l of lines) {
    console.log(l.code + ' : ' + l.name + ' => total: ' + l.total + ' (' + l.category_id[1] + ')');
  }

  // Restore Payslip 2 to only Late: 50,000 as Ari Tegar Riawan actually had
  console.log('Restoring Payslip 2 to standard test state (Late: 50.000)...');
  const allCurrentInp = await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'search_read', [[['payslip_id', '=', 2]]], { fields: ['id'] }],
      },
      id: 8,
    }),
  });
  const curIds = (await allCurrentInp.json()).result.map(x => x.id);
  await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'unlink', [curIds]],
      },
      id: 9,
    }),
  });
  await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip.input', 'create', [{
          payslip_id: 2,
          input_type_id: 27,
          name: 'Late',
          amount: 50000
        }]],
      },
      id: 10,
    }),
  });
  await fetch(baseUrl + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [s.db, uid, s.apiKey, 'hr.payslip', 'compute_sheet', [[2]]],
      },
      id: 11,
    }),
  });
  console.log('Done restoring!');
}

main().catch(console.error);
