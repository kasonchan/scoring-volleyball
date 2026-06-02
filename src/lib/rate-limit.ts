export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

/** Clear in-memory counters (tests). */
export function resetRateLimitStore(): void {
  store.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Fixed-window rate limit. Increments counter on each allowed call.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  if (limit <= 0) return { allowed: true };

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}
