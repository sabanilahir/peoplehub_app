const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.odooSettings.findFirst({
    where: { url: { not: "" } },
    orderBy: { updatedAt: "desc" }
  })
  console.log("DB Odoo Settings:", settings ? { url: settings.url, db: settings.db, user: settings.user } : null)

  const baseUrl = (settings?.url || 'https://pt-gemilang.odoo.com').replace(/\/$/, "").replace(/\/odoo$/, "")
  const odooDb = settings?.db || 'pt-gemilang'
  const odooUser = settings?.user || 'lahir.sabani@gmail.com'
  const odooApiKey = settings?.apiKey || '263217c5eef3a8e37c13704089c814be97c0bd5e'
  const jsonRpcUrl = `${baseUrl}/jsonrpc`

  // 1. Authenticate
  const authRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service: "common", method: "authenticate", args: [odooDb, odooUser, odooApiKey, {}] },
      id: 1
    })
  })
  const authData = await authRes.json()
  const uid = authData.result
  console.log("Auth result UID:", uid)

  if (!uid) {
    console.error("Auth failed:", authData)
    await prisma.$disconnect()
    return
  }

  // 2. Check hr.work.location model in Odoo
  try {
    const locRes = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [odooDb, uid, odooApiKey, "hr.work.location", "search_read", [[]], { fields: ["id", "name", "address_id"] }]
        },
        id: 2
      })
    })
    const locData = await locRes.json()
    console.log("Odoo hr.work.location:", locData.result || locData.error)
  } catch (e) {
    console.error("Error querying hr.work.location:", e.message)
  }

  // 3. Check hr.employee fields available related to 'location' or 'work'
  try {
    const fieldsRes = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [odooDb, uid, odooApiKey, "hr.employee", "fields_get", [], { attributes: ["string", "type"] }]
        },
        id: 3
      })
    })
    const fieldsData = await fieldsRes.json()
    if (fieldsData.result) {
      const locationFields = Object.keys(fieldsData.result).filter(k => k.toLowerCase().includes('location') || k.toLowerCase().includes('work') || k.toLowerCase().includes('office') || k.toLowerCase().includes('branch') || k.toLowerCase().includes('address'))
      console.log("Matching fields in hr.employee:", locationFields)
      for (const k of locationFields) {
        console.log(` - ${k}: ${fieldsData.result[k].type} (${fieldsData.result[k].string})`)
      }
    }
  } catch (e) {
    console.error("Error getting fields_get:", e.message)
  }

  // 4. Sample 5 employees with their location fields
  try {
    const empRes = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            odooDb, uid, odooApiKey, "hr.employee", "search_read",
            [[]],
            { fields: ["id", "name", "work_location_id", "work_location_name", "department_id", "job_id"], limit: 10 }
          ]
        },
        id: 4
      })
    })
    const empData = await empRes.json()
    console.log("Sample 10 Odoo employees location data:", JSON.stringify(empData.result, null, 2))
  } catch (e) {
    console.error("Error reading employee samples:", e.message)
  }

  await prisma.$disconnect()
}

main().catch(console.error)

