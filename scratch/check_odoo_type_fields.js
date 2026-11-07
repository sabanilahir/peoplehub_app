const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOdooFields() {
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

  // Let's inspect fields of hr.employee related to type, payroll, contract, etc.
  const fieldsRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [dbSettings.db, uid, dbSettings.apiKey, "hr.employee", "fields_get",
          [],
          { attributes: ["string", "type", "relation"] }
        ]
      },
      id: 2
    })
  });
  const fieldsData = await fieldsRes.json();
  const allFields = fieldsData.result || {};
  
  const relevant = Object.keys(allFields).filter(k => 
    k.includes('type') || k.includes('payroll') || k.includes('contract') || k.includes('wage') || k.includes('struct')
  );
  console.log("Relevant fields on hr.employee:");
  relevant.forEach(k => console.log(`- ${k}: [${allFields[k].type}] ${allFields[k].string} (${allFields[k].relation || ''})`));

  // Also read employee 521 for these fields
  const empRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [dbSettings.db, uid, dbSettings.apiKey, "hr.employee", "read",
          [[521, 523, 607, 518, 5]],
          relevant
        ]
      },
      id: 3
    })
  });
  const empData = await empRes.json();
  console.log("\nSample Employees data for relevant fields:");
  console.log(JSON.stringify(empData.result, null, 2));
}

checkOdooFields().catch(console.error).finally(() => prisma.$disconnect());

