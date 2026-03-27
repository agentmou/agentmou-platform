'use client';

import { useState, useEffect, useRef } from 'react';
import { useDataProvider } from '@/lib/providers/context';
import type { DataProvider } from './provider';

type ProviderFn<T> = (provider: DataProvider) => Promise<T>;

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Lightweight hook that runs an async query against the active DataProvider.
 *
 * ```tsx
 * const { data: agents, isLoading } = useProviderQuery(
 *   (p) => p.listMarketplaceAgentTemplates(),
 *   [],           // fallback while loading
 *   [tenantId],   // re-fetch when these change
 * );
 * ```
 */
export function useProviderQuery<T>(
  fn: ProviderFn<T>,
  fallback: T,
  deps: unknown[] = [],
): QueryResult<T> {
  const provider = useDataProvider();
  const [data, setData] = useState<T>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    setError(null);

    fn(provider)
      .then((result) => {
        if (mountedRef.current) setData(result);
      })
      .catch((err) => {
        if (mountedRef.current) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [provider, ...deps]);

  return { data, isLoading, error };
}
