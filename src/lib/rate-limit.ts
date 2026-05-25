const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const buckets = new Map<string, { count: number; resetAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  let entry = buckets.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}