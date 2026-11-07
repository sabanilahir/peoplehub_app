async function inspectPayslipDetails() {
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
          db, uid, apiKey, 'hr.payslip', 'search_read',
          [[['id', '=', 2]]],
          { fields: ['id', 'name', 'employee_id', 'struct_id', 'payslip_run_id', 'input_line_ids', 'version_id'] }
        ]
      },
      id: 31
    })
  });
  const data = await res.json();
  console.log('Payslip 2 details:', JSON.stringify(data.result, null, 2));
}

inspectPayslipDetails();

