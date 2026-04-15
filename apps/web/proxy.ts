import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ['/app/:path*', '/login', '/register'],
};
