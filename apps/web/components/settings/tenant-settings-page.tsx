'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Tenant } from '@agentmou/contracts';

import { Card, CardContent } from '@/components/ui/card';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { useDataProvider } from '@/lib/providers/context';
import {
  getVisibleSettingsSections,
  resolveActiveSettingsSection,
  type SettingsRegistryContext,
} from '@/lib/settings-registry';
import { useTenantExperience } from '@/lib/tenant-experience';
import { SettingsShell } from './settings-shell';

const tenantFallback: Tenant = {
  id: '',
  name: '',
  type: 'business',
  plan: 'starter',
  status: 'active',
  createdAt: '',
  ownerId: '',
  settings: {
    timezone: 'UTC',
    defaultHITL: false,
    logRetentionDays: 30,
    memoryRetentionDays: 7,
    activeVertical: 'internal',
    isPlatformAdminTenant: false,
    settingsVersion: 2,
    verticalClinicUi: false,
    clinicDentalMode: false,
    internalPlatformVisible: false,
  },
};

function buildSectionHref(pathname: string, currentQuery: string, section: string) {
  const params = new URLSearchParams(currentQuery);
  params.set('section', section);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function getSettingsPageCopy(
  activeVertical: SettingsRegistryContext['experience']['activeVertical']
) {
  if (activeVertical === 'internal') {
    return {
      title: 'Settings',
      description:
        'Shared workspace configuration for access, integrations, billing posture, and operational defaults.',
    };
  }

  if (activeVertical === 'fisio') {
    return {
      title: 'Configuración',
      description:
        'Base común de ajustes para el centro: acceso, integraciones, plan y extensiones asistenciales reutilizables.',
    };
  }

  return {
    title: 'Configuración',
    description:
      'Base común de ajustes para la clínica: acceso, canales, plan y reglas operativas por vertical.',
  };
}

export function TenantSettingsPage() {
  const provider = useDataProvider();
  const experience = useTenantExperience();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const tenant = experience.tenant ?? {
    ...tenantFallback,
    id: experience.tenantId,
    settings: {
      ...tenantFallback.settings,
      activeVertical: experience.activeVertical,
    },
  };

  const { data: members } = useProviderQuery(
    (activeProvider) => activeProvider.listTenantMembers(experience.tenantId).catch(() => []),
    [],
    [experience.tenantId]
  );
  const { data: integrations } = useProviderQuery(
    (activeProvider) => activeProvider.listTenantIntegrations(experience.tenantId).catch(() => []),
    [],
    [experience.tenantId]
  );
  const { data: billing } = useProviderQuery(
    (activeProvider) =>
      activeProvider.getTenantBillingInfo(experience.tenantId).catch(() => ({
        plan: tenant.plan,
        monthlySpend: 0,
        agentsInstalled: 0,
        runsThisMonth: 0,
      })),
    {
      plan: tenant.plan,
      monthlySpend: 0,
      agentsInstalled: 0,
      runsThisMonth: 0,
    },
    [experience.tenantId, tenant.plan]
  );
  const { data: invoices } = useProviderQuery(
    (activeProvider) => activeProvider.listTenantInvoices(experience.tenantId).catch(() => []),
    [],
    [experience.tenantId]
  );
  const { data: securityFindings } = useProviderQuery(
    (activeProvider) =>
      activeProvider.listTenantSecurityFindings(experience.tenantId).catch(() => []),
    [],
    [experience.tenantId]
  );
  const { data: securityPolicies } = useProviderQuery(
    (activeProvider) =>
      activeProvider.listTenantSecurityPolicies(experience.tenantId).catch(() => []),
    [],
    [experience.tenantId]
  );
  const { data: auditEvents } = useProviderQuery(
    (activeProvider) => activeProvider.listTenantAuditEvents(experience.tenantId).catch(() => []),
    [],
    [experience.tenantId]
  );
  const { data: n8nConnection } = useProviderQuery(
    (activeProvider) =>
      activeProvider.getTenantN8nConnection(experience.tenantId).catch(() => null),
    null,
    [experience.tenantId]
  );

  const registryContext = React.useMemo(
    () =>
      ({
        providerMode: provider.providerMode,
        experience,
        tenant,
        members,
        integrations,
        billing,
        invoices,
        securityFindings,
        securityPolicies,
        auditEvents,
        n8nConnection,
      }) satisfies SettingsRegistryContext,
    [
      auditEvents,
      billing,
      experience,
      integrations,
      invoices,
      members,
      n8nConnection,
      provider.providerMode,
      securityFindings,
      securityPolicies,
      tenant,
    ]
  );

  const visibleSections = React.useMemo(
    () => getVisibleSettingsSections(registryContext),
    [registryContext]
  );
  const requestedSection = searchParams.get('section');
  const activeSection = React.useMemo(
    () => resolveActiveSettingsSection(visibleSections, requestedSection),
    [requestedSection, visibleSections]
  );

  React.useEffect(() => {
    if (!activeSection) {
      return;
    }

    if (requestedSection === activeSection.key) {
      return;
    }

    router.replace(buildSectionHref(pathname, searchParamsString, activeSection.key), {
      scroll: false,
    });
  }, [activeSection, pathname, requestedSection, router, searchParamsString]);

  const pageCopy = getSettingsPageCopy(experience.activeVertical);

  if (experience.isLoading) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Card className="border-border/60">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Cargando configuración del tenant...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!experience.hasTenantAccess) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Card className="border-dashed border-border/60">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tienes acceso a este tenant o la experiencia no pudo resolverse correctamente.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SettingsShell
      title={pageCopy.title}
      description={pageCopy.description}
      activeVertical={experience.activeVertical}
      sections={visibleSections}
      activeSectionKey={activeSection?.key ?? null}
      onSelect={(key) => {
        router.replace(buildSectionHref(pathname, searchParamsString, key), { scroll: false });
      }}
    />
  );
}
