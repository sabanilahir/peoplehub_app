async function checkPayslip4() {
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
          db, uid, apiKey, 'hr.payslip.input', 'search_read',
          [[['payslip_id', '=', 4]]],
          { fields: ['id', 'name', 'code', 'amount', 'input_type_id'] }
        ]
      },
      id: 100
    })
  });
  const data = await res.json();
  console.log('Inputs on Payslip 4 in Odoo:', JSON.stringify(data.result, null, 2));

  // Check salary computation lines on payslip 4
  const linesRes = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.payslip.line', 'search_read',
          [[['slip_id', '=', 4]]],
          { fields: ['code', 'name', 'category_id', 'total'] }
        ]
      },
      id: 101
    })
  });
  const linesData = await linesRes.json();
  console.log('Salary computation lines on Payslip 4:', JSON.stringify(linesData.result, null, 2));
}

checkPayslip4();

