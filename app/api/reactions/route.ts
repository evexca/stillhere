/**
 * PUT /api/reactions — Add or remove a reaction on a post or reply
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTokenFromRequest, getDeviceFromToken, generateToken, setIdentityCookie } from '@/lib/identity';
import { ReactSchema } from '@/lib/validation';
import { extendThread } from '@/services/thread';
import { checkRateLimit, incrementRateLimit } from '@/services/rateLimit';
import { notifyReactionOnPost, notifyReactionOnReply } from '@/services/notification';

export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const parseResult = ReactSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid reaction data.' }, { status: 422 });
    }

    const { targetType, targetId, reactionType, action } = parseResult.data;

    // Resolve identity
    let rawToken = extractTokenFromRequest(request);
    let isNewIdentity = false;
    if (!rawToken) {
      rawToken = generateToken();
      isNewIdentity = true;
    }
    const device = await getDeviceFromToken(rawToken);

    // Rate limit on reactions
    const rateCheck = await checkRateLimit(device.id, 'REACT');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    let postInternalId: string;
    let replyInternalId: string | undefined;

    if (targetType === 'POST') {
      // Verify post exists and is active
      const post = await prisma.post.findUnique({
        where: { publicId: targetId },
        select: { id: true, status: true, expiresAt: true },
      });
      if (!post || post.status !== 'ACTIVE' || post.expiresAt < new Date()) {
        return NextResponse.json({ error: 'This post is no longer available.' }, { status: 410 });
      }
      postInternalId = post.id;
    } else {
      // Verify reply exists and is active
      const reply = await prisma.reply.findUnique({
        where: { publicId: targetId },
        select: { id: true, status: true, postId: true },
      });
      if (!reply || reply.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'This reply is no longer available.' }, { status: 410 });
      }
      replyInternalId = reply.id;
      postInternalId = reply.postId;
    }

    if (action === 'ADD') {
      // Check if reaction already exists
      const existing = await prisma.reaction.findFirst({
        where: {
          deviceId: device.id,
          reactionType: reactionType as import('@prisma/client').ReactionType,
          ...(targetType === 'POST'
            ? { postId: postInternalId, targetType: 'POST' }
            : { replyId: replyInternalId, targetType: 'REPLY' }),
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'You already reacted with this reaction.' }, { status: 409 });
      }

      // Determine if this reaction should extend the thread
      // Extension only happens once per (device, target, reactionType) — hasExtended tracks this
      let shouldExtend = false;

      const reaction = await prisma.reaction.create({
        data: {
          deviceId: device.id,
          targetType: targetType as import('@prisma/client').ReactionTarget,
          reactionType: reactionType as import('@prisma/client').ReactionType,
          ...(targetType === 'POST'
            ? { postId: postInternalId }
            : { replyId: replyInternalId, postId: postInternalId }),
          hasExtended: false,
        },
      });

      // Check if this is the FIRST time this device+target+type has been used
      // (i.e., was never previously added then removed with hasExtended=true)
      // If hasExtended is false, we extend and mark it true
      if (!reaction.hasExtended) {
        shouldExtend = true;
        await prisma.reaction.update({
          where: { id: reaction.id },
          data: { hasExtended: true },
        });
      }

      if (shouldExtend) {
        await extendThread(postInternalId);
      }

      // Update reaction count
      if (targetType === 'POST') {
        await prisma.post.update({
          where: { id: postInternalId },
          data: { reactionCount: { increment: 1 } },
        });
        await notifyReactionOnPost(postInternalId, device.id);
      } else if (replyInternalId) {
        await prisma.reply.update({
          where: { id: replyInternalId },
          data: { reactionCount: { increment: 1 } },
        });
        await notifyReactionOnReply(postInternalId, replyInternalId, device.id);
      }

    } else {
      // REMOVE
      const existing = await prisma.reaction.findFirst({
        where: {
          deviceId: device.id,
          reactionType: reactionType as import('@prisma/client').ReactionType,
          ...(targetType === 'POST'
            ? { postId: postInternalId, targetType: 'POST' }
            : { replyId: replyInternalId, targetType: 'REPLY' }),
        },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Reaction not found.' }, { status: 404 });
      }

      await prisma.reaction.delete({ where: { id: existing.id } });

      // Decrement count (floor at 0)
      if (targetType === 'POST') {
        await prisma.post.update({
          where: { id: postInternalId },
          data: { reactionCount: { decrement: 1 } },
        });
      } else if (replyInternalId) {
        await prisma.reply.update({
          where: { id: replyInternalId },
          data: { reactionCount: { decrement: 1 } },
        });
      }
      // Removing a reaction does NOT extend the thread
    }

    await incrementRateLimit(device.id, 'REACT');

    const response = NextResponse.json({ ok: true });
    if (isNewIdentity) setIdentityCookie(response, rawToken);
    return response;
  } catch (error) {
    console.error('[reactions] PUT error:', error);
    return NextResponse.json(
      { error: 'Your reaction could not be saved. Please try again.' },
      { status: 500 }
    );
  }
}
