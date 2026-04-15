export interface PublicOriginConfig {
  marketingPublicBaseUrl: string;
  appPublicBaseUrl: string;
  apiPublicBaseUrl: string;
}

export interface ResolvePublicOriginsOptions {
  nodeEnv?: string;
}

const LOCAL_PUBLIC_ORIGIN_DEFAULTS: PublicOriginConfig = {
  marketingPublicBaseUrl: 'http://localhost:3000',
  appPublicBaseUrl: 'http://localhost:3000',
  apiPublicBaseUrl: 'http://localhost:3001',
};

export function resolvePublicOrigins(
  input: Partial<PublicOriginConfig>,
  options: ResolvePublicOriginsOptions = {}
): PublicOriginConfig {
  const nodeEnv = options.nodeEnv ?? 'development';
  const isProduction = nodeEnv === 'production';

  return {
    marketingPublicBaseUrl: resolveBaseUrl(
      input.marketingPublicBaseUrl,
      LOCAL_PUBLIC_ORIGIN_DEFAULTS.marketingPublicBaseUrl,
      'MARKETING_PUBLIC_BASE_URL',
      isProduction
    ),
    appPublicBaseUrl: resolveBaseUrl(
      input.appPublicBaseUrl,
      LOCAL_PUBLIC_ORIGIN_DEFAULTS.appPublicBaseUrl,
      'APP_PUBLIC_BASE_URL',
      isProduction
    ),
    apiPublicBaseUrl: resolveBaseUrl(
      input.apiPublicBaseUrl,
      LOCAL_PUBLIC_ORIGIN_DEFAULTS.apiPublicBaseUrl,
      'API_PUBLIC_BASE_URL',
      isProduction
    ),
  };
}

export function getMarketingUrl(config: PublicOriginConfig, pathname = '/'): string {
  return joinPublicUrl(config.marketingPublicBaseUrl, pathname);
}

export function getAppUrl(config: PublicOriginConfig, pathname = '/'): string {
  return joinPublicUrl(config.appPublicBaseUrl, pathname);
}

export function getApiUrl(config: PublicOriginConfig, pathname = '/'): string {
  return joinPublicUrl(config.apiPublicBaseUrl, pathname);
}

function resolveBaseUrl(
  value: string | undefined,
  fallback: string,
  envName: string,
  isProduction: boolean
) {
  const normalizedValue = normalizeOptionalString(value);
  if (normalizedValue) {
    return normalizeBaseUrl(normalizedValue, envName);
  }

  if (isProduction) {
    throw new Error(`${envName} must be set in production`);
  }

  return fallback;
}

function normalizeOptionalString(value: string | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeBaseUrl(value: string, envName: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL`);
  }

  if (url.search || url.hash) {
    throw new Error(`${envName} must not include query parameters or fragments`);
  }

  const normalizedPathname = url.pathname.replace(/\/+$/, '');

  return `${url.origin}${normalizedPathname === '/' ? '' : normalizedPathname}`;
}

function joinPublicUrl(baseUrl: string, pathname: string) {
  if (!pathname || pathname === '/') {
    return baseUrl;
  }

  if (/^https?:\/\//.test(pathname)) {
    return pathname;
  }

  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(normalizedPathname, ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}
