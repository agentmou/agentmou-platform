'use client';

import { create } from 'zustand';

import {
  fetchMe,
  loginApi,
  registerApi,
  type AuthSession,
  type AuthTenant,
  type AuthUser,
  type LoginResponse,
  type MeResponse,
  type RegisterResponse,
} from './api';

export type AuthSnapshot = MeResponse | null;

interface SessionRefreshOptions {
  preferredTenantId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenantId: string | null;
  session: AuthSession | null;
  isLoading: boolean;
  isHydrated: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<string>;
  register: (email: string, password: string, name: string) => Promise<string>;
  /**
   * Clears the auth store state locally. The actual session revocation and
   * cookie invalidation live in the `POST /logout` route handler so that
   * server-side Set-Cookie headers are authoritative. Callers should navigate
   * to `/logout` (via form submit) rather than invoking this directly.
   */
  clearSession: () => void;
  hydrate: (force?: boolean) => Promise<void>;
  refreshSession: (options?: SessionRefreshOptions) => Promise<string | null>;
  bootstrap: (snapshot: AuthSnapshot) => void;
  setActiveTenant: (tenantId: string) => void;
  applyOAuthExchange: (res: LoginResponse) => string;
}

type AuthPayload = LoginResponse | MeResponse | RegisterResponse;

function normalizeAuthTenants(tenants: AuthTenant[]) {
  return tenants.map((tenant) => ({
    ...tenant,
    role: tenant.role ?? 'member',
  }));
}

function resolveActiveTenantId(
  tenants: AuthTenant[],
  preferredTenantId?: string | null,
  fallbackTenantId?: string | null
) {
  if (preferredTenantId && tenants.some((tenant) => tenant.id === preferredTenantId)) {
    return preferredTenantId;
  }

  if (fallbackTenantId && tenants.some((tenant) => tenant.id === fallbackTenantId)) {
    return fallbackTenantId;
  }

  return tenants[0]?.id ?? null;
}

function clearAuthState() {
  return {
    user: null,
    tenants: [],
    activeTenantId: null,
    session: null,
  };
}

function derivePayloadState(
  payload: AuthPayload,
  options?: {
    preferredTenantId?: string | null;
    fallbackTenantId?: string | null;
  }
) {
  const tenants = normalizeAuthTenants(
    'tenant' in payload
      ? [payload.tenant]
      : 'tenants' in payload
        ? payload.tenants
        : payload.user.tenants
  );
  const preferredTenantId =
    options?.preferredTenantId ??
    ('session' in payload ? payload.session?.targetTenantId : null) ??
    options?.fallbackTenantId ??
    null;

  return {
    user: payload.user,
    tenants,
    activeTenantId: resolveActiveTenantId(
      tenants,
      preferredTenantId,
      ('session' in payload ? payload.session?.actorTenantId : null) ?? options?.fallbackTenantId
    ),
    session: 'session' in payload ? payload.session : null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...clearAuthState(),
  isLoading: false,
  isHydrated: false,

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const res = await loginApi(email, password, rememberMe);
      const nextState = derivePayloadState(res);
      const tenantId = nextState.activeTenantId;
      if (!tenantId) {
        set({ isLoading: false });
        throw new Error('No workspace found for this account. Contact support.');
      }

      set({
        ...nextState,
        isHydrated: true,
        isLoading: false,
      });
      return tenantId;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await registerApi(email, password, name);
      const nextState = derivePayloadState(res);
      if (!nextState.activeTenantId) {
        set({ isLoading: false });
        throw new Error('No workspace found for this account. Contact support.');
      }

      set({
        ...nextState,
        isHydrated: true,
        isLoading: false,
      });
      return nextState.activeTenantId;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearSession: () => {
    set({
      ...clearAuthState(),
      isHydrated: true,
      isLoading: false,
    });
  },

  hydrate: async (force = false) => {
    if (get().isHydrated && !force) {
      return;
    }

    set({ isLoading: true });
    try {
      const res = await fetchMe();
      const nextState = derivePayloadState(res, {
        fallbackTenantId: get().activeTenantId,
      });
      set({
        ...nextState,
        isHydrated: true,
        isLoading: false,
      });
    } catch {
      set({
        ...clearAuthState(),
        isHydrated: true,
        isLoading: false,
      });
    }
  },

  refreshSession: async (options) => {
    set({ isLoading: true });
    try {
      const res = await fetchMe();
      const nextState = derivePayloadState(res, {
        preferredTenantId: options?.preferredTenantId ?? null,
        fallbackTenantId: get().activeTenantId,
      });

      set({
        ...nextState,
        isHydrated: true,
        isLoading: false,
      });

      return nextState.activeTenantId;
    } catch (error) {
      set({
        ...clearAuthState(),
        isHydrated: true,
        isLoading: false,
      });
      throw error;
    }
  },

  bootstrap: (snapshot) => {
    if (!snapshot) {
      set({
        ...clearAuthState(),
        isLoading: false,
        isHydrated: true,
      });
      return;
    }

    set({
      ...derivePayloadState(snapshot, {
        fallbackTenantId: get().activeTenantId,
      }),
      isLoading: false,
      isHydrated: true,
    });
  },

  setActiveTenant: (tenantId) => {
    set({ activeTenantId: tenantId });
  },

  applyOAuthExchange: (res) => {
    const nextState = derivePayloadState(res);
    if (!nextState.activeTenantId) {
      throw new Error('No workspace found for this account. Contact support.');
    }

    set({
      ...nextState,
      isHydrated: true,
      isLoading: false,
    });
    return nextState.activeTenantId;
  },
}));

export function bootstrapAuthStore(snapshot: AuthSnapshot) {
  useAuthStore.getState().bootstrap(snapshot);
}
