const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmpRaw() {
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
          [[["id", "in", [523, 607, 518, 5]]]],
          { fields: ["id", "name", "employee_type_id"] }
        ]
      },
      id: 6
    })
  });
  const empData = await empRes.json();
  if (empData.error) {
    console.error("Odoo error:", empData.error);
  } else {
    console.log("Raw employee types in Odoo:", JSON.stringify(empData.result, null, 2));
  }
}

checkEmpRaw().catch(console.error).finally(() => prisma.$disconnect());
