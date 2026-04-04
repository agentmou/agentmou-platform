import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';

import { EmptyState } from '@/components/control-plane/empty-state';

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
  if (enabled) {
    return <>{children}</>;
  }

  return (
    <EmptyState
      icon={LockKeyhole}
      title={title}
      description={description}
      actionLabel="Ver modulos activos"
      actionHref="#configuracion-modulos"
    />
  );
}
