// Check employees in database
const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, imported_from: true, nik: true }
    })
    
    console.log('=== Database Employees ===')
    console.log('Total:', employees.length)
    employees.forEach(e => {
      console.log(`${e.id} | ${e.name} | ${e.imported_from || 'null'} | NIK: ${e.nik}`)
    })
    
    const odooCount = employees.filter(e => e.imported_from === 'odoo').length
    const localCount = employees.filter(e => !e.imported_from).length
    console.log('\nOdoo:', odooCount)
    console.log('Local (null):', localCount)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)

