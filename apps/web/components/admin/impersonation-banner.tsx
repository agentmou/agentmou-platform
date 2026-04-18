'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/store';
import { useDataProvider } from '@/lib/providers/context';
import { useTenantExperience } from '@/lib/tenant-experience';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}

export function ImpersonationBanner() {
  const router = useRouter();
  const provider = useDataProvider();
  const experience = useTenantExperience();
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const [isStopping, setIsStopping] = React.useState(false);

  if (!session?.isImpersonation) {
    return null;
  }

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await provider.stopAdminImpersonation({});
      const actorTenantId = session.actorTenantId ?? experience.tenantId;
      const targetTenantId = session.targetTenantId ?? experience.tenantId;

      await refreshSession({
        preferredTenantId: actorTenantId,
      });

      // After stopping impersonation we land back in the canonical admin
      // console — the actor's tenant is restored from the session and the
      // managed tenant id stays in the URL so the operator keeps context.
      void actorTenantId;
      router.replace(`/admin/tenants/${targetTenantId}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] flex h-11 items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 text-sm text-amber-950 backdrop-blur lg:px-6 dark:text-amber-100">
      <div className="flex min-w-0 items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <p className="truncate">
          Impersonando a{' '}
          <span className="font-medium">{user?.name ?? user?.email ?? 'usuario'}</span> en{' '}
          <span className="font-medium">{experience.tenant?.name ?? experience.tenantId}</span>.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleStop}
        disabled={isStopping}
        className="h-8 shrink-0 border-amber-500/30 bg-background/80 text-amber-950 hover:bg-background dark:text-amber-100"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Salir de impersonation
      </Button>
    </div>
  );
}
