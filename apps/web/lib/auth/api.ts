/**
 * Typed functions for the Agentmou Auth API.
 *
 * Endpoints consumed:
 *   POST /api/v1/auth/register → { user, tenant, token }
 *   POST /api/v1/auth/login    → { user, tenants, token }
 *   GET  /api/v1/auth/me       → { user: { ...user, tenants } }
 *   GET  /api/v1/auth/oauth/providers
 *   POST /api/v1/auth/oauth/exchange → { user, tenants, token }
 *   POST /api/v1/auth/forgot-password → { ok: true }
 *   POST /api/v1/auth/reset-password → { ok: true }
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
}

export interface RegisterResponse {
  user: AuthUser;
  tenant: AuthTenant;
  token: string;
}

export interface LoginResponse {
  user: AuthUser;
  tenants: AuthTenant[];
  token: string;
}

export interface MeResponse {
  user: AuthUser & { tenants: (AuthTenant & { role?: string })[] };
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
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new AuthApiError(
      res.status,
      (body as { message?: string }).message || `API ${res.status}: ${res.statusText}`
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

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return authRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(token: string): Promise<MeResponse> {
  return authRequest<MeResponse>('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
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

/**
 * Build authorize URL for top-level navigation.
 * `returnUrl` must be an absolute URL on an allowlisted origin (e.g. `https://app.example.com/auth/callback?redirect=...`).
 */
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
