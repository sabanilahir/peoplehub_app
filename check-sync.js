const p = require("@prisma/client").PrismaClient
const c = new p()

async function check() {
  const depts = await c.department.findMany({ where: { odoo_id: { not: null } }, take: 5 })
  console.log("Departments synced:", depts.length)
  depts.forEach(x => console.log(" -", x.id, x.name))
  
  const pos = await c.position.findMany({ where: { odoo_id: { not: null } }, take: 5 })
  console.log("Positions synced:", pos.length)
  pos.forEach(x => console.log(" -", x.id, x.name))
  
  const emps = await c.employee.findMany({ where: { imported_from: "odoo" }, take: 3 })
  console.log("Employees from Odoo:", emps.length)
  emps.forEach(x => console.log(" -", x.id, x.name, "| dept:", x.dept, "| pos:", x.position))
  
  await c.disconnect()
}

check().catch(console.error)
