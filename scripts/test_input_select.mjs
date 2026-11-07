async function testInputSelect() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  console.log('Setting rule 170 to amount_select: "input" with amount_other_input_id: 27...');
  const upRes = await fetch(`${baseUrl}/jsonrpc`, {
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
          [[170, 179], {
            amount_select: 'input',
            amount_other_input_id: 27,
          }]
        ]
      },
      id: 80
    })
  });
  const upData = await upRes.json();
  console.log('Update rule result:', upData);
}

testInputSelect();

