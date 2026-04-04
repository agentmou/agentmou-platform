'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { InternalModeSwitch } from '@/components/clinic/internal-mode-switch';
import { useTenantExperience } from '@/lib/tenant-experience';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const experience = useTenantExperience();
  const router = useRouter();

  React.useEffect(() => {
    if (experience.isClinicTenant && !experience.canAccessInternalPlatform) {
      router.replace(`/app/${experience.tenantId}/dashboard`);
    }
  }, [experience.canAccessInternalPlatform, experience.isClinicTenant, experience.tenantId, router]);

  if (experience.isClinicTenant && !experience.canAccessInternalPlatform) {
    return null;
  }

  return (
    <>
      {experience.isClinicTenant ? (
        <div className="border-b border-border/60 bg-muted/30 px-6 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Modo interno Agentmou</p>
              <p className="text-sm text-muted-foreground">
                Esta capa mantiene marketplace, runs y administracion avanzada fuera de la experiencia cliente.
              </p>
            </div>
            <InternalModeSwitch
              href={`/app/${experience.tenantId}/dashboard`}
              label="Volver al centro de recepcion"
            />
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
