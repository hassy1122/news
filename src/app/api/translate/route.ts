import { NextRequest, NextResponse } from "next/server";
import { loadAll, saveAll, log } from "@/lib/store";
import { aiStatus, translateToLanguage } from "@/lib/ai";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_KEY = (lang: string) => `ai_${lang}` as keyof NewsItem & string;

/**
 * POST /api/translate { id, lang }
 * Requires AI key. Result cached on the item under ai[lang]. On absence of a
 * key the response is an explicit 501 with setup guidance — no fake output.
 */
export async function POST(req: NextRequest) {
  const st = aiStatus();
  if (!st.configured) {
    return NextResponse.json(
      {
        error: "AI translation is disabled because AI_API_KEY is not configured.",
        setup: "Set an OpenAI-compatible key in .env.local (see .env.example, README §Optional credentials). Content stays in its original language and is clearly labelled as untranslated meanwhile.",
      },
      { status: 501 }
    );
  }
  const { id, lang } = (await req.json()) as { id: string; lang: string };
  if (!["ur", "en"].includes(lang)) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  const store = await loadAll();
  const item = store.items[id];
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  try {
    const cache = (item as unknown as Record<string, unknown>)[CACHE_KEY(lang)] as
      | { title: string; summary: string; why?: string } | undefined;
    if (cache) return NextResponse.json({ ok: true, translation: cache, cached: true });
    const [t, s, w] = await Promise.all([
      translateToLanguage(item.title, lang),
      translateToLanguage(item.summary, lang),
      item.whyItMatters ? translateToLanguage(item.whyItMatters, lang) : Promise.resolve(undefined),
    ]);
    const translation = { title: t, summary: s, why: w };
    await saveAll((st2) => {
      const it = st2.items[id];
      if (it) (it as unknown as Record<string, unknown>)[CACHE_KEY(lang)] = translation;
    });
    await log("ingest", true, `Translated item ${id} to ${lang}`);
    return NextResponse.json({ ok: true, translation, label: `Translated to ${lang === "ur" ? "Urdu" : "English"} (AI)` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Translation failed" }, { status: 502 });
  }
}
