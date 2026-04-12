type SeedVerticalKey = 'internal' | 'clinic' | 'fisio';

export interface TenantVerticalConfigSeedRow {
  tenantId: string;
  verticalKey: SeedVerticalKey;
  config: Record<string, unknown>;
}

export function buildTenantVerticalConfigSeedRows(params: {
  tenantId: string;
  activeVertical: SeedVerticalKey;
  config?: Record<string, unknown>;
}): TenantVerticalConfigSeedRow[] {
  return [
    {
      tenantId: params.tenantId,
      verticalKey: params.activeVertical,
      config: params.config ?? {},
    },
  ];
}
