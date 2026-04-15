import { createHash, randomBytes } from 'node:crypto';

export const AUTH_SESSION_COOKIE_NAME = 'agentmou-session';
export const STANDARD_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const IMPERSONATION_SESSION_TTL_MS = 30 * 60 * 1000;

export type AuthSessionType = 'standard' | 'impersonation';

export interface AuthSessionLike {
  expiresAt: Date;
  revokedAt: Date | null;
}

export function createOpaqueSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashAuthSessionToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function resolveAuthSessionExpiry(params?: {
  now?: Date;
  rememberMe?: boolean;
  sessionType?: AuthSessionType;
}) {
  const now = params?.now ?? new Date();

  if (params?.sessionType === 'impersonation') {
    return new Date(now.getTime() + IMPERSONATION_SESSION_TTL_MS);
  }

  const ttlMs = params?.rememberMe ? REMEMBER_ME_SESSION_TTL_MS : STANDARD_SESSION_TTL_MS;
  return new Date(now.getTime() + ttlMs);
}

export function isAuthSessionActive(session: AuthSessionLike, now = new Date()) {
  return session.revokedAt === null && session.expiresAt.getTime() > now.getTime();
}
