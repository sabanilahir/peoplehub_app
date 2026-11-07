async function test() {
  const baseUrl = 'https://pt-gemilang.odoo.com'
  const odooDb = 'pt-gemilang'
  const odooUser = 'lahir.sabani@gmail.com'
  const odooApiKey = '263217c5eef3a8e37c13704089c814be97c0bd5e'

  // Try different endpoints
  const endpoints = [
    `${baseUrl}/jsonrpc`,
    `${baseUrl}/odoo/jsonrpc`,
    `${baseUrl}:443/jsonrpc`
  ]

  for (const jsonRpcUrl of endpoints) {
    console.log('\n--- Testing:', jsonRpcUrl, '---')
    try {
      const authResponse = await fetch(jsonRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'common',
            method: 'authenticate',
            args: [odooDb, odooUser, odooApiKey, {}]
          },
          id: 1
        })
      })
      
      const authData = await authResponse.json()
      console.log('Auth:', authData.result ? `Success (UID: ${authData.result})` : 'Failed')
      
      if (authData.result) {
        // Fetch employees
        const empResponse = await fetch(jsonRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                odooDb, authData.result, odooApiKey,
                'hr.employee',
                'search_read',
                [[['active', '=', true]]],
                { fields: ['id', 'name', 'work_email'], limit: 5 }
              ]
            },
            id: 2
          })
        })
        
        const empData = await empResponse.json()
        console.log('Employees:', empData.result?.length || 0)
        if (empData.result?.length > 0) {
          console.log('First:', empData.result[0])
          return jsonRpcUrl // Found working endpoint
        }
      }
    } catch (e) {
      console.log('Error:', e.message)
    }
  }
}

test()

