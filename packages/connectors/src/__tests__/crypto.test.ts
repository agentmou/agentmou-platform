import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt } from '../crypto';

function generateKey(): string {
  return randomBytes(32).toString('hex');
}

describe('crypto', () => {
  const key = generateKey();

  describe('encrypt', () => {
    it('should return a base64 string different from the input', () => {
      const plaintext = 'my-secret-token';
      const encrypted = encrypt(plaintext, key);

      expect(encrypted).not.toBe(plaintext);
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('should produce different ciphertexts for the same input (random IV)', () => {
      const plaintext = 'same-value';
      const a = encrypt(plaintext, key);
      const b = encrypt(plaintext, key);

      expect(a).not.toBe(b);
    });

    it('should throw if key is not 32 bytes', () => {
      expect(() => encrypt('test', 'short')).toThrow('32 bytes');
      expect(() => encrypt('test', 'aa'.repeat(33))).toThrow('32 bytes');
    });
  });

  describe('decrypt', () => {
    it('should recover the original plaintext', () => {
      const plaintext = 'ya29.a0AfH6SMB...long-oauth-token';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('', key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe('');
    });

    it('should handle unicode content', () => {
      const plaintext = 'token-with-émojis-🔑-and-中文';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw with a wrong key', () => {
      const encrypted = encrypt('secret', key);
      const wrongKey = generateKey();

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should throw if data is tampered with', () => {
      const encrypted = encrypt('secret', key);
      const buf = Buffer.from(encrypted, 'base64');
      buf[buf.length - 1] ^= 0xff; // flip a byte in the auth tag
      const tampered = buf.toString('base64');

      expect(() => decrypt(tampered, key)).toThrow();
    });

    it('should throw if encrypted data is too short', () => {
      const short = Buffer.from('tooshort').toString('base64');

      expect(() => decrypt(short, key)).toThrow('too short');
    });

    it('should throw if key is not 32 bytes', () => {
      expect(() => decrypt('dGVzdA==', 'short')).toThrow('32 bytes');
    });
  });

  describe('round-trip with different keys', () => {
    it('should work independently with separate keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();

      const enc1 = encrypt('token-a', key1);
      const enc2 = encrypt('token-b', key2);

      expect(decrypt(enc1, key1)).toBe('token-a');
      expect(decrypt(enc2, key2)).toBe('token-b');

      expect(() => decrypt(enc1, key2)).toThrow();
      expect(() => decrypt(enc2, key1)).toThrow();
    });
  });
});
