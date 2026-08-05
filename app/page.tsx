import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GlobalCountdown } from '@/components/countdown/GlobalCountdown';
import { Feed } from '@/components/feed/Feed';
import { getActiveGeneration } from '@/services/generation';
import { getTodayTheme } from '@/services/theme';
import { prisma } from '@/lib/prisma';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Stillhere — Nothing here is permanent',
  description: SITE_CONFIG.socialDescription,
};

export const dynamic = 'force-dynamic';

async function getInitialFeed(generationId: number) {
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: {
      generationId,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
    orderBy: [
      { lastActivityAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: SITE_CONFIG.feedPageSize + 1,
    select: {
      publicId: true,
      content: true,
      createdAt: true,
      lastActivityAt: true,
      expiresAt: true,
      savedWebsite: true,
      replyCount: true,
      reactionCount: true,
      deviceId: true,
      reactions: {
        select: { reactionType: true, deviceId: true },
      },
    },
  });

  const hasMore = posts.length > SITE_CONFIG.feedPageSize;
  const items = posts.slice(0, SITE_CONFIG.feedPageSize);
  const nextCursor = hasMore ? items[items.length - 1].publicId : null;

  return {
    posts: items.map((p) => ({
      publicId: p.publicId,
      content: p.content,
      createdAt: p.createdAt.toISOString(),
      lastActivityAt: p.lastActivityAt.toISOString(),
      expiresAt: p.expiresAt.toISOString(),
      savedWebsite: p.savedWebsite,
      replyCount: p.replyCount,
      reactionCount: p.reactionCount,
      isOwn: false, // RSC can't know device — Feed will update via client
      reactions: SITE_CONFIG.reactions.map(({ type, label, emoji }) => ({
        type,
        label,
        emoji,
        count: p.reactions.filter((r) => r.reactionType === type).length,
        myReaction: false,
      })),
    })),
    nextCursor,
  };
}

export default async function HomePage() {
  const [generation, theme] = await Promise.all([
    getActiveGeneration(),
    getTodayTheme(),
  ]);

  const { posts, nextCursor } = await getInitialFeed(generation.id);

  return (
    <>
      {/* Hero section with countdown */}
      <header>
        <GlobalCountdown initialExpiresAt={generation.expiresAt.toISOString()} />

        {/* Tagline */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.03em',
            marginBottom: '1.5rem',
          }}
          aria-label="Site description"
        >
          {SITE_CONFIG.tagline}
        </p>

        {/* Today's Theme */}
        {theme && (
          <div className="container">
            <div className="theme-banner">
              <p className="theme-banner__eyebrow">Today&apos;s Theme</p>
              <p className="theme-banner__text">{theme.text}</p>
            </div>
          </div>
        )}
      </header>

      {/* Feed */}
      <div className="container page-body" style={{ paddingTop: '0' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton" style={{ width: 70, height: 14 }} />
                <div className="skeleton" style={{ width: '100%', height: 64 }} />
              </div>
            ))}
          </div>
        }>
          <Feed
            initialPosts={posts}
            initialCursor={nextCursor}
            todayTheme={theme?.text ?? null}
            generationExpiresAt={generation.expiresAt.toISOString()}
          />
        </Suspense>
      </div>
    </>
  );
}
