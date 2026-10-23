import { NextRequest, NextResponse } from "next/server";
import { runFullRefresh } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/refresh — the HTTP hook for schedulers that run in the cloud:
 * Vercel Cron, GitHub Actions cron, Upstash QStash, or Windows Task Scheduler.
 * Runs the full server-side cycle with no browser involved.
 *
 * Protect with CRON_SECRET (header `x-cron-secret` or ?secret=).
 */
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
    if (provided !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await runFullRefresh({ reason: "cron" });
  return NextResponse.json({
    ok: true,
    reason: "cron",
    ingest: { newItems: result.ingest.newItems, feeds: result.ingest.fetchedFeeds, failed: result.ingest.failedFeeds.length },
    cleanup: result.cleanup,
    briefingCreated: result.briefingCreated,
  });
}
