'use client'

import { useParams } from 'next/navigation'
import { FleetOpsShell } from '@/components/fleetops/app-shell'
import { DataProviderContext, apiProvider, demoProvider } from '@/lib/data'

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const tenantId = params.tenantId as string
  const provider = tenantId === 'demo-workspace' ? demoProvider : apiProvider;

  return (
    <DataProviderContext.Provider value={provider}>
      <FleetOpsShell>{children}</FleetOpsShell>
    </DataProviderContext.Provider>
  )
}
