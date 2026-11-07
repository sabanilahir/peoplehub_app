async function checkDb() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';

  for (const db of ['invalid_db_xyz', 'san-erp-staging-1-40952978']) {
    const res = await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [db, 'test', 'test', {}]
        },
        id: 1
      })
    });
    const data = await res.json();
    console.log(`DB ${db} response:`, data);
  }
}
checkDb();

