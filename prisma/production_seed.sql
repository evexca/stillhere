-- Stillhere — Production Seed Data
-- ─────────────────────────────────────────────────────────────────────────────
-- Manual equivalent of `prisma/seed.mjs`, for import through Hostinger's
-- phpMyAdmin (no Node.js/Prisma CLI access required).
--
-- Run this ONCE, after importing
-- prisma/migrations/20260806021219_init/migration.sql, on the production
-- database. It creates exactly what `prisma/seed.mjs` creates:
--   - 20 daily themes
--   - 3 default site settings
--   - the first site generation (Generation 1), only if none exists yet
--
-- Contains no admin account or credentials. Create the initial admin
-- separately with `node scripts/create-admin.mjs` (it hashes the password
-- with bcrypt — never store or import a plain-text password here).
--
-- Idempotent: every statement below is safe to re-run. Daily themes and site
-- settings use INSERT ... ON DUPLICATE KEY UPDATE as a no-op (matching
-- seed.mjs's own upsert-with-empty-update semantics — an existing row, even
-- one since edited via the admin dashboard, is left untouched). The site
-- generation insert only fires if the table is completely empty, so it can
-- never collide with or duplicate a generation the app has since created.
-- ─────────────────────────────────────────────────────────────────────────────

START TRANSACTION;

-- ── Daily themes ─────────────────────────────────────────────────────────────
INSERT INTO `daily_themes` (`id`, `text`, `active`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  (1,  'A confession you have never told anyone',            1, 0,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2,  'An unpopular opinion you genuinely believe',          1, 1,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3,  'A secret from work',                                  1, 2,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4,  'Your most embarrassing story',                        1, 3,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5,  'The love that never happened',                        1, 4,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (6,  'Am I the problem?',                                   1, 5,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (7,  'Something you would never tell your family',          1, 6,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (8,  'A paranormal experience you cannot explain',          1, 7,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9,  'Questions only',                                      1, 8,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (10, 'One sentence with no context',                        1, 9,  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (11, 'A decision you still regret',                         1, 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (12, 'The kindest thing a stranger ever did for you',       1, 11, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (13, 'Something everyone pretends to enjoy',                1, 12, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (14, 'A lie you told that became too big',                  1, 13, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (15, 'The moment you knew it was over',                     1, 14, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (16, 'Something you wish someone would ask you',            1, 15, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (17, 'A harmless secret',                                   1, 16, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (18, 'A strange childhood memory',                          1, 17, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (19, 'A message you will never send',                       1, 18, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (20, 'A belief you recently changed',                       1, 19, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ── Default site settings ───────────────────────────────────────────────────
INSERT INTO `site_settings` (`key`, `value`, `updatedAt`) VALUES
  ('adsEnabled',      'false',    CURRENT_TIMESTAMP(3)),
  ('maintenanceMode', 'false',    CURRENT_TIMESTAMP(3)),
  ('moderationMode',  'standard', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `key` = `key`;

-- ── First site generation ───────────────────────────────────────────────────
-- Only inserted if the table is completely empty — never collides with a
-- generation the running app has already created (e.g. on a re-run, or if
-- this is imported after the app has already booted and self-bootstrapped
-- via getActiveGeneration()).
INSERT INTO `site_generations`
  (`generationNum`, `status`, `startedAt`, `expiresAt`, `saveCount`, `postCount`, `replyCount`, `reactionCount`)
SELECT 1, 'ACTIVE', CURRENT_TIMESTAMP(3), DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 24 HOUR), 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM `site_generations`);

COMMIT;
