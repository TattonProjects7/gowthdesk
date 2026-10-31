// Best-effort in-memory rate limiter for the AI routes (per IP, sliding window).
// It resets when a serverless instance recycles — enough to stop casual abuse
// of a paid API key; put a shared store (e.g. Upstash) in front for more.

const hits = new Map<string, number[]>();

export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    // keep memory bounded
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return false;
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip")) || "anon";
}
