import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = '_sh_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Ensure anonymous identity cookie is present on all requests
  if (!request.cookies.has(COOKIE_NAME)) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const rawToken = Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set(COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  // 2. Protect admin dashboard route
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const adminCookie = request.cookies.get('_sh_admin')?.value;
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)',
  ],
};
