import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getJwtSecret } from './config';

function getSecret() {
  return new TextEncoder().encode(getJwtSecret());
}

/**
 * JWT claims carried by authenticated Agentmou sessions.
 */
export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  isImpersonation?: boolean;
  isImpersonationRestore?: boolean;
  impersonationSessionId?: string;
  actorUserId?: string;
  actorTenantId?: string;
  targetUserId?: string;
  targetTenantId?: string;
}

async function signPayload(payload: TokenPayload, expirationTime: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(getSecret());
}

/**
 * Create a signed JWT for a user session.
 */
export async function createToken(payload: { userId: string; email: string }): Promise<string> {
  return signPayload(payload, '7d');
}

export async function createImpersonationToken(payload: {
  email: string;
  impersonationSessionId: string;
  actorUserId: string;
  actorTenantId: string;
  targetUserId: string;
  targetTenantId: string;
}): Promise<string> {
  return signPayload(
    {
      userId: payload.targetUserId,
      email: payload.email,
      isImpersonation: true,
      impersonationSessionId: payload.impersonationSessionId,
      actorUserId: payload.actorUserId,
      actorTenantId: payload.actorTenantId,
      targetUserId: payload.targetUserId,
      targetTenantId: payload.targetTenantId,
    },
    '30m'
  );
}

export async function createImpersonationRestoreToken(payload: {
  userId: string;
  email: string;
  impersonationSessionId: string;
  actorUserId: string;
  actorTenantId: string;
  targetUserId: string;
  targetTenantId: string;
}): Promise<string> {
  return signPayload(
    {
      userId: payload.userId,
      email: payload.email,
      isImpersonationRestore: true,
      impersonationSessionId: payload.impersonationSessionId,
      actorUserId: payload.actorUserId,
      actorTenantId: payload.actorTenantId,
      targetUserId: payload.targetUserId,
      targetTenantId: payload.targetTenantId,
    },
    '30m'
  );
}

/**
 * Verify a JWT and return its typed payload when valid.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
