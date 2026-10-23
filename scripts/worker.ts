/**
 * Local scheduled worker — `npm run worker`
 *
 * Runs the same pipeline as the cloud cron route, but directly (no HTTP):
 *   - fetches new eligible information every `refreshMinutes` (default 15),
 *   - expiry cleanup every run,
 *   - daily briefing at `briefingTime` in `timezone` (default 08:00 Asia/Karachi),
 *   - retries with backoff on failure.
 *
 * This keeps updating while the browser is closed — as long as this process
 * (Windows Task Scheduler / a terminal) is running. For zero-maintenance
 * hosting see README §Scheduling (Vercel cron / GitHub Actions).
 */

import { runFullRefresh, aiPolish } from "@/lib/pipeline";
import { loadPrefs } from "@/lib/prefs-store";
import { localDateInTz } from "@/lib/pipeline";

const REASON = "worker";

async function main() {
  console.log(`[worker] started ${new Date().toISOString()} — Ctrl+C to stop.`);
  let consecutiveFailures = 0;

  while (true) {
    const prefs = await loadPrefs();
    let lastBriefedDate = "";

    try {
      const result = await runFullRefresh({ reason: REASON });
      consecutiveFailures = 0;
      console.log(
        `[worker] refresh ok — new: ${result.ingest.newItems}, dupes: ${result.ingest.superseded}, ` +
        `feeds: ${result.ingest.fetchedFeeds}/${result.ingest.fetchedFeeds + result.ingest.failedFeeds.length}, ` +
        `expired: ${result.cleanup.expired}, briefing: ${result.briefingCreated ? "created" : "-"}` +
        (result.ingest.failedFeeds.length ? `, failed feeds: ${result.ingest.failedFeeds.map((f) => f.name).join(", ")}` : "")
      );
      if (result.briefingCreated) lastBriefedDate = localDateInTz(new Date(), prefs.timezone);
      lastBriefedDate = result.briefing?.localDate ?? lastBriefedDate;

      if (process.env.AI_API_KEY) await aiPolish(8);
    } catch (e) {
      consecutiveFailures++;
      const backoffMs = Math.min(30 * 60_000, 60_000 * 2 ** Math.min(4, consecutiveFailures));
      console.error(`[worker] refresh failed (${consecutiveFailures} in a row): ${e instanceof Error ? e.message : e}. Retrying in ${Math.round(backoffMs / 1000)}s. Last successful data stays in place.`);
      await sleep(backoffMs);
      continue;
    }

    // sleep until the next refresh tick (respect configured interval)
    const minutes = Math.max(5, prefs.refreshMinutes);
    // small nudge so the briefing lands close to its wall-clock minute
    await sleep(minutes * 60_000);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

void loadPrefs;
void main;
main();
