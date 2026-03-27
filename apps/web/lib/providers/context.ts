'use client';

import { createContext, useContext } from 'react';
import type { DataProvider } from '@/lib/data/provider';
import { apiProvider } from './product';

export const DataProviderContext = createContext<DataProvider>(apiProvider);

export function useDataProvider(): DataProvider {
  return useContext(DataProviderContext);
}
