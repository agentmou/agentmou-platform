'use client';

import * as React from 'react';

import { NotificationsPopover } from '@/components/clinic/notifications-popover';
import { formatClinicDateTime, resolveClinicTimezone } from '@/lib/clinic-formatting';
import { deriveClinicNotifications } from '@/lib/clinic-notifications';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { useTenantExperience } from '@/lib/tenant-experience';
import type { ClinicDashboard } from '@agentmou/contracts';

const EMPTY_DASHBOARD: ClinicDashboard = {
  tenantId: '',
  generatedAt: '',
  kpis: {
    openThreads: 0,
    pendingConfirmations: 0,
    pendingForms: 0,
    activeGaps: 0,
    activeCampaigns: 0,
    todaysAppointments: 0,
    patientsNew: 0,
    patientsExisting: 0,
  },
  prioritizedInbox: [],
  agenda: [],
  pendingForms: [],
  pendingConfirmations: [],
  activeGaps: [],
  activeCampaigns: [],
  patientMix: { newPatients: 0, existingPatients: 0 },
};

/**
 * Topbar variant of `NotificationsPopover` wired to the live dashboard.
 *
 * The clinic surface does not have a dedicated notifications backend
 * yet, so we synthesise the feed from the dashboard payload (escalated
 * threads, pending confirmations, pending forms, active gaps). The
 * underlying presentational popover stays unchanged so the rest of the
 * app can keep passing notifications explicitly when it has them
 * (tests, marketing previews, etc.).
 */
export function LiveNotificationsPopover() {
  const experience = useTenantExperience();
  const tenantId = experience.tenantId;
  const timezone = resolveClinicTimezone({
    profileTimezone: experience.profile?.timezone,
    tenantTimezone: experience.tenant?.settings.timezone,
  });

  const { data: dashboard } = useProviderQuery(
    (provider) =>
      tenantId ? provider.getClinicDashboard(tenantId) : Promise.resolve(EMPTY_DASHBOARD),
    EMPTY_DASHBOARD,
    [tenantId]
  );

  const notifications = React.useMemo(
    () =>
      deriveClinicNotifications(dashboard, {
        formatTimestamp: (iso) => formatClinicDateTime(iso, timezone),
      }),
    [dashboard, timezone]
  );

  return <NotificationsPopover notifications={notifications} />;
}
