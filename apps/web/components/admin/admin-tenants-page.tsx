'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AdminTenantListResponse, TenantPlan, VerticalKey } from '@agentmou/contracts';
import { ArrowRight, Crown, Inbox, PauseCircle, Search, Snowflake, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
const SKELETON_ROWS = 4;

function formatPlan(plan: TenantPlan) {
  return plan.replace('_', ' ');
}

function formatVertical(vertical: VerticalKey) {
  return vertical === 'clinic' ? 'clinic' : vertical;
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-8" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-8 w-24" />
      </TableCell>
    </TableRow>
  );
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
  const showSkeleton = isLoading && data.tenants.length === 0;
  const showEmpty = !isLoading && !error && data.tenants.length === 0;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <p className="text-text-muted text-xs uppercase tracking-[0.12em]" aria-hidden>
          Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Tenants</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Gestiona tenants, cambia su vertical activa y entra al detalle para operar usuarios e
          impersonation sin salir de la consola interna.
        </p>
      </header>

      <Card variant="subtle" padding="sm">
        <CardContent className="flex flex-col gap-3 px-4 md:flex-row md:items-center md:gap-3">
          <div className="relative min-w-0 flex-1 md:max-w-xs">
            <Search
              className="text-text-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden
            />
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
            onValueChange={(value) => handleFilterChange({ plan: value as AdminTenantsPlanFilter })}
          >
            <SelectTrigger className="w-full md:w-[150px]" aria-label="Filtrar por plan">
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
            <SelectTrigger className="w-full md:w-[150px]" aria-label="Filtrar por vertical">
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
            <SelectTrigger className="w-full md:w-[170px]" aria-label="Filtrar por tipo de tenant">
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
              className="md:ml-auto"
            >
              <X className="h-4 w-4" aria-hidden />
              Limpiar filtros
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Card
          variant="outline"
          padding="sm"
          role="alert"
          className="border-destructive/30 bg-destructive-subtle"
        >
          <CardContent className="px-4 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      <Card variant="raised" padding="none" className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              // Skeleton row keys are stable across renders because the
              // placeholder count is fixed; index-as-key is fine here.
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <SkeletonRow key={`skeleton-${index}`} />
              ))
            ) : showEmpty ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center text-text-muted">
                    <Inbox className="text-text-muted h-8 w-8" aria-hidden />
                    <p className="text-sm">No hay tenants que coincidan con los filtros.</p>
                    {filtersActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        aria-label="Limpiar filtros y mostrar todos los tenants"
                      >
                        Limpiar filtros
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.tenants.map((tenant) => (
                <TableRow key={tenant.id} className="hover:bg-card-hover">
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="text-text-primary font-medium">{tenant.name}</div>
                      <code className="text-text-muted block font-mono text-xs">{tenant.id}</code>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className="capitalize">
                      {formatPlan(tenant.plan)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge tone="info" className="capitalize">
                      {formatVertical(tenant.activeVertical)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    {tenant.status === 'frozen' ? (
                      <Badge tone="warning" className="gap-1">
                        <Snowflake className="h-3 w-3" aria-hidden />
                        Frozen
                      </Badge>
                    ) : (
                      <Badge tone="success" className="gap-1">
                        <PauseCircle className="h-3 w-3" aria-hidden />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-text-secondary align-top text-sm">
                    {tenant.userCount}
                  </TableCell>
                  <TableCell className="align-top">
                    {tenant.isPlatformAdminTenant ? (
                      <Badge tone="warning" className="gap-1">
                        <Crown className="h-3 w-3" aria-hidden />
                        Admin tenant
                      </Badge>
                    ) : (
                      <Badge variant="outline">Client tenant</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        aria-label={`Ver detalle de ${tenant.name}`}
                      >
                        Ver detalle
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
