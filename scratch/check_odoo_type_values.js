const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOdooFields() {
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

  const fields = [
    "id", "name", 
    "employee_type_id", 
    "structure_type_id", 
    "structure_id", 
    "wage_type",
    "l10n_id_payroll_type"
  ];

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
          [[["id", "in", [521, 523, 607, 518, 5]]]],
          { fields: fields }
        ]
      },
      id: 3
    })
  });
  const empData = await empRes.json();
  console.log("Employees data:");
  console.log(JSON.stringify(empData.result, null, 2));

  // Also check hr.contract if exists
  const contractRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [dbSettings.db, uid, dbSettings.apiKey, "hr.contract", "fields_get",
          [],
          { attributes: ["string", "type"] }
        ]
      },
      id: 4
    })
  });
  const cData = await contractRes.json();
  console.log("hr.contract exists?", !cData.error);
  if (!cData.error) {
    const cFields = Object.keys(cData.result || {}).filter(k => k.includes('type') || k.includes('struct') || k.includes('name'));
    console.log("Contract fields of interest:", cFields);
  }
}

checkOdooFields().catch(console.error).finally(() => prisma.$disconnect());

