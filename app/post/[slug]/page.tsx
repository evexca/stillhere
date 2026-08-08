import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ThreadView } from '@/components/thread/ThreadView';
import { PageAdRail } from '@/components/ads/PageAdRail';
import { SITE_CONFIG } from '@/config/site';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Thread — Stillhere',
  robots: { index: false, follow: false }, // don't index ephemeral content
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { publicId: slug },
    select: {
      id: true,
      publicId: true,
      content: true,
      status: true,
      createdAt: true,
      lastActivityAt: true,
      expiresAt: true,
      savedWebsite: true,
      replyCount: true,
      reactionCount: true,
      deviceId: true,
      generation: { select: { status: true } },
      reactions: {
        select: { reactionType: true, deviceId: true },
      },
    },
  });

  if (!post) {
    notFound();
  }

  // Check if expired or from ended generation
  if (
    post.status === 'DELETED' ||
    post.generation.status === 'ENDED' ||
    post.expiresAt < new Date()
  ) {
    return (
      <div className="container page-body">
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">⟳</div>
          <h1 className="empty-state__title">This conversation has disappeared.</h1>
          <p className="empty-state__text">
            Everything here is temporary. This thread has expired or been removed.
          </p>
          <a href="/" className="btn btn--secondary" style={{ marginTop: '1.5rem' }}>
            Back to home
          </a>
        </div>
      </div>
    );
  }

  if (post.status === 'HIDDEN') {
    return (
      <div className="container page-body">
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">◌</div>
          <h1 className="empty-state__title">This post is currently unavailable.</h1>
          <p className="empty-state__text">
            This content has been temporarily removed for review.
          </p>
          <a href="/" className="btn btn--secondary" style={{ marginTop: '1.5rem' }}>
            Back to home
          </a>
        </div>
      </div>
    );
  }

  const postData = {
    publicId: post.publicId,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    lastActivityAt: post.lastActivityAt.toISOString(),
    expiresAt: post.expiresAt.toISOString(),
    savedWebsite: post.savedWebsite,
    replyCount: post.replyCount,
    reactionCount: post.reactionCount,
    isOwn: false, // resolved client-side
    reactions: SITE_CONFIG.reactions.map(({ type, label, emoji }) => ({
      type,
      label,
      emoji,
      count: post.reactions.filter((r) => r.reactionType === type).length,
      myReaction: false,
    })),
  };

  return (
    <PageAdRail>
      <div className="container page-body">
        <ThreadView post={postData} />
      </div>
    </PageAdRail>
  );
}
