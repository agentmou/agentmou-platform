'use client'

import { FleetOpsShell } from '@/components/fleetops/app-shell'
import { DataProviderContext, apiProvider } from '@/lib/data'

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DataProviderContext.Provider value={apiProvider}>
      <FleetOpsShell>{children}</FleetOpsShell>
    </DataProviderContext.Provider>
  )
}
