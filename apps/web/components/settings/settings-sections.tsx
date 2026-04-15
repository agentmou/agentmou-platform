'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Monitor,
  Moon,
  Shield,
  Sun,
} from 'lucide-react';

import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { resolveHonestSurfaceState } from '@/lib/honest-ui';
import type { SettingsRegistryContext } from '@/lib/settings-registry';
import { formatDate, formatNumber } from '@/lib/utils';

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return 'Sin dato';
  }

  return value.replace(/_/g, ' ');
}

function formatChannelLabel(value: string) {
  if (value === 'whatsapp') {
    return 'WhatsApp';
  }

  if (value === 'voice') {
    return 'Voz';
  }

  return formatStatusLabel(value);
}

function formatRoleLabel(value: string) {
  if (value === 'owner') {
    return 'Owner';
  }
  if (value === 'admin') {
    return 'Admin';
  }
  if (value === 'operator') {
    return 'Operator';
  }
  if (value === 'viewer') {
    return 'Viewer';
  }

  return value;
}

function describeModuleVisibility(reason: string) {
  if (reason === 'active') return 'Activo';
  if (reason === 'not_in_plan') return 'Fuera del plan';
  if (reason === 'requires_configuration') return 'Pendiente de configuración';
  if (reason === 'hidden_internal_only') return 'Solo interno';
  if (reason === 'disabled_by_tenant') return 'Desactivado';
  return formatStatusLabel(reason);
}

function toBusinessHoursRows(hours: Record<string, unknown> | undefined) {
  if (!hours) {
    return [];
  }

  return Object.entries(hours)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([day, value]) => ({
      day,
      slots: (value as Array<Record<string, unknown>>)
        .map((slot) => {
          const start = typeof slot.start === 'string' ? slot.start : null;
          const end = typeof slot.end === 'string' ? slot.end : null;
          return start && end ? `${start} - ${end}` : null;
        })
        .filter((slot): slot is string => Boolean(slot)),
    }));
}

function KeyValueGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyStateCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function GeneralSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const { theme, setTheme } = useTheme();
  const state = resolveHonestSurfaceState('settings-general', {
    providerMode: context.providerMode,
    tenantId: context.experience.tenantId,
  });
  const facilityLabel = context.experience.activeVertical === 'internal' ? 'Workspace' : 'Centro';

  return (
    <div className="space-y-6">
      <HonestSurfaceNotice state={state} />
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{facilityLabel}</CardTitle>
            <HonestSurfaceBadge state={state} />
          </div>
          <CardDescription>
            Identidad, vertical activa y defaults visibles del tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <KeyValueGrid
            rows={[
              { label: 'Nombre visible', value: context.tenant.name || 'Sin configurar' },
              { label: 'Tenant ID', value: context.tenant.id },
              { label: 'Zona horaria', value: context.tenant.settings.timezone },
              { label: 'Vertical activa', value: context.experience.activeVertical },
              { label: 'Settings version', value: String(context.tenant.settings.settingsVersion) },
              {
                label: 'Internal admin',
                value: context.tenant.settings.isPlatformAdminTenant ? 'Si' : 'No',
              },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-[1fr,0.9fr]">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nombre del workspace</Label>
              <Input id="tenant-name" value={context.tenant.name} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                La identidad del tenant ya viene desde datos reales, pero los cambios siguen siendo
                read-only desde esta superficie.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-select">Theme</Label>
              <Select value={theme ?? 'system'} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger id="theme-select" className="w-full sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Esta preferencia es local del navegador y no cambia la configuración del tenant.
              </p>
            </div>
          </div>

          <KeyValueGrid
            rows={[
              {
                label: 'Default HITL',
                value: context.tenant.settings.defaultHITL ? 'Activo' : 'Desactivado',
              },
              {
                label: 'Log retention',
                value: `${context.tenant.settings.logRetentionDays} dias`,
              },
              {
                label: 'Memory retention',
                value: `${context.tenant.settings.memoryRetentionDays} dias`,
              },
              {
                label: 'Ruta por defecto',
                value: context.experience.defaultRoute.replace(`/app/${context.tenant.id}`, ''),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function TeamSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const state = resolveHonestSurfaceState('security-team', {
    providerMode: context.providerMode,
    tenantId: context.experience.tenantId,
  });

  return (
    <div className="space-y-6">
      <HonestSurfaceNotice state={state} />
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Miembros y acceso</CardTitle>
            <HonestSurfaceBadge state={state} />
          </div>
          <CardDescription>
            La membresia es real; las acciones siguen siendo read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {context.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(member.joinedAt)}
                  {member.lastActiveAt ? ` · Last active ${formatDate(member.lastActiveAt)}` : ''}
                </p>
              </div>
              <Badge variant="secondary">{formatRoleLabel(member.role)}</Badge>
            </div>
          ))}
          {context.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay miembros cargados todavía.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function IntegrationsSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const n8nState = resolveHonestSurfaceState('n8n-connection', {
    providerMode: context.providerMode,
    tenantId: context.experience.tenantId,
  });
  const showChannels = context.experience.isSharedVertical;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Connectores</CardTitle>
          <CardDescription>Estado operativo de las integraciones del tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {context.integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="space-y-1">
                <p className="font-medium">{integration.name}</p>
                <p className="text-sm text-muted-foreground">
                  {integration.category ? `${formatStatusLabel(integration.category)} · ` : ''}
                  {formatStatusLabel(integration.status)}
                </p>
              </div>
              <Badge variant="outline">{formatStatusLabel(integration.status)}</Badge>
            </div>
          ))}
          {context.integrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay conectores registrados para este tenant.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {showChannels ? (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Canales</CardTitle>
            <CardDescription>
              Canales entrantes y salientes visibles para el centro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {context.experience.channels.map((channel) => (
              <div
                key={channel.id}
                className="rounded-2xl border border-border/60 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{formatChannelLabel(channel.channelType)}</p>
                    <p className="text-sm text-muted-foreground">
                      {channel.phoneNumber ?? 'Sin número asignado'}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatStatusLabel(channel.status)}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {channel.directionPolicy.inboundEnabled ? 'Entrada activa' : 'Entrada inactiva'}
                  {' · '}
                  {channel.directionPolicy.outboundEnabled ? 'Salida activa' : 'Salida inactiva'}
                </p>
              </div>
            ))}
            {context.experience.channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay canales expuestos para esta vertical todavía.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Workflow runtime</CardTitle>
              <HonestSurfaceBadge state={n8nState} />
            </div>
            <CardDescription>Estado del runtime interno gestionado por Agentmou.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HonestSurfaceNotice state={n8nState} />
            {context.n8nConnection ? (
              <KeyValueGrid
                rows={[
                  { label: 'Base URL', value: context.n8nConnection.baseUrl },
                  {
                    label: 'Availability',
                    value: formatStatusLabel(context.n8nConnection.availability ?? 'unknown'),
                  },
                  {
                    label: 'API key',
                    value: context.n8nConnection.apiKeySet ? 'Configured' : 'Not set',
                  },
                  {
                    label: 'Installed workflows',
                    value: formatNumber(context.n8nConnection.installedWorkflows ?? 0),
                  },
                  {
                    label: 'Executions',
                    value: formatNumber(context.n8nConnection.executionCount),
                  },
                  {
                    label: 'Last execution',
                    value: context.n8nConnection.lastExecutionAt
                      ? formatDate(context.n8nConnection.lastExecutionAt)
                      : 'No executions yet',
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Agentmou gestiona este runtime internamente y la surface sigue siendo read-only.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function PlanSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const state = resolveHonestSurfaceState('settings-billing', {
    providerMode: context.providerMode,
    tenantId: context.experience.tenantId,
  });

  return (
    <div className="space-y-6">
      <HonestSurfaceNotice state={state} />
      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Billing summary</CardTitle>
              <HonestSurfaceBadge state={state} />
            </div>
            <CardDescription>
              Plan activo, consumo visible y trazabilidad de facturas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <KeyValueGrid
              rows={[
                { label: 'Plan', value: context.tenant.plan },
                { label: 'Billing plan', value: context.billing.plan },
                {
                  label: 'Monthly spend',
                  value: `${formatNumber(context.billing.monthlySpend)} ${context.billing.currency ?? 'EUR'}`,
                },
                {
                  label: 'Runs this month',
                  value: formatNumber(context.billing.runsThisMonth),
                },
                {
                  label: 'Installed agents',
                  value: formatNumber(context.billing.agentsInstalled),
                },
                {
                  label: 'Included runs',
                  value:
                    typeof context.billing.includedRuns === 'number'
                      ? formatNumber(context.billing.includedRuns)
                      : 'No definido',
                },
              ]}
            />

            <div className="space-y-3">
              <p className="text-sm font-medium">Facturas recientes</p>
              {context.invoices.slice(0, 4).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{invoice.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.periodStart
                        ? `${formatDate(invoice.periodStart)} · ${formatStatusLabel(invoice.status)}`
                        : formatStatusLabel(invoice.status)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {`${formatNumber(invoice.amount)} ${invoice.currency ?? 'EUR'}`}
                  </Badge>
                </div>
              ))}
              {context.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay facturas visibles para este tenant todavía.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Módulos activos</CardTitle>
            <CardDescription>Visibilidad, estado y dependencias de configuración.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {context.experience.modules.map((module) => (
              <div
                key={module.id}
                className="rounded-2xl border border-border/60 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{module.displayName}</p>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                  <Badge variant={module.enabled ? 'secondary' : 'outline'}>{module.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {describeModuleVisibility(module.visibilityReason)}
                  </Badge>
                  <Badge variant="outline">
                    {module.visibleToClient ? 'Visible al cliente' : 'Solo interno'}
                  </Badge>
                  {module.requiresConfig ? (
                    <Badge variant="outline">Requiere configuración</Badge>
                  ) : null}
                </div>
              </div>
            ))}
            {context.experience.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta vertical todavía no expone módulos configurables desde la UI.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SecuritySettingsSection({ context }: { context: SettingsRegistryContext }) {
  const dangerState = resolveHonestSurfaceState('settings-danger-zone', {
    providerMode: context.providerMode,
    tenantId: context.experience.tenantId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60">
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Hallazgos</span>
            </div>
            <p className="text-3xl font-semibold">{context.securityFindings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Políticas</span>
            </div>
            <p className="text-3xl font-semibold">{context.securityPolicies.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span className="text-sm">Eventos auditados</span>
            </div>
            <p className="text-3xl font-semibold">{context.auditEvents.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Hallazgos recientes</CardTitle>
            <CardDescription>
              Visibles para diagnóstico; las acciones siguen fuera de esta surface.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {context.securityFindings.slice(0, 5).map((finding) => (
              <div
                key={finding.id}
                className="rounded-2xl border border-border/60 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{finding.title}</p>
                  <Badge variant="outline">{finding.severity}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{finding.description}</p>
              </div>
            ))}
            {context.securityFindings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay hallazgos visibles para este tenant ahora mismo.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Políticas y auditoría</CardTitle>
            <CardDescription>
              Resumen de guardrails y actividad reciente del tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {context.securityPolicies.slice(0, 4).map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <div>
                    <p className="font-medium">{policy.name}</p>
                    <p className="text-sm text-muted-foreground">{policy.description}</p>
                  </div>
                  <Badge variant={policy.enabled ? 'secondary' : 'outline'}>
                    {policy.enabled ? 'Activa' : 'Desactivada'}
                  </Badge>
                </div>
              ))}
              {context.securityPolicies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin políticas expuestas todavía.</p>
              ) : null}
            </div>

            <div className="space-y-3">
              {context.auditEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <p className="font-medium">{event.action}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.actor} · {formatStatusLabel(event.category)} ·{' '}
                    {formatDate(event.timestamp)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{event.details}</p>
                </div>
              ))}
            </div>

            {context.experience.activeVertical === 'internal' ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">Zona sensible</p>
                  <HonestSurfaceBadge state={dangerState} />
                </div>
                <HonestSurfaceNotice state={dangerState} />
                <Button disabled variant="destructive" className="mt-4">
                  Eliminar workspace
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CareProfileSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const profile = context.experience.profile;

  if (!profile) {
    return (
      <EmptyStateCard
        title="Perfil pendiente"
        description="La vertical compartida ya soporta esta sección, pero este tenant todavía no expone un perfil operativo completo."
      />
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Perfil operativo</CardTitle>
        <CardDescription>Datos base visibles para el centro y su recepción.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <KeyValueGrid
          rows={[
            { label: 'Nombre visible', value: profile.displayName },
            { label: 'Especialidad', value: profile.specialty ?? 'Sin especificar' },
            { label: 'Zona horaria', value: profile.timezone },
            {
              label: 'Canal principal',
              value: profile.defaultInboundChannel
                ? formatChannelLabel(profile.defaultInboundChannel)
                : 'Sin definir',
            },
            {
              label: 'Formulario de paciente nuevo',
              value: profile.requiresNewPatientForm ? 'Requerido' : 'Opcional',
            },
            { label: 'Vertical', value: profile.vertical },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function CareScheduleSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const profile = context.experience.profile;

  if (!profile) {
    return (
      <EmptyStateCard
        title="Agenda pendiente"
        description="Todavía no hay perfil suficiente para mostrar horarios y reglas del centro."
      />
    );
  }

  const rows = toBusinessHoursRows(profile.businessHours as Record<string, unknown>);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Horario publicado</CardTitle>
          <CardDescription>Rangos actualmente visibles en el perfil del centro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div key={row.day} className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="font-medium capitalize">{row.day}</p>
              <p className="mt-2 text-sm text-muted-foreground">{row.slots.join(' · ')}</p>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay franjas publicadas todavía.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Reglas y políticas</CardTitle>
          <CardDescription>
            Resumen operativo derivado del perfil clinic compartido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            rows={[
              {
                label: 'Confirmaciones',
                value: profile.confirmationPolicy.enabled === false ? 'Desactivadas' : 'Activas',
              },
              {
                label: 'Horas de antelación',
                value: String(profile.confirmationPolicy.leadHours ?? 24),
              },
              {
                label: 'Recuperación de huecos',
                value: profile.gapRecoveryPolicy.enabled === false ? 'Desactivado' : 'Activo',
              },
              {
                label: 'Máximo de ofertas',
                value: String(profile.gapRecoveryPolicy.maxOffersPerGap ?? 0),
              },
              {
                label: 'Reactivación',
                value: profile.reactivationPolicy.enabled === false ? 'Desactivada' : 'Activa',
              },
              {
                label: 'Tipo de campaña',
                value: profile.reactivationPolicy.defaultCampaignType ?? 'Sin definir',
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function CareServicesSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const practitionerLabel =
    context.experience.activeVertical === 'fisio' ? 'Profesionales' : 'Profesionales';

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <EmptyStateCard
        title="Servicios"
        description="La base común ya reserva esta sección para catálogo, duraciones y packaging operativo."
      />
      <EmptyStateCard
        title={practitionerLabel}
        description="La vista dedicada para agenda fina y responsables se publicará sobre el dominio compartido existente."
      />
      <EmptyStateCard
        title="Capacidad y sedes"
        description="Mientras tanto, la planificación visible sigue viniendo del perfil operativo y de la agenda."
      />
    </div>
  );
}

export function CareFormsSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const { data: templates } = useProviderQuery(
    (provider) => provider.listClinicFormTemplates(context.experience.tenantId).catch(() => []),
    [],
    [context.experience.tenantId]
  );
  const { data: submissions } = useProviderQuery(
    (provider) => provider.listClinicFormSubmissions(context.experience.tenantId).catch(() => []),
    [],
    [context.experience.tenantId]
  );
  const pending = submissions.filter((submission) => submission.status !== 'completed').length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Cobertura de formularios</CardTitle>
          <CardDescription>Plantillas disponibles y avance visible del funnel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            rows={[
              { label: 'Plantillas', value: formatNumber(templates.length) },
              { label: 'Envíos', value: formatNumber(submissions.length) },
              { label: 'Pendientes', value: formatNumber(pending) },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Actividad reciente</CardTitle>
          <CardDescription>Últimos envíos y estado de completado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {submissions.slice(0, 5).map((submission) => (
            <div
              key={submission.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{submission.patientId ?? 'Paciente pendiente'}</p>
                <Badge variant="outline">{formatStatusLabel(submission.status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{submission.templateId}</p>
            </div>
          ))}
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay envíos de formularios visibles todavía.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function CareConfirmationsSettingsSection({
  context,
}: {
  context: SettingsRegistryContext;
}) {
  const { data: confirmations } = useProviderQuery(
    (provider) => provider.listClinicConfirmations(context.experience.tenantId).catch(() => []),
    [],
    [context.experience.tenantId]
  );
  const pending = confirmations.filter((item) => item.status === 'pending').length;
  const escalated = confirmations.filter((item) => item.status === 'escalated').length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Estado de confirmaciones</CardTitle>
          <CardDescription>Cola actual y presión operativa del tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            rows={[
              { label: 'Total', value: formatNumber(confirmations.length) },
              { label: 'Pendientes', value: formatNumber(pending) },
              { label: 'Escaladas', value: formatNumber(escalated) },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Solicitudes recientes</CardTitle>
          <CardDescription>
            Ejemplos visibles sin editar reglas desde esta pantalla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {confirmations.slice(0, 5).map((confirmation) => (
            <div
              key={confirmation.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{confirmation.appointmentId}</p>
                <Badge variant="outline">{formatStatusLabel(confirmation.status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {`${formatChannelLabel(confirmation.channelType)} · ${formatDate(confirmation.requestedAt)}`}
              </p>
            </div>
          ))}
          {confirmations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay confirmaciones visibles para este tenant.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function CareGapRecoverySettingsSection({ context }: { context: SettingsRegistryContext }) {
  const { data: gaps } = useProviderQuery(
    (provider) => provider.listClinicGaps(context.experience.tenantId).catch(() => []),
    [],
    [context.experience.tenantId]
  );
  const totalOutreach = gaps.reduce((count, gap) => count + gap.outreachAttempts.length, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Recuperación de huecos</CardTitle>
          <CardDescription>Huecos abiertos y outreach acumulado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            rows={[
              { label: 'Huecos activos', value: formatNumber(gaps.length) },
              { label: 'Outreach total', value: formatNumber(totalOutreach) },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Casos recientes</CardTitle>
          <CardDescription>Cancelaciones abiertas y cobertura disponible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {gaps.slice(0, 5).map((gap) => (
            <div key={gap.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{gap.id}</p>
                <Badge variant="outline">{formatStatusLabel(gap.status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {`${formatDate(gap.startsAt)} · ${gap.outreachAttempts.length} intentos`}
              </p>
            </div>
          ))}
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay huecos activos ahora mismo.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function CareReactivationSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const { data: campaigns } = useProviderQuery(
    (provider) =>
      provider
        .listClinicReactivationCampaigns(context.experience.tenantId)
        .catch(() => ({ campaigns: [], total: 0 })),
    { campaigns: [], total: 0 },
    [context.experience.tenantId]
  );
  const running = campaigns.campaigns.filter((campaign) => campaign.status === 'running').length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Cobertura de reactivación</CardTitle>
          <CardDescription>Campañas activas y volumen total visible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            rows={[
              {
                label: 'Campañas',
                value: formatNumber(campaigns.total ?? campaigns.campaigns.length),
              },
              { label: 'En curso', value: formatNumber(running) },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Campañas recientes</CardTitle>
          <CardDescription>Estado y foco de los recorridos en curso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaigns.campaigns.slice(0, 5).map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{campaign.name}</p>
                <Badge variant="outline">{formatStatusLabel(campaign.status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{campaign.campaignType}</p>
            </div>
          ))}
          {campaigns.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay campañas de reactivación visibles todavía.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function InternalDefaultsSettingsSection({ context }: { context: SettingsRegistryContext }) {
  const notificationsState = resolveHonestSurfaceState('settings-notifications', {
    providerMode: context.providerMode,
    tenantId: context.experience.tenantId,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Workspace defaults</CardTitle>
          <CardDescription>
            Defaults operativos y guardrails visibles para el tenant interno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <KeyValueGrid
            rows={[
              {
                label: 'Default HITL',
                value: context.tenant.settings.defaultHITL ? 'Enabled' : 'Disabled',
              },
              {
                label: 'Log retention',
                value: `${context.tenant.settings.logRetentionDays} days`,
              },
              {
                label: 'Memory retention',
                value: `${context.tenant.settings.memoryRetentionDays} days`,
              },
              {
                label: 'Admin console',
                value: context.experience.canAccessAdminConsole ? 'Enabled' : 'Disabled',
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Notification preview</CardTitle>
            <HonestSurfaceBadge state={notificationsState} />
          </div>
          <CardDescription>
            Surface mantenida para no perder planning de preferencias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HonestSurfaceNotice state={notificationsState} />
          {[
            { label: 'Email notifications', description: 'Receive operational updates by email.' },
            {
              label: 'Slack notifications',
              description: 'Mirror alerts to the shared ops channel.',
            },
            { label: 'Run alerts', description: 'Get notified on failed or blocked runs.' },
            {
              label: 'Approval alerts',
              description: 'Track pending HITL backlog from this workspace.',
            },
          ].map((item, index) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="space-y-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch disabled checked={index < 3} aria-label={item.label} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function InternalApprovalsSettingsSection({
  context,
}: {
  context: SettingsRegistryContext;
}) {
  const { data: approvals } = useProviderQuery(
    (provider) => provider.listTenantApprovals(context.experience.tenantId).catch(() => []),
    [],
    [context.experience.tenantId]
  );
  const pending = approvals.filter((approval) => approval.status === 'pending');

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Approval posture</CardTitle>
          <CardDescription>Resumen de backlog y accesos relacionados con HITL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            rows={[
              { label: 'Total approvals', value: formatNumber(approvals.length) },
              { label: 'Pending', value: formatNumber(pending.length) },
            ]}
          />
          <Button asChild variant="outline">
            <Link href={`/app/${context.experience.tenantId}/approvals`}>
              Abrir approvals
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Backlog visible</CardTitle>
          <CardDescription>
            Solo resumen; la operación completa sigue en su surface dedicada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.slice(0, 5).map((approval) => (
            <div
              key={approval.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{approval.title}</p>
                <Badge variant="outline">{approval.riskLevel}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{approval.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {approval.actionType} · {formatDate(approval.requestedAt)}
              </p>
            </div>
          ))}
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay aprobaciones pendientes para este tenant ahora mismo.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
