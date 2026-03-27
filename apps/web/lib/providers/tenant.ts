import type { DataProvider } from '@/lib/data/provider';
import { demoProvider } from './demo';
import { apiProvider } from './product';

export const DEMO_WORKSPACE_ID = 'demo-workspace';

export function getTenantDataProvider(tenantId: string): DataProvider {
  return tenantId === DEMO_WORKSPACE_ID ? demoProvider : apiProvider;
}
