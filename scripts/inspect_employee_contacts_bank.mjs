// scripts/inspect_employee_contacts_bank.mjs
const baseUrl = 'https://san-erp-staging-1-40952978.dev.odoo.com'
const db = 'san-erp-staging-1-40952978'
const user = 'lahir'
const apiKey = '8b2fb7c1633252ab439e78fbbeef9f96c06bb135'

async function callOdoo(service, method, args) {
  const res = await fetch(`${baseUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: 1,
    }),
  })
  const json = await res.json()
  return json.result
}

async function main() {
  const uid = await callOdoo('common', 'authenticate', [db, user, apiKey, {}])
  console.log('Authenticated UID:', uid)

  // 1. Check res.partner.bank
  const bankAccounts = await callOdoo('object', 'execute_kw', [
    db, uid, apiKey, 'res.partner.bank', 'search_read',
    [[]],
    { fields: ['id', 'acc_number', 'bank_id', 'partner_id', 'acc_holder_name'], limit: 10 },
  ])
  console.log('--- Sample res.partner.bank (Total checked: 10) ---')
  console.log(JSON.stringify(bankAccounts, null, 2))

  const totalBankAccounts = await callOdoo('object', 'execute_kw', [
    db, uid, apiKey, 'res.partner.bank', 'search_count',
    [[]],
  ])
  console.log('Total res.partner.bank in Odoo:', totalBankAccounts)

  // 2. Check hr.employee bank fields
  const sampleEmployees = await callOdoo('object', 'execute_kw', [
    db, uid, apiKey, 'hr.employee', 'search_read',
    [[['name', 'ilike', 'Ari Tegar']]],
    { fields: ['id', 'name', 'bank_account_id', 'address_home_id', 'work_contact_id', 'user_id', 'identification_id'] },
  ])
  console.log('--- Ari Tegar Riawan hr.employee record ---')
  console.log(JSON.stringify(sampleEmployees, null, 2))

  // If Ari Tegar has address_home_id or partner_id, check that partner's bank_ids
  if (sampleEmployees && sampleEmployees.length > 0) {
    const emp = sampleEmployees[0]
    const partnerId = emp.address_home_id ? emp.address_home_id[0] : (emp.work_contact_id ? emp.work_contact_id[0] : null)
    console.log('Partner ID for Ari Tegar:', partnerId)

    if (partnerId) {
      const partnerData = await callOdoo('object', 'execute_kw', [
        db, uid, apiKey, 'res.partner', 'search_read',
        [[['id', '=', partnerId]]],
        { fields: ['id', 'name', 'bank_ids'] },
      ])
      console.log('Partner Data for Ari Tegar:', JSON.stringify(partnerData, null, 2))
    }
  }

  // 3. Check some partners who have bank_ids
  const partnersWithBanks = await callOdoo('object', 'execute_kw', [
    db, uid, apiKey, 'res.partner', 'search_read',
    [[['bank_ids', '!=', false]]],
    { fields: ['id', 'name', 'bank_ids'], limit: 5 },
  ])
  console.log('--- Sample res.partner with bank_ids ---')
  console.log(JSON.stringify(partnersWithBanks, null, 2))
}

main().catch(console.error)
