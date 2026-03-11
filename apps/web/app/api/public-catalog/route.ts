import { NextResponse } from 'next/server';
import { getPublicMarketingCatalogResult } from '@/lib/marketing/public-catalog';

const EMPTY_PAYLOAD = { agents: [], workflows: [], packs: [] };

export async function GET() {
  try {
    const result = await getPublicMarketingCatalogResult();

    if (result.degraded) {
      console.warn(
        `[public-catalog] degraded response source=${result.source} reason=${result.reason ?? 'unknown'}`,
      );
    }

    return NextResponse.json(result.payload, {
      headers: {
        'Cache-Control': result.degraded
          ? 'public, s-maxage=60, stale-while-revalidate=120'
          : 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.warn('[public-catalog] unexpected route failure', error);
    return NextResponse.json(
      EMPTY_PAYLOAD,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  }
}
