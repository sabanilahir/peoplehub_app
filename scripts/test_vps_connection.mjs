import { PrismaClient } from '@prisma/client'

const dbUrl = process.env.DATABASE_URL || ''
console.log('----------------------------------------------------')
console.log('🔍 Menguji Koneksi Database...')
console.log(`Target DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`)
console.log('----------------------------------------------------')

const prisma = new PrismaClient({
  log: ['error']
})

async function run() {
  try {
    const start = Date.now()
    // Test raw query to get database name and current time
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`
    const duration = Date.now() - start
    
    console.log('✅ Berhasil terhubung ke database!')
    console.log(`⏱️ Latensi: ${duration} ms`)
    console.log('📊 Info Database:', result[0])

    const employeeCount = await prisma.employee.count()
    console.log(`👥 Total Karyawan di DB: ${employeeCount}`)
    console.log('----------------------------------------------------')
    console.log('🎉 Setup koneksi berhasil! Anda siap menjalankan "npm run dev".')
  } catch (err) {
    console.error('\n❌ Gagal terhubung ke database!')
    console.error(`Detail Error: ${err.message}\n`)

    if (dbUrl.includes('localhost:5433') || dbUrl.includes('127.0.0.1:5433')) {
      if (err.message.includes("Can't reach database server") || err.message.includes('ECONNREFUSED')) {
        console.log('💡 TIPS:')
        console.log('  SSH Tunnel tampaknya belum berjalan!')
        console.log('  Buka terminal baru dan jalankan:')
        console.log('  .\\scripts\\start-vps-tunnel.bat user@IP_VPS')
      }
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
