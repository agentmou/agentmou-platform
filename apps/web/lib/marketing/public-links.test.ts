import { describe, expect, it } from 'vitest';
import {
  PUBLIC_APP_LOGIN_HREF,
  PUBLIC_DEMO_CLINIC_HREF,
  TECHNICAL_ENGINE_HREF,
} from './public-links';

describe('public marketing links', () => {
  it('keeps a single canonical public demo destination', () => {
    expect(PUBLIC_DEMO_CLINIC_HREF).toBe('http://localhost:3000/app/demo-workspace/dashboard');
  });

  it('builds login on the app origin instead of the marketing root', () => {
    expect(PUBLIC_APP_LOGIN_HREF).toBe('http://localhost:3000/login');
  });

  it('keeps the technical narrative outside the main funnel path', () => {
    expect(TECHNICAL_ENGINE_HREF).toBe('/docs/engine');
  });
});
