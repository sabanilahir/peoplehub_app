async function inspectPayslipFields() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  // 1. Inspect hr.payslip.input fields
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
          db, uid, apiKey, 'hr.payslip.input', 'fields_get',
          [],
          { attributes: ['string', 'type', 'required'] }
        ]
      },
      id: 20
    })
  });
  const data = await res.json();
  console.log('hr.payslip.input fields:', JSON.stringify(data.result, null, 2));

  // 2. Check existing payslips in Odoo staging
  const slipRes = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db, uid, apiKey, 'hr.payslip', 'search_read',
          [[]],
          { fields: ['id', 'name', 'employee_id', 'state', 'input_line_ids', 'date_from', 'date_to'], limit: 3 }
        ]
      },
      id: 21
    })
  });
  const slipData = await slipRes.json();
  console.log('Sample existing payslips in Odoo:', JSON.stringify(slipData.result, null, 2));
}

inspectPayslipFields();

