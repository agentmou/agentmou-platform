import 'server-only';

import { resolvePublicOrigins } from '@agentmou/contracts';

import { AUTH_SESSION_COOKIE_NAME } from './constants';

/**
 * Mirror of the cookie-domain logic in services/api/src/lib/auth-sessions.ts
 * (resolveCookieDomain). Kept in sync so Set-Cookie headers produced by the
 * web and the API target the same scope when clearing sessions.
 */

function isLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  );
}

function resolveOrigins() {
  return resolvePublicOrigins(
    {
      marketingPublicBaseUrl: process.env.MARKETING_PUBLIC_BASE_URL,
      appPublicBaseUrl: process.env.APP_PUBLIC_BASE_URL,
      apiPublicBaseUrl: process.env.API_PUBLIC_BASE_URL,
    },
    {
      nodeEnv: process.env.NODE_ENV,
    }
  );
}

export function resolveAuthCookieDomain(): string | undefined {
  const origins = resolveOrigins();
  const appHostname = new URL(origins.appPublicBaseUrl).hostname;
  const apiHostname = new URL(origins.apiPublicBaseUrl).hostname;

  if (isLocalHostname(appHostname) || isLocalHostname(apiHostname)) {
    return undefined;
  }

  if (
    (appHostname === 'agentmou.io' || appHostname.endsWith('.agentmou.io')) &&
    (apiHostname === 'agentmou.io' || apiHostname.endsWith('.agentmou.io'))
  ) {
    return '.agentmou.io';
  }

  return undefined;
}

export function shouldUseSecureAuthCookie(): boolean {
  const origins = resolveOrigins();
  const appHostname = new URL(origins.appPublicBaseUrl).hostname;
  const apiHostname = new URL(origins.apiPublicBaseUrl).hostname;
  return !isLocalHostname(appHostname) && !isLocalHostname(apiHostname);
}

export interface ClearAuthCookieOptions {
  domain?: string;
  secure?: boolean;
}

export function buildClearedAuthCookie(options: ClearAuthCookieOptions = {}) {
  return {
    name: AUTH_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: options.secure ?? shouldUseSecureAuthCookie(),
    domain: options.domain ?? resolveAuthCookieDomain(),
    maxAge: 0,
    expires: new Date(0),
  };
}
