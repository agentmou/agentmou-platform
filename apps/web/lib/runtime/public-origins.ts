import {
  getApiUrl as buildApiUrl,
  getAppUrl as buildAppUrl,
  getMarketingUrl as buildMarketingUrl,
  resolvePublicOrigins,
  type PublicOriginConfig,
} from '@agentmou/contracts';

export function resolveWebPublicOrigins(): PublicOriginConfig {
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

export function getMarketingUrl(pathname = '/') {
  return buildMarketingUrl(resolveWebPublicOrigins(), pathname);
}

export function getAppUrl(pathname = '/') {
  return buildAppUrl(resolveWebPublicOrigins(), pathname);
}

export function getApiUrl(pathname = '/') {
  return buildApiUrl(resolveWebPublicOrigins(), pathname);
}
