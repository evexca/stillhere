/**
 * POST /api/reports — Submit a content report
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTokenFromRequest, getDeviceFromToken, generateToken, setIdentityCookie } from '@/lib/identity';
import { CreateReportSchema } from '@/lib/validation';
import { checkRateLimit, incrementRateLimit } from '@/services/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const parseResult = CreateReportSchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Invalid report data.';
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { targetType, targetId, reason, note } = parseResult.data;

    // Resolve identity
    let rawToken = extractTokenFromRequest(request);
    let isNewIdentity = false;
    if (!rawToken) {
      rawToken = generateToken();
      isNewIdentity = true;
    }
    const device = await getDeviceFromToken(rawToken);

    // Rate limit on reports
    const rateCheck = await checkRateLimit(device.id, 'REPORT');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'You have submitted too many reports. Please try again later.' },
        { status: 429 }
      );
    }

    // Resolve internal target ID
    let postId: string | null = null;
    let replyId: string | null = null;

    if (targetType === 'POST') {
      const post = await prisma.post.findUnique({
        where: { publicId: targetId },
        select: { id: true, status: true },
      });
      if (!post || post.status === 'DELETED') {
        return NextResponse.json({ error: 'This post is no longer available.' }, { status: 404 });
      }
      postId = post.id;
    } else {
      const reply = await prisma.reply.findUnique({
        where: { publicId: targetId },
        select: { id: true, postId: true, status: true },
      });
      if (!reply || reply.status === 'DELETED') {
        return NextResponse.json({ error: 'This reply is no longer available.' }, { status: 404 });
      }
      replyId = reply.id;
    }

    // Check for duplicate report from same device
    const duplicate = await prisma.report.findFirst({
      where: {
        deviceId: device.id,
        reason: reason as import('@prisma/client').ReportReason,
        ...(postId ? { postId } : { replyId }),
      },
    });

    if (duplicate) {
      // Return success silently to avoid leaking report existence
      return NextResponse.json({ ok: true });
    }

    await prisma.report.create({
      data: {
        deviceId: device.id,
        targetType: targetType as import('@prisma/client').ReactionTarget,
        postId,
        replyId,
        reason: reason as import('@prisma/client').ReportReason,
        note: note ? note.slice(0, 500) : null,
      },
    });

    await incrementRateLimit(device.id, 'REPORT');

    const response = NextResponse.json({ ok: true }, { status: 201 });
    if (isNewIdentity) setIdentityCookie(response, rawToken);
    return response;
  } catch (error) {
    console.error('[reports] POST error:', error);
    return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 });
  }
}
