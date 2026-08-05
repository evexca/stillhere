/**
 * Rate limiting and cooldown enforcement.
 * All limits are enforced server-side; client timers are cosmetic only.
 */
import { prisma } from '@/lib/prisma';
import { SITE_CONFIG } from '@/config/site';

type ActionType = 'POST' | 'REPLY' | 'REACT' | 'REPORT';

/**
 * Check whether a device is within the cooldown period for a given action.
 * Returns the seconds remaining if in cooldown, or 0 if allowed.
 */
export async function checkCooldown(
  deviceId: string,
  action: 'POST' | 'REPLY'
): Promise<{ allowed: boolean; remainingSeconds: number }> {
  const device = await prisma.anonymousDevice.findUnique({
    where: { id: deviceId },
    select: { cooldownPostAt: true, cooldownReplyAt: true },
  });

  if (!device) return { allowed: true, remainingSeconds: 0 };

  const cooldownField =
    action === 'POST' ? device.cooldownPostAt : device.cooldownReplyAt;
  if (!cooldownField) return { allowed: true, remainingSeconds: 0 };

  const remaining = Math.ceil((cooldownField.getTime() - Date.now()) / 1000);
  if (remaining <= 0) return { allowed: true, remainingSeconds: 0 };

  return { allowed: false, remainingSeconds: remaining };
}

/**
 * Set the cooldown for a device after a successful action.
 */
export async function setCooldown(
  deviceId: string,
  action: 'POST' | 'REPLY'
): Promise<void> {
  const seconds =
    action === 'POST'
      ? SITE_CONFIG.postCooldownSeconds
      : SITE_CONFIG.replyCooldownSeconds;

  const cooldownAt = new Date(Date.now() + seconds * 1000);

  await prisma.anonymousDevice.update({
    where: { id: deviceId },
    data:
      action === 'POST'
        ? { cooldownPostAt: cooldownAt }
        : { cooldownReplyAt: cooldownAt },
  });
}

/**
 * Check hourly rate limit for a device action.
 * Returns true if allowed, false if limit exceeded.
 */
export async function checkRateLimit(
  deviceId: string,
  action: ActionType
): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date();

  // Determine window size and limit
  const isMinuteWindow = action === 'REACT';
  const windowMs = isMinuteWindow ? 60 * 1000 : 60 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  const limit = getLimit(action);

  const record = await prisma.rateLimitRecord.findUnique({
    where: {
      deviceId_action_windowStart: {
        deviceId,
        action,
        windowStart,
      },
    },
  });

  if (record && record.count >= limit) {
    const windowLabel = isMinuteWindow ? 'minute' : 'hour';
    const actionLabel = getActionLabel(action);
    return {
      allowed: false,
      message: `You've ${actionLabel} too many times this ${windowLabel}. Please try again later.`,
    };
  }

  return { allowed: true };
}

/**
 * Increment the rate limit counter for a device action.
 */
export async function incrementRateLimit(
  deviceId: string,
  action: ActionType
): Promise<void> {
  const now = new Date();
  const isMinuteWindow = action === 'REACT';
  const windowMs = isMinuteWindow ? 60 * 1000 : 60 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  await prisma.rateLimitRecord.upsert({
    where: {
      deviceId_action_windowStart: {
        deviceId,
        action,
        windowStart,
      },
    },
    update: {
      count: { increment: 1 },
      lastAt: now,
    },
    create: {
      deviceId,
      action,
      windowStart,
      count: 1,
    },
  });
}

function getLimit(action: ActionType): number {
  switch (action) {
    case 'POST': return SITE_CONFIG.maxPostsPerHour;
    case 'REPLY': return SITE_CONFIG.maxRepliesPerHour;
    case 'REPORT': return SITE_CONFIG.maxReportsPerHour;
    case 'REACT': return SITE_CONFIG.maxReactionChangesPerMinute;
  }
}

function getActionLabel(action: ActionType): string {
  switch (action) {
    case 'POST': return 'posted';
    case 'REPLY': return 'commented';
    case 'REPORT': return 'reported';
    case 'REACT': return 'reacted';
  }
}

/**
 * Clean up old rate limit records beyond the retention period.
 * Called during cleanup runs.
 */
export async function cleanOldRateLimits(): Promise<number> {
  const cutoff = new Date(
    Date.now() -
      parseInt(process.env.RATE_LIMIT_RETENTION_HOURS ?? '48', 10) * 3600 * 1000
  );
  const result = await prisma.rateLimitRecord.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return result.count;
}
