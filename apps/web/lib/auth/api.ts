/**
 * Typed functions for the Agentmou Auth API.
 *
 * Browser auth is cookie-based:
 *   POST /api/v1/auth/register      -> sets HttpOnly session cookie
 *   POST /api/v1/auth/login         -> sets HttpOnly session cookie
 *   POST /api/v1/auth/logout        -> revokes session + clears cookie
 *   GET  /api/v1/auth/me            -> resolves current user from cookie
 *   POST /api/v1/auth/oauth/exchange -> sets HttpOnly session cookie
 */

import { getApiUrl } from '@/lib/runtime/public-origins';

const API_URL = getApiUrl().replace(/\/$/, '');

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthTenant {
  id: string;
  name: string;
  plan: string;
  role?: string;
  settings?: {
    timezone: string;
    defaultHITL: boolean;
    logRetentionDays: number;
    memoryRetentionDays: number;
    activeVertical?: 'internal' | 'clinic' | 'fisio';
    isPlatformAdminTenant?: boolean;
    settingsVersion?: number;
    verticalClinicUi?: boolean;
    clinicDentalMode?: boolean;
    internalPlatformVisible?: boolean;
  };
}

export interface AuthSession {
  isImpersonation: boolean;
  impersonationSessionId: string | null;
  actorUserId: string | null;
  actorTenantId: string | null;
  targetUserId: string | null;
  targetTenantId: string | null;
}

export interface RegisterResponse {
  user: AuthUser;
  tenant: AuthTenant;
  session: AuthSession | null;
}

export interface LoginResponse {
  user: AuthUser;
  tenants: AuthTenant[];
  session: AuthSession | null;
}

export interface MeResponse {
  user: AuthUser & { tenants: (AuthTenant & { role?: string })[] };
  session: AuthSession | null;
}

class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  const headers: HeadersInit = {
    ...options?.headers,
  };
  if (method !== 'GET' && method !== 'HEAD') {
    (headers as Record<string, string>)['Content-Type'] =
      (headers as Record<string, string>)['Content-Type'] ?? 'application/json';
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new AuthApiError(
      res.status,
      (body as { message?: string; error?: string }).message ||
        (body as { error?: string }).error ||
        `API ${res.status}: ${res.statusText}`
    );
  }

  return body as T;
}

export async function registerApi(
  email: string,
  password: string,
  name: string
): Promise<RegisterResponse> {
  return authRequest<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function loginApi(
  email: string,
  password: string,
  rememberMe = false
): Promise<LoginResponse> {
  return authRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
}

export async function fetchMe(): Promise<MeResponse> {
  return authRequest<MeResponse>('/api/v1/auth/me');
}

export async function logoutApi(): Promise<{ ok: true }> {
  return authRequest<{ ok: true }>('/api/v1/auth/logout', {
    method: 'POST',
  });
}

export interface OAuthProvidersResponse {
  google: boolean;
  microsoft: boolean;
}

export async function fetchOAuthProviders(): Promise<OAuthProvidersResponse> {
  return authRequest<OAuthProvidersResponse>('/api/v1/auth/oauth/providers', {
    method: 'GET',
  });
}

export function getOAuthAuthorizeUrl(provider: 'google' | 'microsoft', returnUrl: string): string {
  const q = new URLSearchParams({ return_url: returnUrl });
  return `${API_URL}/api/v1/auth/oauth/${provider}/authorize?${q.toString()}`;
}

export async function exchangeOAuthLoginCode(code: string): Promise<LoginResponse> {
  return authRequest<LoginResponse>('/api/v1/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function forgotPasswordApi(email: string): Promise<{ ok: true }> {
  return authRequest<{ ok: true }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordApi(token: string, password: string): Promise<{ ok: true }> {
  return authRequest<{ ok: true }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
