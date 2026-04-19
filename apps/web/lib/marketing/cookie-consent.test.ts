import { describe, expect, it } from 'vitest';
import {
  MARKETING_COOKIE_CONSENT_MAX_AGE,
  MARKETING_COOKIE_CONSENT_NAME,
  buildMarketingCookieConsentCookie,
  parseMarketingCookieConsent,
} from './cookie-consent';

describe('marketing cookie consent helpers', () => {
  it('parses only the supported consent values', () => {
    expect(parseMarketingCookieConsent('accepted')).toBe('accepted');
    expect(parseMarketingCookieConsent('rejected')).toBe('rejected');
    expect(parseMarketingCookieConsent('pending')).toBeNull();
    expect(parseMarketingCookieConsent(undefined)).toBeNull();
  });

  it('builds a host-only cookie payload with the expected defaults', () => {
    const secureCookie = buildMarketingCookieConsentCookie('accepted', true);
    const nonSecureCookie = buildMarketingCookieConsentCookie('rejected', false);

    expect(secureCookie).toContain(`${MARKETING_COOKIE_CONSENT_NAME}=accepted`);
    expect(secureCookie).toContain(`Max-Age=${MARKETING_COOKIE_CONSENT_MAX_AGE}`);
    expect(secureCookie).toContain('Path=/');
    expect(secureCookie).toContain('SameSite=Lax');
    expect(secureCookie).toContain('Secure');
    expect(nonSecureCookie).toContain(`${MARKETING_COOKIE_CONSENT_NAME}=rejected`);
    expect(nonSecureCookie).not.toContain('Domain=');
    expect(nonSecureCookie).not.toContain('Secure');
  });
});
