/**
 * Moderation service.
 * Abstracts content checking; in MVP, uses local blocked-term matching.
 * Future: delegate to MODERATION_API_URL when configured.
 */
import { prisma } from '@/lib/prisma';

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check content against blocked terms.
 * Returns allowed:false with a generic message if matched.
 * Does NOT reveal which term was matched.
 */
export async function checkContent(text: string): Promise<ModerationResult> {
  // Future: if MODERATION_API_URL is set, delegate to it
  if (process.env.MODERATION_API_URL && process.env.MODERATION_API_KEY) {
    return checkWithExternalApi(text);
  }

  return checkLocalBlocking(text);
}

async function checkLocalBlocking(text: string): Promise<ModerationResult> {
  const terms = await prisma.blockedTerm.findMany({
    where: { active: true },
    select: { pattern: true, isRegex: true },
  });

  const lower = text.toLowerCase();

  for (const { pattern, isRegex } of terms) {
    if (isRegex) {
      try {
        const re = new RegExp(pattern, 'i');
        if (re.test(text)) {
          return {
            allowed: false,
            reason: 'Your post contains content that is not allowed on this platform.',
          };
        }
      } catch {
        // Invalid regex in DB — skip silently
      }
    } else {
      if (lower.includes(pattern.toLowerCase())) {
        return {
          allowed: false,
          reason: 'Your post contains content that is not allowed on this platform.',
        };
      }
    }
  }

  return { allowed: true };
}

async function checkWithExternalApi(text: string): Promise<ModerationResult> {
  try {
    const response = await fetch(process.env.MODERATION_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MODERATION_API_KEY}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!response.ok) {
      // If external API fails, fall back to local
      return checkLocalBlocking(text);
    }

    const data = await response.json() as { allowed: boolean; reason?: string };
    return data;
  } catch {
    // External API unavailable — fall back to local
    return checkLocalBlocking(text);
  }
}

/**
 * Record a moderation action in the audit log.
 * Never stores content text.
 */
export async function logModerationAction(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  reason?: string
): Promise<void> {
  await prisma.moderationAction.create({
    data: {
      adminId,
      actionType: actionType as import('@prisma/client').ModerationActionType,
      targetType,
      targetId,
      reason: reason ?? null,
    },
  });
}
