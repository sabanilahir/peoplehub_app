async function fixRule135() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  console.log('Fixing syntax error in Rule 135 in Odoo...');
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
          db, uid, apiKey, 'hr.salary.rule', 'write',
          [[135], {
            amount_python_compute: "result = categories['BASIC'] + categories['ALW'] + categories['DED']"
          }]
        ]
      },
      id: 50
    })
  });
  const data = await res.json();
  console.log('Fix result:', data);
}

fixRule135();

