async function testAuth() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const users = ['lahir.sabani@gmail.com', 'admin', 'lahirs'];
  const dbCandidates = [
    'san-erp-staging-1-40952978',
    'san-erp-staging-1',
    'san-erp',
    'san-erp-staging',
    'staging-1',
    'pt-gemilang'
  ];

  for (const db of dbCandidates) {
    for (const user of users) {
      try {
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
        if (data.result) {
          console.log(` SUCCESS! db: "${db}", user: "${user}", uid: ${data.result}`);
          return;
        } else {
          // console.log(`Failed for db: ${db}, user: ${user}`, data.error?.data?.message || data.result);
        }
      } catch (e) {
        console.log(`Error testing ${db}:`, e.message);
      }
    }
  }
  console.log('Finished testing combinations.');
}

testAuth();

