/**
 * Typed functions for the AgentMou Auth API.
 *
 * Endpoints consumed:
 *   POST /api/v1/auth/register → { user, tenant, token }
 *   POST /api/v1/auth/login    → { user, tenants, token }
 *   GET  /api/v1/auth/me       → { user: { ...user, tenants } }
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
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
  user: AuthUser & { tenants: AuthTenant[] };
}

class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new AuthApiError(
      res.status,
      (body as { message?: string }).message || `API ${res.status}: ${res.statusText}`,
    );
  }

  return body as T;
}

export async function registerApi(
  email: string,
  password: string,
  name: string,
): Promise<RegisterResponse> {
  return authRequest<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function loginApi(
  email: string,
  password: string,
): Promise<LoginResponse> {
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
