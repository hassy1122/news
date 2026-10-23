import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal in-memory fixed-window rate limiter (per IP + bucket).
 * Single-node deployments only; for serverless, use an Upstash limiter.
 */
const hits = new Map<string, { count: number; reset: number }>();

export const BUCKETS = { read: 240, write: 60 } as const;

export function rateLimit(req: NextRequest, bucket: keyof typeof BUCKETS = "read"): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return null;
  }
  h.count++;
  if (h.count > BUCKETS[bucket]) {
    return NextResponse.json(
      { error: "Rate limit exceeded — slow down a little." },
      { status: 429, headers: { "retry-after": String(Math.ceil((h.reset - now) / 1000)) } }
    );
  }
  if (hits.size > 5_000) hits.clear();
  return null;
}
