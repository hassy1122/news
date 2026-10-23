import { runFullRefresh } from "@/lib/pipeline";
import { loadAll } from "@/lib/store";

async function main() {
  const res = await runFullRefresh({ reason: "manual-one-shot" });
  console.log("ingest  :", { new: res.ingest.newItems, dupes: res.ingest.superseded, feeds: res.ingest.fetchedFeeds, failed: res.ingest.failedFeeds });
  if (res.ingest.failedFeeds.length) {
    for (const f of res.ingest.failedFeeds) console.log(`  failed: ${f.name} → ${f.error}`);
  }
  console.log("cleanup :", res.cleanup);
  console.log("briefing:", res.briefingCreated ? `created (${res.briefing?.localDate})` : "not its time yet (or already generated)");
  const store = await loadAll();
  const n = Object.values(store.items).filter((i) => i.status === "active").length;
  console.log(`store   : ${n} active items, ${store.briefings.length} briefing(s)`);
}

main();
