import { afterEach, describe, expect, it } from 'vitest';

import {
  getPublicCatalogHref,
  getPublicDemoWorkspaceUrl,
  getPublicDocsUrl,
  getPublicPricingUrl,
  getPublicSecurityUrl,
} from './public-links.js';

describe('public chat link builders', () => {
  const originalMarketingBaseUrl = process.env.MARKETING_PUBLIC_BASE_URL;
  const originalAppBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalApiBaseUrl = process.env.API_PUBLIC_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = originalMarketingBaseUrl;
    process.env.APP_PUBLIC_BASE_URL = originalAppBaseUrl;
    process.env.API_PUBLIC_BASE_URL = originalApiBaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('builds canonical absolute demo and marketing URLs', () => {
    process.env.NODE_ENV = 'production';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io/';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io/';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io/';

    expect(getPublicDemoWorkspaceUrl()).toBe(
      'https://app.agentmou.io/app/demo-workspace/dashboard'
    );
    expect(getPublicPricingUrl()).toBe('https://agentmou.io/pricing');
    expect(getPublicSecurityUrl()).toBe('https://agentmou.io/security');
    expect(getPublicDocsUrl()).toBe('https://agentmou.io/docs');
  });

  it('maps catalog slugs onto the correct public surface', () => {
    process.env.NODE_ENV = 'production';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';

    expect(getPublicCatalogHref('agent-inbox-triage')).toBe(
      'https://app.agentmou.io/app/demo-workspace/marketplace/agents/inbox-triage'
    );
    expect(getPublicCatalogHref('workflow-wf-01-auto-label-gmail')).toBe(
      'https://app.agentmou.io/app/demo-workspace/marketplace/workflows/wf-01-auto-label-gmail'
    );
    expect(getPublicCatalogHref('pack-support-starter')).toBe(
      'https://app.agentmou.io/app/demo-workspace/marketplace/packs/support-starter'
    );
    expect(getPublicCatalogHref('public-product-overview')).toBe('https://agentmou.io/docs');
  });
});
