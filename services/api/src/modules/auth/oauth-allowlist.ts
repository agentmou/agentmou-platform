/**
 * Validates post-OAuth redirect targets for the web app (open-redirect hardening).
 */
export function parseWebOriginAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isAllowedAuthCallbackUrl(urlString: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.pathname !== '/auth/callback') return false;
  const candidate = `${parsed.protocol}//${parsed.host}`;
  return allowlist.some((allowed) => {
    try {
      const base = new URL(allowed.includes('://') ? allowed : `https://${allowed}`);
      return base.origin === candidate;
    } catch {
      return false;
    }
  });
}
