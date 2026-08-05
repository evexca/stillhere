/**
 * GET /api/activity/unread — Unread notification count for the nav badge
 */
import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, getDeviceFromToken } from '@/lib/identity';
import { countUnread } from '@/services/notification';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const rawToken = extractTokenFromRequest(request);
    if (!rawToken) {
      return NextResponse.json({ count: 0 });
    }
    const device = await getDeviceFromToken(rawToken);
    const count = await countUnread(device.id);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
