/**
 * POST /api/posts — Create a new top-level post
 * GET  /api/posts — Fetch feed with filters and cursor-based pagination
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTokenFromRequest, getDeviceFromToken, generateToken, hashToken, setIdentityCookie } from '@/lib/identity';
import { sanitizeText, hasVisibleContent, generatePublicId } from '@/lib/sanitize';
import { CreatePostSchema, FeedQuerySchema } from '@/lib/validation';
import { getActiveGeneration, resetCountdown } from '@/services/generation';
import { checkCooldown, setCooldown, checkRateLimit, incrementRateLimit } from '@/services/rateLimit';
import { checkContent } from '@/services/moderation';
import { SITE_CONFIG } from '@/config/site';

// Body size limit: 4KB is more than enough for a 1000-char post
export const runtime = 'nodejs';

// ─── GET /api/posts ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = FeedQuerySchema.safeParse({
      filter: searchParams.get('filter') ?? 'LIVE',
      cursor: searchParams.get('cursor') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? String(SITE_CONFIG.feedPageSize), 10),
    });

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters.' }, { status: 400 });
    }

    const { filter, cursor, limit } = parseResult.data;
    const generation = await getActiveGeneration();
    const now = new Date();

    const baseWhere = {
      generationId: generation.id,
      status: 'ACTIVE' as const,
      expiresAt: { gt: now },
    };

    const filterWhere = {
      ...baseWhere,
      ...(filter === 'DISAPPEARING'
        ? { expiresAt: { gt: now, lt: new Date(now.getTime() + 3600 * 1000) } }
        : {}),
    };

    const orderBy = getOrderBy(filter);

    const posts = await prisma.post.findMany({
      where: filterWhere,
      orderBy,
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor
        ? { cursor: { publicId: cursor }, skip: 1 }
        : {}),
      select: {
        publicId: true,
        content: true,
        status: true,
        createdAt: true,
        lastActivityAt: true,
        expiresAt: true,
        absoluteExpiresAt: true,
        savedWebsite: true,
        replyCount: true,
        reactionCount: true,
        deviceId: true,
        reactions: {
          select: {
            reactionType: true,
            deviceId: true,
          },
        },
      },
    });

    // Resolve current visitor's device for ownership marking
    const rawToken = extractTokenFromRequest(request);
    let currentDeviceId: string | null = null;
    if (rawToken) {
      const device = await getDeviceFromToken(rawToken);
      currentDeviceId = device?.id ?? null;
    }

    const hasNextPage = posts.length > limit;
    const items = posts.slice(0, limit);
    const nextCursor = hasNextPage ? items[items.length - 1].publicId : null;

    return NextResponse.json({
      posts: items.map((p) => serializePost(p, currentDeviceId)),
      nextCursor,
      generationExpiresAt: generation.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[posts] GET error:', error);
    return NextResponse.json({ error: 'Failed to load posts.' }, { status: 500 });
  }
}

// ─── POST /api/posts ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Parse body (limit size)
    const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
    if (contentLength > 8192) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // Validate input
    const parseResult = CreatePostSchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Invalid input.';
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { content: rawContent } = parseResult.data;
    const content = sanitizeText(rawContent);

    if (!hasVisibleContent(content) || content.length < 3) {
      return NextResponse.json(
        { error: 'Your post needs at least 3 characters.' },
        { status: 422 }
      );
    }

    // Resolve identity — create if not exists
    let rawToken = extractTokenFromRequest(request);
    let isNewIdentity = false;
    if (!rawToken) {
      rawToken = generateToken();
      isNewIdentity = true;
    }

    const device = await getDeviceFromToken(rawToken);

    // Check posting cooldown
    const cooldown = await checkCooldown(device.id, 'POST');
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: `You can post again in ${cooldown.remainingSeconds} second${cooldown.remainingSeconds !== 1 ? 's' : ''}.`,
          cooldownSeconds: cooldown.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Check hourly rate limit
    const rateCheck = await checkRateLimit(device.id, 'POST');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Content moderation check
    const modResult = await checkContent(content);
    if (!modResult.allowed) {
      return NextResponse.json({ error: modResult.reason }, { status: 422 });
    }

    // Get active generation
    const generation = await getActiveGeneration();

    // Calculate expiration times
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + SITE_CONFIG.threadExpirationHours * 3600 * 1000
    );
    const absoluteExpiresAt = new Date(
      now.getTime() + SITE_CONFIG.threadMaxLifetimeDays * 86400 * 1000
    );

    // Create the post (automatically attached to today's theme)
    const publicId = generatePublicId();
    const post = await prisma.post.create({
      data: {
        publicId,
        generationId: generation.id,
        deviceId: device.id,
        content,
        expiresAt,
        absoluteExpiresAt,
      },
    });

    // Reset global countdown and mark this post as the website saver
    await resetCountdown(generation.id, post.publicId);

    // Set cooldown and increment rate limit
    await setCooldown(device.id, 'POST');
    await incrementRateLimit(device.id, 'POST');

    const response = NextResponse.json(
      {
        post: {
          publicId: post.publicId,
          content: post.content,
          createdAt: post.createdAt.toISOString(),
          lastActivityAt: post.lastActivityAt.toISOString(),
          expiresAt: post.expiresAt.toISOString(),
          savedWebsite: true,
          replyCount: 0,
          reactionCount: 0,
          isOwn: true,
          reactions: SITE_CONFIG.reactions.map(({ type, label, emoji }) => ({
            type,
            label,
            emoji,
            count: 0,
            myReaction: false,
          })),
        },
        cooldownSeconds: SITE_CONFIG.postCooldownSeconds,
      },
      { status: 201 }
    );

    // Set identity cookie if this was a new identity
    if (isNewIdentity) {
      setIdentityCookie(response, rawToken);
    }

    return response;
  } catch (error) {
    console.error('[posts] POST error:', error);
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PostWithReactions = {
  publicId: string;
  content: string;
  status: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  savedWebsite: boolean;
  replyCount: number;
  reactionCount: number;
  deviceId: string;
  reactions: { reactionType: string; deviceId: string }[];
};

function serializePost(post: PostWithReactions, currentDeviceId: string | null) {
  const reactionSummary = SITE_CONFIG.reactions.map(({ type, label, emoji }) => {
    const count = post.reactions.filter((r) => r.reactionType === type).length;
    const myReaction = currentDeviceId
      ? post.reactions.some((r) => r.reactionType === type && r.deviceId === currentDeviceId)
      : false;
    return { type, label, emoji, count, myReaction };
  });

  return {
    publicId: post.publicId,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    lastActivityAt: post.lastActivityAt.toISOString(),
    expiresAt: post.expiresAt.toISOString(),
    savedWebsite: post.savedWebsite,
    replyCount: post.replyCount,
    reactionCount: post.reactionCount,
    isOwn: currentDeviceId === post.deviceId,
    reactions: reactionSummary,
  };
}

function getOrderBy(filter: string) {
  switch (filter) {
    case 'DISCUSSED':
      return [{ replyCount: 'desc' as const }, { lastActivityAt: 'desc' as const }];
    case 'DISAPPEARING':
      return [{ expiresAt: 'asc' as const }];
    case 'LIVE':
    default:
      return [{ createdAt: 'desc' as const }];
  }
}
