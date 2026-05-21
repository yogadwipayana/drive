// In-memory only: state resets on process restart and is not shared across instances.

const store = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length < opts.max) {
    timestamps.push(now);
    store.set(key, timestamps);
    return { allowed: true, retryAfterSec: 0 };
  }

  // Oldest timestamp still in window; once it falls out the next request will be allowed.
  const oldest = timestamps[0];
  const retryAfterSec = Math.ceil((oldest + opts.windowMs - now) / 1000);
  return { allowed: false, retryAfterSec };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
