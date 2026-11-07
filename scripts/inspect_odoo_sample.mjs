async function inspectOdooEmployees() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

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
          db, uid, apiKey, 'hr.employee', 'search_read',
          [[]],
          {
            fields: ['id', 'name', 'identification_id', 'department_id', 'job_id', 'job_title', 'parent_id', 'work_location_id', 'work_email'],
            limit: 3
          }
        ]
      },
      id: 4
    })
  });

  const data = await res.json();
  console.log('Sample Odoo Employees:', JSON.stringify(data.result, null, 2));
}

inspectOdooEmployees();

