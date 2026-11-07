async function testNegativeLate() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  // 1. Update salary rule Late (170 & 179) so amount_select is 'code' with negative result and clean name 'Late'
  const pyCode = `if 'Late' in inputs:
    result = -inputs['Late'].amount
    result_name = 'Late'
else:
    result = 0.0`;

  await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.salary.rule', 'write',
          [[170, 179], {
            amount_select: 'code',
            amount_python_compute: pyCode,
          }]
        ]
      },
      id: 130
    })
  });
  console.log('✅ Updated rule 170 & 179 to negative code with clean name');

  // 2. Update hr.payslip.input on Payslip 5 to have clean name 'Late'
  // Find input on payslip 5
  const inRes = await fetch(`${baseUrl}/jsonrpc`, {
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
          [[['payslip_id', '=', 5]]],
          { fields: ['id'] }
        ]
      },
      id: 131
    })
  });
  const inData = await inRes.json();
  if (inData.result && inData.result.length > 0) {
    const inputId = inData.result[0].id;
    await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            db, uid, apiKey, 'hr.payslip.input', 'write',
            [[inputId], { name: 'Late' }]
          ]
        },
        id: 132
      })
    });
    console.log('✅ Updated input name to "Late"');
  }

  // 3. Re-compute payslip 5
  await fetch(`${baseUrl}/jsonrpc`, {
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
          [[5]]
        ]
      },
      id: 133
    })
  });
  console.log('✅ Recomputed payslip 5');

  // 4. Read payslip 5 lines
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
          [[['slip_id', '=', 5]]],
          { fields: ['code', 'name', 'category_id', 'total'] }
        ]
      },
      id: 134
    })
  });
  const linesData = await linesRes.json();
  console.log('Payslip 5 lines:', JSON.stringify(linesData.result, null, 2));
}

testNegativeLate();

