async function testOdooAuth() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const user = 'lahir';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';

  console.log(`Connecting to ${baseUrl}/jsonrpc...`);
  console.log(`DB: ${db}, User: ${user}`);

  const res = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [db, user, apiKey, {}]
      },
      id: 1
    })
  });

  const data = await res.json();
  console.log('Auth result:', JSON.stringify(data, null, 2));

  if (data.result) {
    const uid = data.result;
    console.log(` Authenticated successfully! UID: ${uid}`);

    // Test reading company / employee count
    const empRes = await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [db, uid, apiKey, 'hr.employee', 'search_count', [[]]]
        },
        id: 2
      })
    });
    const empData = await empRes.json();
    console.log('Total hr.employee in Odoo:', empData.result);

    // Test reading department count
    const deptRes = await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [db, uid, apiKey, 'hr.department', 'search_count', [[]]]
        },
        id: 3
      })
    });
    const deptData = await deptRes.json();
    console.log('Total hr.department in Odoo:', deptData.result);
  } else {
    console.log('Authentication failed:', data);
  }
}

testOdooAuth();

