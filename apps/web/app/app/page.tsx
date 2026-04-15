'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { resolveAppRootRedirect } from '@/lib/tenant-routing';

/**
 * /app entry point — redirects authenticated users to their first tenant dashboard.
 * When auth bootstrap resolves to no valid session, sends the user back to /login.
 */
export default function AppPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const tenants = useAuthStore((s) => s.tenants);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(resolveAppRootRedirect({ tenants, activeTenantId }));
  }, [activeTenantId, isHydrated, router, tenants, user]);

  return null;
}
