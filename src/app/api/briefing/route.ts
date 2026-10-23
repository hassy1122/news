import { NextRequest, NextResponse } from "next/server";
import { runBriefing } from "@/lib/pipeline";
import { loadAll, log } from "@/lib/store";
import { loadPrefs, savePrefs } from "@/lib/prefs-store";
import type { NotificationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST: generate today's (or a given date's) briefing. GET: list history. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { date?: string; regenerate?: boolean };
    const res = await runBriefing({ date: body.date, regenerate: body.regenerate });

    if (res.created && res.briefing) {
      const prefs = await loadPrefs();
      if (prefs.notifications.enabled && prefs.notifications.briefingAlert) {
        const record: NotificationRecord = {
          id: `b_${res.briefing.id}`,
          createdAt: new Date().toISOString(),
          title: `Your daily briefing for ${res.briefing.localDate} is ready`,
          body: res.briefing.sections.map((s) => `${s.label}: ${s.items.length}`).join(" · "),
          url: "/",
          topic: "Daily briefing",
          delivery: "generated",
          note: "Recorded. Shown automatically when an app window is open; background push requires Web Push setup.",
        };
        await savePrefs((p) => {
          p.notificationHistory = [record, ...p.notificationHistory].slice(0, 120);
          return p;
        });
      }
    }
    return NextResponse.json({ ok: true, created: res.created, briefing: res.briefing ?? null });
  } catch (e) {
    await log("briefing", false, `Briefing failed: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const store = await loadAll();
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 30);
  return NextResponse.json({ briefings: store.briefings.slice(-limit).reverse() });
}
