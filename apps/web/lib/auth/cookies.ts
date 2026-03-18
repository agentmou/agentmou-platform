const TOKEN_KEY = 'agentmou-token';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setTokenCookie(token: string) {
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeTokenCookie() {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

/** Name used by Next.js proxy to read the cookie on the edge. */
export const TOKEN_COOKIE_NAME = TOKEN_KEY;
