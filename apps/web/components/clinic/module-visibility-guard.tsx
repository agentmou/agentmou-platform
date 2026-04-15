import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';

import { EmptyState } from '@/components/control-plane/empty-state';
import { useTenantExperience } from '@/lib/tenant-experience';

export function ModuleVisibilityGuard({
  enabled,
  title,
  description,
  children,
}: {
  enabled: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const experience = useTenantExperience();

  if (enabled) {
    return <>{children}</>;
  }

  return (
    <EmptyState
      icon={LockKeyhole}
      title={title}
      description={description}
      actionLabel="Ir a Configuración"
      actionHref={`/app/${experience.tenantId}/configuracion?section=plan`}
    />
  );
}
