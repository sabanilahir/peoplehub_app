async function testInsertLateInput() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  console.log('Testing inserting Late input on Payslip 2...');
  const createRes = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.payslip.input', 'create',
          [{
            payslip_id: 2,
            input_type_id: 27, // Late
            name: 'Denda Keterlambatan Cut-off (26 Sep s/d 25 Okt) - Telat 2 hari (45 mnt)',
            amount: 50000,
          }]
        ]
      },
      id: 35
    })
  });
  const createData = await createRes.json();
  console.log('Insert Late input result:', JSON.stringify(createData, null, 2));

  // Verify by reading inputs of payslip 2
  const checkRes = await fetch(`${baseUrl}/jsonrpc`, {
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
          [[['payslip_id', '=', 2]]],
          { fields: ['id', 'name', 'code', 'amount', 'input_type_id'] }
        ]
      },
      id: 36
    })
  });
  const checkData = await checkRes.json();
  console.log('Inputs on Payslip 2 now:', JSON.stringify(checkData.result, null, 2));
}

testInsertLateInput();

