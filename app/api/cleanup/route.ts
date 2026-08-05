/**
 * GET /api/cleanup — Trigger cleanup via HTTP (for Hostinger cron)
 * Protected by CLEANUP_SECRET environment variable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveGeneration, createNewGeneration } from '@/services/generation';
import { cleanOldRateLimits } from '@/services/rateLimit';
import { SITE_CONFIG } from '@/config/site';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 second timeout

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cleanup-secret') ?? 
    new URL(request.url).searchParams.get('secret');

  const expectedSecret = process.env.CLEANUP_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    // Check if active generation has expired
    const generation = await prisma.siteGeneration.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { generationNum: 'desc' },
    });

    if (generation && generation.expiresAt < new Date()) {
      // Mark as ENDING
      const claim = await prisma.siteGeneration.updateMany({
        where: { id: generation.id, status: 'ACTIVE' },
        data: { status: 'ENDING' },
      });

      if (claim.count > 0) {
        // End the generation
        await prisma.siteGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'ENDED',
            endedAt: new Date(),
            endReason: 'EXPIRED',
          },
        });

        // Create new generation
        await createNewGeneration(generation.generationNum + 1);
        results.generationEnded = generation.generationNum;
        results.newGeneration = generation.generationNum + 1;
      }
    }

    // Clean expired posts
    const now = new Date();
    const expiredPosts = await prisma.post.findMany({
      where: {
        status: { in: ['ACTIVE', 'HIDDEN'] },
        OR: [{ expiresAt: { lt: now } }, { absoluteExpiresAt: { lt: now } }],
      },
      select: { id: true },
    });

    if (expiredPosts.length > 0) {
      const ids = expiredPosts.map((p) => p.id);
      await prisma.reaction.deleteMany({ where: { postId: { in: ids } } });
      await prisma.activityNotification.deleteMany({ where: { postId: { in: ids } } });
      await prisma.report.deleteMany({ where: { postId: { in: ids } } });
      await prisma.reply.updateMany({ where: { postId: { in: ids } }, data: { content: '', status: 'DELETED' } });
      await prisma.reply.deleteMany({ where: { postId: { in: ids } } });
      await prisma.post.updateMany({ where: { id: { in: ids } }, data: { content: '', status: 'DELETED' } });
      await prisma.post.deleteMany({ where: { id: { in: ids } } });
      results.postsDeleted = expiredPosts.length;
    }

    // Clean rate limits
    const rateLimitsCleaned = await cleanOldRateLimits();
    results.rateLimitsCleaned = rateLimitsCleaned;

    // Clean admin sessions
    await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cleanup API] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
