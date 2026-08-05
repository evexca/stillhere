/**
 * Admin authentication using secure server-side sessions.
 * Sessions are stored in the database; session tokens are hashed.
 */
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = '_sh_admin';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function hashSessionToken(rawToken: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
}

/**
 * Authenticate an admin with email + password.
 * Returns a session token on success, null on failure.
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<string | null> {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return null;

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return null;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.adminSession.create({
    data: { adminId: admin.id, tokenHash, expiresAt },
  });

  return rawToken;
}

/**
 * Validate an admin session from the cookie.
 * Returns the admin record if valid, null otherwise.
 */
export async function getAdminFromSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired session — clean up
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.admin;
}

/**
 * Set the admin session cookie.
 */
export async function setAdminSessionCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  });
}

/**
 * Clear the admin session cookie and delete the session record.
 */
export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await prisma.adminSession
      .deleteMany({ where: { tokenHash } })
      .catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Hash a password for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
