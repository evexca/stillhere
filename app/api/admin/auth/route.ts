/**
 * POST /api/admin/auth — Admin login
 * DELETE /api/admin/auth — Admin logout
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminLogin, adminLogout, setAdminSessionCookie } from '@/lib/auth';
import { AdminLoginSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const parseResult = AdminLoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 422 });
    }

    const { email, password } = parseResult.data;
    const rawToken = await adminLogin(email, password);

    if (!rawToken) {
      // Generic message — don't reveal which field is wrong
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await setAdminSessionCookie(rawToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/auth] POST error:', error);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await adminLogout();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/auth] DELETE error:', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
