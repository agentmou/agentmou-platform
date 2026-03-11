import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

/**
 * JWT claims carried by authenticated AgentMou sessions.
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
    .sign(secret);
}

/**
 * Verify a JWT and return its typed payload when valid.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
