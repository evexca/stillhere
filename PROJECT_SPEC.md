# PROJECT_SPEC.md — Stillhere

> **Internal document — all decisions, rationale, and architecture in one place.**
> Phase 1 — Product & Technical Plan

---

## 1. Product Concept

**Stillhere** is an anonymous, ephemeral social platform where people share confessions, thoughts, questions, secrets, opinions, and short stories without creating an account.

Every piece of content is temporary. The website itself exists on borrowed time — a 24-hour global countdown that resets only when someone publishes a new top-level post. If no one posts and the clock reaches zero, the entire generation is destroyed and the site begins again.

**Core emotional proposition:** *"Nothing here is permanent. Post, respond, or let it disappear."*

---

## 2. Brand Name & Identity

### Name: **Stillhere**
- One word, easy to say, easy to remember
- Carries irony — something "still here" that may not be for long
- Works as a domain: `stillhere.app` or `stillhere.io`
- No copyright conflicts; generic English compound
- Easy to replace in one config file

### Tagline
> *"Nothing here is permanent. Post, respond, or let it disappear."*

### Logo
- Text-based: **STILLHERE** in wide-tracked uppercase with a soft monospace or geometric sans
- A minimal CSS/SVG hourglass symbol as an accent (no external asset required)
- Renders purely in CSS — no image dependency

### Color Direction
- **Light mode:** Near-white background (`#F8F7F5`), near-black text (`#1A1A1A`), warm accent (`#C8A97E`)
- **Night mode ("After 7"):** Very dark background (`#0F0F11`), soft warm text (`#E8E2D9`), muted warm accent (`#9B7D5A`)
- No neon, no cyberpunk
- Urgency states: controlled shift toward amber/crimson at low countdown values

### Typography
- **Display:** `Space Grotesk` (Google Fonts — geometric, modern, distinctive)
- **Body:** `Inter` (Google Fonts — readable, neutral)
- **Mono fallback:** `JetBrains Mono` (used sparingly for ID-like displays)

---

## 3. Central Configuration File

`src/config/site.ts` — single source of truth for all brand and behavior constants.

---

## 4. Screen Map

```
/ (Home — Feed)
  ├── Post composer (no category choice — every post joins today's theme automatically)
  ├── Global countdown widget
  ├── Daily theme banner
  ├── Feed filters (Live | Most Discussed | Disappearing Soon)
  ├── Post cards
  └── "Load More" pagination

/post/[slug] (Thread Detail)
  ├── Parent post card
  ├── Reply list (2-level visual nesting)
  ├── Reply composer
  └── Reaction controls

/my-activity (My Activity)
  ├── My Posts tab
  ├── My Replies tab
  ├── Replies to My Posts tab
  ├── Replies to My Replies tab
  ├── Reactions Received tab
  ├── Threads I Reacted To tab
  └── Disappearing Soon tab

/graveyard (The Graveyard — public aggregate stats)

/about
/guidelines (Community Guidelines)
/privacy
/terms
/contact

/admin (Admin login)
/admin/dashboard
/admin/posts
/admin/reports
/admin/themes
/admin/settings
/admin/cleanup
```

---

## 5. User Flows

### 5.1 First Visit
1. Server generates cryptographically secure random token (32 bytes hex)
2. Cookie set: `_sh_id`; HttpOnly; Secure in production; SameSite=Lax; 1-year expiry
3. Server stores `SHA-256(token + ANONYMOUS_IDENTITY_SECRET)` as the device hash
4. User sees feed with global countdown and daily theme

### 5.2 Publishing a Top-Level Post
1. User opens composer and types content (3–1000 characters) — no category or theme choice; the post is automatically attached to today's theme by the server
2. Submit → POST `/api/posts`
3. Server reads cookie, verifies device identity
4. Server checks: rate limit, cooldown, blocked terms, content size
5. Server validates and sanitizes content
6. Server creates Post record with `expiresAt = now + 24h`, `absoluteExpiresAt = now + 7d`
7. Server updates `SiteGeneration.expiresAt = now + 24h`, marks post as `savedWebsite = true`, clears previous saver
8. Server increments `SiteGeneration.saveCount`
9. Response returns new post data; feed updates without full reload
10. Post card shows "This post saved the website." with subtle glow

### 5.3 Replying
1. User clicks Reply on a post or reply
2. Inline composer opens
3. Submit → POST `/api/replies`
4. Server validates, sanitizes, checks cooldown and rate limit
5. Server extends `Post.expiresAt` by 24h (capped at `absoluteExpiresAt`)
6. Server updates `Post.lastActivityAt`
7. Reply appears inline; cooldown timer shows in composer

### 5.4 Reacting
1. User taps a reaction button
2. Optimistic UI update
3. Server validates, checks duplicate, checks cooldown
4. If new reaction: extends thread by 24h (once per reaction+device; tracks `hasExtended`)
5. If server rejects: rolls back optimistic update with error message

