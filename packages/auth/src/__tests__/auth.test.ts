import { describe, it, expect } from 'vitest';
import { createToken, verifyToken, hashPassword, verifyPassword } from '../index';

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
