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
} from './api';
import { getTokenCookie, removeTokenCookie, setTokenCookie } from './cookies';
import {
  clearImpersonationRestoreToken,
  getImpersonationRestoreToken,
  setImpersonationRestoreToken,
} from './impersonation-storage';

interface ReplaceSessionTokenOptions {
  rememberMe?: boolean;
  preferredTenantId?: string | null;
  impersonationRestoreToken?: string | null;
  maxAgeDays?: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenantId: string | null;
  session: AuthSession | null;
  impersonationRestoreToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<string>;
  register: (email: string, password: string, name: string) => Promise<string>;
  logout: () => void;
  hydrate: () => Promise<void>;
  setActiveTenant: (tenantId: string) => void;
  replaceSessionToken: (token: string, options?: ReplaceSessionTokenOptions) => Promise<string>;
  /** After OAuth exchange — same session shape as password login. */
  applyOAuthExchange: (res: LoginResponse, rememberMe?: boolean) => string;
}

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

function clearStoredSession() {
  removeTokenCookie();
  clearImpersonationRestoreToken();
}

/**
 * Auth store powered by Zustand.
 *
 * - `login` / `register` call the API, persist the JWT in a cookie,
 *   and return the tenantId to redirect to. Login accepts optional
 *   `rememberMe` (longer cookie lifetime: 30d vs 7d).
 * - `hydrate` is called on app mount to restore state from the cookie.
 * - `logout` clears everything and removes the cookie.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  tenants: [],
  activeTenantId: null,
  session: null,
  impersonationRestoreToken: null,
  isLoading: false,
  isHydrated: false,

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const res = await loginApi(email, password);
      setTokenCookie(res.token, { maxAgeDays: rememberMe ? 30 : 7 });
      const tenants = normalizeAuthTenants(res.tenants);
      const tenantId = tenants[0]?.id ?? null;
      if (!tenantId) {
        set({ isLoading: false });
        throw new Error('No workspace found for this account. Contact support.');
      }

      clearImpersonationRestoreToken();
      set({
        token: res.token,
        user: res.user,
        tenants,
        activeTenantId: tenantId,
        session: null,
        impersonationRestoreToken: null,
        isLoading: false,
      });
      return tenantId;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await registerApi(email, password, name);
      setTokenCookie(res.token);
      clearImpersonationRestoreToken();
      const tenant = { ...res.tenant, role: 'owner' };
      set({
        token: res.token,
        user: res.user,
        tenants: [tenant],
        activeTenantId: tenant.id,
        session: null,
        impersonationRestoreToken: null,
        isLoading: false,
      });
      return tenant.id;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    clearStoredSession();
    set({
      token: null,
      user: null,
      tenants: [],
      activeTenantId: null,
      session: null,
      impersonationRestoreToken: null,
    });
  },

  hydrate: async () => {
    if (get().isHydrated) return;
    const token = getTokenCookie();
    if (!token) {
      clearImpersonationRestoreToken();
      set({
        token: null,
        user: null,
        tenants: [],
        activeTenantId: null,
        session: null,
        impersonationRestoreToken: null,
        isHydrated: true,
      });
      return;
    }

    try {
      const res = await fetchMe(token);
      const tenants = normalizeAuthTenants(res.user.tenants);
      const impersonationRestoreToken = getImpersonationRestoreToken();
      const preferredTenantId = res.session?.targetTenantId ?? get().activeTenantId;

      set({
        token,
        user: {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name ?? null,
        },
        tenants,
        activeTenantId: resolveActiveTenantId(
          tenants,
          preferredTenantId,
          res.session?.actorTenantId ?? null
        ),
        session: res.session,
        impersonationRestoreToken,
        isHydrated: true,
      });
    } catch {
      clearStoredSession();
      set({
        token: null,
        user: null,
        tenants: [],
        activeTenantId: null,
        session: null,
        impersonationRestoreToken: null,
        isHydrated: true,
      });
    }
  },

  setActiveTenant: (tenantId) => {
    set({ activeTenantId: tenantId });
  },

  replaceSessionToken: async (token, options = {}) => {
    const {
      rememberMe = false,
      preferredTenantId = null,
      impersonationRestoreToken = null,
      maxAgeDays,
    } = options;

    set({ isLoading: true });
    setTokenCookie(token, {
      maxAgeDays: maxAgeDays ?? (rememberMe ? 30 : 7),
    });

    if (impersonationRestoreToken) {
      setImpersonationRestoreToken(impersonationRestoreToken);
    } else {
      clearImpersonationRestoreToken();
    }

    try {
      const res = await fetchMe(token);
      const tenants = normalizeAuthTenants(res.user.tenants);
      const activeTenantId = resolveActiveTenantId(
        tenants,
        preferredTenantId,
        res.session?.targetTenantId ?? res.session?.actorTenantId ?? null
      );

      set({
        token,
        user: {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name ?? null,
        },
        tenants,
        activeTenantId,
        session: res.session,
        impersonationRestoreToken,
        isHydrated: true,
        isLoading: false,
      });

      return activeTenantId ?? '';
    } catch (error) {
      clearStoredSession();
      set({
        token: null,
        user: null,
        tenants: [],
        activeTenantId: null,
        session: null,
        impersonationRestoreToken: null,
        isHydrated: true,
        isLoading: false,
      });
      throw error;
    }
  },

  applyOAuthExchange: (res, rememberMe = false) => {
    const tenants = normalizeAuthTenants(res.tenants);
    const tenantId = tenants[0]?.id ?? null;
    if (!tenantId) {
      throw new Error('No workspace found for this account. Contact support.');
    }

    setTokenCookie(res.token, { maxAgeDays: rememberMe ? 30 : 7 });
    clearImpersonationRestoreToken();
    set({
      token: res.token,
      user: {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name ?? null,
      },
      tenants,
      activeTenantId: tenantId,
      session: null,
      impersonationRestoreToken: null,
      isHydrated: true,
      isLoading: false,
    });
    return tenantId;
  },
}));
