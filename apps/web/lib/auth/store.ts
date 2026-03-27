'use client';

import { create } from 'zustand';
import {
  loginApi,
  registerApi,
  fetchMe,
  type AuthUser,
  type AuthTenant,
  type LoginResponse,
} from './api';
import { setTokenCookie, getTokenCookie, removeTokenCookie } from './cookies';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenantId: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<string>;
  register: (email: string, password: string, name: string) => Promise<string>;
  logout: () => void;
  hydrate: () => Promise<void>;
  setActiveTenant: (tenantId: string) => void;
  /** After OAuth exchange — same session shape as password login. */
  applyOAuthExchange: (res: LoginResponse, rememberMe?: boolean) => string;
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
  isLoading: false,
  isHydrated: false,

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const res = await loginApi(email, password);
      setTokenCookie(res.token, { maxAgeDays: rememberMe ? 30 : 7 });
      const tenantId = res.tenants[0]?.id ?? null;
      if (!tenantId) {
        set({ isLoading: false });
        throw new Error('No workspace found for this account. Contact support.');
      }
      set({
        token: res.token,
        user: res.user,
        tenants: res.tenants,
        activeTenantId: tenantId,
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
      const tenant = { ...res.tenant, role: 'owner' };
      set({
        token: res.token,
        user: res.user,
        tenants: [tenant],
        activeTenantId: tenant.id,
        isLoading: false,
      });
      return tenant.id;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    removeTokenCookie();
    set({
      token: null,
      user: null,
      tenants: [],
      activeTenantId: null,
    });
  },

  hydrate: async () => {
    if (get().isHydrated) return;
    const token = getTokenCookie();
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    try {
      const res = await fetchMe(token);
      set({
        token,
        user: {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name ?? null,
        },
        tenants: res.user.tenants,
        activeTenantId: res.user.tenants[0]?.id ?? null,
        isHydrated: true,
      });
    } catch {
      removeTokenCookie();
      set({ isHydrated: true });
    }
  },

  setActiveTenant: (tenantId) => {
    set({ activeTenantId: tenantId });
  },

  applyOAuthExchange: (res, rememberMe = false) => {
    const tenantId = res.tenants[0]?.id ?? null;
    if (!tenantId) {
      throw new Error('No workspace found for this account. Contact support.');
    }
    setTokenCookie(res.token, { maxAgeDays: rememberMe ? 30 : 7 });
    const tenants: AuthTenant[] = res.tenants.map((t) => ({
      ...t,
      role: t.role ?? 'member',
    }));
    set({
      token: res.token,
      user: {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name ?? null,
      },
      tenants,
      activeTenantId: tenantId,
      isHydrated: true,
      isLoading: false,
    });
    return tenantId;
  },
}));
