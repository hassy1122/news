import type { NewsItem, Reliability } from "./types";
import { CONCEPT_BY_ID } from "./taxonomy";
import { evalInterest } from "./matching";

const RELIABILITY: Record<Reliability, number> = {
  official: 1,
  high: 0.85,
  medium: 0.65,
  low: 0.45,
};

/** freshness decay — half-life ≈ 36h */
export function freshness(publishedAt?: string | null, now = Date.now()): number {
  if (!publishedAt) return 0.35; // unknown publication time — treated cautiously
  const hours = (now - Date.parse(publishedAt)) / 3_600_000;
  return Math.max(0, Math.exp(-Math.max(0, hours) / 52));
}

/**
 * Importance — justified by facts only: source tier, content type weights,
 * deadline proximity for opportunities. No clickbait heuristics: we never boost
 * ALL-CAPS or "shocking" phrasing.
 */
export function importanceOf(item: NewsItem, now = Date.now()): number {
  let score = RELIABILITY[item.reliability] * 0.5;
  const top = item.categories[0];
  if (top) score += (CONCEPT_BY_ID.get(top)?.boost ?? 0.3) * 0.35;

  if (item.availability?.deadline) {
    const days = (Date.parse(item.availability.deadline) - now) / 86_400_000;
    if (days >= 0 && days <= 30) score += 0.15 * (1 - days / 30);
    if (days < 0 || days > 400) score -= 0.1;
  }
  if (item.kind === "job" || item.kind === "internship") score += item.availability?.remote ? 0.05 : 0;

  return Math.max(0, Math.min(1, score));
}

export function relevanceOf(item: NewsItem, interests: Array<{ id: string; text: string; enabled: boolean; priority?: string }>): { score: number; reasons: string[] } {
  let best = 0;
  const reasons: string[] = [];
  for (const i of interests) {
    if (!i.enabled) continue;
    const ev = evalInterest(item, i);
    if (ev.matched) {
      const priorityBonus = i.priority === "high" ? 0.15 : i.priority === "low" ? -0.1 : 0;
      const s = Math.min(1, ev.score + priorityBonus);
      if (s > best) best = s;
      if (ev.reason && reasons.length < 2) reasons.push(ev.reason);
    }
  }
  return { score: best, reasons };
}

export type SortMode = "latest" | "important" | "relevant";

export function sortItems(
  items: NewsItem[],
  mode: SortMode,
  interests: Array<{ id: string; text: string; enabled: boolean }>
): NewsItem[] {
  const arr = [...items];
  const ts = (i: NewsItem) => (i.publishedAt ? Date.parse(i.publishedAt) : Date.parse(i.fetchedAt));
  if (mode === "latest") {
    arr.sort((a, b) => ts(b) - ts(a));
  } else if (mode === "important") {
    arr.sort((a, b) => b.importance - a.importance || ts(b) - ts(a));
  } else {
    const rel = new Map<string, number>();
    for (const i of arr) {
      const r = relevanceOf(i, interests);
      rel.set(i.id, r.score * 0.6 + i.importance * 0.25 + freshness(i.publishedAt) * 0.15);
    }
    arr.sort((a, b) => (rel.get(b.id) ?? 0) - (rel.get(a.id) ?? 0));
  }
  return arr;
}
