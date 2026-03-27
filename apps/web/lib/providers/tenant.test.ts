import { describe, expect, it } from 'vitest';
import { demoProvider } from './demo';
import { apiProvider } from './product';
import { DEMO_WORKSPACE_ID, getTenantDataProvider } from './tenant';

describe('getTenantDataProvider', () => {
  it('returns the demo provider for the public demo workspace', () => {
    expect(getTenantDataProvider(DEMO_WORKSPACE_ID)).toBe(demoProvider);
  });

  it('returns the api provider for real tenants', () => {
    expect(getTenantDataProvider('tenant-123')).toBe(apiProvider);
  });
});
