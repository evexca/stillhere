/**
 * Thread extension service.
 * Handles extending thread lifetime when new replies or reactions are added.
 */
import { prisma } from '@/lib/prisma';
import { SITE_CONFIG } from '@/config/site';

/**
 * Extend a thread's expiration time by THREAD_EXPIRATION_HOURS,
 * but never beyond its absolute maximum lifetime.
 */
export async function extendThread(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { absoluteExpiresAt: true, expiresAt: true },
  });
  if (!post) return;

  const newExpiry = new Date(
    Date.now() + SITE_CONFIG.threadExpirationHours * 3600 * 1000
  );
  const clampedExpiry =
    newExpiry > post.absoluteExpiresAt ? post.absoluteExpiresAt : newExpiry;

  // Only extend if the new time is actually later
  if (clampedExpiry > post.expiresAt) {
    await prisma.post.update({
      where: { id: postId },
      data: {
        expiresAt: clampedExpiry,
        lastActivityAt: new Date(),
      },
    });
  } else {
    // Still update last activity
    await prisma.post.update({
      where: { id: postId },
      data: { lastActivityAt: new Date() },
    });
  }
}

/**
 * Get the standard public post query filter.
 * All public queries must use this to exclude expired and hidden posts.
 */
export function activePostFilter(generationId?: number) {
  return {
    status: 'ACTIVE' as const,
    expiresAt: { gt: new Date() },
    ...(generationId !== undefined ? { generationId } : {}),
  };
}
