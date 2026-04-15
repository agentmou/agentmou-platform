import 'server-only';

import { cookies, headers } from 'next/headers';

import { AUTH_SESSION_COOKIE_NAME } from './constants';
import { getApiUrl } from '@/lib/runtime/public-origins';
import type { AuthSnapshot } from './store';

export async function getServerAuthSnapshot(): Promise<AuthSnapshot> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return null;
  }

  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(getApiUrl('/api/v1/auth/me'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      cookie: cookieHeader,
    },
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return (await response.json()) as AuthSnapshot;
}
