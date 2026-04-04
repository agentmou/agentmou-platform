'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { getPlatformPath, useTenantExperience } from '@/lib/tenant-experience';

export function useLegacyPlatformRedirect(path: string) {
  const router = useRouter();
  const experience = useTenantExperience();
  const shouldRedirect = experience.isClinicTenant && !experience.isPlatformRoute;

  React.useEffect(() => {
    if (!shouldRedirect) {
      return;
    }

    router.replace(getPlatformPath(experience.tenantId, path));
  }, [experience.tenantId, router, shouldRedirect, path]);

  return shouldRedirect;
}
