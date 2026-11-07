const p = require("@prisma/client").PrismaClient
const c = new p()

async function check() {
  const settings = await c.odooSettings.findMany({ take: 1 })
  if (settings.length > 0) {
    console.log("Odoo Settings:")
    console.log(" URL:", settings[0].url)
    console.log(" DB:", settings[0].db)
    console.log(" User:", settings[0].user)
  } else {
    console.log("No Odoo settings found")
  }
  
  await c.$disconnect()
}

check().catch(console.error)
