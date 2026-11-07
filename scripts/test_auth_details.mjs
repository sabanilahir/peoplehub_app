async function testAuthDetails() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';

  const res = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: ['san-erp-staging-1-40952978', 'lahir.sabani@gmail.com', apiKey, {}]
      },
      id: 1
    })
  });
  const data = await res.json();
  console.log('Response for san-erp-staging-1-40952978:', JSON.stringify(data, null, 2));
}

testAuthDetails();

