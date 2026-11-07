const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOdooCompanies() {
  const dbSettings = await prisma.odooSettings.findFirst({
    where: { url: { not: "" } },
    orderBy: { updatedAt: "desc" }
  });
  const baseUrl = dbSettings.url.replace(/\/$/, "").replace(/\/odoo$/, "");
  const jsonRpcUrl = `${baseUrl}/jsonrpc`;

  const authResponse = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service: "common", method: "authenticate", args: [dbSettings.db, dbSettings.user, dbSettings.apiKey, {}] },
      id: 1
    })
  });
  const authData = await authResponse.json();
  const uid = authData.result;

  // Read all employees' address_id and company_id in Odoo
  const empRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [dbSettings.db, uid, dbSettings.apiKey, "hr.employee", "search_read", 
          [[]], 
          { fields: ["id", "name", "address_id", "company_id"], limit: 1000 }
        ]
      },
      id: 2
    })
  });
  const emps = (await empRes.json()).result || [];
  
  const addresses = {};
  const companies = {};
  for (const e of emps) {
    const aName = Array.isArray(e.address_id) ? e.address_id[1] : String(e.address_id);
    addresses[aName] = (addresses[aName] || 0) + 1;
    const cName = Array.isArray(e.company_id) ? e.company_id[1] : String(e.company_id);
    companies[cName] = (companies[cName] || 0) + 1;
  }
  console.log("Distinct address_id in Odoo:", addresses);
  console.log("Distinct company_id in Odoo:", companies);
}

checkOdooCompanies().catch(console.error).finally(() => prisma.$disconnect());

