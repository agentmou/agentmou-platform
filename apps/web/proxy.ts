import { NextResponse, type NextRequest } from 'next/server';

const TOKEN_COOKIE = 'agentmou-token';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isPublicDemoPath =
    pathname === '/app/demo-workspace' ||
    pathname.startsWith('/app/demo-workspace/');

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
