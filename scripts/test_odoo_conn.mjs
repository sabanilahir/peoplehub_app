async function testOdoo() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';

  console.log('1. Testing database list from /web/database/list or jsonrpc...');
  try {
    const dbRes = await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service: 'db', method: 'list', args: [] },
        id: 1
      })
    });
    const dbData = await dbRes.json();
    console.log('DB list result:', dbData);
  } catch (e) {
    console.log('DB list error:', e.message);
  }

  // Also check /web/webclient/version_info
  try {
    const vRes = await fetch(`${baseUrl}/web/webclient/version_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 2 })
    });
    const vData = await vRes.json();
    console.log('Version info:', vData);
  } catch (e) {
    console.log('Version error:', e.message);
  }
}

testOdoo();

