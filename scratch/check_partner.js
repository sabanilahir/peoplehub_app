const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPartner() {
  const dbSettings = await prisma.odooSettings.findFirst({
    where: { url: { not: "" } },
    orderBy: { updatedAt: "desc" }
  });
  if (!dbSettings) {
    console.log("No db settings found");
    return;
  }
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
  console.log("Auth uid:", uid);

  // Read employee 521 with address_id and related partner fields
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
          [[["id", "=", 521]]],
          { fields: ["id", "name", "job_id", "job_title", "parent_id", "address_id", "work_location_id"] }
        ]
      },
      id: 2
    })
  });
  const empData = await empRes.json();
  console.log("Odoo Employee 521:", JSON.stringify(empData.result, null, 2));

  if (empData.result?.[0]?.address_id) {
    const partnerId = empData.result[0].address_id[0];
    const partnerRes = await fetch(jsonRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [dbSettings.db, uid, dbSettings.apiKey, "res.partner", "read",
            [[partnerId]],
            { fields: ["name", "street", "street2", "city", "state_id", "country_id", "contact_address_complete"] }
          ]
        },
        id: 3
      })
    });
    const partnerData = await partnerRes.json();
    console.log("Partner Address Data:", JSON.stringify(partnerData.result, null, 2));
  }
}

checkPartner().catch(console.error).finally(() => prisma.$disconnect());

