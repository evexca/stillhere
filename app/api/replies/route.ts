/**
 * POST /api/replies — Create a reply to a post or another reply
 * GET  /api/replies?postId=... — Fetch replies for a thread
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTokenFromRequest, getDeviceFromToken, generateToken, hashToken, setIdentityCookie } from '@/lib/identity';
import { sanitizeText, hasVisibleContent, generatePublicId } from '@/lib/sanitize';
import { CreateReplySchema } from '@/lib/validation';
import { extendThread } from '@/services/thread';
import { checkCooldown, setCooldown, checkRateLimit, incrementRateLimit } from '@/services/rateLimit';
import { checkContent } from '@/services/moderation';
import { notifyReplyToPost, notifyReplyToReply } from '@/services/notification';
import { SITE_CONFIG } from '@/config/site';

export const runtime = 'nodejs';

// ─── GET /api/replies ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postPublicId = searchParams.get('postId');
    if (!postPublicId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { publicId: postPublicId },
      select: { id: true, status: true, expiresAt: true, deviceId: true },
    });

    if (!post || post.status !== 'ACTIVE' || post.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This post is no longer available.' }, { status: 404 });
    }

    // Resolve current device for ownership
    const rawToken = extractTokenFromRequest(request);
    let currentDeviceId: string | null = null;
    if (rawToken) {
      const device = await getDeviceFromToken(rawToken);
      currentDeviceId = device?.id ?? null;
    }

    const replies = await prisma.reply.findMany({
      where: {
        postId: post.id,
        status: 'ACTIVE',
        parentReplyId: null, // top-level replies only
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        publicId: true,
        content: true,
        createdAt: true,
        reactionCount: true,
        deviceId: true,
        childReplies: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            publicId: true,
            content: true,
            createdAt: true,
            reactionCount: true,
            deviceId: true,
            parentReplyId: true,
            reactions: {
              select: { reactionType: true, deviceId: true },
            },
          },
        },
        reactions: {
          select: { reactionType: true, deviceId: true },
        },
      },
    });

    return NextResponse.json({
      replies: replies.map((r) => serializeReply(r, currentDeviceId, post.deviceId)),
    });
  } catch (error) {
    console.error('[replies] GET error:', error);
    return NextResponse.json({ error: 'Failed to load replies.' }, { status: 500 });
  }
}

// ─── POST /api/replies ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
    if (contentLength > 4096) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const parseResult = CreateReplySchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Invalid input.';
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { content: rawContent, postId: postPublicId, parentReplyId: parentPublicId } = parseResult.data;
    const content = sanitizeText(rawContent);

    if (!hasVisibleContent(content) || content.length < 2) {
      return NextResponse.json(
        { error: 'Your reply needs at least 2 characters.' },
        { status: 422 }
      );
    }

    // Resolve identity
    let rawToken = extractTokenFromRequest(request);
    let isNewIdentity = false;
    if (!rawToken) {
      rawToken = generateToken();
      isNewIdentity = true;
    }

    const device = await getDeviceFromToken(rawToken);

    // Check cooldown
    const cooldown = await checkCooldown(device.id, 'REPLY');
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: `You can comment again in ${cooldown.remainingSeconds} second${cooldown.remainingSeconds !== 1 ? 's' : ''}.`,
          cooldownSeconds: cooldown.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Check rate limit
    const rateCheck = await checkRateLimit(device.id, 'REPLY');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Content moderation
    const modResult = await checkContent(content);
    if (!modResult.allowed) {
      return NextResponse.json({ error: modResult.reason }, { status: 422 });
    }

    // Verify post exists and is active
    const post = await prisma.post.findUnique({
      where: { publicId: postPublicId },
      select: { id: true, status: true, expiresAt: true, deviceId: true },
    });

    if (!post || post.status !== 'ACTIVE' || post.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This conversation has already disappeared.' },
        { status: 410 }
      );
    }

    // Verify parent reply if nested
    let parentReplyInternalId: string | undefined;
    if (parentPublicId) {
      const parentReply = await prisma.reply.findUnique({
        where: { publicId: parentPublicId },
        select: { id: true, status: true, postId: true },
      });
      if (!parentReply || parentReply.status !== 'ACTIVE' || parentReply.postId !== post.id) {
        return NextResponse.json({ error: 'Parent reply not found.' }, { status: 404 });
      }
      parentReplyInternalId = parentReply.id;
    }

    const publicId = generatePublicId();
    const reply = await prisma.reply.create({
      data: {
        publicId,
        postId: post.id,
        parentReplyId: parentReplyInternalId ?? null,
        deviceId: device.id,
        content,
      },
    });

    // Increment reply count on post
    await prisma.post.update({
      where: { id: post.id },
      data: { replyCount: { increment: 1 } },
    });

    // Extend thread lifetime
    await extendThread(post.id);

    // Send notifications
    if (parentReplyInternalId) {
      await notifyReplyToReply(post.id, parentReplyInternalId, reply.id, device.id);
    } else {
      await notifyReplyToPost(post.id, reply.id, device.id);
    }

    // Set cooldown and rate limit
    await setCooldown(device.id, 'REPLY');
    await incrementRateLimit(device.id, 'REPLY');

    const response = NextResponse.json(
      {
        reply: {
          publicId: reply.publicId,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
          reactionCount: 0,
          reactions: [],
          isOwn: true,
          parentReplyPublicId: parentPublicId ?? null,
        },
        cooldownSeconds: SITE_CONFIG.replyCooldownSeconds,
      },
      { status: 201 }
    );

    if (isNewIdentity) setIdentityCookie(response, rawToken);
    return response;
  } catch (error) {
    console.error('[replies] POST error:', error);
    return NextResponse.json({ error: 'Failed to create reply.' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ReplyData = {
  id: string;
  publicId: string;
  content: string;
  createdAt: Date;
  reactionCount: number;
  deviceId: string;
  parentReplyId?: string | null;
  reactions: { reactionType: string; deviceId: string }[];
  childReplies?: ReplyData[];
};

interface SerializedReply {
  publicId: string;
  content: string;
  createdAt: string;
  reactionCount: number;
  isOwn: boolean;
  isPostOwner: boolean;
  reactions: { type: string; label: string; emoji: string; count: number; myReaction: boolean }[];
  children: SerializedReply[];
}

function serializeReply(
  reply: ReplyData,
  currentDeviceId: string | null,
  postOwnerId: string
): SerializedReply {
  const reactions = SITE_CONFIG.reactions.map(({ type, label, emoji }) => ({
    type,
    label,
    emoji,
    count: reply.reactions.filter((r) => r.reactionType === type).length,
    myReaction: currentDeviceId
      ? reply.reactions.some((r) => r.reactionType === type && r.deviceId === currentDeviceId)
      : false,
  }));

  return {
    publicId: reply.publicId,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    reactionCount: reply.reactionCount,
    isOwn: currentDeviceId === reply.deviceId,
    isPostOwner: reply.deviceId === postOwnerId,
    reactions,
    children: reply.childReplies?.map((c) => serializeReply(c, currentDeviceId, postOwnerId)) ?? [],
  };
}
