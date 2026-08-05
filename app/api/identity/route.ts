/**
 * POST /api/identity
 * Initializes an anonymous identity and sets the identity cookie.
 * Called on first visit when no cookie is present.
 */
import { NextResponse } from 'next/server';
import { generateToken, hashToken, setIdentityCookie } from '@/lib/identity';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    await prisma.anonymousDevice.upsert({
      where: { tokenHash },
      update: { lastSeenAt: new Date() },
      create: { tokenHash },
    });

    const response = NextResponse.json({ ok: true });
    setIdentityCookie(response, rawToken);
    return response;
  } catch (error) {
    console.error('[identity] Error creating identity:', error);
    return NextResponse.json({ error: 'Failed to initialize identity.' }, { status: 500 });
  }
}
