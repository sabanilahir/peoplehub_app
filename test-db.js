// Test API route logic directly
const path = require('path')

// Set up environment
process.chdir(__dirname)

// Mock Next.js environment
const mockReq = { json: async () => ({ test: true }) }

// Simple test of the API logic
async function testApi() {
  try {
    // Simulate what /api/employees does
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    console.log('Testing /api/employees logic...')
    
    // Test GET logic
    const employees = await prisma.employee.findMany({ orderBy: { id: 'asc' } })
    console.log('✅ GET: Found', employees.length, 'employees')
    
    await prisma.$disconnect()
    return { success: true, count: employees.length }
  } catch (e) {
    console.error('❌ Error:', e.message)
    return { success: false, error: e.message }
  }
}

testApi().then(r => console.log('Result:', r))