async function testComputeSheet() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  console.log('Testing compute_sheet on Payslip 2...');
  const computeRes = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.payslip', 'compute_sheet',
          [[2]]
        ]
      },
      id: 40
    })
  });
  const computeData = await computeRes.json();
  console.log('Compute sheet result:', JSON.stringify(computeData, null, 2));

  // Check salary computation lines on payslip 2
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
          [[['slip_id', '=', 2]]],
          { fields: ['code', 'name', 'category_id', 'total'] }
        ]
      },
      id: 41
    })
  });
  const linesData = await linesRes.json();
  console.log('Salary computation lines on Payslip 2:', JSON.stringify(linesData.result, null, 2));
}

testComputeSheet();

