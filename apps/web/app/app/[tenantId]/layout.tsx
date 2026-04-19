'use client';

import * as React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/lib/auth/store';
import { TenantWorkspaceLoadingShell } from '@/components/clinic/tenant-workspace-loading-shell';
import { DataProviderContext } from '@/lib/providers/context';
import { getTenantDataProvider } from '@/lib/providers/tenant';
import { getShellComponent } from '@/lib/shell-registry';
import { resolveTenantRouteRedirect } from '@/lib/tenant-routing';
import { TenantExperienceProvider, useResolvedTenantExperience } from '@/lib/tenant-experience';
import { getTenantDefaultHref } from '@/lib/vertical-registry';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const authTenants = useAuthStore((state) => state.tenants);
  const authTenant = authTenants.find((tenant) => tenant.id === tenantId);
  const activeFallbackTenant = authTenants.find((tenant) => tenant.status !== 'frozen') ?? null;
  const provider = React.useMemo(() => getTenantDataProvider(tenantId), [tenantId]);
  const experience = useResolvedTenantExperience(tenantId, provider);
  const fallbackTenant = authTenants.find((tenant) => tenant.id === experience.fallbackTenantId);
  const redirectTarget =
    pathname && experience.resolvedExperience
      ? resolveTenantRouteRedirect({
          pathname,
          tenantId,
          experience: experience.resolvedExperience,
        })
      : null;

  React.useEffect(() => {
    if (authTenant?.status === 'frozen') {
      const params = new URLSearchParams({
        tenantId,
        tenantName: authTenant.name,
      });
      router.replace(`/app/frozen?${params.toString()}`);
      return;
    }

    if (experience.isLoading || experience.hasTenantAccess) {
      return;
    }

    if (experience.fallbackTenantId) {
      router.replace(
        getTenantDefaultHref(
          experience.fallbackTenantId,
          activeFallbackTenant?.settings ?? fallbackTenant?.settings ?? 'internal'
        )
      );
      return;
    }

    if (authTenants.length > 0) {
      router.replace('/app/frozen');
      return;
    }

    router.replace('/login');
  }, [
    activeFallbackTenant?.settings,
    authTenant?.name,
    authTenant?.status,
    authTenants.length,
    experience.fallbackTenantId,
    experience.hasTenantAccess,
    experience.isLoading,
    fallbackTenant?.settings,
    router,
    tenantId,
  ]);

  React.useEffect(() => {
    if (experience.isLoading || !experience.hasTenantAccess || !redirectTarget) {
      return;
    }

    router.replace(redirectTarget);
  }, [experience.hasTenantAccess, experience.isLoading, redirectTarget, router]);

  if (experience.isLoading) {
    const loadingVariant =
      authTenant?.settings?.activeVertical === 'clinic' ||
      authTenant?.settings?.activeVertical === 'fisio' ||
      authTenant?.settings?.verticalClinicUi
        ? 'clinic'
        : 'generic';

    return <TenantWorkspaceLoadingShell variant={loadingVariant} />;
  }

  if (!experience.hasTenantAccess) {
    return null;
  }

  if (redirectTarget) {
    return null;
  }

  const Shell = getShellComponent(experience.shellKey);

  return (
    <DataProviderContext.Provider value={provider}>
      <TenantExperienceProvider value={experience}>
        <Shell>{children}</Shell>
      </TenantExperienceProvider>
    </DataProviderContext.Provider>
  );
}
