import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadPrefs, savePrefs, resetInterests } from "@/lib/prefs-store";
import { defaultPrefs } from "@/lib/prefs-defaults";
import { rateLimit } from "@/lib/rate-limit";
import { loadAll, saveAll, wipe } from "@/lib/store";
import { runFeed } from "@/lib/filters";
import { expandInterest } from "@/lib/matching";
import { parseCustomTopic } from "@/lib/ai";

export const dynamic = "force-dynamic";

const prefsPatch = z.object({
  language: z.enum(["en", "ur"]).optional(),
  timezone: z.string().optional(),
  briefingTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  refreshMinutes: z.number().int().min(10).max(240).optional(),
  sections: z.record(z.string(), z.object({
    country: z.string().optional(),
    dailyQuantity: z.number().int().min(1).max(30).optional(),
    sort: z.enum(["latest", "important", "relevant"]).optional(),
  })).optional(),
  appearance: z.any().optional(),
}).passthrough();

// ── GET: read prefs (client mirror excludes nothing; local personal app) ──
export async function GET() {
  const prefs = await loadPrefs();
  return NextResponse.json(prefs);
}

// ── PUT: general settings updates ──
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = prefsPatch.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const next = await savePrefs((p) => {
    if (data.language) p.language = data.language;
    if (data.timezone) p.timezone = data.timezone;
    if (data.briefingTime) p.briefingTime = data.briefingTime;
    if (data.refreshMinutes) p.refreshMinutes = data.refreshMinutes;
    if (data.sections) {
      for (const [sid, sp] of Object.entries(data.sections)) {
        p.sections[sid] = { ...(p.sections[sid] ?? { country: "PK", dailyQuantity: 5, sort: "latest" }), ...sp };
      }
    }
    if (data.appearance) (p as any).appearance = { ...((p as any).appearance ?? {}), ...data.appearance };
    return p;
  });
  return NextResponse.json(next);
}