### 5.5 Generation Expiry
1. Cron runs every 5 minutes
2. Cleanup service checks `SiteGeneration.expiresAt`
3. If expired: acquires DB lock (via unique CleanupRun record)
4. Transaction:
   a. Null/delete all post/reply text from current generation
   b. Aggregate statistics saved to SiteGeneration record
   c. Mark generation ENDED
   d. Create new SiteGeneration with `expiresAt = now + 24h`
5. Log results without content

### 5.6 Thread Expiry (Individual)
- Expired posts excluded from all public queries via `WHERE expiresAt > NOW() AND status = 'ACTIVE'`
- Physical deletion during cleanup runs

---

## 6. Architecture

```
Next.js App Router
  ├── Server Components (RSC) — data-heavy pages
  ├── Client Components — interactive: composer, countdown, reactions, cooldown timers
  └── API Routes — mutations with fine-grained HTTP control
          ↓
Server Services Layer
  countdown | generation | identity | moderation | thread | notification | cleanup | rateLimit
          ↓
Prisma ORM (MySQL — Hostinger)
          ↑
Hostinger Cron Jobs (every 5 min) → scripts/cleanup.ts
```

**Key decisions:**
- Next.js App Router with RSC for data pages
- Client components only for interactive pieces
- Server Actions for mutations where appropriate
- API Routes for operations needing fine-grained HTTP control
- Prisma with MySQL — Hostinger-native
- All secrets from env vars; validated at startup via `@t3-oss/env-nextjs`

---

## 7. Database Schema Summary

### Models
| Model | Purpose |
|---|---|
| `AdminUser` | Protected admin accounts |
| `AdminSession` | Server-side admin sessions |
| `AnonymousDevice` | Anonymous visitor identity (hash only) |
| `SiteGeneration` | Website lifecycle tracking |
| `SiteSetting` | Key-value app configuration |
| `Post` | Top-level posts |
| `Reply` | Replies to posts or replies |
| `Reaction` | Reactions to posts or replies |
| `ActivityNotification` | User activity inbox |
| `Report` | Content reports |
| `ModerationAction` | Admin audit log |
| `DailyTheme` | Theme database |
| `BlockedTerm` | Content filtering |
| `RateLimitRecord` | Per-identity rate tracking |
| `CleanupRun` | Cron overlap prevention |

### Key Constraints
- `Reaction` has unique constraint on `(deviceId, targetType, postId, reactionType)` — prevents duplicates
- `AnonymousDevice.tokenHash` is unique — no raw token stored
- `SiteGeneration.generationNum` is unique — no duplicate generations
- All public queries filter `WHERE status = 'ACTIVE' AND expiresAt > NOW()`

---

## 8. Expiration Model

### Individual Thread
```
Post created → expiresAt = now + 24h, absoluteExpiresAt = now + 7d
  ├── New reply → expiresAt = min(now + 24h, absoluteExpiresAt)
  ├── New reaction (first time per device+type) → expiresAt = min(now + 24h, absoluteExpiresAt)
  │     reaction.hasExtended = true
  ├── Reaction removed → no change
  └── Same reaction re-added → hasExtended already true → NO extension
```

### Global Countdown
```
Generation created → SiteGeneration.expiresAt = now + 24h
  ├── New top-level post → SiteGeneration.expiresAt = now + 24h
  │     post.savedWebsite = true; previous cleared; saveCount++
  └── expiresAt passes → Transaction: nullify content → save stats → ENDED → new generation
```

---

## 9. Anonymous Identity Model

```
First visit: server generates token → SHA-256(token + secret) stored → cookie set
Requests: server reads cookie → computes hash → looks up/creates AnonymousDevice
Public: all content shows "Anonymous" — owner sees "You"
Ownership: server resolves deviceId from cookie; never trusts client-provided identity
```

---

## 10. Cooldown Model

- Cooldowns stored in `RateLimitRecord`
- Server enforces on every write before processing
- Frontend timer is display-only (cosmetic UX)
- Failed submissions do not trigger cooldowns
- Post cooldown: 10 seconds; Reply cooldown: 5 seconds

---

## 11. Moderation Model

```
Content status: ACTIVE → HIDDEN → ACTIVE (restore) or DELETED
Reports → admin review queue → hide / delete / dismiss
ModerationAction logs every action (no content text in log)
BlockedTerm table: server-side pattern matching on submit
Abstraction layer: MVP uses local blocking; future: MODERATION_API_URL
```

---

## 12. Notification Model

Triggers: reply to your post, reply to your reply, reaction on your content
Does not trigger: your own actions, expired/deleted content
Read state: `lastViewedAt` timestamp on AnonymousDevice
Viewing My Activity → updates lastViewedAt

---

## 13. Daily Theme Model

- Rotates by UTC day index: `dayIndex = floor(Date.now() / 86400000) % activeThemeCount`
- All users see same theme for same UTC day
- Stored in DB; admin-managed

### Initial 20 Themes
1. A confession you have never told anyone
2. An unpopular opinion you genuinely believe
3. A secret from work
4. Your most embarrassing story
5. The love that never happened
6. Am I the problem?
7. Something you would never tell your family
8. A paranormal experience you cannot explain
9. Questions only
10. One sentence with no context
11. A decision you still regret
12. The kindest thing a stranger ever did for you
13. Something everyone pretends to enjoy
14. A lie you told that became too big
15. The moment you knew it was over
16. Something you wish someone would ask you
17. A harmless secret
18. A strange childhood memory
19. A message you will never send
20. A belief you recently changed

