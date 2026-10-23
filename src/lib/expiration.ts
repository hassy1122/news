import type { NewsItem } from "./types";

/**
 * Seven-day news expiration + opportunity deadlines.
 *
 * - Ordinary news: expires 7 days after ORIGINAL publication — never from the
 *   fetch time. Items with unknown publication time expire 7 days after fetch
 *   and display "publication time unknown" rather than an invented date.
 * - Scholarships/jobs: expire after deadline + 2 days grace (or annually
 *   catalogued cycles remain visible until closed/failed availability checks).
 * - Events: expire after their end date.
 * - Both query-time and cleanup enforcement live here so callers cannot forget.
 */

export const NEWS_TTL_MS = 7 * 24 * 3600 * 1000;
const DEADLINE_GRACE_MS = 2 * 24 * 3600 * 1000;

export function expiryTime(item: NewsItem): number {
  if (item.kind === "scholarship" || item.kind === "job" || item.kind === "internship") {
    const d = item.availability?.deadline;
    if (d) return Date.parse(d) + DEADLINE_GRACE_MS;
    if (item.seeded) return Infinity; // catalogued annual cycle — manually closed
    return Date.parse(item.fetchedAt) + NEWS_TTL_MS;
  }
  if (item.kind === "event") {
    const e = item.availability?.endedAt ?? item.availability?.deadline;
    if (e) return Date.parse(e) + DEADLINE_GRACE_MS;
  }
  if (item.kind === "course" || item.kind === "evergreen") return Date.parse(item.fetchedAt) + 30 * 24 * 3600 * 1000;
  const base = item.publishedAt ? Date.parse(item.publishedAt) : Date.parse(item.fetchedAt);
  return base + NEWS_TTL_MS;
}

export function isExpired(item: NewsItem, now = Date.now()): boolean {
  return expiryTime(item) < now;
}

/** Marks (and returns) items newly expired — used by the cleanup job. */
export function applyExpiry(items: NewsItem[], now = Date.now()): NewsItem[] {
  const changed: NewsItem[] = [];
  for (const it of items) {
    if (it.status === "active" && isExpired(it, now)) {
      it.status = "expired";
      it.expiredAt = new Date(now).toISOString();
      changed.push(it);
    }
  }
  return changed;
}
