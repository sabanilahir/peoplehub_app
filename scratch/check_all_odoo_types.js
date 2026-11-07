const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllOdooTypes() {
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

  // Read all distinct employee_type_id in hr.employee
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
          { fields: ["id", "name", "employee_type_id"], limit: 1000 }
        ]
      },
      id: 7
    })
  });
  const empData = await empRes.json();
  const emps = empData.result || [];
  
  const typeCounts = {};
  for (const e of emps) {
    const typeName = Array.isArray(e.employee_type_id) ? e.employee_type_id[1] : (e.employee_type_id || 'EMPTY');
    typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
  }
  console.log("Distinct Employee Types (from hr.employee.employee_type_id):", typeCounts);
}

checkAllOdooTypes().catch(console.error).finally(() => prisma.$disconnect());

