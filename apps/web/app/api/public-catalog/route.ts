import { NextResponse } from 'next/server';
import { getPublicMarketingCatalog } from '@/lib/marketing/public-catalog';

export async function GET() {
  try {
    const payload = await getPublicMarketingCatalog();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[public-catalog] failed to load catalog', error);
    return NextResponse.json(
      { agents: [], workflows: [], packs: [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  }
}
