'use client';

import { createContext, useContext } from 'react';
import type { DataProvider } from './provider';
import { mockProvider } from './mock-provider';
import { demoProvider } from './demo-provider';

export type { DataProvider } from './provider';
export { mockProvider } from './mock-provider';
export { demoProvider } from './demo-provider';
export { apiProvider } from './api-provider';

/**
 * React context that holds the active DataProvider.
 *
 * - Marketing layout sets this to `mockProvider`
 * - App layout sets this to `apiProvider` for real tenants
 * - Demo workspace uses `demoProvider`
 *
 * Default is `mockProvider` so pages that haven't been wrapped
 * (e.g. the root `/` page) still work with demo data.
 */
export const DataProviderContext = createContext<DataProvider>(mockProvider);

/**
 * Hook to access the current DataProvider.
 *
 * Usage:
 * ```ts
 * const data = useDataProvider();
 * const agents = await data.listMarketplaceAgentTemplates();
 * ```
 */
export function useDataProvider(): DataProvider {
  return useContext(DataProviderContext);
}
