import { describe, expect, it } from 'vitest';
import {
  isAllowedAuthCallbackUrl,
  parseWebOriginAllowlist,
} from '../oauth-allowlist.js';

describe('parseWebOriginAllowlist', () => {
  it('parses comma-separated origins', () => {
    expect(parseWebOriginAllowlist('http://localhost:3000, https://app.test')).toEqual([
      'http://localhost:3000',
      'https://app.test',
    ]);
  });

  it('strips trailing slashes', () => {
    expect(parseWebOriginAllowlist('https://app.test/')).toEqual(['https://app.test']);
  });
});

describe('isAllowedAuthCallbackUrl', () => {
  const allow = ['http://localhost:3000', 'https://app.example.com'];

  it('accepts exact /auth/callback on allowlisted origin', () => {
    expect(
      isAllowedAuthCallbackUrl('http://localhost:3000/auth/callback', allow),
    ).toBe(true);
    expect(
      isAllowedAuthCallbackUrl(
        'http://localhost:3000/auth/callback?redirect=%2Fapp%2Fx',
        allow,
      ),
    ).toBe(true);
  });

  it('rejects wrong path', () => {
    expect(
      isAllowedAuthCallbackUrl('http://localhost:3000/login', allow),
    ).toBe(false);
  });

  it('rejects unknown origin', () => {
    expect(
      isAllowedAuthCallbackUrl('https://evil.com/auth/callback', allow),
    ).toBe(false);
  });

  it('rejects empty allowlist', () => {
    expect(isAllowedAuthCallbackUrl('http://localhost:3000/auth/callback', [])).toBe(
      false,
    );
  });
});
