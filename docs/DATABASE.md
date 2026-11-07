# Database (Prisma) — initialize & seed

The app runs in two modes, automatically:

- **No database (default)** — the stores hydrate from the committed static JSON in
  `public/data/`. Nothing resets between runs; the data is always reloaded from the
  files in git. UI edits are in-memory only.
- **With a database** — once `DATABASE_URL` is set and the DB is seeded, the API
  routes (`/api/employees`, `/api/structure`, `/api/users`) serve data from Postgres
  and the stores read from there first (falling back to JSON if the DB is down).

## One-time setup

1. **Provision Postgres** (Neon, Vercel Postgres, Supabase, or local) and copy the
   connection string.

2. **Configure env** — copy `.env.example` to `.env` and set `DATABASE_URL`.
   On Vercel, add `DATABASE_URL` in Project → Settings → Environment Variables.

3. **Create the schema**
   ```bash
   npx prisma db push        # or: npx prisma migrate deploy
   ```

4. **Seed from the committed data files** (`public/data/*.json`)
   ```bash
   npm run db:seed           # = prisma db seed = node prisma/seed.js
   ```
   Seeds: 1 enterprise, 1 division, 20 companies, 108 business units, 384
   departments, 88 job families, 72 grades, 7,237 positions, 9,940 employees,
   9,940 login accounts. Idempotent (`createMany({ skipDuplicates })`) — safe to
   re-run.

## Re-initialize from scratch

```bash
npx prisma db push --force-reset   # drops & recreates all tables
npm run db:seed
```

## Notes

- The data files in `public/data/` are the source of truth for the seed, so the DB
  can always be rebuilt to the exact current state — this is what guarantees the data
  isn't lost on a fresh environment.
- Org-structure references (companyId, departmentId, positionId, managerId, …) are
  plain indexed integer columns rather than enforced foreign keys, so the bulk seed
  is order-independent and tolerant of the few unresolved supervisor links in the
  source export.
- Write-back of UI edits: **Employees** and **Users** are wired — create/update/delete
  in the UI is written through to the DB (best-effort via `/api/employees`,
  `/api/employees/[id]`, `/api/users`, `/api/users/[id]`). When no DB is configured the
  write is silently skipped and the in-memory store behaves exactly as before.
  Not yet wired: org-structure entities, nested employee sub-records (dependents,
  education, certifications, skills, history) and the other stores (leave, payroll,
  attendance, onboarding, …).
