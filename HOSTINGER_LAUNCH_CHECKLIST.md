# Hostinger Launch Checklist — Stillhere

> Execution-ready checklist for the first production deployment. Companion to `DEPLOYMENT.md` (narrative walkthrough) — this file is the ordered, copy-pasteable version, updated after the full post-cleanup verification pass documented in `PROGRESS.md`.
>
> **Status when this was written:** `npm test` 22/22 passing, `npm run build` zero errors, full 18-point browser/API smoke test passed against a local production build. **Not yet deployed.**

---

## 0. Before you start — one gap you must resolve

This repo has **no `prisma/migrations/` directory**. The local dev/test database was set up with `prisma db push`, not `prisma migrate`. That means the commonly-recommended `npx prisma migrate deploy` command **will do nothing on a fresh Hostinger database** — there are no migration files for it to apply.

Pick one:

- **Option A — create a baseline migration once (recommended if you expect future schema changes):**
  1. Point `DATABASE_URL` at a throwaway empty MySQL database (not production, not the local `stillhere_test` dev DB — that one has ad-hoc `db push` history that isn't migration-tracked).
  2. Run `npx prisma migrate dev --name init`. This creates `prisma/migrations/<timestamp>_init/migration.sql` from the current `schema.prisma`.
  3. Commit `prisma/migrations/` to the repo.
  4. In production, use `npx prisma migrate deploy` (step 3 below) — it will apply that one migration cleanly to the empty Hostinger database and leave a proper migration history for every future change.
- **Option B — use `db push` for this launch (faster, acceptable for a single-admin low-traffic launch, no migration history):**
  1. Skip `migrate deploy` entirely.
  2. In production, run `npx prisma db push` instead (step 3 below). It syncs the schema directly with no migration files.
  3. Understand this means future schema changes also need `db push`, and there's no audit trail of schema evolution.

The commands below assume **Option A** (`migrate deploy`) since it's the correct long-term setup; swap in `npx prisma db push` wherever you see `migrate deploy` if you chose Option B.

---

## 1. Hostinger prerequisites

- [ ] Hosting plan with **Node.js app support** (Business Web Hosting or VPS) — confirm Node.js 20.x or 22.x LTS is selectable in hPanel.
- [ ] **MySQL 8.0+ database** created via hPanel → Databases → MySQL Databases. Note the generated database name, username, password, and host (usually `localhost` for shared hosting).
- [ ] Domain pointed at the Hostinger hosting account (A record or nameservers already configured).
- [ ] SSH access enabled (hPanel → Advanced → SSH Access) — needed for the one-time setup commands below.

---

## 2. Environment variables

Set these in Hostinger's Node.js app environment-variable panel (hPanel → Websites → [your site] → Node.js → Environment Variables), **not** just in a `.env` file — several project scripts (`scripts/create-admin.mjs`, `prisma/seed.mjs`, `scripts/cleanup.mjs`) only auto-load `.env` when `NODE_ENV !== 'production'`, matching how the app itself expects real env vars to already be present in production.

| Variable | Example / how to generate | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `APP_URL` | `https://yourdomain.com` | |
| `DATABASE_URL` | `mysql://db_user:db_password@localhost:3306/db_name` | From Hostinger MySQL panel |
| `ANONYMOUS_IDENTITY_SECRET` | `openssl rand -hex 64` | |
| `NETWORK_HASH_SECRET` | `openssl rand -hex 64` | |
| `NETWORK_HASH_ROTATION_VERSION` | `1` | |
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 64` | |
| `INITIAL_ADMIN_EMAIL` | `admin@yourdomain.com` | Used once by `create-admin.mjs` |
| `INITIAL_ADMIN_PASSWORD` | 12+ char strong password | **Remove from env after first successful admin login** |
| `CLEANUP_SECRET` | `openssl rand -hex 32` | Protects `/api/cleanup` |
| `CLEANUP_RETENTION_DAYS` | `30` | |
| `RATE_LIMIT_RETENTION_HOURS` | `48` | |
| `GLOBAL_COUNTDOWN_HOURS` | `24` | |
| `THREAD_EXPIRATION_HOURS` | `24` | |
| `THREAD_MAX_LIFETIME_DAYS` | `7` | |
| `POST_COOLDOWN_SECONDS` | `10` | |
| `REPLY_COOLDOWN_SECONDS` | `5` | |
| `MAX_POSTS_PER_HOUR` | `5` | |
| `MAX_REPLIES_PER_HOUR` | `20` | |
| `MAX_REPORTS_PER_HOUR` | `10` | |
| `MAX_REACTION_CHANGES_PER_MINUTE` | `10` | |
| `NIGHT_MODE_START_HOUR` | `19` | |
| `NIGHT_MODE_END_HOUR` | `7` | |
| `ADS_ENABLED` | `false` | |
| `MODERATION_API_URL` | *(leave blank)* | Not used in MVP |
| `MODERATION_API_KEY` | *(leave blank)* | Not used in MVP |
| `SUPPORT_EMAIL` | `support@yourdomain.com` | |

- [ ] All variables above set in the Hostinger Node.js environment panel.
- [ ] Full list cross-checked against `.env.example` (source of truth if this table ever drifts).

---

## 3. One-time server setup (via SSH, in the app directory)

Run in this exact order:

```bash
# 1. Install dependencies (production only)
npm ci --omit=dev

# 2. Generate the Prisma Client for this environment
npx prisma generate

# 3a. Apply the database schema — Option A (migration history, see §0)
npx prisma migrate deploy
# 3b. — OR Option B (no migration history, see §0)
# npx prisma db push

# 4. Seed initial data (20 daily themes, default site settings, Generation 1)
npx prisma db seed
# equivalent direct form if the above ever errors on "no seed command found":
# node prisma/seed.mjs

# 5. Create the first admin account (reads INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD from env)
node scripts/create-admin.mjs
```

Notes:
- Step 4 is **idempotent** (uses `upsert`) — safe to re-run.
- Step 5 is a no-op if an admin with that email already exists — safe to re-run.
- `npm ci --omit=dev` still installs `prisma` (it's a `dependencies` entry, not `devDependencies`, in this project) so step 2 works without a dev install.

---

## 4. Build and start

```bash
# Build the production bundle
npm run build

# Start the app
npm run start
```

- **Node.js entry point for Hostinger's app config:** this is a standard Next.js app — the entry point Hostinger's Node.js app panel needs is the `npm run start` script (which runs `next start`), **not** a custom `server.js`. If Hostinger's panel requires a literal file path instead of an npm script, point it at `node_modules/.bin/next` with `start` as the argument, or use `scripts/start-local-server.mjs` as a custom entry point (it wraps `next({ dev: false })` in a plain `http.createServer` — edit `dev: true` → `dev: false` and the hostname/port before using it this way).
- **Port:** `next start` defaults to `3000`. If Hostinger's Node.js proxy expects a specific port, set a `PORT` environment variable (Next.js respects it) and match it in the Hostinger app's port configuration.
- **Process manager (VPS only — shared hosting manages the process for you):**
  ```bash
  pm2 start npm --name "stillhere" -- run start
  pm2 save
  pm2 startup   # follow the printed instructions to survive reboots
  ```

- [ ] `npm run build` completes with zero errors on the server itself (build artifacts are environment-specific; don't just copy a locally-built `.next` folder unless your Hostinger Node version exactly matches).
- [ ] App starts and responds on the configured port.

---

## 5. Cron job — automated cleanup

Runs generation expiry, thread deletion, notification cleanup, and rate-limit pruning every 5 minutes. Set up in hPanel → Advanced → Cron Jobs.

**Recommended: HTTP endpoint** (works identically whether the app is managed by PM2, Hostinger's built-in Node process manager, or anything else — no dependency on cron running as the same user/environment as the app):

```bash
*/5 * * * * curl -s -H "x-cleanup-secret: YOUR_CLEANUP_SECRET" "https://yourdomain.com/api/cleanup" > /dev/null 2>&1
```

(Query-param form also works if header-based cron isn't supported by your Hostinger cron UI: `curl -s "https://yourdomain.com/api/cleanup?secret=YOUR_CLEANUP_SECRET"`.)

**Alternative: direct script execution** (only if you have SSH-level cron with the same env vars available):

```bash
*/5 * * * * cd /home/username/public_html && /usr/bin/node scripts/cleanup.mjs >> /home/username/logs/cleanup.log 2>&1
```

- [ ] Cron job created and set to every 5 minutes.
- [ ] `CLEANUP_SECRET` in the cron command matches the environment variable exactly.
- [ ] First cron run confirmed in logs (either the app's server log for the HTTP route, or `cleanup.log` for the script form).

---

## 6. Domain & HTTPS

- [ ] Domain's DNS points at the Hostinger hosting account (A record to the server IP, or nameservers set to Hostinger's).
- [ ] SSL certificate issued via hPanel → SSL (Hostinger's free Let's Encrypt SSL is sufficient) and shows as **Active**.
- [ ] Force-HTTPS redirect enabled in hPanel (or confirm the Node app itself doesn't need to handle the redirect — Hostinger's edge typically does this).
- [ ] `APP_URL` environment variable matches the final `https://` domain exactly (used in metadata/OpenGraph generation).

---

## 7. Post-deployment smoke test

Run through this in a real browser against the live domain, in order — mirrors the local verification already completed (see `PROGRESS.md`):

- [ ] Homepage loads at `https://yourdomain.com` with no console errors.
- [ ] Global countdown is visible and ticking down.
- [ ] Only three feed tabs are visible: **Live**, **Most Discussed**, **Disappearing Soon** — Live selected by default.
- [ ] No "Anything Goes" option, no theme selector in the composer, no "Somewhere Strange" link anywhere.
- [ ] Create a test post → countdown resets to ~24:00:00, post shows "This post saved the website."
- [ ] Reply to that post → thread's "Disappears in" time extends; **global countdown does not change**.
- [ ] Reply to that reply (nested) → renders correctly.
- [ ] React to the post, then remove the reaction → both operations succeed.
- [ ] Attempt a second post within 10 seconds → blocked with a cooldown message.
- [ ] Attempt a second reply within 5 seconds → blocked with a cooldown message.
- [ ] Visit `/my-activity` → the test post and reply appear under the correct tabs.
- [ ] Visit `/admin`, log in with `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`.
- [ ] In the dashboard, open **Moderation / Posts** — the list loads (not a "Failed to fetch posts" error; this exact failure mode was caused by a cookie-path bug fixed in this codebase — confirm it doesn't regress).
- [ ] Hide the test post from the dashboard, confirm it disappears from the public feed; restore it, confirm it reappears.
- [ ] Open **Reports Queue**, **Blocked Terms**, **Daily Themes** tabs — all load without errors.
- [ ] Visit `/graveyard`, `/about`, `/guidelines`, `/privacy`, `/terms`, `/contact` — all render.
- [ ] **Immediately after this smoke test:** delete the test post/reply via the admin dashboard (Delete, not just Hide) so no test content lingers in the live generation, then remove `INITIAL_ADMIN_PASSWORD` from the environment variables.
- [ ] Confirm the cron job fires within 5 minutes and produces no errors in its log.

---

*Do not run any step in this file against production until you've re-read §0 and made a deliberate choice between Option A and Option B.*
