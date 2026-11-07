# Database Setup — making changes persist across devices

Today the prototype stores changes in each browser's `localStorage`, so edits
don't travel between devices. This guide turns on a shared PostgreSQL database.
The app already ships with a Prisma schema, a migration, and a seed script — you
just need to provision a database and point the app at it.

> **Scope note.** Right now four domains write through to the database:
> **Users, Employees, Org Structure, Onboarding Templates.** The remaining
> modules (offboarding, talent, personnel actions, exit interviews, checklists,
> onboarding records, …) are still `localStorage`-only and are being migrated in
> phases — see [Roadmap](#roadmap-full-backend) at the bottom.

---

## Step 1 — Create a Postgres database (Neon, free)

[Neon](https://neon.tech) is a free serverless Postgres that works smoothly with
Vercel + Prisma. (Vercel Postgres and Supabase also work — see notes at the end.)

1. Sign up at **https://neon.tech** and click **Create project**.
2. Name it e.g. `kappabel`, pick the region closest to your Vercel deployment,
   Postgres 16.
3. After it's created, open **Dashboard → Connect** and copy **two** strings:
   - the **Pooled** connection string (host contains `-pooler`) → this is `DATABASE_URL`
   - the **Direct** connection string (no `-pooler`) → this is `DIRECT_URL`

Both look like:
```
postgresql://kappabel_owner:npg_xxxxx@ep-cool-name-pooler.ap-southeast-1.aws.neon.tech/kappabel?sslmode=require
```

---

## Step 2 — Set the environment variables

### Locally (for running migrate + seed once)
Create a `.env` file in the project root (copy from `.env.example`):
```bash
DATABASE_URL="…pooled…&pgbouncer=true"
DIRECT_URL="…direct…"
```

### On Vercel (for the live site)
Project → **Settings → Environment Variables** → add both `DATABASE_URL` and
`DIRECT_URL` for **Production** (and Preview if you want). Then **redeploy** so
the running app picks them up.

---

## Step 3 — Create the tables and load the data

Run these once from the project root (after `.env` is set):

```bash
npm install                        # ensures prisma client is generated
npx prisma migrate deploy          # creates all tables from the existing migration
npm run db:seed                    # bulk-loads ~10k employees/users/org structure
```

`db:seed` is **idempotent** (`skipDuplicates`), so it's safe to re-run.

---

## Step 4 — Verify

```bash
npx prisma studio        # opens a browser table viewer — you should see rows in User, Employee, …
```

Then open the site on two different devices/browsers, edit an employee on one,
refresh the other — the change should now be there.

---

## How it works (so you know what's persisted)

- **Read path:** on load, each wired store calls `GET /api/<domain>`. If a
  database is configured it returns rows; if not (HTTP 503) the app falls back to
  the bundled `/public/data/*.json` seed. → *no DB = today's behaviour, unchanged.*
- **Write path:** create/update/delete call `POST/PUT/DELETE /api/<domain>` as a
  best-effort write-through (`src/lib/persist.js`).
- **Connection pooling:** `DATABASE_URL` is the pooled URL (safe for Vercel's
  serverless functions); `DIRECT_URL` is used only by migrations. This split is
  configured in `prisma/schema.prisma`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Can't reach database server` on migrate | Use the **direct** URL for `DIRECT_URL`; check the password didn't get truncated. |
| `too many connections` on the live site | Make sure `DATABASE_URL` is the **pooled** (`-pooler`) URL with `&pgbouncer=true`. |
| `/api/*` still returns 503 after deploy | Env vars not set for the right environment, or you didn't redeploy. |
| Seed says `0 rows` | The JSON files under `public/data/` must be present (they are, in the repo). |

### Other providers
- **Vercel Postgres:** Storage → Create → Postgres. It auto-adds `POSTGRES_*`
  vars; set `DATABASE_URL`/`DIRECT_URL` to the pooled/direct values it gives.
- **Supabase:** Project Settings → Database → Connection string. Use the
  *Transaction pooler* (port 6543) for `DATABASE_URL` and the direct (5432) for
  `DIRECT_URL`.

---

## Roadmap: full backend

Making **every** module multi-device is incremental. Each remaining store needs:
a Prisma model → an `/api/<domain>` route (GET/POST/PUT/DELETE) → the store
rewired to read from the API and write through it.

Suggested phases:

1. **Harden the wired core** — make reads DB-authoritative (no seed+DB merge),
   await writes with error surfacing. *(code only, no schema change)*
2. **Onboarding** — onboarding records, checklist items, rules.
3. **Offboarding** — personnel actions, offboarding checklist, dept
   notifications, exit interviews.
4. **Talent** — 9-Box placements, TRM records, key positions, succession,
   vacancy risk, IDP.
5. **The rest** — attendance, leave, payroll, learning, branding/settings.
6. **Security pass** — hash passwords, real auth/session, per-row audit.

Phases 2–5 add tables to `schema.prisma`; each needs one migration
(`npx prisma migrate dev --name <phase>`) and a matching API route.
