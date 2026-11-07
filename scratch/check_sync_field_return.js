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

  const odooFields = [
    "id", "name", "active",
    "work_email", "work_phone", "mobile_phone",
    "department_id", "job_id", "job_title",
    "parent_id", "work_location_id", "work_location_name",
    "employee_type_id", "first_contract_date", "contract_date_start",
    "birthday", "sex", "marital",
    "identification_id", "country_id",
    "additional_note", "category_ids",
    "user_id", "address_id"
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
          [[["id", "in", [523, 607, 518, 5]]]], 
          { fields: odooFields, limit: 10 }
        ]
      },
      id: 4
    })
  });
  const emps = await employeesResponse.json();
  console.log("Returned from search_read with odooFields:", JSON.stringify(emps.result?.map(e => ({
    id: e.id,
    name: e.name,
    employee_type_id: e.employee_type_id
  })), null, 2));
}

checkOdooFields().catch(console.error).finally(() => prisma.$disconnect());

