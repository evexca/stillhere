/**
 * Generation service.
 * Handles the global site generation lifecycle.
 */
import { prisma } from '@/lib/prisma';
import { SITE_CONFIG } from '@/config/site';

/**
 * Get the currently active site generation.
 * Creates the first one if none exists.
 */
export async function getActiveGeneration() {
  const active = await prisma.siteGeneration.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { generationNum: 'desc' },
  });

  if (active) return active;

  // Bootstrap the very first generation
  return createNewGeneration(1);
}

/**
 * Create a new site generation.
 * Should only be called inside a transaction or with a lock.
 */
export async function createNewGeneration(generationNum: number) {
  const expiresAt = new Date(
    Date.now() + SITE_CONFIG.globalCountdownHours * 3600 * 1000
  );
  return prisma.siteGeneration.create({
    data: {
      generationNum,
      status: 'ACTIVE',
      expiresAt,
    },
  });
}

/**
 * Reset the global countdown to 24 hours from now.
 * Called when a new top-level post is published.
 * Also updates the website-saving post status.
 */
export async function resetCountdown(
  generationId: number,
  savingPostId: string
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SITE_CONFIG.globalCountdownHours * 3600 * 1000
  );

  await prisma.$transaction([
    // Clear previous website-saving post
    prisma.post.updateMany({
      where: { generationId, savedWebsite: true },
      data: { savedWebsite: false },
    }),
    // Mark new post as the saver + reset countdown + increment saveCount
    prisma.post.update({
      where: { publicId: savingPostId },
      data: { savedWebsite: true },
    }),
    prisma.siteGeneration.update({
      where: { id: generationId },
      data: {
        expiresAt,
        saveCount: { increment: 1 },
        postCount: { increment: 1 },
      },
    }),
  ]);
}

/**
 * Get summary data for the countdown widget.
 */
export async function getGenerationSummary() {
  const gen = await getActiveGeneration();
  const postCount = await prisma.post.count({
    where: {
      generationId: gen.id,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
  });
  const replyCount = await prisma.reply.count({
    where: {
      post: { generationId: gen.id },
      status: 'ACTIVE',
    },
  });

  return {
    generationNum: gen.generationNum,
    expiresAt: gen.expiresAt.toISOString(),
    saveCount: gen.saveCount,
    activePostCount: postCount,
    activeReplyCount: replyCount,
  };
}
