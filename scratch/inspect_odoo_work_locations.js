const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.odooSettings.findFirst({
    where: { url: { not: "" } },
    orderBy: { updatedAt: "desc" }
  })
  const baseUrl = (settings?.url || 'https://pt-gemilang.odoo.com').replace(/\/$/, "").replace(/\/odoo$/, "")
  const odooDb = settings?.db || 'pt-gemilang'
  const odooUser = settings?.user || 'lahir.sabani@gmail.com'
  const odooApiKey = settings?.apiKey || '263217c5eef3a8e37c13704089c814be97c0bd5e'
  const jsonRpcUrl = `${baseUrl}/jsonrpc`

  // Auth
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
  const uid = (await authRes.json()).result

  // Fields of hr.work.location
  const fieldsRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [odooDb, uid, odooApiKey, "hr.work.location", "fields_get", [], { attributes: ["string", "type"] }]
      },
      id: 2
    })
  })
  const fields = await fieldsRes.json()
  console.log("hr.work.location fields:", Object.keys(fields.result || {}))

  // Fetch all records with all fields
  const dataRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [odooDb, uid, odooApiKey, "hr.work.location", "search_read", [[]], {}]
      },
      id: 3
    })
  })
  const allLocs = await dataRes.json()
  console.log("All hr.work.location records:", JSON.stringify(allLocs.result, null, 2))

  await prisma.$disconnect()
}

main().catch(console.error)