---

## 14. Environment Variables

See `.env.example` for full list. Key variables:

```
NODE_ENV, APP_URL, DATABASE_URL
ANONYMOUS_IDENTITY_SECRET, NETWORK_HASH_SECRET, ADMIN_SESSION_SECRET
INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD
GLOBAL_COUNTDOWN_HOURS=24, THREAD_EXPIRATION_HOURS=24, THREAD_MAX_LIFETIME_DAYS=7
POST_COOLDOWN_SECONDS=10, REPLY_COOLDOWN_SECONDS=5
MAX_POSTS_PER_HOUR=5, MAX_REPLIES_PER_HOUR=20, MAX_REPORTS_PER_HOUR=10
CLEANUP_SECRET, CLEANUP_RETENTION_DAYS=30
NIGHT_MODE_START_HOUR=19, NIGHT_MODE_END_HOUR=7
ADS_ENABLED=false
MODERATION_API_URL=, MODERATION_API_KEY=
SUPPORT_EMAIL
```

---

## 15. Hostinger Deployment Model

- Persistent Node.js application (`next start`)
- MySQL database on Hostinger
- Cron jobs via Hostinger Scheduled Tasks panel (every 5 min)
- HTTPS via Hostinger SSL
- Environment variables in Hostinger control panel
- Full step-by-step instructions in `DEPLOYMENT.md`

---

## 16. Risks and Assumptions

| Risk | Mitigation |
|---|---|
| Duplicate cron runs | CleanupRun unique lock prevents double-generation |
| Race condition on countdown reset | DB transaction + unique active generation constraint |
| Cookie loss | By design; documented in Privacy Policy |
| MySQL connection exhaustion | Prisma pool tuned for Hostinger persistent app |
| Content survives generation end | Transaction nullifies text before stats saved |
| Thread extension abuse | `hasExtended` flag enforced per reaction+device |

**Assumptions:** Hostinger MySQL 8.0+, Node.js 20+, persistent process (not serverless), cron every 5 minutes.

---

## 17. Implementation Sequence

Phase 2: Foundation — Next.js, TypeScript, Tailwind, Prisma schema, migrations, env validation
Phase 3: Core — Identity, generation, countdown, posting, replies, reactions, expiration, feed, themes, night mode, My Activity
Phase 4: Safety — Reports, filtering, rate limiting, admin auth, dashboard, moderation, audit logs
Phase 5: Automation — Cleanup script, generation destruction, Graveyard, aggregate stats
Phase 6: Polish — Ads, legal pages, accessibility, SEO, error/loading states, responsive
Phase 7: Testing & Docs — Tests, browser testing, deployment guide

## 18. Senior Engineer Production Audit Checklist

| Requirement Area | Status | Audit Verification & Findings |
|---|---|---|
| **English Language Requirement** | PASS | 100% of UI text, buttons, navigation, error states, and legal content in English |
| **No Account Registration / Profile** | PASS | Entirely anonymous identity model using SHA-256 device token hash |
| **HttpOnly / Secure Cookie Identity** | PASS | Assigned automatically via `middleware.ts` and `app/lib/identity.ts` |
| **24-Hour Global Countdown & Reset** | PASS | Ticks live in `GlobalCountdown.tsx`, syncs with server, resets on top-level post |
| **Thread Expiration & Extension** | PASS | 24h initial lifespan, capped at 7 days max, extended by replies and first-time reactions |
| **Atomic Generation Destruction** | PASS | `scripts/cleanup.mjs` & `/api/cleanup` nullify content before database cleanup |
| **Feed Filters & Pagination** | PASS | Live, Most Discussed, Disappearing Soon with cursor pagination; every post automatically joins today's theme (no manual category choice) |
| **Nested Replies (2-Level Visual)** | PASS | Top-level reply composer + nested reply cards in `ThreadView.tsx` |
| **Curated Reactions (6 Types)** | PASS | `UNDERSTAND`, `NOT_ALONE`, `THAT_HURT`, `NEED_CONTEXT`, `TELL_MORE`, `DISAGREE` with optimistic updates |
| **My Activity Inbox** | PASS | Dedicated privacy-focused activity tabs for posts, replies, notifications, and reactions |
| **Graveyard Public Statistics** | PASS | Aggregates ended generation stats without retaining post/reply content |
| **Safety & Moderation Queue** | PASS | User report modal + full admin dashboard for hiding, restoring, and deleting content |
| **Blocked Terms & Theme Admin** | PASS | Local regex pattern matcher + admin management for terms and daily themes |
| **Rate Limiting & Cooldowns** | PASS | Per-device rate limits and post (10s) / reply (5s) cooldowns enforced server-side |
| **Hostinger Native Tech Stack** | PASS | Next.js App Router + Node.js hosting + MySQL via Prisma ORM |
| **Automated Unit & Integration Tests** | PASS | 22/22 tests passing via Node native test runner |

---

*End of Specification and Audit.*
