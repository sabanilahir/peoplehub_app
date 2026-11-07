async function checkRule170Fields() {
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
          db, uid, apiKey, 'hr.salary.rule', 'read',
          [[170]],
          []
        ]
      },
      id: 70
    })
  });
  const data = await res.json();
  const r = data.result[0];
  const relevant = {};
  for (const [k, v] of Object.entries(r)) {
    if (k.includes('input') || k.includes('condition') || k.includes('other')) {
      relevant[k] = v;
    }
  }
  console.log('Relevant fields on Rule 170:', relevant);
}

checkRule170Fields();

