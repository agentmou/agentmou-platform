'use client';

import { useParams } from 'next/navigation';
import { AgentmouShell } from '@/components/control-plane/app-shell';
import { DataProviderContext } from '@/lib/providers/context';
import { getTenantDataProvider } from '@/lib/providers/tenant';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const provider = getTenantDataProvider(tenantId);

  return (
    <DataProviderContext.Provider value={provider}>
      <AgentmouShell>{children}</AgentmouShell>
    </DataProviderContext.Provider>
  );
}
