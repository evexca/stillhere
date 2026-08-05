/**
 * Notification service.
 * Creates activity notifications for replies and reactions.
 */
import { prisma } from '@/lib/prisma';

/**
 * Create a notification for a reply to a post.
 */
export async function notifyReplyToPost(
  postId: string,
  replyId: string,
  triggerDeviceId: string
): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { deviceId: true, status: true, expiresAt: true },
  });
  if (!post || post.status !== 'ACTIVE' || post.expiresAt < new Date()) return;

  // Don't notify self
  if (post.deviceId === triggerDeviceId) return;

  await prisma.activityNotification.create({
    data: {
      recipientId: post.deviceId,
      type: 'REPLY_TO_POST',
      postId,
      replyId,
      triggerDeviceId,
    },
  }).catch(() => {}); // Swallow duplicates / constraint errors
}

/**
 * Create a notification for a reply to a reply.
 */
export async function notifyReplyToReply(
  postId: string,
  parentReplyId: string,
  newReplyId: string,
  triggerDeviceId: string
): Promise<void> {
  const parentReply = await prisma.reply.findUnique({
    where: { id: parentReplyId },
    select: { deviceId: true, status: true },
  });
  if (!parentReply || parentReply.status !== 'ACTIVE') return;
  if (parentReply.deviceId === triggerDeviceId) return;

  await prisma.activityNotification.create({
    data: {
      recipientId: parentReply.deviceId,
      type: 'REPLY_TO_REPLY',
      postId,
      replyId: newReplyId,
      triggerDeviceId,
    },
  }).catch(() => {});
}

/**
 * Create a notification for a reaction on a post.
 */
export async function notifyReactionOnPost(
  postId: string,
  triggerDeviceId: string
): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { deviceId: true, status: true, expiresAt: true },
  });
  if (!post || post.status !== 'ACTIVE' || post.expiresAt < new Date()) return;
  if (post.deviceId === triggerDeviceId) return;

  await prisma.activityNotification.create({
    data: {
      recipientId: post.deviceId,
      type: 'REACTION_ON_POST',
      postId,
      triggerDeviceId,
    },
  }).catch(() => {});
}

/**
 * Create a notification for a reaction on a reply.
 */
export async function notifyReactionOnReply(
  postId: string,
  replyId: string,
  triggerDeviceId: string
): Promise<void> {
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: { deviceId: true, status: true },
  });
  if (!reply || reply.status !== 'ACTIVE') return;
  if (reply.deviceId === triggerDeviceId) return;

  await prisma.activityNotification.create({
    data: {
      recipientId: reply.deviceId,
      type: 'REACTION_ON_REPLY',
      postId,
      replyId,
      triggerDeviceId,
    },
  }).catch(() => {});
}

/**
 * Count unread notifications for a device.
 */
export async function countUnread(deviceId: string): Promise<number> {
  const device = await prisma.anonymousDevice.findUnique({
    where: { id: deviceId },
    select: { notificationsLastViewedAt: true },
  });

  return prisma.activityNotification.count({
    where: {
      recipientId: deviceId,
      ...(device?.notificationsLastViewedAt
        ? { createdAt: { gt: device.notificationsLastViewedAt } }
        : {}),
      // Only count notifications for content that still exists
      post: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    },
  });
}