// ── POST: named actions (all verified server-side) ──
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reset-interests") }),
  z.object({ type: z.literal("add-interest"), text: z.string().min(2).max(140), country: z.string().optional(), priority: z.enum(["low", "normal", "high"]).optional(), notify: z.enum(["off", "immediate", "digest", "briefing"]).optional() }),
  z.object({ type: z.literal("update-interest"), id: z.string(), patch: z.record(z.string(), z.any()) }),
  z.object({ type: z.literal("remove-interest"), id: z.string() }),
  z.object({ type: z.literal("add-exclusion"), text: z.string().min(2).max(140), scope: z.union([z.literal("all"), z.array(z.string())]).optional(), exception: z.string().optional() }),
  z.object({ type: z.literal("remove-exclusion"), id: z.string() }),
  z.object({ type: z.literal("toggle-item"), itemId: z.string(), snapshot: z.any().optional() }),
  z.object({ type: z.literal("remove-saved"), id: z.string() }),
  z.object({ type: z.literal("saved-status"), id: z.string(), status: z.enum(["not-started", "applying", "submitted", "result"]) }),
  z.object({ type: z.literal("add-custom-topic"), name: z.string().min(2).max(80), description: z.string().max(600), prefs: z.any() }),
  z.object({ type: z.literal("remove-custom-topic"), id: z.string() }),
  z.object({ type: z.literal("notif-settings"), patch: z.record(z.string(), z.any()) }),
  z.object({ type: z.literal("notif-delivered"), ids: z.array(z.string()), status: z.string() }),
  z.object({ type: z.literal("notif-clear") }),
  z.object({ type: z.literal("feedback"), rating: z.enum(["accurate", "inaccurate", "not-relevant", "other"]), comment: z.string().max(1000), itemId: z.string().optional() }),
  z.object({ type: z.literal("wipe-all"), confirm: z.literal("DELETE") }),
  z.object({ type: z.literal("preview-match"), text: z.string().min(3).max(600) }),
]);

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const a = parsed.data;

  switch (a.type) {
    case "reset-interests": {
      const p = await resetInterests();
      return NextResponse.json({ ok: true, message: "Interest preferences cleared. Other settings were left untouched.", prefs: p });
    }
    case "add-interest": {
      const id = `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const next = await savePrefs((p) => {
        p.interests = [...p.interests, {
          id, text: a.text, enabled: true, country: a.country, priority: a.priority ?? "normal",
          notify: { mode: a.notify ?? (p.notifications.perInterestDefault ? "briefing" : "off") },
          createdAt: new Date().toISOString(),
        }];
        return p;
      });
      const exp = expandInterest(a.text);
      return NextResponse.json({ ok: true, includes: exp.conceptIds, prefs: next });
    }
    case "update-interest": {
      const next = await savePrefs((p) => {
        p.interests = p.interests.map((i) => (i.id === a.id ? { ...i, ...(a.patch as object) } : i));
        return p;
      });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "remove-interest": {
      const next = await savePrefs((p) => { p.interests = p.interests.filter((i) => i.id !== a.id); return p; });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "add-exclusion": {
      const id = `x_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const next = await savePrefs((p) => {
        p.exclusions = [...p.exclusions, { id, text: a.text, enabled: true, type: "semantic" as const, scope: a.scope ?? "all", exception: a.exception, createdAt: new Date().toISOString() }];
        return p;
      });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "remove-exclusion": {
      const next = await savePrefs((p) => { p.exclusions = p.exclusions.filter((i) => i.id !== a.id); return p; });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "toggle-item": {
      const next = await savePrefs((p) => {
        if (p.saved.some((s) => s.itemId === a.itemId)) p.saved = p.saved.filter((s) => s.itemId !== a.itemId);
        else p.saved = [{ id: `s_${Date.now().toString(36)}`, itemId: a.itemId, savedAt: new Date().toISOString(), snapshot: a.snapshot ?? null }, ...p.saved];
        return p;
      });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "remove-saved": {
      const next = await savePrefs((p) => { p.saved = p.saved.filter((s) => s.id !== a.id); return p; });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "saved-status": {
      const next = await savePrefs((p) => { p.saved = p.saved.map((s) => (s.id === a.id ? { ...s, applicationStatus: a.status } : s)); return p; });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "add-custom-topic": {
      const id = `ct_${Date.now().toString(36)}`;
      const next = await savePrefs((p) => {
        p.customTopics = [...p.customTopics, { id, name: a.name, description: a.description, prefs: a.prefs, createdAt: new Date().toISOString(), parsedBy: a.prefs?.parsedBy ?? "heuristic" }];
        if (!(id in {})) p.sections[id] = { country: a.prefs?.country && a.prefs.country !== "WW" ? a.prefs.country : "WW", dailyQuantity: a.prefs?.quantityPerDay ?? 5, sort: "latest" } as any;
        return p;
      });
      return NextResponse.json({ ok: true, id, prefs: next });
    }
    case "remove-custom-topic": {
      const next = await savePrefs((p) => { p.customTopics = p.customTopics.filter((t) => t.id !== a.id); delete p.sections[a.id]; return p; });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "notif-settings": {
      const next = await savePrefs((p) => {
        p.notifications = { ...p.notifications, ...(a.patch as object) };
        return p;
      });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "notif-delivered": {
      const next = await savePrefs((p) => {
        p.notificationHistory = p.notificationHistory.map((n) => (a.ids.includes(n.id) ? { ...n, delivery: a.status as any } : n));
        return p;
      });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "notif-clear": {
      const next = await savePrefs((p) => { p.notificationHistory = []; return p; });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "feedback": {
      const next = await savePrefs((p) => {
        p.feedback = [{ id: `f_${Date.now().toString(36)}`, createdAt: new Date().toISOString(), rating: a.rating, comment: a.comment, itemId: a.itemId }, ...p.feedback];
        return p;
      });
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "wipe-all": {
      await wipe();
      const fresh = defaultPrefs();
      const next = await savePrefs(() => fresh);
      return NextResponse.json({ ok: true, prefs: next });
    }
    case "preview-match": {
      // Preference tester — explains how matching will behave for a sample text
      const prefs = await loadPrefs();
      const store = await loadAll();
      const sample = { title: a.text, summary: a.text, categories: [] as string[] };
      const { applyPreferences } = await import("@/lib/matching");
      const res = applyPreferences(sample, prefs.interests, prefs.exclusions);
      const matchedItems = runFeed(store, prefs, { section: "topit", limit: 5 });
      const matchedByInterest = matchedItems.items.filter((i) =>
        prefs.interests.some((ii) => { const e = expandInterest(ii.text); return e.conceptIds.some((c) => i.categories.includes(c)); })
      ).slice(0, 3).map((i) => ({ id: i.id, title: i.title, url: i.url, source: i.sourceName }));
      return NextResponse.json({
        visible: res.visible,
        reason: res.flagNote ?? (res.interestScores.find((s) => s.matched)?.reason ?? "No interest or exclusion preference matches this text yet."),
        interestConcepts: prefs.interests.flatMap((i) => expandInterest(i.text).conceptIds).filter((c, idx, arr) => arr.indexOf(c) === idx),
        sampleMatches: matchedByInterest,
      });
    }
  }
  return NextResponse.json({ error: "unreachable" }, { status: 500 });
}

// custom topic AI parse (separate route-level endpoint for clarity)
export async function PATCH(req: NextRequest) {
  const { description } = (await req.json().catch(() => null)) ?? {};
  if (!description || typeof description !== "string") return NextResponse.json({ error: "description required" }, { status: 400 });
  try {
    const parsedPrefs = await parseCustomTopic(description);
    if (!parsedPrefs) {
      return NextResponse.json({
        parsed: null,
        guidance: "Parsing needs the AI key (AI_API_KEY in .env.example). You can still create this topic with the manual builder below — same capabilities.",
      });
    }
    return NextResponse.json({ parsed: parsedPrefs });
  } catch (e) {
    return NextResponse.json({ parsed: null, guidance: e instanceof Error && e.message.includes("AI_API_KEY") ? "AI not configured — use the manual builder." : "Parsing failed — use the manual builder." });
  }
}
