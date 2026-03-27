const TOKEN_KEY = 'agentmou-token';
const SECONDS_PER_DAY = 60 * 60 * 24;

export type SetTokenCookieOptions = {
  /** Cookie lifetime in days. Default 7; use a longer value for "remember me". */
  maxAgeDays?: number;
};

export function setTokenCookie(token: string, options?: SetTokenCookieOptions) {
  const maxAgeDays = options?.maxAgeDays ?? 7;
  const maxAge = SECONDS_PER_DAY * maxAgeDays;
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
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
