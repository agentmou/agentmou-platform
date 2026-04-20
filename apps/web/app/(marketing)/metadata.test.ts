import { describe, expect, it } from 'vitest';
import { metadata as homeMetadata } from './page';
import { metadata as pricingMetadata } from './pricing/page';
import { metadata as securityMetadata } from './security/page';
import { metadata as docsEngineMetadata } from './docs/engine/page';
import { metadata as cookiesMetadata } from './cookies/page';
import { metadata as privacyMetadata } from './privacy/page';
import { metadata as termsMetadata } from './terms/page';

describe('marketing metadata', () => {
  it('keeps the primary public pages buyer-facing and canonical', () => {
    expect(homeMetadata.title).toBe(
      'Agentmou Clinics | Recepción IA multicanal para clínicas dentales'
    );
    expect(homeMetadata.alternates?.canonical).toBe('/');
    expect(pricingMetadata.alternates?.canonical).toBe('/pricing');
    expect(securityMetadata.alternates?.canonical).toBe('/security');
    expect(cookiesMetadata.alternates?.canonical).toBe('/cookies');
    expect(privacyMetadata.alternates?.canonical).toBe('/privacy');
    expect(termsMetadata.alternates?.canonical).toBe('/terms');
  });

  it('keeps the technical engine page accessible but noindex', () => {
    expect(docsEngineMetadata.alternates?.canonical).toBe('/docs/engine');
    expect(docsEngineMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
