import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { buildClearedAuthCookie } from '@/lib/auth/cookie';
import { getApiUrl } from '@/lib/runtime/public-origins';

/**
 * Server-side logout route. Owns the contract that any client (shells,
 * deeplinks, or manual navigation) uses to terminate a session.
 *
 * 1. Forward the request cookie to `POST /api/v1/auth/logout` so the server
 *    can revoke the session record. Swallow failures — the client-side cookie
 *    must still be cleared below even if the API is unavailable.
 * 2. Emit a `Set-Cookie` that expires the session cookie locally, matching
 *    the Domain/Path/SameSite/Secure attributes used when it was created.
 * 3. Redirect the browser to `/login` with status 303 so the new navigation
 *    is a clean GET, regardless of whether the triggering request was POST
 *    (form submission) or GET (fallback link).
 */
async function handleLogout(request: NextRequest): Promise<NextResponse> {
  const cookieHeader = request.headers.get('cookie');

  if (cookieHeader?.includes(`${AUTH_SESSION_COOKIE_NAME}=`)) {
    try {
      await fetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        cache: 'no-store',
        headers: {
          cookie: cookieHeader,
          'content-type': 'application/json',
        },
      });
    } catch {
      // Session record revocation is best-effort; the cookie is still cleared.
    }
  }

  const loginUrl = new URL('/login', request.nextUrl.origin);
  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.set(buildClearedAuthCookie());
  return response;
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}
