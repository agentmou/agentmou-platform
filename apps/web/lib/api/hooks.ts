/**
 * React data-fetching hooks backed by the typed API client.
 *
 * Pages can progressively migrate from synchronous read-model calls to these
 * hooks. Each hook manages loading/error state internally.
 *
 * Usage:
 *   const { data: runs, loading } = useApiData(() => fetchTenantRuns(tenantId), [tenantId]);
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type FetchFn<T> = () => Promise<T>;

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Generic hook for fetching data from the API.
 * Re-fetches when deps change.
 */
export function useApiData<T>(
  fetcher: FetchFn<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
