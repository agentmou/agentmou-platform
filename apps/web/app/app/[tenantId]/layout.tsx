'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ClinicShell } from '@/components/clinic/clinic-shell';
import { AgentmouShell } from '@/components/control-plane/app-shell';
import { DataProviderContext } from '@/lib/providers/context';
import { getTenantDataProvider } from '@/lib/providers/tenant';
import {
  TenantExperienceProvider,
  useResolvedTenantExperience,
} from '@/lib/tenant-experience';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const provider = React.useMemo(() => getTenantDataProvider(tenantId), [tenantId]);
  const experience = useResolvedTenantExperience(tenantId, provider);

  React.useEffect(() => {
    if (experience.isLoading || experience.hasTenantAccess) {
      return;
    }

    if (experience.fallbackTenantId) {
      router.replace(`/app/${experience.fallbackTenantId}/dashboard`);
      return;
    }

    router.replace('/app');
  }, [
    experience.fallbackTenantId,
    experience.hasTenantAccess,
    experience.isLoading,
    router,
  ]);

  if (experience.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  if (!experience.hasTenantAccess) {
    return null;
  }

  const Shell = experience.mode === 'clinic' ? ClinicShell : AgentmouShell;

  return (
    <DataProviderContext.Provider value={provider}>
      <TenantExperienceProvider value={experience}>
        <Shell>{children}</Shell>
      </TenantExperienceProvider>
    </DataProviderContext.Provider>
  );
}
