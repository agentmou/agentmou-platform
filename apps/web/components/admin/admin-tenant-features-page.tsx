'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AdminFeatureDecision } from '@agentmou/contracts';
import { ArrowLeft, ExternalLink, Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/auth/store';
import { useProviderQuery } from '@/lib/data/use-provider-query';

function reflagAppUrl(): string | null {
  if (typeof process === 'undefined') {
    return null;
  }
  const url = process.env.NEXT_PUBLIC_REFLAG_APP_URL;
  return url && url.length > 0 ? url : null;
}

function DecisionTable({
  decisions,
  emptyLabel,
}: {
  decisions: readonly AdminFeatureDecision[];
  emptyLabel: string;
}) {
  if (decisions.length === 0) {
    return (
      <p className="border-border-subtle text-text-muted rounded-xl border border-dashed px-4 py-6 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Flag</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fuente</TableHead>
          <TableHead>Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {decisions.map((decision) => (
          <TableRow key={`${decision.kind}:${decision.key}`}>
            <TableCell className="text-text-muted align-top font-mono text-xs">
              {decision.key}
            </TableCell>
            <TableCell className="align-top">
              {decision.enabled ? (
                <Badge tone="success">Activo</Badge>
              ) : (
                <Badge tone="warning" variant="outline">
                  Inactivo
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-text-secondary align-top text-sm">
              {decision.source}
            </TableCell>
            <TableCell className="text-text-muted align-top text-sm">
              {decision.detail ?? decision.reason ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AdminTenantFeaturesPage() {
  const params = useParams();
  const adminTenantId = useAuthStore((state) => state.activeTenantId) ?? '';
  const managedTenantId = params.managedTenantId as string;

  const {
    data: resolution,
    error,
    isLoading,
  } = useProviderQuery(
    (provider) => provider.getAdminTenantFeatureResolution(adminTenantId, managedTenantId),
    null,
    [adminTenantId, managedTenantId]
  );

  const planDecisions = React.useMemo(
    () => resolution?.decisions.filter((decision) => decision.kind === 'plan') ?? [],
    [resolution]
  );

  const rolloutDecisions = React.useMemo(
    () => resolution?.decisions.filter((decision) => decision.kind === 'rollout') ?? [],
    [resolution]
  );

  const moduleDecisions = resolution?.modules ?? [];
  const reflagUrl = reflagAppUrl();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link
            href={`/admin/tenants/${managedTenantId}`}
            aria-label="Volver al detalle del tenant"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al detalle
          </Link>
        </Button>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-text-muted text-xs uppercase tracking-[0.12em]" aria-hidden>
              Admin
            </p>
            <h1 className="text-text-primary text-3xl font-semibold tracking-tight">
              Resolución de features
            </h1>
            <p className="text-text-secondary max-w-3xl text-sm">
              Trace completo del plan baseline, los overrides de módulos y las decisiones de Reflag
              para este tenant. Diagnóstico read-only — para cambiar entitlements usa la consola de
              Reflag o el cambio de plan/módulos.
            </p>
          </div>
          {reflagUrl ? (
            <Button asChild variant="outline">
              <a
                href={reflagUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Reflag dashboard en otra pestaña"
              >
                Abrir Reflag
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card
          variant="outline"
          padding="sm"
          role="alert"
          className="border-destructive/30 bg-destructive-subtle"
        >
          <CardContent className="text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      {!error && isLoading && !resolution ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : null}

      {resolution ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card variant="raised">
              <CardHeader>
                <CardTitle className="text-base">Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="capitalize">
                  {resolution.plan}
                </Badge>
              </CardContent>
            </Card>
            <Card variant="raised">
              <CardHeader>
                <CardTitle className="text-base">Vertical activa</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge tone="info" className="capitalize">
                  {resolution.activeVertical}
                </Badge>
              </CardContent>
            </Card>
            <Card variant="raised">
              <CardHeader>
                <CardTitle className="text-base">Módulos activos</CardTitle>
              </CardHeader>
              <CardContent className="text-text-secondary text-sm">
                <span className="text-text-primary font-medium">
                  {moduleDecisions.filter((module) => module.enabled).length}
                </span>{' '}
                de {moduleDecisions.length}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="plan" className="space-y-4">
            <TabsList>
              <TabsTrigger value="plan">Plan baseline ({planDecisions.length})</TabsTrigger>
              <TabsTrigger value="modules">Módulos ({moduleDecisions.length})</TabsTrigger>
              <TabsTrigger value="rollouts">
                Rollouts Reflag ({rolloutDecisions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-3">
              <Card variant="raised">
                <CardHeader>
                  <CardTitle className="text-base">Decisiones por capability comercial</CardTitle>
                </CardHeader>
                <CardContent>
                  <DecisionTable
                    decisions={planDecisions}
                    emptyLabel="Sin decisiones de plan resueltas para este tenant."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules" className="space-y-3">
              <Card variant="raised">
                <CardHeader>
                  <CardTitle className="text-base">Módulos por tenant</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Visibilidad</TableHead>
                        <TableHead>Razón</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moduleDecisions.map((module) => (
                        <TableRow key={module.moduleKey}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <div className="text-text-primary font-medium">
                                {module.displayName}
                              </div>
                              <code className="text-text-muted block font-mono text-xs">
                                {module.moduleKey}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {module.enabled ? (
                              <Badge tone="success">{module.status}</Badge>
                            ) : (
                              <Badge tone="warning" variant="outline">
                                {module.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-text-secondary align-top text-sm">
                            {module.visibilityState}
                          </TableCell>
                          <TableCell className="text-text-muted align-top text-sm">
                            {module.visibilityReason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rollouts" className="space-y-3">
              <Card variant="raised">
                <CardHeader>
                  <CardTitle className="text-base">Rollouts y readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <DecisionTable
                    decisions={rolloutDecisions}
                    emptyLabel="No hay rollouts en curso aplicables a este tenant."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="border-border/60">
            <CardHeader className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base">Notas operativas</CardTitle>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                read-only
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Esta vista nunca toma decisiones de autorización por sí misma — solo refleja el estado
              calculado por <code>FeatureFlagService</code>. Los cambios reales suceden en el plan
              del tenant, en sus <code>tenant_modules</code>, o en la consola de Reflag.
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
