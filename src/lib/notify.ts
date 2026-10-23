import type { NewsItem, NotificationRecord, Prefs } from "./types";
import { CONCEPT_BY_ID } from "./taxonomy";
import { evalInterest, applyPreferences } from "./matching";
import { isExpired } from "./expiration";

/**
 * Notification planning — the server-side gate. Client displays what is
 * actually deliverable right now (Notification API / Web Push) and reports
 * accurate delivery status back. Delivery statuses are always recorded from
 * reality, never assumed.
 */

function withinQuietHours(prefs: Prefs, at = new Date()): boolean {
  const { quietStart, quietEnd } = prefs.notifications;
  const nowMin = at.getHours() * 60 + at.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const start = toMin(quietStart), end = toMin(quietEnd);
  if (start <= end) return nowMin >= start && nowMin < end;
  return nowMin >= start || nowMin < end; // overnight window
}

export interface NotifyCheck {
  allowed: boolean;
  status: NotificationRecord["delivery"] | null;
  note?: string;
}

/** Mirrors spec §6.D — the seven checks, in order. */
export function checkNotification(item: NewsItem, prefs: Prefs, at = new Date(), recentTimes: number[] = []): NotifyCheck {
  const st = item.verification.status;
  if (!prefs.notifications.enabled) return { allowed: false, status: "generated", note: "Master notifications are off — item recorded, nothing delivered." };
  if (isExpired(item)) return { allowed: false, status: "suppressed-expired", note: "Item no longer current." };
  if (st === "flagged") return { allowed: false, status: "suppressed-excluded", note: "Flagged/suspicious content." };

  // excluded topics never notify
  const ex = applyPreferences(item, [], prefs.exclusions);
  if (!ex.visible) return { allowed: false, status: "suppressed-excluded", note: "Matches a Not-Interested exclusion." };

  // topic / category mode
  const selected = prefs.interests.filter((i) => i.enabled && i.notify.mode !== "off");
  const isImportantNews = item.kind === "news" && item.importance >= 0.82 && prefs.notifications.importantNews;
  const isIt = item.sections.includes("topit") && prefs.notifications.itOpportunities;
  const isSch = item.sections.includes("scholarships") && prefs.notifications.scholarshipAlerts;
  const topicMatch = selected.some((i) => {
    const ev = evalInterest(item, i);
    const threshold = i.notify.threshold ?? 0.3;
    return ev.matched && ev.score >= threshold;
  });
  const customMatch = prefs.customTopics.some(
    (t) => t.prefs.notify.mode !== "off" && t.prefs.keywords.some((k) => normL(item.title).includes(k.toLowerCase()))
  );

  const allowedByMode =
    prefs.notifications.topicMode === "all"
      ? isImportantNews || isIt || isSch || topicMatch || customMatch
      : topicMatch || customMatch;
  if (!allowedByMode) return { allowed: false, status: "generated", note: "Outside your notification topic selection." };

  // frequency caps
  const hour = recentTimes.filter((t) => at.getTime() - t < 3_600_000).length;
  const day = recentTimes.filter((t) => at.getTime() - t < 86_400_000).length;
  if (hour >= prefs.notifications.maxPerHour) return { allowed: false, status: "generated", note: `Hourly cap (${prefs.notifications.maxPerHour}) reached — queued for later digest.` };
  if (day >= prefs.notifications.maxPerDay) return { allowed: false, status: "generated", note: `Daily cap (${prefs.notifications.maxPerDay}) reached.` };

  // quiet hours — applied last; during quiet hours nothing is delivered live
  if (withinQuietHours(prefs, at)) return { allowed: false, status: "suppressed-quiet", note: `Quiet hours ${prefs.notifications.quietStart}–${prefs.notifications.quietEnd} (${prefs.timezone}).` };

  return { allowed: true, status: null };
}

function normL(s: string): string {
  return s.toLowerCase();
}

export function planRecord(item: NewsItem, note?: string): NotificationRecord {
  return {
    id: `n_${item.id}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: item.title,
    body: item.summary.slice(0, 160),
    url: item.url,
    topic: item.categories[0] ? CONCEPT_BY_ID.get(item.categories[0])?.label ?? item.categories[0] : item.kind,
    sourceName: item.sourceName,
    delivery: "generated",
    note,
  };
}
