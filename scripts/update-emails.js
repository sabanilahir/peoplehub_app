// One-off: repoint every seed email domain to @testing.com in the live DB.
// Run with: node scripts/update-emails.js
const fs = require('fs')
const path = require('path')

// Next/Prisma CLI auto-load .env; a bare `node` script doesn't, so parse it here.
const envPath = path.join(__dirname, '..', '.env')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const OLD_DOMAINS = ['test.com', 'dwikarya.co.id', 'gmail.com', 'company.com', 'mail.com', 'email.com']
const NEW_DOMAIN = 'testing.com'

const retarget = (email) => {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  return OLD_DOMAINS.includes(domain) ? `${local}@${NEW_DOMAIN}` : email
}

async function main() {
  const employees = await prisma.employee.findMany({ select: { id: true, email: true, personalEmail: true } })
  let empChanged = 0
  for (const e of employees) {
    const email = retarget(e.email)
    const personalEmail = retarget(e.personalEmail)
    if (email !== e.email || personalEmail !== e.personalEmail) {
      await prisma.employee.update({ where: { id: e.id }, data: { email, personalEmail } })
      empChanged++
    }
  }
  console.log(`Employee: updated ${empChanged}/${employees.length}`)

  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  let userChanged = 0
  for (const u of users) {
    const email = retarget(u.email)
    if (email !== u.email) {
      await prisma.user.update({ where: { id: u.id }, data: { email } })
      userChanged++
    }
  }
  console.log(`User: updated ${userChanged}/${users.length}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
