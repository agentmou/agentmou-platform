import { getAppUrl, getMarketingUrl } from '../../lib/public-origins.js';

const DEMO_WORKSPACE_ID = 'demo-workspace';

export function getPublicDemoWorkspaceUrl() {
  return getAppUrl(`/app/${DEMO_WORKSPACE_ID}/dashboard`);
}

export function getPublicPricingUrl() {
  return getMarketingUrl('/pricing');
}

export function getPublicSecurityUrl() {
  return getMarketingUrl('/security');
}

export function getPublicDocsUrl() {
  return getMarketingUrl('/docs');
}

export function getPublicCatalogHref(slug: string) {
  if (slug === 'public-pricing') return getPublicPricingUrl();
  if (slug === 'public-security') return getPublicSecurityUrl();
  if (slug === 'public-product-overview') return getPublicDocsUrl();
  if (slug.startsWith('agent-')) {
    return getAppUrl(`/app/${DEMO_WORKSPACE_ID}/marketplace/agents/${slug.replace('agent-', '')}`);
  }
  if (slug.startsWith('workflow-')) {
    return getAppUrl(
      `/app/${DEMO_WORKSPACE_ID}/marketplace/workflows/${slug.replace('workflow-', '')}`
    );
  }
  if (slug.startsWith('pack-')) {
    return getAppUrl(`/app/${DEMO_WORKSPACE_ID}/marketplace/packs/${slug.replace('pack-', '')}`);
  }

  return getPublicDocsUrl();
}
