import { NextResponse } from 'next/server';
import { buildMarketingFeaturedCatalog } from '@/lib/marketing/featured-from-demo';

const EMPTY_PAYLOAD = {
  agents: [],
  workflows: [],
  packs: [],
  demoTotals: { agents: 0, workflows: 0, packs: 0 },
  operationalFeaturedCounts: { agents: 0, workflows: 0, packs: 0 },
  gaInventoryCounts: { agents: 0, workflows: 0, packs: 0 },
};

export async function GET() {
  try {
    const featured = buildMarketingFeaturedCatalog();

    return NextResponse.json(
      {
        agents: featured.agents,
        workflows: featured.workflows,
        packs: featured.packs,
        demoTotals: featured.demoTotals,
        operationalFeaturedCounts: featured.operationalFeaturedCounts,
        gaInventoryCounts: featured.gaInventoryCounts,
        source: 'demo-featured',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.warn('[public-catalog] featured demo catalog failure', error);
    return NextResponse.json(EMPTY_PAYLOAD, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}
