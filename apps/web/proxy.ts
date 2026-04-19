import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import {
  buildCanonicalSurfaceUrl,
  getCanonicalSurfaceOrigin,
  isCanonicalBypassPath,
  resolveCanonicalSurface,
} from '@/lib/runtime/canonical-hosts';

// The Playwright smoke suite runs `next start` on 127.0.0.1:3100 and
// mocks every /api/v1/* call, so it has no meaningful "canonical" host
// pair to enforce. This flag is set at build time by `pnpm test:e2e`
// and is never shipped to production builds (the official CI builds
// never set `E2E_DISABLE_CANONICAL_REDIRECT`).
const E2E_DISABLE_CANONICAL_REDIRECT = process.env.E2E_DISABLE_CANONICAL_REDIRECT === '1';

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

  if (!E2E_DISABLE_CANONICAL_REDIRECT) {
    const canonicalSurface = resolveCanonicalSurface(pathname);
    if (canonicalSurface) {
      const canonicalOrigin = getCanonicalSurfaceOrigin(canonicalSurface);
      if (request.nextUrl.origin !== canonicalOrigin) {
        return NextResponse.redirect(
          buildCanonicalSurfaceUrl(canonicalSurface, pathname, request.nextUrl.search)
        );
      }
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

  // Top-level admin console — same gate as /app/*. The platform-admin
  // role check stays server-side (`requirePlatformAdmin` middleware on the
  // API + the admin layout's session resolution). The proxy only enforces
  // that an authenticated cookie is present so unauthenticated visitors
  // see /login instead of a blank screen.
  if (pathname.startsWith('/admin/') || pathname === '/admin') {
    if (!token) {
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
    '/cookies',
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
    '/admin',
    '/admin/:path*',
  ],
};
