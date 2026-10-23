import { SOURCES } from "./sources";
import type { NewsItem } from "./types";

/** Summarizes per-source health for /api/status. */
export function sourcesInfo(store?: { logs: Array<{ time: string; job: string; ok: boolean; detail: string }> }) {
  return SOURCES.map((s) => {
    const failures = store?.logs.filter((l) => l.job === "ingest" && !l.ok && l.detail.includes(s.name)).length ?? 0;
    return {
      id: s.id,
      name: s.name,
      homepage: s.homepage,
      reliability: s.reliability,
      official: s.official ?? false,
      bestFor: s.bestFor,
      failures,
    };
  });
}

/** Guard used by the UI: an item is never shown as "fresh" without a real publication time. */
export function freshnessGuard(item: NewsItem): { fresh: boolean; label: string } {
  if (item.publishedUnknown) return { fresh: false, label: "Publication time unknown" };
  return { fresh: true, label: "" };
}
