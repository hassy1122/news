import type { NewsItem } from "./types";
import { tokenize } from "./matching";

/**
 * Near-duplicate detection: independent outlets often publish the same core
 * story. We merge into one canonical item and record the others as
 * corroboration sources (a REAL verification signal displayed in the UI).
 */

const WINDOW_MS = 72 * 3600 * 1000;

function titleSet(title: string): Set<string> {
  return new Set(tokenize(title));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function isDuplicate(a: NewsItem, b: NewsItem): boolean {
  if (a.id === b.id) return false;
  const ta = a.publishedAt ? Date.parse(a.publishedAt) : Date.parse(a.fetchedAt);
  const tb = b.publishedAt ? Date.parse(b.publishedAt) : Date.parse(b.fetchedAt);
  if (Math.abs(ta - tb) > WINDOW_MS) return false;
  if (jaccard(titleSet(a.title), titleSet(b.title)) >= 0.55) return true;
  return false;
}

export function pickCanonical(a: NewsItem, b: NewsItem): NewsItem {
  const tier = (x: NewsItem) => (x.reliability === "official" ? 3 : x.reliability === "high" ? 2 : 1);
  if (tier(a) !== tier(b)) return tier(a) > tier(b) ? a : b;
  return (a.publishedAt ?? a.fetchedAt) <= (b.publishedAt ?? b.fetchedAt) ? a : b;
}

/**
 * Dedupes `newItems` against `existing` (both will be mutated for
 * corroborations). Returns [newItems to add, existing updated].
 */
export function dedupe(newItems: NewsItem[], existing: NewsItem[]): {
  accepted: NewsItem[];
  updatedExisting: NewsItem[];
  rejected: NewsItem[];
} {
  const accepted: NewsItem[] = [];
  const rejected: NewsItem[] = [];
  const updatedExisting: NewsItem[] = [];

  for (const n of newItems) {
    let dupOf: NewsItem | null = null;
    for (const e of existing) {
      if (e.status !== "active" || e.kind !== n.kind) continue;
      if (isDuplicate(n, e)) { dupOf = e; break; }
    }
    if (!dupOf) {
      for (const a of accepted) {
        if (isDuplicate(n, a)) { dupOf = a; break; }
      }
    }
    if (dupOf) {
      rejected.push(n);
      if (dupOf.id.startsWith("seed") && n.kind === "scholarship") continue;
      const name = n.sourceName;
      if (!dupOf.corroborations?.some((c) => c.url === n.url)) {
        dupOf.corroborations = [...(dupOf.corroborations ?? []), { url: n.url, sourceName: name }];
      }
      // a substantive newer update time stays honest: record latest explicit update
      if (n.updatedSubstantiveAt && (!dupOf.updatedSubstantiveAt || Date.parse(n.updatedSubstantiveAt) > Date.parse(dupOf.updatedSubstantiveAt))) {
        dupOf.updatedSubstantiveAt = n.updatedSubstantiveAt;
      }
      if (!updatedExisting.includes(dupOf) && !dupOf.id.startsWith("seed")) updatedExisting.push(dupOf);
    } else {
      accepted.push(n);
    }
  }
  return { accepted, updatedExisting, rejected };
}
