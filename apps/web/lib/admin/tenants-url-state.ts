import type {
  AdminTenantListFilters,
  AdminTenantListSortBy,
  AdminTenantListSortDir,
  TenantPlan,
  VerticalKey,
} from '@agentmou/contracts';

/**
 * Centralised serializer + parser for the admin tenants list URL state.
 *
 * Living URL contract: `/admin/tenants?q=...&plan=pro&vertical=clinic&type=admin&sortBy=name&sortDir=asc`.
 *
 * - Empty / "all" / default values are stripped from the output so URLs stay
 *   short and idempotent.
 * - The parser is forgiving — anything unrecognised is dropped silently and
 *   the search hook treats the absence as "no filter".
 * - Pure module — no React deps so the same logic can be unit-tested without
 *   spinning up a Next env.
 */

export type AdminTenantsAdminFilter = 'all' | 'admin' | 'client';
export type AdminTenantsPlanFilter = 'all' | TenantPlan;
export type AdminTenantsVerticalFilter = 'all' | VerticalKey;

export interface AdminTenantsUrlState {
  q: string;
  plan: AdminTenantsPlanFilter;
  vertical: AdminTenantsVerticalFilter;
  type: AdminTenantsAdminFilter;
  sortBy?: AdminTenantListSortBy;
  sortDir?: AdminTenantListSortDir;
}

const TENANT_PLAN_VALUES: readonly TenantPlan[] = ['free', 'starter', 'pro', 'scale', 'enterprise'];
const VERTICAL_VALUES: readonly VerticalKey[] = ['internal', 'clinic', 'fisio'];
const SORT_BY_VALUES: readonly AdminTenantListSortBy[] = ['name', 'plan', 'vertical', 'createdAt'];
const SORT_DIR_VALUES: readonly AdminTenantListSortDir[] = ['asc', 'desc'];

export const ADMIN_TENANTS_DEFAULT_STATE: AdminTenantsUrlState = {
  q: '',
  plan: 'all',
  vertical: 'all',
  type: 'all',
};

function isPlan(value: string): value is TenantPlan {
  return (TENANT_PLAN_VALUES as readonly string[]).includes(value);
}

function isVertical(value: string): value is VerticalKey {
  return (VERTICAL_VALUES as readonly string[]).includes(value);
}

function isSortBy(value: string): value is AdminTenantListSortBy {
  return (SORT_BY_VALUES as readonly string[]).includes(value);
}

function isSortDir(value: string): value is AdminTenantListSortDir {
  return (SORT_DIR_VALUES as readonly string[]).includes(value);
}

export function parseAdminTenantsSearchParams(
  search: URLSearchParams | null | undefined
): AdminTenantsUrlState {
  if (!search) {
    return { ...ADMIN_TENANTS_DEFAULT_STATE };
  }

  const planRaw = search.get('plan') ?? 'all';
  const verticalRaw = search.get('vertical') ?? 'all';
  const typeRaw = search.get('type') ?? 'all';
  const sortByRaw = search.get('sortBy') ?? '';
  const sortDirRaw = search.get('sortDir') ?? '';

  return {
    q: search.get('q')?.trim() ?? '',
    plan: planRaw === 'all' || isPlan(planRaw) ? (planRaw as AdminTenantsPlanFilter) : 'all',
    vertical:
      verticalRaw === 'all' || isVertical(verticalRaw)
        ? (verticalRaw as AdminTenantsVerticalFilter)
        : 'all',
    type: typeRaw === 'admin' || typeRaw === 'client' ? typeRaw : 'all',
    sortBy: isSortBy(sortByRaw) ? sortByRaw : undefined,
    sortDir: isSortDir(sortDirRaw) ? sortDirRaw : undefined,
  };
}

export function serializeAdminTenantsState(state: AdminTenantsUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedQ = state.q.trim();
  if (trimmedQ) {
    params.set('q', trimmedQ);
  }
  if (state.plan !== 'all') {
    params.set('plan', state.plan);
  }
  if (state.vertical !== 'all') {
    params.set('vertical', state.vertical);
  }
  if (state.type !== 'all') {
    params.set('type', state.type);
  }
  if (state.sortBy) {
    params.set('sortBy', state.sortBy);
  }
  if (state.sortDir) {
    params.set('sortDir', state.sortDir);
  }
  return params;
}

export function buildAdminTenantsHref(pathname: string, state: AdminTenantsUrlState): string {
  const params = serializeAdminTenantsState(state);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Convert URL state into the request payload sent to
 * `provider.listAdminTenants(...)`. The mapping is:
 *
 *   url.q          → filters.q          (trimmed, undefined when empty)
 *   url.plan       → filters.plan       (undefined when "all")
 *   url.vertical   → filters.vertical   (undefined when "all")
 *   url.type       → filters.isPlatformAdminTenant (boolean | undefined)
 *   url.sortBy     → filters.sortBy
 *   url.sortDir    → filters.sortDir
 */
export function toAdminTenantsRequestFilters(
  state: AdminTenantsUrlState,
  options: { limit?: number } = {}
): AdminTenantListFilters {
  const filters: AdminTenantListFilters = {};
  const trimmedQ = state.q.trim();
  if (trimmedQ) {
    filters.q = trimmedQ;
  }
  if (state.plan !== 'all') {
    filters.plan = state.plan;
  }
  if (state.vertical !== 'all') {
    filters.vertical = state.vertical;
  }
  if (state.type !== 'all') {
    filters.isPlatformAdminTenant = state.type === 'admin';
  }
  if (state.sortBy) {
    filters.sortBy = state.sortBy;
  }
  if (state.sortDir) {
    filters.sortDir = state.sortDir;
  }
  if (options.limit) {
    filters.limit = options.limit;
  }
  return filters;
}

/** True when at least one filter is set, used for the "Clear filters" CTA. */
export function hasActiveAdminTenantsFilters(state: AdminTenantsUrlState): boolean {
  return (
    state.q.trim().length > 0 ||
    state.plan !== 'all' ||
    state.vertical !== 'all' ||
    state.type !== 'all'
  );
}
