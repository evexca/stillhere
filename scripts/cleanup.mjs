#!/usr/bin/env node
/**
 * Stillhere Cleanup Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Run by Hostinger cron every 5 minutes:
 *   node scripts/cleanup.mjs
 *
 * This script:
 * 1. Checks if the current site generation has expired
 * 2. If expired: safely destroys the generation and creates the next one
 * 3. Deletes expired individual threads (posts + replies)
 * 4. Cleans up notifications for expired content
 * 5. Cleans up old rate limit records
 * 6. Records cleanup run results
 * 7. Prevents overlapping runs via a CleanupRun lock
 *
 * Safe to run repeatedly. Uses transactions. Cannot corrupt state if interrupted.
 * Content text is nullified (not logged) before deletion.
 */

import { PrismaClient } from '@prisma/client';

// Load .env if not in production
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  config();
}

const prisma = new PrismaClient({
  log: ['error'],
});

const GLOBAL_COUNTDOWN_HOURS = parseInt(process.env.GLOBAL_COUNTDOWN_HOURS ?? '24', 10);
const RATE_LIMIT_RETENTION_HOURS = parseInt(process.env.RATE_LIMIT_RETENTION_HOURS ?? '48', 10);

async function run() {
  const startedAt = new Date();
  console.log(`[cleanup] Starting cleanup run at ${startedAt.toISOString()}`);

  // ── Prevent overlapping runs ─────────────────────────────────────────────
  // Check if a run has started in the last 4 minutes (cron is every 5 min)
  const recentRun = await prisma.cleanupRun.findFirst({
    where: {
      startedAt: { gt: new Date(Date.now() - 4 * 60 * 1000) },
      completedAt: null, // still running
    },
  });

  if (recentRun) {
    console.log(`[cleanup] Another cleanup run is in progress (id: ${recentRun.id}). Skipping.`);
    await prisma.$disconnect();
    return;
  }

  // Create a cleanup run record (acts as a lock)
  const cleanupRun = await prisma.cleanupRun.create({
    data: { startedAt },
  });

  let generationEnded = false;
  let postsDeleted = 0;
  let repliesDeleted = 0;
  let reactionsDeleted = 0;
  let notificationsClean = 0;
  let rateLimitsCleaned = 0;

  try {
    // ── 1. Check if the active generation has expired ──────────────────────
    const activeGen = await prisma.siteGeneration.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { generationNum: 'desc' },
    });

    if (activeGen && activeGen.expiresAt < new Date()) {
      console.log(`[cleanup] Generation ${activeGen.generationNum} has expired. Beginning end-of-generation transition.`);
      await endGeneration(activeGen.id, activeGen.generationNum);
      generationEnded = true;
    }

    // ── 2. Delete expired individual threads ──────────────────────────────
    const now = new Date();

    // Find expired posts (expiresAt has passed OR absolute max has passed)
    const expiredPosts = await prisma.post.findMany({
      where: {
        status: { in: ['ACTIVE', 'HIDDEN'] },
        OR: [
          { expiresAt: { lt: now } },
          { absoluteExpiresAt: { lt: now } },
        ],
      },
      select: { id: true },
    });

    if (expiredPosts.length > 0) {
      const expiredPostIds = expiredPosts.map((p) => p.id);

      // Count replies and reactions before deletion (for stats)
      repliesDeleted = await prisma.reply.count({ where: { postId: { in: expiredPostIds } } });
      reactionsDeleted = await prisma.reaction.count({ where: { postId: { in: expiredPostIds } } });

      // Delete reactions on expired posts
      await prisma.reaction.deleteMany({ where: { postId: { in: expiredPostIds } } });

      // Delete notifications for expired posts
      notificationsClean += await (await prisma.activityNotification.deleteMany({
        where: { postId: { in: expiredPostIds } },
      })).count;

      // Delete reports for expired posts
      await prisma.report.deleteMany({ where: { postId: { in: expiredPostIds } } });

      // Nullify reply content then delete
      await prisma.reply.updateMany({
        where: { postId: { in: expiredPostIds } },
        data: { content: '', status: 'DELETED' },
      });
      await prisma.reply.deleteMany({ where: { postId: { in: expiredPostIds } } });

      // Nullify post content then delete
      await prisma.post.updateMany({
        where: { id: { in: expiredPostIds } },
        data: { content: '', status: 'DELETED' },
      });
      await prisma.post.deleteMany({ where: { id: { in: expiredPostIds } } });

      postsDeleted = expiredPosts.length;
      console.log(`[cleanup] Deleted ${postsDeleted} expired posts, ${repliesDeleted} replies, ${reactionsDeleted} reactions.`);
    }

    // ── 3. Clean up orphaned notifications ───────────────────────────────
    const orphaned = await prisma.activityNotification.deleteMany({
      where: {
        OR: [
          { post: null },
          { post: { status: 'DELETED' } },
        ],
      },
    });
    notificationsClean += orphaned.count;

    // ── 4. Clean up old rate limit records ───────────────────────────────
    const rateLimitCutoff = new Date(
      Date.now() - RATE_LIMIT_RETENTION_HOURS * 3600 * 1000
    );
    const rateLimitResult = await prisma.rateLimitRecord.deleteMany({
      where: { windowStart: { lt: rateLimitCutoff } },
    });
    rateLimitsCleaned = rateLimitResult.count;

    // ── 5. Clean up old admin sessions ───────────────────────────────────
    await prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // ── Mark cleanup run complete ──────────────────────────────────────────
    await prisma.cleanupRun.update({
      where: { id: cleanupRun.id },
      data: {
        completedAt: new Date(),
        generationEnded,
        postsDeleted,
        repliesDeleted,
        reactionsDeleted,
        notificationsClean,
        rateLimitsCleaned,
      },
    });

    console.log(`[cleanup] Completed. posts=${postsDeleted} replies=${repliesDeleted} ratelimits=${rateLimitsCleaned}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[cleanup] ERROR: ${errorMessage}`);

    await prisma.cleanupRun.update({
      where: { id: cleanupRun.id },
      data: {
        completedAt: new Date(),
        error: errorMessage.slice(0, 1000), // trim but don't store content
      },
    }).catch(() => {});
  }

  await prisma.$disconnect();
}

