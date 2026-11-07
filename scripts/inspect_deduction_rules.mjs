async function inspectDeductionRules() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  // Read JHT, JP, BPJS_KESEHATAN_DED rules to see how they produce negative amount
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
          db, uid, apiKey, 'hr.salary.rule', 'search_read',
          [[['code', 'in', ['JHT', 'JP', 'BPJS_KESEHATAN_DED', 'DEDUCTION']]]],
          { fields: ['id', 'name', 'code', 'category_id', 'amount_select', 'amount_python_compute', 'amount_fix', 'amount_percentage'] }
        ]
      },
      id: 120
    })
  });
  const data = await res.json();
  console.log('Deduction rules in Odoo:', JSON.stringify(data.result, null, 2));
}

inspectDeductionRules();

