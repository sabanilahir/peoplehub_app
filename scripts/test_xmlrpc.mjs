async function testXmlRpc() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';

  const xmlBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>version</methodName>
  <params></params>
</methodCall>`;

  const res = await fetch(`${baseUrl}/xmlrpc/2/common`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xmlBody
  });
  const text = await res.text();
  console.log('XML-RPC version response:', text);
}

testXmlRpc();

