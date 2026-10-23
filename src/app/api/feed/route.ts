import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadPrefs, savePrefs } from "@/lib/prefs-store";
import { loadAll } from "@/lib/store";
import { runFeed, type FeedParams } from "@/lib/filters";
import { sourcesInfo } from "@/lib/feed-helpers";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  section: z.string().min(1),
  country: z.string().optional(),
  sort: z.enum(["latest", "important", "relevant"]).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().min(0).max(50).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  nationality: z.string().optional(),
  destination: z.string().optional(),
  degreeLevel: z.string().optional(),
  funding: z.string().optional(),
  deadline: z.enum(["week", "month", "any"]).optional(),
  remoteOnly: z.enum(["1", "0"]).optional(),
});

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data as z.infer<typeof schema>;

  const prefs = await loadPrefs();
  const store = await loadAll();
  const fp: FeedParams = {
    section: p.section,
    country: p.country,
    sort: p.sort,
    q: p.q,
    page: p.page,
    limit: p.limit,
    nationality: p.nationality,
    destination: p.destination,
    degreeLevel: p.degreeLevel,
    funding: p.funding,
    deadline: p.deadline,
    remoteOnly: p.remoteOnly === "1",
  };
  const result = runFeed(store, prefs, fp);

  return NextResponse.json({
    items: result.items.map(cardItem),
    total: result.total,
    totalBeforeFilters: result.totalBeforeFilters,
    lastIngestAt: String(store.meta.lastIngest ?? null),
    sources: sourcesInfo(),
  });
}

/** Slim, UI-facing projection (never leaks internal scoring internals). */
function cardItem(it: import("@/lib/types").NewsItem) {
  return {
    id: it.id,
    title: it.title,
    summary: it.summary,
    whyItMatters: it.whyItMatters,
    url: it.url,
    imageUrl: it.imageUrl,
    sourceName: it.sourceName,
    reliability: it.reliability,
    verification: it.verification,
    originCountry: it.originCountry,
    regions: it.regions,
    publishedAt: it.publishedAt,
    publishedUnknown: it.publishedUnknown,
    updatedSubstantiveAt: it.updatedSubstantiveAt,
    fetchedAt: it.fetchedAt,
    kind: it.kind,
    categories: it.categories,
    sections: it.sections,
    availability: it.availability,
    flagged: it.flagged,
    corroborationCount: it.corroborations?.length ?? 0,
    importance: Math.round(it.importance * 100) / 100,
    seeded: it.seeded ?? false,
    seedNote: it.seedNote,
  };
}
