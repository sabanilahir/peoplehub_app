// Runs `prisma migrate deploy` during the build when a database is configured,
// so tables are created automatically on Vercel deploys. It never fails the
// build: with no DATABASE_URL (or a migration error) it logs and continues, and
// the app falls back to the bundled JSON seed at runtime.
import { execSync } from 'node:child_process'

if (!process.env.DATABASE_URL) {
  console.log('[db] No DATABASE_URL set — skipping migrations (app uses local seed data).')
  process.exit(0)
}

try {
  console.log('[db] Applying migrations (prisma migrate deploy)…')
  execSync('prisma migrate deploy', { stdio: 'inherit' })
  console.log('[db] Migrations applied.')
} catch (e) {
  console.warn('[db] migrate deploy failed — continuing build. Error:', e?.message || e)
}
process.exit(0)
