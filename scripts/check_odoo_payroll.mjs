async function checkPayrollInputTypes() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const user = 'lahir';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  console.log('Querying hr.payslip.input.type in Odoo staging...');
  const res = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.payslip.input.type', 'search_read',
          [[]],
          { fields: ['id', 'name', 'code', 'country_id', 'struct_ids'] }
        ]
      },
      id: 10
    })
  });

  const data = await res.json();
  console.log('Available hr.payslip.input.type:', JSON.stringify(data.result, null, 2));

  // Also query salary structures in Odoo
  const structRes = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.payroll.structure', 'search_read',
          [[]],
          { fields: ['id', 'name', 'type_id', 'rule_ids'] }
        ]
      },
      id: 11
    })
  });
  const structData = await structRes.json();
  console.log('Available hr.payroll.structure:', JSON.stringify(structData.result, null, 2));

  // Also query salary rules
  const rulesRes = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.salary.rule', 'search_read',
          [[['code', 'ilike', 'late']]],
          { fields: ['id', 'name', 'code', 'category_id'] }
        ]
      },
      id: 12
    })
  });
  const rulesData = await rulesRes.json();
  console.log('Rules matching "late":', JSON.stringify(rulesData.result, null, 2));
}

checkPayrollInputTypes();

