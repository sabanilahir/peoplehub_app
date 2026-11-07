async function checkOdooEmployeeFields() {
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
          db, uid, apiKey, 'hr.employee', 'fields_get',
          [],
          {
            attributes: ['type', 'string', 'readonly']
          }
        ]
      },
      id: 5
    })
  });

  const data = await res.json();
  const fields = data.result;
  const interested = [
    'name', 'identification_id', 'barcode', 'work_email', 'work_phone', 'mobile_phone',
    'private_email', 'private_phone', 'private_street', 'private_city',
    'birthday', 'gender', 'marital', 'department_id', 'job_id', 'job_title',
    'parent_id', 'work_location_id', 'emergency_contact', 'emergency_phone',
    'bank_account_id'
  ];

  const summary = {};
  for (const k of interested) {
    if (fields[k]) {
      summary[k] = { string: fields[k].string, type: fields[k].type, readonly: fields[k].readonly };
    } else {
      summary[k] = 'NOT_FOUND';
    }
  }
  console.log('Interested Odoo Fields:', JSON.stringify(summary, null, 2));
}

checkOdooEmployeeFields();

