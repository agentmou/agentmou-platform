import { describe, expect, it } from 'vitest';

import { buildTenantVerticalConfigSeedRows } from './tenant-vertical-config-fixture';

describe('buildTenantVerticalConfigSeedRows', () => {
  it('builds a single canonical config row for the active tenant vertical', () => {
    expect(
      buildTenantVerticalConfigSeedRows({
        tenantId: 'tenant-1',
        activeVertical: 'fisio',
        config: {
          specialty: 'sports_rehab',
        },
      })
    ).toEqual([
      {
        tenantId: 'tenant-1',
        verticalKey: 'fisio',
        config: {
          specialty: 'sports_rehab',
        },
      },
    ]);
  });
});
