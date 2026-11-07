const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkView() {
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

  // Let's get the view architecture of hr.employee form view to see what field is under the "Payroll" tab!
  const viewRes = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [dbSettings.db, uid, dbSettings.apiKey, "hr.employee", "get_views",
          [],
          { views: [[false, "form"]] }
        ]
      },
      id: 5
    })
  });
  const viewData = await viewRes.json();
  const formArch = viewData.result?.views?.form?.arch || "";
  
  // Find "Payroll" in arch
  const idx = formArch.indexOf('Payroll');
  if (idx !== -1) {
    console.log("Snippet around 'Payroll':");
    console.log(formArch.substring(Math.max(0, idx - 200), Math.min(formArch.length, idx + 1500)));
  } else {
    console.log("Word 'Payroll' not found directly in form arch");
  }
}

checkView().catch(console.error).finally(() => prisma.$disconnect());

