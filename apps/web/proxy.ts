import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import {
  buildCanonicalSurfaceUrl,
  getCanonicalSurfaceOrigin,
  isCanonicalBypassPath,
  resolveCanonicalSurface,
} from '@/lib/runtime/canonical-hosts';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isCanonicalBypassPath(pathname)) {
    return NextResponse.next();
  }

  // /logout is a server route handler that must run regardless of cookie
  // presence or canonical host checks so the session can be cleared reliably.
  if (pathname === '/logout') {
    return NextResponse.next();
  }

  const canonicalSurface = resolveCanonicalSurface(pathname);
  if (canonicalSurface) {
    const canonicalOrigin = getCanonicalSurfaceOrigin(canonicalSurface);
    if (request.nextUrl.origin !== canonicalOrigin) {
      return NextResponse.redirect(
        buildCanonicalSurfaceUrl(canonicalSurface, pathname, request.nextUrl.search)
      );
    }
  }

  const token = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const isPublicDemoPath =
    pathname === '/app/demo-workspace' || pathname.startsWith('/app/demo-workspace/');

  if (pathname.startsWith('/app/') || pathname === '/app') {
    if (!token && !isPublicDemoPath) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if ((pathname === '/login' || pathname === '/register') && token) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = '/app';
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/pricing',
    '/security',
    '/contact-sales',
    '/privacy',
    '/terms',
    '/docs',
    '/docs/:path*',
    '/platform',
    '/login',
    '/logout',
    '/register',
    '/reset-password',
    '/auth/callback',
    '/app',
    '/app/:path*',
  ],
};
