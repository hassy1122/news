import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";
import { runCleanup } from "@/lib/pipeline";
import { loadAll, saveAll, log } from "@/lib/store";
import { sourcesInfo } from "@/lib/feed-helpers";
import { aiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/ingest — manual refresh (ingest + expiry cleanup). */
export async function POST() {
  try {
    const ingest = await runIngest();
    await saveAll((s) => { s.meta.lastIngest = new Date().toISOString(); });
    const cleanup = await runCleanup();
    const store = await loadAll();
    return NextResponse.json({
      ok: true,
      ingest: {
        fetchedFeeds: ingest.fetchedFeeds,
        newItems: ingest.newItems,
        superseded: ingest.superseded,
        failedFeeds: ingest.failedFeeds,
      },
      cleanup,
      lastIngestAt: store.meta.lastIngest ?? null,
      sources: sourcesInfo(store),
      aiConfigured: aiStatus().configured,
    });
  } catch (e) {
    await log("ingest", false, `Ingest failed: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/** GET /api/ingest — status snapshot for the refresh bar. */
export async function GET() {
  const store = await loadAll();
  return NextResponse.json({
    lastIngestAt: store.meta.lastIngest ?? null,
    lastBriefing: store.meta.lastBriefing ?? null,
    counts: countSections(store.items),
    sources: sourcesInfo(store),
    aiConfigured: aiStatus().configured,
    logTail: store.logs.slice(-10),
  });
}

function countSections(items: Record<string, import("@/lib/types").NewsItem>) {
  const c = { all: 0, topnews: 0, topit: 0, scholarships: 0, active: 0 };
  for (const i of Object.values(items)) {
    c.all++;
    if (i.status === "active" && (i.kind === "news" || i.kind === "scholarship" || i.kind === "job" || i.kind === "internship")) c.active++;
    for (const s of ["topnews", "topit", "scholarships"] as const) {
      if ((i as import("@/lib/types").NewsItem).sections.includes(s) && i.status === "active") c[s]++;
    }
  }
  return c;
}
