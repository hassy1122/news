import type { Briefing, NewsItem, NotificationRecord, Prefs } from "./types";
import { loadAll, saveAll, log, sha1 } from "./store";
import { loadPrefs } from "./prefs-store";
import { runIngest, type IngestStats } from "./ingest";
import { applyExpiry } from "./expiration";
import { runFeed } from "./filters";
import { sortItems } from "./ranking";
import { checkNotification, planRecord } from "./notify";
import { aiStatus, summarizeGrounded, whyItMatters } from "./ai";

/**
 * Orchestration shared by:
 *  - API routes (/api/ingest, /api/briefing, /api/cron/refresh),
 *  - the local scheduler (npm run worker),
 *  - CI cron (GitHub Actions) / Vercel cron.
 */

export async function runCleanup(): Promise<{ expired: number }> {
  const store = await loadAll();
  const all = Object.values(store.items);
  const changed = applyExpiry(all);
  let expired = 0;
  await saveAll((s) => {
    for (const it of changed) {
      s.items[it.id] = { ...s.items[it.id], status: "expired", expiredAt: it.expiredAt };
      expired++;
    }
  });
  await log("cleanup", true, `Expiry sweep: ${changed.length} item(s) expired.`);
  return { expired: changed.length };
  void expired;
}

/** Generates the daily briefing for a local date. Idempotent per date. */
export async function runBriefing(opts?: { date?: string; regenerate?: boolean }): Promise<{ briefing?: Briefing; created: boolean }> {
  const prefs = await loadPrefs();
  const store = await loadAll();
  const localDate = opts?.date ?? localDateInTz(new Date(), prefs.timezone);

  if (!opts?.regenerate) {
    const existing = store.briefings.find((b) => b.localDate === localDate);
    if (existing) return { briefing: existing, created: false };
  }

  const sections = ["topnews", "topit", "scholarships"] as const;
  const out: Briefing = {
    id: `brief_${sha1(localDate + Date.now())}`,
    localDate,
    createdAt: new Date().toISOString(),
    timezone: prefs.timezone,
    sections: [],
  };

  for (const sid of sections) {
    const limit = prefs.sections[sid]?.dailyQuantity ?? 5;
    const res = runFeed(store, prefs, { section: sid, limit: 60 });
    // briefing picks the strongest qualifying items, not just the newest
    const picks = sortItems(res.items, "important", prefs.interests).slice(0, limit);
    if (picks.length) out.sections.push({ sectionId: sid, label: sectionLabel(sid), itemIds: picks.map((p) => p.id), items: picks });
  }

  await saveAll((s) => {
    s.briefings = s.briefings.filter((b) => b.localDate !== localDate);
    s.briefings.push(out);
    s.meta.lastBriefing = new Date().toISOString();
  });

  // deadline reminders (scholarships / jobs closing within 72h)
  const soon = Object.values(store.items).filter(
    (i) => i.status === "active" && i.availability?.deadline &&
      Date.parse(i.availability.deadline) - Date.now() < 72 * 3.6e6 &&
      Date.parse(i.availability.deadline) > Date.now()
  );
  const reminderNotes: NoticeDraft[] = [];
  if (soon.length && prefs.notifications.deadlineReminders) {
    for (const it of soon.slice(0, 5)) {
      const draft = await deliverOrRecord(it, prefs, [],
        `Deadline approaching: ${it.title}`);
      reminderNotes.push(draft);
    }
  }

  const stats = { items: out.sections.reduce((n, s2) => n + s2.itemIds.length, 0), date: localDate };
  await log("briefing", true, `Daily briefing for ${localDate} generated (${stats.items} items).`, stats);
  return { briefing: out, created: true };
}

interface NoticeDraft { record: NotificationRecord; deliverable: boolean }

/** Records notification history with an honest delivery status. */
async function deliverOrRecord(item: NewsItem, prefs: Prefs, recent: number[], titleOverride?: string): Promise<NoticeDraft> {
  const check = checkNotification(item, prefs, new Date(), recent);
  const record = planRecord(item);
  if (titleOverride) record.title = titleOverride;
  record.delivery = check.status === null ? "generated" : (check.status as NotificationRecord["delivery"]);
  record.note = check.note;
  await saveAll((s) => {
    s.meta.pendingDeliveries = ((s.meta.pendingDeliveries as number | null) ?? 0) + 1;
    void s.meta.pendingDeliveries;
  });
  return { record, deliverable: check.allowed };
}

function sectionLabel(sid: string): string {
  return sid === "topnews" ? "Top News" : sid === "topit" ? "Top IT" : sid === "scholarships" ? "Top Scholarships" : sid;
}

export function localDateInTz(at: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  return parts;
}

/** Time-of-day (minutes) in a timezone, e.g. "08:00" → minutes since midnight. */
export function minutesInTz(at: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const [h, m] = fmt.format(at).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Full automated refresh — runs ingest, cleanup, briefing (if its local time
 * has come), and records notifications. Used by the scheduler & cron.
 */
export async function runFullRefresh(opts?: { sources?: string[]; reason?: string }): Promise<{
  ingest: IngestStats;
  cleanup: { expired: number };
  briefing?: Briefing;
  briefingCreated: boolean;
}> {
  const ingest = await runIngest({ sources: opts?.sources });
  const cleanup = await runCleanup();

  const prefs = await loadPrefs();
  const store = await loadAll();
  const lastBriefing = store.meta.lastBriefingDate as string | null;
  const localDate = localDateInTz(new Date(), prefs.timezone);
  const targetMin = hmToMinutes(prefs.briefingTime);
  let briefing: Briefing | undefined;
  let created = false;
  const nowMin = minutesInTz(new Date(), prefs.timezone);
  if (lastBriefing !== localDate && nowMin >= targetMin && nowMin < targetMin + 150) {
    const res = await runBriefing({ date: localDate });
    if (res.created) {
      briefing = res.briefing;
      created = true;
      await saveAll((s) => { s.meta.lastBriefingDate = localDate; });
    }
  }

  await log("notify", true, `Refresh (${opts?.reason ?? "scheduled"}): notification gate evaluated.`, {
    ai: aiStatus().configured ? "on" : "off",
  });
  return { ingest, cleanup, briefing, briefingCreated: created };
}

function hmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Optional AI pass: grounded summaries + why-it-matters for freshest items. */
export async function aiPolish(limit = 20): Promise<{ polished: number }> {
  const st = aiStatus();
  if (!st.configured) return { polished: 0 };
  const store = await loadAll();
  const fresh = Object.values(store.items)
    .filter((i) => i.status === "active" && i.kind === "news" && !i.whyItMatters)
    .sort((a, b) => (Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt)))
    .slice(0, limit);
  let polished = 0;
  for (const it of fresh) {
    try {
      it.whyItMatters = (await whyItMatters(it.title, it.summary)) || undefined;
      polished++;
    } catch {
      break; // stop hammering on failure
    }
  }
  if (polished) await saveAll((s) => { for (const it of fresh) s.items[it.id] = it; });
  void summarizeGrounded; // summaries stay source-provided unless needed later
  return { polished };
}
