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
}

/**
 * Create a signed JWT for a user session.
 */
export async function createToken(payload: { userId: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
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
