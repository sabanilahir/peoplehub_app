async function updateLateSalaryRules() {
  const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com';
  const db = 'san-erp-staging-1-40952978';
  const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135';
  const uid = 5;

  console.log('Updating Salary Rule Late (170 & 179) to read from inputs[\"Late\"]...');

  const lateCompute = `if 'Late' in inputs:
    result = -inputs['Late'].amount
    result_name = inputs['Late'].name
else:
    result = 0.0`;

  const rewardCompute = `if 'Attendance Reward' in inputs:
    result = inputs['Attendance Reward'].amount
    result_name = inputs['Attendance Reward'].name
else:
    result = 0.0`;

  // Update Late rules
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
            amount_python_compute: lateCompute,
          }]
        ]
      },
      id: 60
    })
  });

  // Update Attendance Reward rules
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
          [[163, 172], {
            amount_select: 'code',
            amount_python_compute: rewardCompute,
          }]
        ]
      },
      id: 61
    })
  });

  console.log('✅ Successfully updated salary rules for Late & Attendance Reward.');
}

updateLateSalaryRules();

