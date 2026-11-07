const p = require("@prisma/client").PrismaClient
const c = new p()

async function check() {
  const settings = await c.odooSettings.findMany({ take: 1 })
  if (settings.length > 0) {
    console.log("Odoo Settings found:")
    console.log(" URL:", settings[0].url)
    console.log(" DB:", settings[0].db)
    console.log(" User:", settings[0].user)
    console.log(" Sync Enabled:", settings[0].syncEnabled)
  } else {
    console.log("No settings found - click Save first in the UI")
  }
  
  await c.$disconnect()
}

check().catch(console.error)
