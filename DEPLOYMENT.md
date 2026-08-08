# DEPLOYMENT.md — Stillhere Hostinger Deployment Guide

This guide provides step-by-step instructions for deploying **Stillhere** to Hostinger's Node.js + MySQL environment.

---

## 1. Prerequisites & Hostinger Environment

- **Hostinger Hosting Plan:** Business Web Hosting or VPS with Node.js support.
- **Node.js:** Version 20.x or 22.x LTS.
- **MySQL Database:** MySQL 8.0+ provisioned via Hostinger Database Manager.
- **Domain Name & SSL:** Configured with active HTTPS via Hostinger SSL.

---

## 2. Environment Configuration

1. In the Hostinger Control Panel (hPanel) or via SSH, set the following environment variables in `.env`:

```env
NODE_ENV=production
APP_URL=https://yourdomain.com
DATABASE_URL=mysql://db_user:db_password@localhost:3306/db_name

ANONYMOUS_IDENTITY_SECRET=your_64_char_hex_secret
NETWORK_HASH_SECRET=your_64_char_hex_secret
NETWORK_HASH_ROTATION_VERSION=1
ADMIN_SESSION_SECRET=your_64_char_hex_secret

INITIAL_ADMIN_EMAIL=admin@yourdomain.com
INITIAL_ADMIN_PASSWORD=your_secure_password_at_least_12_chars

CLEANUP_SECRET=your_32_char_hex_secret
CLEANUP_RETENTION_DAYS=30
RATE_LIMIT_RETENTION_HOURS=48

GLOBAL_COUNTDOWN_HOURS=24
THREAD_EXPIRATION_HOURS=24
THREAD_MAX_LIFETIME_DAYS=7

POST_COOLDOWN_SECONDS=10
REPLY_COOLDOWN_SECONDS=5

MAX_POSTS_PER_HOUR=5
MAX_REPLIES_PER_HOUR=20
MAX_REPORTS_PER_HOUR=10
MAX_REACTION_CHANGES_PER_MINUTE=10

NIGHT_MODE_START_HOUR=19
NIGHT_MODE_END_HOUR=7

NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1012049652296233
NEXT_PUBLIC_ADSENSE_SIDEBAR_LEFT_SLOT=
NEXT_PUBLIC_ADSENSE_SIDEBAR_RIGHT_SLOT=
NEXT_PUBLIC_ADSENSE_INFEED_SLOT=
SUPPORT_EMAIL=support@yourdomain.com
```

---

## 3. Database Migration & Initialization

Run the following commands via SSH in the project directory:

```bash
# 1. Install dependencies
npm ci

# 2. Run Prisma database migrations
npx prisma migrate deploy

# 3. Seed initial database data (Daily themes & Generation 1)
npx prisma db seed

# 4. Create initial Admin user account
node scripts/create-admin.mjs
```

---

## 4. Building & Running the Application

```bash
# Build the production Next.js bundle
npm run build

# Start the Node.js application process
npm run start
```

*For PM2 process management on Hostinger VPS:*
```bash
pm2 start npm --name "stillhere" -- run start
pm2 save
```

---

## 5. Setting Up Cron Jobs (Automated Cleanup)

To handle thread expiration, generation destruction, rate-limit cleanup, and database locks automatically:

1. Open Hostinger **hPanel** → **Advanced** → **Cron Jobs** (or Scheduled Tasks).
2. Set up a cron task to run **every 5 minutes**:

**Option A (Node execution via script):**
```bash
*/5 * * * * cd /home/username/public_html && /usr/bin/node scripts/cleanup.mjs >> /home/username/logs/cleanup.log 2>&1
```

**Option B (HTTP trigger via API endpoint):**
```bash
*/5 * * * * curl -s "https://yourdomain.com/api/cleanup?secret=YOUR_CLEANUP_SECRET" > /dev/null
```

---

## 6. Post-Deployment Verification Checklist

- [ ] Visit homepage — verify Global Countdown clock ticks down.
- [ ] Create a test post — verify countdown resets to 24:00:00 and marks post as website saver.
- [ ] Add a reply — verify thread expiration time extends.
- [ ] React to a post — verify optimistic update and thread extension.
- [ ] Visit `/admin` — log in with `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.
- [ ] Verify `/graveyard`, `/my-activity`, `/about`, `/guidelines`, `/privacy`, `/terms`, and `/contact`.
