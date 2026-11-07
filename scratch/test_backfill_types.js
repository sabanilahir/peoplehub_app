const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFetchAndMap() {
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

  const odooFields = [
    "id", "name", "employee_type_id"
  ];

  const employeesResponse = await fetch(jsonRpcUrl, {
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
          { fields: odooFields, limit: 1000 }
        ]
      },
      id: 4
    })
  });
  const emps = (await employeesResponse.json()).result || [];
  const getName = (val) => Array.isArray(val) ? val[1] : (val || "");

  console.log("Total fetched:", emps.length);
  for (const emp of emps) {
    const rawEmpType = getName(emp.employee_type_id);
    const employmentType = rawEmpType || "Permanent";
    await prisma.employee.updateMany({
      where: { odoo_id: String(emp.id) },
      data: { employmentType: employmentType }
    });
  }
  console.log("Finished updating employees in DB!");

  // Verify in DB
  const counts = {};
  const updatedEmps = await prisma.employee.findMany({
    where: { imported_from: 'odoo' },
    select: { employmentType: true }
  });
  updatedEmps.forEach(e => { counts[e.employmentType] = (counts[e.employmentType] || 0) + 1; });
  console.log("New DB employmentType counts:", counts);
}

testFetchAndMap().catch(console.error).finally(() => prisma.$disconnect());

