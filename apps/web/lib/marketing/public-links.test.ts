import { describe, expect, it } from 'vitest';
import { PUBLIC_DEMO_CLINIC_HREF, TECHNICAL_ENGINE_HREF } from './public-links';

describe('public marketing links', () => {
  it('keeps a single canonical public demo destination', () => {
    expect(PUBLIC_DEMO_CLINIC_HREF).toBe('/app/demo-workspace/dashboard');
  });

  it('keeps the technical narrative outside the main funnel path', () => {
    expect(TECHNICAL_ENGINE_HREF).toBe('/docs/engine');
  });
});
