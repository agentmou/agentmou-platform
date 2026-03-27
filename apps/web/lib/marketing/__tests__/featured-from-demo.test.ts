import { describe, expect, it } from 'vitest';

import { buildMarketingFeaturedCatalog } from '../featured-from-demo';

describe('buildMarketingFeaturedCatalog', () => {
  it('returns only GA operational featured rows and inventory counts', () => {
    const catalog = buildMarketingFeaturedCatalog();

    expect(catalog.agents).toHaveLength(1);
    expect(catalog.agents[0]?.id).toBe('agent-inbox-triage');

    expect(catalog.workflows).toHaveLength(1);
    expect(catalog.workflows[0]?.id).toBe('wf-01');

    expect(catalog.packs).toHaveLength(2);
    expect(catalog.packs.map((p) => p.id).sort()).toEqual(
      ['pack-sales-accelerator', 'pack-support-starter'].sort()
    );

    expect(catalog.operationalFeaturedCounts).toEqual({
      agents: 1,
      workflows: 1,
      packs: 2,
    });

    expect(catalog.gaInventoryCounts.agents).toBeGreaterThanOrEqual(1);
    expect(catalog.gaInventoryCounts.workflows).toBeGreaterThanOrEqual(1);
    expect(catalog.gaInventoryCounts.packs).toBeGreaterThanOrEqual(2);
  });
});
