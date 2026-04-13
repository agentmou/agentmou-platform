'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AdminTenantListResponse, TenantPlan, VerticalKey } from '@agentmou/contracts';
import { ArrowRight, Search, Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProviderQuery } from '@/lib/data/use-provider-query';

const EMPTY_LIST: AdminTenantListResponse = { tenants: [] };

function formatPlan(plan: TenantPlan) {
  return plan.replace('_', ' ');
}

function formatVertical(vertical: VerticalKey) {
  return vertical === 'clinic' ? 'clinic' : vertical;
}

export function AdminTenantsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [query, setQuery] = React.useState('');
  const [plan, setPlan] = React.useState<'all' | TenantPlan>('all');
  const [vertical, setVertical] = React.useState<'all' | VerticalKey>('all');
  const [adminFilter, setAdminFilter] = React.useState<'all' | 'admin' | 'client'>('all');

  const { data, error, isLoading } = useProviderQuery(
    (provider) =>
      provider.listAdminTenants(tenantId, {
        q: query.trim() || undefined,
        plan: plan === 'all' ? undefined : plan,
        vertical: vertical === 'all' ? undefined : vertical,
        isPlatformAdminTenant: adminFilter === 'all' ? undefined : adminFilter === 'admin',
        limit: 50,
      }),
    EMPTY_LIST,
    [tenantId, query, plan, vertical, adminFilter]
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tenants</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Gestiona tenants, cambia su vertical activa y entra al detalle para operar usuarios e
            impersonation sin salir de la shell interna.
          </p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg">Directory</CardTitle>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar tenant o email"
                  aria-label="Buscar tenants"
                />
              </div>
              <Select value={plan} onValueChange={(value) => setPlan(value as typeof plan)}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={vertical}
                onValueChange={(value) => setVertical(value as typeof vertical)}
              >
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las verticales</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="fisio">Fisio</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={adminFilter}
                onValueChange={(value) => setAdminFilter(value as typeof adminFilter)}
              >
                <SelectTrigger className="w-full md:w-[190px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tenants</SelectItem>
                  <SelectItem value="admin">Solo admin</SelectItem>
                  <SelectItem value="client">Solo cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error.message}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">{tenant.id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className="capitalize">
                      {formatPlan(tenant.plan)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="secondary" className="capitalize">
                      {formatVertical(tenant.activeVertical)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm">{tenant.userCount}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap gap-2">
                      {tenant.isPlatformAdminTenant ? (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin tenant
                        </Badge>
                      ) : (
                        <Badge variant="outline">Client tenant</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/${tenantId}/admin/tenants/${tenant.id}`}>
                        Ver detalle
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data.tenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay tenants que coincidan con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Cargando tenants...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Operativa centralizada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Busca tenants por nombre o por email de usuario, revisa su plan y entra al detalle con
            un click para operar altas, cambios de vertical e impersonation.
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Vertical activa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La columna de vertical refleja la experiencia por defecto que verá ese tenant cuando
            aterrice en la app autenticada.
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Tenant admin</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Los badges de admin te ayudan a distinguir workspaces de control interno frente a
            tenants cliente antes de ejecutar cambios delicados.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
