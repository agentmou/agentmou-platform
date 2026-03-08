import { FleetOpsShell } from '@/components/fleetops/app-shell'

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <FleetOpsShell>{children}</FleetOpsShell>
}
