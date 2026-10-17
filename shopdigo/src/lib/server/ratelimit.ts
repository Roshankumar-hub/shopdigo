import 'server-only';
// Simple in-memory fixed-window limiter. Per process only: for multi-instance
// production (e.g. Vercel), back this with Upstash Redis or a Supabase table.
// Set SHOPDIGO_DISABLE_RATE_LIMIT=true ONLY for local automated tests.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (process.env.SHOPDIGO_DISABLE_RATE_LIMIT === 'true') return true;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
