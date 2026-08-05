/**
 * GET /api/activity — My Activity data for the current visitor
 * POST /api/activity/viewed — Mark notifications as viewed
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTokenFromRequest, getDeviceFromToken } from '@/lib/identity';
import { SITE_CONFIG } from '@/config/site';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const rawToken = extractTokenFromRequest(request);
    if (!rawToken) {
      return NextResponse.json({ authenticated: false, posts: [], replies: [], notifications: [] });
    }

    const device = await getDeviceFromToken(rawToken);
    const now = new Date();
    const disappearingSoon = new Date(now.getTime() + 3600 * 1000); // 1 hour

    const [
      myPosts,
      myReplies,
      repliesToMyPosts,
      repliesToMyReplies,
      reactionsReceived,
      threadsReacted,
      disappearingPosts,
      unreadCount,
    ] = await Promise.all([
      // My posts
      prisma.post.findMany({
        where: { deviceId: device.id, status: 'ACTIVE', expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          publicId: true,
          content: true,
          createdAt: true,
          expiresAt: true,
          replyCount: true,
          reactionCount: true,
          savedWebsite: true,
        },
      }),

      // My replies
      prisma.reply.findMany({
        where: { deviceId: device.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          publicId: true,
          content: true,
          createdAt: true,
          post: { select: { publicId: true, expiresAt: true, status: true } },
        },
      }),

      // Replies to my posts
      prisma.reply.findMany({
        where: {
          post: { deviceId: device.id, status: 'ACTIVE', expiresAt: { gt: now } },
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          publicId: true,
          content: true,
          createdAt: true,
          post: { select: { publicId: true, expiresAt: true } },
        },
      }),

      // Replies to my replies (via notifications)
      prisma.activityNotification.findMany({
        where: {
          recipientId: device.id,
          type: 'REPLY_TO_REPLY',
          post: { status: 'ACTIVE', expiresAt: { gt: now } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          viewedAt: true,
          post: { select: { publicId: true } },
          reply: { select: { publicId: true, content: true } },
        },
      }),

      // Reactions received on my posts/replies (count per post)
      prisma.activityNotification.findMany({
        where: {
          recipientId: device.id,
          type: { in: ['REACTION_ON_POST', 'REACTION_ON_REPLY'] },
          post: { status: 'ACTIVE', expiresAt: { gt: now } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          createdAt: true,
          viewedAt: true,
          post: { select: { publicId: true, content: true } },
        },
      }),

      // Threads I reacted to
      prisma.reaction.findMany({
        where: {
          deviceId: device.id,
          post: { status: 'ACTIVE', expiresAt: { gt: now } },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['postId'],
        take: 20,
        select: {
          post: {
            select: {
              publicId: true,
              content: true,
              expiresAt: true,
              replyCount: true,
            },
          },
        },
      }),

      // Disappearing soon — my posts
      prisma.post.findMany({
        where: {
          deviceId: device.id,
          status: 'ACTIVE',
          expiresAt: { gt: now, lt: disappearingSoon },
        },
        orderBy: { expiresAt: 'asc' },
        take: 10,
        select: { publicId: true, content: true, expiresAt: true },
      }),

      // Unread count
      prisma.activityNotification.count({
        where: {
          recipientId: device.id,
          ...(device.notificationsLastViewedAt
            ? { createdAt: { gt: device.notificationsLastViewedAt } }
            : {}),
          post: { status: 'ACTIVE', expiresAt: { gt: now } },
        },
      }),
    ]);

    return NextResponse.json({
      authenticated: true,
      myPosts: myPosts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        expiresAt: p.expiresAt.toISOString(),
      })),
      myReplies: myReplies
        .filter((r) => r.post?.status === 'ACTIVE')
        .map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          postPublicId: r.post?.publicId,
          postExpiresAt: r.post?.expiresAt?.toISOString(),
        })),
      repliesToMyPosts: repliesToMyPosts.map((r) => ({
        publicId: r.publicId,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        postPublicId: r.post?.publicId,
      })),
      repliesToMyReplies: repliesToMyReplies.map((n) => ({
        notifId: n.id,
        postPublicId: n.post?.publicId,
        replyPublicId: n.reply?.publicId,
        replyContent: n.reply?.content ?? null,
        createdAt: n.createdAt.toISOString(),
        viewed: !!n.viewedAt,
      })),
      reactionsReceived: reactionsReceived.map((n) => ({
        notifId: n.id,
        type: n.type,
        postPublicId: n.post?.publicId,
        postContent: n.post?.content?.slice(0, 100) ?? null,
        createdAt: n.createdAt.toISOString(),
        viewed: !!n.viewedAt,
      })),
      threadsReacted: threadsReacted.map((r) => ({
        publicId: r.post?.publicId,
        content: r.post?.content?.slice(0, 200) ?? null,
        expiresAt: r.post?.expiresAt?.toISOString(),
        replyCount: r.post?.replyCount ?? 0,
      })),
      disappearingSoon: disappearingPosts.map((p) => ({
        publicId: p.publicId,
        content: p.content.slice(0, 150),
        expiresAt: p.expiresAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('[activity] GET error:', error);
    return NextResponse.json({ error: 'Failed to load activity.' }, { status: 500 });
  }
}
