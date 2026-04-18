'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { useAuthStore } from '@/lib/auth/store';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import {
  ADMIN_TENANTS_DEFAULT_STATE,
  buildAdminTenantsHref,
  hasActiveAdminTenantsFilters,
  parseAdminTenantsSearchParams,
  toAdminTenantsRequestFilters,
  type AdminTenantsAdminFilter,
  type AdminTenantsPlanFilter,
  type AdminTenantsUrlState,
  type AdminTenantsVerticalFilter,
} from '@/lib/admin/tenants-url-state';

const EMPTY_LIST: AdminTenantListResponse = { tenants: [] };
const SEARCH_DEBOUNCE_MS = 300;

function formatPlan(plan: TenantPlan) {
  return plan.replace('_', ' ');
}

function formatVertical(vertical: VerticalKey) {
  return vertical === 'clinic' ? 'clinic' : vertical;
}

interface AdminTenantsPageProps {
  /**
   * Path used by the URL-state helper to build the canonical href when
   * filters change. Defaults to the new top-level admin route; the legacy
   * tenant-scoped route override (`/app/[tenantId]/admin/tenants`) is
   * kept available for the brief overlap period before that mount is
   * removed.
   */
  basePath?: string;
}

export function AdminTenantsPage({ basePath = '/admin/tenants' }: AdminTenantsPageProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const adminTenantId = useAuthStore((state) => state.activeTenantId) ?? '';

  const urlState = React.useMemo(
    () => parseAdminTenantsSearchParams(searchParams ?? null),
    [searchParams]
  );

  // Local mirror for the `q` input keeps typing snappy; pushes to the URL
  // are debounced so the back/forward stack does not flood with intermediate
  // states while the operator is typing.
  const [draftQuery, setDraftQuery] = React.useState(urlState.q);
  React.useEffect(() => {
    setDraftQuery(urlState.q);
  }, [urlState.q]);

  const targetPath = pathname ?? basePath;

  const replaceState = React.useCallback(
    (next: AdminTenantsUrlState) => {
      router.replace(buildAdminTenantsHref(targetPath, next), { scroll: false });
    },
    [router, targetPath]
  );

  React.useEffect(() => {
    if (draftQuery === urlState.q) {
      return;
    }
    const handle = window.setTimeout(() => {
      replaceState({ ...urlState, q: draftQuery });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [draftQuery, replaceState, urlState]);

  const requestFilters = React.useMemo(
    () => toAdminTenantsRequestFilters(urlState, { limit: 50 }),
    [urlState]
  );

  const { data, error, isLoading } = useProviderQuery(
    (provider) => provider.listAdminTenants(adminTenantId, requestFilters),
    EMPTY_LIST,
    [adminTenantId, requestFilters]
  );

  const handleFilterChange = (patch: Partial<AdminTenantsUrlState>) => {
    replaceState({ ...urlState, ...patch });
  };

  const handleClearFilters = () => {
    setDraftQuery('');
    replaceState({ ...ADMIN_TENANTS_DEFAULT_STATE });
  };

  const filtersActive = hasActiveAdminTenantsFilters(urlState);

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
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar tenant o email"
                  aria-label="Buscar tenants"
                />
              </div>
              <Select
                value={urlState.plan}
                onValueChange={(value) =>
                  handleFilterChange({ plan: value as AdminTenantsPlanFilter })
                }
              >
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
                value={urlState.vertical}
                onValueChange={(value) =>
                  handleFilterChange({ vertical: value as AdminTenantsVerticalFilter })
                }
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
                value={urlState.type}
                onValueChange={(value) =>
                  handleFilterChange({ type: value as AdminTenantsAdminFilter })
                }
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
              {filtersActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  aria-label="Limpiar filtros"
                >
                  Limpiar filtros
                </Button>
              ) : null}
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
                      <Link href={`/admin/tenants/${tenant.id}`}>
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
    </div>
  );
}
