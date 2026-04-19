export const MARKETING_COOKIE_CONSENT_NAME = 'agentmou-cookie-consent';
export const MARKETING_COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

export type MarketingCookieConsent = 'accepted' | 'rejected';

export function parseMarketingCookieConsent(value?: string | null): MarketingCookieConsent | null {
  if (value === 'accepted' || value === 'rejected') {
    return value;
  }

  return null;
}

export function buildMarketingCookieConsentCookie(
  consent: MarketingCookieConsent,
  isSecure: boolean
) {
  return `${MARKETING_COOKIE_CONSENT_NAME}=${consent}; Path=/; Max-Age=${MARKETING_COOKIE_CONSENT_MAX_AGE}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}
