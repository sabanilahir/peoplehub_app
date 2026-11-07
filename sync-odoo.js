import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncEmployees() {
  const baseUrl = 'https://pt-gemilang.odoo.com'
  const odooDb = 'pt-gemilang'
  const odooUser = 'lahir.sabani@gmail.com'
  const odooApiKey = '263217c5eef3a8e37c13704089c814be97c0bd5e'
  const jsonRpcUrl = `${baseUrl}/jsonrpc`

  console.log('Step 1: Authenticating...')
  
  // Auth
  const authResponse = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [odooDb, odooUser, odooApiKey, {}]
      },
      id: 1
    })
  })

  const authData = await authResponse.json()
  const uid = authData.result
  console.log('UID:', uid)

  console.log('Step 2: Fetching employees...')
  
  // Fetch employees
  const employeesResponse = await fetch(jsonRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          odooDb,
          uid,
          odooApiKey,
          'hr.employee',
          'search_read',
          [[['active', '=', true]]],
          {
            fields: ['id', 'name', 'work_email', 'work_phone'],
            limit: 1000
          }
        ]
      },
      id: 2
    })
  })

  const employeesData = await employeesResponse.json()
  const odooEmployees = employeesData.result || []
  console.log('Odoo employees found:', odooEmployees.length)

  console.log('Step 3: Syncing to PostgreSQL...')
  
  let created = 0
  let updated = 0

  for (const emp of odooEmployees) {
    const empData = {
      odoo_id: String(emp.id),
      imported_from: 'odoo',
      last_sync_at: new Date(),
      name: emp.name || '',
      email: emp.work_email || '',
      phone: emp.work_phone || '',
    }

    const existing = await prisma.employee.findFirst({
      where: { odoo_id: String(emp.id) }
    })

    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: empData
      })
      updated++
    } else {
      const maxId = await prisma.employee.aggregate({
        _max: { id: true }
      })
      const newId = (maxId._max.id || 200000) + 1

      await prisma.employee.create({
        data: {
          ...empData,
          id: newId,
          nik: `ODOO-${emp.id}`,
          status: 'Active',
          role: 'employee'
        }
      })
      created++
    }
  }

  console.log(`\n✅ Sync completed!`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Total synced: ${created + updated}`)
}

syncEmployees()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
