/**
 * Feed audit: prints per-section coverage for every country selector value,
 * using the same engine as /api/feed. Run: npx tsx scripts/audit-feed.ts [section]
 */
import { loadAll } from "@/lib/store";
import { loadPrefs } from "@/lib/prefs-store";
import { runFeed } from "@/lib/filters";
import { CATEGORY_BY_ID } from "@/lib/taxonomy";
import { COUNTRIES } from "@/lib/countries";

async function main() {
  const only = process.argv[2];
  const store = await loadAll(true);
  const prefs = await loadPrefs();
  const sections = [...CATEGORY_BY_ID.keys()].filter(
    (id) => !["companies", "richest"].includes(id), // ranking pages, not feeds
  );
  const before = Object.values(store.items).filter((i) => i.status === "active").length;
  console.log(`store: ${before} active items; interests=${prefs.interests.length} exclusions=${prefs.exclusions.length}`);
  for (const s of sections) {
    if (only && s !== only) continue;
    try {
      let row = "";
      for (const c of COUNTRIES.map((x) => x.code)) {
        const r = runFeed(store, prefs, { section: s, country: c, limit: 1 });
        if (r.total > 0) row += `${c}:${r.total} `;
      }
      console.log(`${s.padEnd(14)} -> ${row || "— NO COUNTRY WORKS —"}`);
    } catch (e) {
      console.log(`${s.padEnd(14)} AUDIT ERROR: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch((e) => console.error("FATAL:", e));
