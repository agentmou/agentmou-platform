'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { resolveAppRootRedirect } from '@/lib/tenant-routing';

/**
 * /app entry point — redirects authenticated users to their first tenant dashboard.
 * Falls back to demo-workspace for unauthenticated visits (proxy will redirect
 * to /login if there's no token cookie, so this only runs for logged-in users).
 */
export default function AppPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const tenants = useAuthStore((s) => s.tenants);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    router.replace(resolveAppRootRedirect({ tenants, activeTenantId }));
  }, [activeTenantId, isHydrated, router, tenants]);

  return null;
}
