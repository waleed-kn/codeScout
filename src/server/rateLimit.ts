import { AppError } from "@/lib/errors";
import { getConfig } from "@/server/config";

interface RateBucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __codescoutRateLimit?: Map<string, RateBucket>;
};

function getStore(): Map<string, RateBucket> {
  if (!globalForRateLimit.__codescoutRateLimit) {
    globalForRateLimit.__codescoutRateLimit = new Map<string, RateBucket>();
  }
  return globalForRateLimit.__codescoutRateLimit;
}

export function resetRateLimitStore(): void {
  globalForRateLimit.__codescoutRateLimit?.clear();
}

export function getClientIp(request: Request, trustProxy?: boolean): string {
  const shouldTrust = trustProxy ?? getConfig().TRUST_PROXY;
  if (shouldTrust) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }
  }
  return "local";
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  now?: () => number;
}

export function checkRateLimit(options: RateLimitOptions): void {
  const { key, limit, windowMs } = options;
  const now = (options.now ?? Date.now)();
  const store = getStore();

  // Opportunistic cleanup so expired buckets cannot accumulate unboundedly
  if (store.size > 1000) {
    for (const [k, bucket] of store.entries()) {
      if (bucket.resetAt <= now) {
        store.delete(k);
      }
    }
  }

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Too many requests, try again later",
      { headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  existing.count += 1;
}
