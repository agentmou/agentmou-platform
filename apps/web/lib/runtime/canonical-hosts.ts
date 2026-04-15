import { getAppUrl, getMarketingUrl, resolveWebPublicOrigins } from './public-origins';

export type CanonicalSurface = 'app' | 'marketing';

const APP_SURFACE_PATHS = ['/login', '/register', '/reset-password', '/auth/callback'] as const;
const MARKETING_SURFACE_PATHS = [
  '/',
  '/pricing',
  '/security',
  '/contact-sales',
  '/privacy',
  '/terms',
  '/docs',
  '/docs/engine',
  '/platform',
] as const;

export function isCanonicalBypassPath(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    hasStaticAssetExtension(pathname)
  );
}

export function resolveCanonicalSurface(pathname: string): CanonicalSurface | null {
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    return 'app';
  }

  if (APP_SURFACE_PATHS.includes(pathname as (typeof APP_SURFACE_PATHS)[number])) {
    return 'app';
  }

  if (MARKETING_SURFACE_PATHS.includes(pathname as (typeof MARKETING_SURFACE_PATHS)[number])) {
    return 'marketing';
  }

  return null;
}

export function getCanonicalSurfaceOrigin(surface: CanonicalSurface) {
  const origins = resolveWebPublicOrigins();
  return surface === 'app' ? origins.appPublicBaseUrl : origins.marketingPublicBaseUrl;
}

export function buildCanonicalSurfaceUrl(surface: CanonicalSurface, pathname: string, search = '') {
  const relativeUrl = `${pathname}${search}`;
  return surface === 'app' ? getAppUrl(relativeUrl) : getMarketingUrl(relativeUrl);
}

function hasStaticAssetExtension(pathname: string) {
  return /\.[a-z0-9]+$/i.test(pathname);
}
