import { describe, it, expect } from 'vitest';
import {
  createImpersonationRestoreToken,
  createImpersonationToken,
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,
} from '../index';

describe('JWT', () => {
  it('creates and verifies a valid token', async () => {
    const token = await createToken({ userId: 'user-1', email: 'test@example.com' });
    expect(token).toBeTruthy();

    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('user-1');
    expect(payload!.email).toBe('test@example.com');
  });

  it('returns null for an invalid token', async () => {
    const result = await verifyToken('invalid-token');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  it('creates and verifies impersonation tokens with actor and target claims', async () => {
    const token = await createImpersonationToken({
      email: 'target@example.com',
      impersonationSessionId: 'session-1',
      actorUserId: 'actor-1',
      actorTenantId: 'tenant-admin',
      targetUserId: 'target-1',
      targetTenantId: 'tenant-target',
    });

    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.isImpersonation).toBe(true);
    expect(payload?.userId).toBe('target-1');
    expect(payload?.actorUserId).toBe('actor-1');
    expect(payload?.targetTenantId).toBe('tenant-target');
  });

  it('creates and verifies impersonation restore tokens', async () => {
    const token = await createImpersonationRestoreToken({
      userId: 'actor-1',
      email: 'actor@example.com',
      impersonationSessionId: 'session-1',
      actorUserId: 'actor-1',
      actorTenantId: 'tenant-admin',
      targetUserId: 'target-1',
      targetTenantId: 'tenant-target',
    });

    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.isImpersonationRestore).toBe(true);
    expect(payload?.userId).toBe('actor-1');
    expect(payload?.impersonationSessionId).toBe('session-1');
  });
});

describe('Password hashing', () => {
  it('hashes and verifies a password', () => {
    const password = 'my-secret-password';
    const hash = hashPassword(password);
    expect(hash).toContain(':');
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it('rejects wrong password', () => {
    const hash = hashPassword('correct-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces different hashes for the same password', () => {
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a).not.toBe(b);
  });
});
