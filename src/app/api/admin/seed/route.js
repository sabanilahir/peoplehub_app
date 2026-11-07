import { prisma } from '@/lib/prisma'
import { SCHEMA_SQL } from '@/lib/schemaSql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Drop every app table (used by ?reset=1 to recover from an earlier partial /
// stale schema). Safe here because setup hasn't completed — no real data yet.
async function dropAll() {
  const names = [...SCHEMA_SQL.matchAll(/CREATE TABLE "([^"]+)"/g)].map(m => m[1])
  for (const n of [...names, '_prisma_migrations']) {
    try { await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${n}" CASCADE`) } catch {}
  }
}

// Create every table/index/constraint if missing, using the (working) runtime
// connection. Idempotent: CREATE … IF NOT EXISTS, and "already exists" errors on
// foreign keys are ignored. Returns any unexpected errors.
async function ensureTables() {
  const stmts = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean)
  const errors = []
  for (const raw of stmts) {
    const sql = raw
      .replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (e) {
      const msg = String(e?.message || e)
      if (!/already exists/i.test(msg)) errors.push({ sql: sql.slice(0, 60), msg: msg.slice(0, 140) })
    }
  }
  return errors
}

// ─── One-click database loader ────────────────────────────────────────────────
// Fills the database from the committed /public/data JSON. Idempotent
// (createMany skipDuplicates) and resumable: it processes rows within a time
// budget and reports progress, so it can be called repeatedly until `done`.
//
//   GET /api/admin/seed?key=<SEED_KEY>
//
// Protected by the SEED_KEY environment variable (set it in Vercel).

// Stay well under Vercel's 10s Hobby function limit: process a small slice per
// request and return progress; the client refreshes until done.
const BATCH = 500
const TIME_BUDGET_MS = 5000

const mapEmployee = (e) => ({
  id: e.id, nik: String(e.nik || ''), name: e.name || '', status: e.status || 'Active',
  companyId: e.companyId ?? null, divisionId: e.divisionId ?? null,
  businessUnitId: e.businessUnitId ?? null, departmentId: e.departmentId ?? null,
  positionId: e.positionId ?? null, gradeId: e.gradeId ?? null, managerId: e.managerId ?? null,
  employmentType: e.employmentType || '', role: e.role || 'employee',
  joinDate: e.joinDate || '', endDate: e.endDate || '',
  gender: e.gender || '', birthPlace: e.birthPlace || '', birthDate: e.birthDate || '',
  nationality: e.nationality || '', religion: e.religion || '', maritalStatus: e.maritalStatus || '',
  ktp: e.ktp || '', phone: e.phone || '', email: e.email || '', personalEmail: e.personalEmail || '',
  address: e.address || '', city: e.city || '', province: e.province || '', country: e.country || '',
  location: e.location || '',
})

const mapUser = (u) => ({
  id: u.id, username: String(u.username), password: u.password || 'pass123',
  name: u.name || '', role: u.role || 'employee', dept: u.dept || '',
  position: u.position || '', email: u.email || '', employeeId: u.employeeId ?? null,
})

export async function GET(req) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key')

  if (!process.env.SEED_KEY) {
    return Response.json({ error: 'SEED_KEY is not set on the server. Add it as an environment variable in Vercel, then retry.' }, { status: 403 })
  }
  if (key !== process.env.SEED_KEY) {
    return Response.json({ error: 'Invalid or missing key.' }, { status: 401 })
  }

  // Optional one-time reset: drop stale/partial tables, recreate, and stop.
  const isReset = url.searchParams.get('reset') === '1'
  if (isReset) {
    await dropAll()
    const schemaErrors = await ensureTables()
    if (schemaErrors.length) return Response.json({ error: 'Could not create the database schema.', schemaErrors }, { status: 500 })
    return Response.json({ reset: true, done: false, hint: 'Schema reset & created. Now open the same URL WITHOUT &reset=1 to load the data (refresh until done).' })
  }

  // Plain load: ensure the schema exists (idempotent; also creates newly-added
  // tables like AppState on a database seeded before they existed). Fast when the
  // function is co-located with the DB.
  const schemaErrors = await ensureTables()
  if (schemaErrors.length) return Response.json({ error: 'Could not create the database schema. Try the reset link once: add &reset=1', schemaErrors }, { status: 500 })

  const base = url.origin
  const getJson = (f) => fetch(`${base}/data/${f}`).then(r => r.json())

  let structure, grades, employees, users
  try {
    ;[structure, grades, employees, users] = await Promise.all([
      getJson('importedStructure.json'),
      getJson('grades.json'),
      getJson('importedEmployees.json'),
      getJson('importedUsers.json'),
    ])
  } catch (e) {
    return Response.json({ error: 'Could not load /data JSON files.', detail: String(e?.message || e) }, { status: 500 })
  }

  // Keep company names in sync (createMany skips existing rows, so names loaded
  // before they were de-anonymized are corrected here via upsert — only 20 rows).
  let companiesSynced = 0
  try {
    for (const c of (structure.companies || [])) {
      await prisma.company.upsert({
        where:  { id: c.id },
        create: c,
        update: { name: c.name, companyCode: c.companyCode, code: c.code, legalEntity: c.legalEntity, country: c.country, status: c.status },
      })
      companiesSynced++
    }
  } catch {}

  const steps = [
    { key: 'enterprises',   model: prisma.enterprise,  rows: structure.enterprises   || [], map: r => r },
    { key: 'divisions',     model: prisma.division,     rows: structure.divisions     || [], map: r => r },
    { key: 'companies',     model: prisma.company,      rows: structure.companies     || [], map: r => r },
    { key: 'businessUnits', model: prisma.businessUnit, rows: structure.businessUnits || [], map: r => r },
    { key: 'departments',   model: prisma.department,   rows: structure.departments   || [], map: r => r },
    { key: 'jobFamilies',   model: prisma.jobFamily,    rows: structure.jobFamilies   || [], map: r => r },
    { key: 'grades',        model: prisma.grade,        rows: grades                  || [], map: r => r },
    { key: 'positions',     model: prisma.position,     rows: structure.positions     || [], map: r => r },
    { key: 'employees',     model: prisma.employee,     rows: employees               || [], map: mapEmployee },
    { key: 'users',         model: prisma.user,         rows: users                   || [], map: mapUser },
  ]

  const start = Date.now()
  const progress = []
  let inserted = 0
  let done = true

  try {
    for (const step of steps) {
      const total = step.rows.length
      let have = await step.model.count()
      if (have < total) {
        while (have < total) {
          if (Date.now() - start > TIME_BUDGET_MS) { done = false; break }
          const chunk = step.rows.slice(have, have + BATCH).map(step.map)
          const res = await step.model.createMany({ data: chunk, skipDuplicates: true })
          inserted += res.count
          have += chunk.length
        }
      }
      progress.push({ entity: step.key, loaded: Math.min(have, total), total })
      if (!done) break
    }
  } catch (e) {
    return Response.json({ error: 'Seeding error (tables may not exist yet — check the deploy migrated).', detail: String(e?.message || e), progress }, { status: 500 })
  }

  return Response.json({
    done,
    insertedThisCall: inserted,
    companiesSynced,
    elapsedMs: Date.now() - start,
    progress,
    hint: done ? 'Database loaded. ✅' : 'Not finished — call this URL again to continue.',
  })
}
