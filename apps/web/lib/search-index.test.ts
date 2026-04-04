import { describe, expect, it } from 'vitest';

import { mockProvider } from '@/lib/data/mock-provider';

import { buildSearchIndex } from './search-index';

describe('clinic search index', () => {
  it('builds clinic navigation and records without platform-only entries', async () => {
    const items = await buildSearchIndex('demo-workspace', mockProvider, 'clinic');

    expect(items.some((item) => item.label === 'Resumen')).toBe(true);
    expect(items.some((item) => item.label === 'Bandeja')).toBe(true);
    expect(items.some((item) => item.label === 'Marketplace')).toBe(false);
    expect(items.some((item) => item.label === 'Ana Garcia')).toBe(true);
    expect(items.some((item) => item.label.includes('Revision semestral'))).toBe(true);
  });

  it('keeps platform search entries in platform mode', async () => {
    const items = await buildSearchIndex('demo-workspace', mockProvider, 'platform');

    expect(items.some((item) => item.label === 'Marketplace')).toBe(true);
    expect(items.some((item) => item.label === 'Runs')).toBe(true);
  });
});