/**
 * End the current generation and create the next one.
 * Uses a transaction to ensure atomicity.
 * Content is nullified — never copied to statistics.
 */
async function endGeneration(genId, genNum) {
  // First, mark as ENDING to prevent race conditions with other cron instances
  const updated = await prisma.siteGeneration.updateMany({
    where: { id: genId, status: 'ACTIVE' },
    data: { status: 'ENDING' },
  });

  // If another process already claimed this, skip
  if (updated.count === 0) {
    console.log(`[cleanup] Generation ${genNum} already being ended by another process.`);
    return;
  }

  try {
    // Collect aggregate stats BEFORE destroying content
    const [postCount, replyCount, reactionCount] = await Promise.all([
      prisma.post.count({ where: { generationId: genId } }),
      prisma.reply.count({ where: { post: { generationId: genId } } }),
      prisma.reaction.count({ where: { post: { generationId: genId } } }),
    ]);

    // Find longest-lived thread
    const longestThread = await prisma.post.findFirst({
      where: { generationId: genId },
      orderBy: { absoluteExpiresAt: 'desc' },
      select: { createdAt: true, absoluteExpiresAt: true },
    });

    const longestThreadMs = longestThread
      ? BigInt(longestThread.absoluteExpiresAt.getTime() - longestThread.createdAt.getTime())
      : null;

    const endedAt = new Date();

    const genRecord = await prisma.siteGeneration.findUnique({
      where: { id: genId },
      select: { startedAt: true },
    });
    const totalDurationMs = genRecord
      ? BigInt(endedAt.getTime() - genRecord.startedAt.getTime())
      : null;

    // In a transaction:
    // 1. Nullify all post and reply content
    // 2. Delete reactions, notifications, reports
    // 3. Mark generation as ENDED
    // 4. Create new generation
    await prisma.$transaction(async (tx) => {
      // Nullify content (critical: text must not survive)
      await tx.post.updateMany({
        where: { generationId: genId },
        data: { content: '', status: 'DELETED' },
      });

      await tx.reply.updateMany({
        where: { post: { generationId: genId } },
        data: { content: '', status: 'DELETED' },
      });

      // Delete reactions for this generation's posts
      await tx.reaction.deleteMany({
        where: { post: { generationId: genId } },
      });

      // Delete notifications
      await tx.activityNotification.deleteMany({
        where: { post: { generationId: genId } },
      });

      // Update generation stats and status
      await tx.siteGeneration.update({
        where: { id: genId },
        data: {
          status: 'ENDED',
          endedAt,
          postCount,
          replyCount,
          reactionCount,
          longestThreadMs,
          totalDurationMs,
          endReason: 'EXPIRED',
        },
      });

      // Create next generation
      const expiresAt = new Date(Date.now() + GLOBAL_COUNTDOWN_HOURS * 3600 * 1000);
      await tx.siteGeneration.create({
        data: {
          generationNum: genNum + 1,
          status: 'ACTIVE',
          expiresAt,
        },
      });
    });

    console.log(`[cleanup] Generation ${genNum} ended. Stats: posts=${postCount} replies=${replyCount} reactions=${reactionCount}`);
    console.log(`[cleanup] New generation ${genNum + 1} created.`);
  } catch (err) {
    // If transaction fails, revert ENDING back to ACTIVE so next run can retry
    await prisma.siteGeneration.update({
      where: { id: genId },
      data: { status: 'ACTIVE' },
    }).catch(() => {});
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cleanup.mjs')) {
  run().catch((err) => {
    console.error('[cleanup] Fatal error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
