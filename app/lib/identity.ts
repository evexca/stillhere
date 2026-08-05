/**
 * Anonymous identity management.
 * The raw token is only ever stored in the browser cookie.
 * The database stores only the SHA-256 hash of (token + secret).
 */
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = '_sh_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Hash a raw identity token for safe database storage.
 */
export function hashToken(rawToken: string): string {
  const secret = process.env.ANONYMOUS_IDENTITY_SECRET;
  if (!secret) throw new Error('ANONYMOUS_IDENTITY_SECRET is not set');
  return crypto
    .createHmac('sha256', secret)
    .update(rawToken)
    .digest('hex');
}

/**
 * Generate a new cryptographically secure identity token.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Read the current device's identity from the cookie.
 * Returns the AnonymousDevice record, creating one if needed.
 * Returns null if cookie cannot be set (e.g. in static context).
 */
export async function getOrCreateDevice() {
  const cookieStore = await cookies();
  let rawToken = cookieStore.get(COOKIE_NAME)?.value;

  // If no cookie, generate a new one
  // Note: in Route Handlers we can set cookies; in Server Components we read only
  if (!rawToken) {
    rawToken = generateToken();
    try {
      cookieStore.set(COOKIE_NAME, rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
    } catch {
      // In read-only Server Component context, middleware assigns the cookie
    }
  }

  const tokenHash = hashToken(rawToken);

  // Upsert the device record
  const device = await prisma.anonymousDevice.upsert({
    where: { tokenHash },
    update: { lastSeenAt: new Date() },
    create: { tokenHash },
  });

  return { device, rawToken };
}

/**
 * Get the current device from cookie (read-only — for Server Components).
 * Returns null if no cookie is present.
 */
export async function getCurrentDevice() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  return prisma.anonymousDevice.findUnique({ where: { tokenHash } });
}

/**
 * Get device from a raw token string (for API Route Handlers).
 * The raw token comes from reading the cookie in the route handler.
 */
export async function getDeviceFromToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  return prisma.anonymousDevice.upsert({
    where: { tokenHash },
    update: { lastSeenAt: new Date() },
    create: { tokenHash },
  });
}

/**
 * Read the raw identity token from request cookies header.
 * Used inside API Route Handlers where we have a Request object.
 */
export function extractTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  return cookies[COOKIE_NAME] ?? null;
}

/**
 * Set the identity cookie on a Response.
 * Used when creating a new identity in an API Route.
 */
export function setIdentityCookie(response: Response, rawToken: string): Response {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieValue = [
    `${COOKIE_NAME}=${rawToken}`,
    `Path=/`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    `SameSite=Lax`,
    isProduction ? 'Secure' : '',
    'HttpOnly',
  ]
    .filter(Boolean)
    .join('; ');

  response.headers.append('Set-Cookie', cookieValue);
  return response;
}
