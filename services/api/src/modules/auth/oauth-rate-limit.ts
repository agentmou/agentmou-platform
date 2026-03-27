type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 40;

/**
 * Simple in-memory rate limit for OAuth endpoints (per IPv4/IPv6).
 * Replace with Redis in multi-instance production if needed.
 */
export function checkOAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > MAX_REQUESTS) return false;
  return true;
}

export function clientIp(request: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return request.ip || request.socket?.remoteAddress || 'unknown';
}
