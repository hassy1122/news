import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "./types";
import { SOURCES } from "./sources";
import { conceptsForText, norm } from "./matching";
import { dedupe } from "./dedupe";
import { loadAll, saveAll, log, sha1 } from "./store";
import { applyExpiry } from "./expiration";
import { SCHOLARSHIP_SEEDS } from "./seed";
import { importanceOf } from "./ranking";

const UA = "Mozilla/5.0 (compatible; PersonalIntel/1.0; +https://github.com/hassy1122/news)";
const TIMEOUT = 12_000;

// ── small helpers ─────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  html = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
  return html.replace(/\s+/g, " ").trim();
}

function truncateSummary(text: string, max = 420): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastDot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastDot > 120 ? cut.slice(0, lastDot + 1) : cut) + " …";
}

// ── country tagging ───────────────────────────────────────────────────────
const COUNTRY_HINTS: Array<[string, string[]]> = [
  ["PK", ["pakistan", "pakistani", "islamabad", "karachi", "lahore", "peshawar", "quetta", "sindh", "punjab university", "punjab govt", "kp ", "balochistan", "hina rabbani"]],
  ["IN", ["india", "indian", "delhi", "mumbai", "bengaluru", "modi"]],
  ["US", ["united states", "white house", "washington", "congress", "new york", "california"]],
  ["GB", ["britain", "uk government", "london", "scotland", "westminster"]],
  ["DE", ["germany", "german", "berlin", "munich"]],
  ["JP", ["japan", "tokyo"]],
  ["CN", ["china", "beijing", "shanghai"]],
  ["AU", ["australia", "canberra", "sydney"]],
  ["CA", ["canada", "ottawa", "toronto"]],
  ["SA", ["saudi", "riyadh"]],
  ["AE", ["emirates", "dubai", "abu dhabi"]],
  ["TR", ["turkey", "türkiye", "istanbul", "ankara"]],
  ["AF", ["afghanistan", "kabul", "taliban"]],
  ["IR", ["iran", "tehran"]],
  ["UA", ["ukraine", "kyiv", "ukrainian"]],
  ["IL", ["israel", "idf", "tel aviv"]],
  ["BR", ["brazil", "brasilia"]],
  ["FR", ["france", "french", "paris"]],
];

function tagCountry(text: string, sourceDefault?: string): { country?: string; regions: string[] } {
  const t = ` ${text.toLowerCase()} `;
  for (const [code, hints] of COUNTRY_HINTS) {
    if (hints.some((h) => t.includes(h))) {
      const regions: string[] = [];
      if (["PK", "IN", "BD", "LK", "NP", "AF"].includes(code)) regions.push("south-asia");
      if (["DE", "GB", "FR", "UA"].includes(code)) regions.push("europe");
      return { country: code, regions };
    }
  }
  if (sourceDefault) {
    // Google News country editions etc. — the edition itself is the country.
    return { country: sourceDefault, regions: sourceDefault === "PK" ? ["south-asia"] : [] };
  }
  return { regions: [] };
}

// ── category mapping ──────────────────────────────────────────────────────
export const SECTIONS_BY_CONCEPT: Record<string, string[]> = {
  ai: ["topit"], ml: ["topit"], softdev: ["topit"], webdev: ["topit"], cyber: ["topit"],
  cloud: ["topit"], products: ["topit"], opensource: ["topit"], crypto: ["topit"],
  jobs: ["topit"], internships: ["topit"], hackathons: ["topit"], conferences: ["topit"],
  courses: ["topit"], scholarship: ["scholarships"],
  politics: ["topnews"], economy: ["topnews"], safety: ["topnews"], science: ["topnews"],
  govtech: ["topnews"], finance: ["topnews"],
};

const MORE_BY_CONCEPT: Record<string, string[]> = {
  conferences: ["conferences"], internships: ["internships"], jobs: ["jobs"],
  finance: ["earnings", "finance"], economy: ["business", "finance"], ai: ["ai-tools"],
  courses: ["courses"], hackathons: ["hackathons"], opensource: ["opensource"],
  govtech: ["gov"], science: ["science"],
};

function kindFor(concepts: string[], sourceBestFor: string[], text: string): NewsItem["kind"] {
  const t = ` ${text.toLowerCase()} `;
  if (concepts.includes("scholarship")) {
    if (t.includes(" fellowship") || t.includes(" postdoc")) return "scholarship";
    return "scholarship";
  }
  if (concepts.includes("internships") || /internship|int trainee/.test(t)) return "internship";
  if (concepts.includes("jobs") && sourceBestFor.some((s) => ["jobs", "topit"].includes(s))) return "job";
  if (concepts.includes("hackathons")) return "event";
  if (concepts.includes("conferences")) return "event";
  if (concepts.includes("courses")) return "course";
  return "news";
}

// ── RSS/Atom fetch & parse ───────────────────────────────────────────────
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

interface RawEntry { title: string; link: string; desc: string; published?: string; image?: string }

async function parseFeed(xml: string): Promise<RawEntry[]> {
  const j = parser.parse(xml) as any;
  const rss = j?.rss?.channel?.item;
  if (Array.isArray(rss) || rss) {
    const arr = Array.isArray(rss) ? rss : [rss];
    return arr.map((it: any) => ({
      title: stripHtml(String(it.title ?? "")),
      link: String(it.link ?? ""),
      desc: stripHtml(String(it.description ?? it["content:encoded"] ?? "")),
      published: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
      image: it.enclosure?.["@_url"]?.match?.(/\.(jpg|jpeg|png|webp)/i) && String(it.enclosure["@_url"]) || undefined,
    })).filter((e: RawEntry) => e.title && e.link.startsWith("http"));
  }
  const atom = j?.feed?.entry;
  if (Array.isArray(atom)) {
    return atom.map((it: any) => {
      let link = "";
      if (Array.isArray(it.link)) link = String(it.link[0]?.["@_href"] ?? "");
      else link = String(it.link?.["@_href"] ?? "");
      let image: string | undefined;
      const media = it["media:content"] ?? it["media:thumbnail"];
      image = media?.[0]?.["@_url"] ? String(media[0]["@_url"]) : media?.["@_url"] ? String(media["@_url"]) : undefined;
      return {
        title: stripHtml(String(it.title ?? "")),
        link,
        desc: stripHtml(String(it.content ?? it.summary ?? "")),
        published: it.published ? new Date(it.published).toISOString() : it.updated ? new Date(it.updated).toISOString() : undefined,
        image,
      };
    }).filter((e: RawEntry) => e.title && e.link.startsWith("http"));
  }
  return [];
}

export interface IngestOptions {
  sources?: string[]; // subset of source ids
  maxPerFeed?: number;
}

export interface IngestStats {
  fetchedFeeds: number;
  failedFeeds: Array<{ name: string; error: string }>;
  newItems: number;
  superseded: number;
  expiredNow: number;
}

export async function runIngest(opts?: IngestOptions): Promise<IngestStats> {
  const stats: IngestStats = { fetchedFeeds: 0, failedFeeds: [], newItems: 0, superseded: 0, expiredNow: 0 };
  const store = await loadAll();
  if (!store.meta.seeded) {
    for (const s of SCHOLARSHIP_SEEDS) {
      if (!store.items[s.id]) store.items[s.id] = s;
    }
    await saveAll((st) => {
      for (const s of SCHOLARSHIP_SEEDS) if (!st.items[s.id]) st.items[s.id] = s;
      st.meta.seeded = new Date().toISOString();
    });
  }

  const chosen = SOURCES.filter((s) => !opts?.sources?.length || opts.sources.includes(s.id));
  const existingActive = Object.values(store.items).filter((i) => i.status === "active");

  const batch: NewsItem[] = [];
  const now = new Date().toISOString();

  for (const src of chosen) {
    for (const feedUrl of src.feeds) {
      try {
        const res = await fetch(feedUrl, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" }, signal: AbortSignal.timeout(TIMEOUT) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const entries = (await parseFeed(xml)).slice(0, opts?.maxPerFeed ?? 25);
        stats.fetchedFeeds++;
        for (const e of entries) {
          const id = sha1(e.link);
          if (store.items[id] || batch.some((b) => b.id === id)) continue;
          const text = `${e.title} ${e.desc}`;
          const concepts = conceptsForText(e.title, e.desc).slice(0, 3);
          if (!concepts.length) continue;
          const { country, regions } = tagCountry(text, src.defaultCountry);
          const sections = [...new Set(concepts.flatMap((c) => SECTIONS_BY_CONCEPT[c] ?? []))];
          if (!sections.length) continue;
          for (const bf of src.bestFor) if (["topnews", "topit", "scholarships"].includes(bf) && !sections.includes(bf) && concepts.some((c) => (SECTIONS_BY_CONCEPT[c] ?? []).includes(bf))) sections.push(bf);
          const kind = kindFor(concepts, src.bestFor, text);
          const item: NewsItem = {
            id,
            title: e.title,
            url: e.link,
            summary: truncateSummary(e.desc) || truncateSummary(e.title),
            summarySource: "source",
            sourceId: src.id,
            sourceName: src.name,
            sourceDomains: [new URL(e.link).hostname],
            reliability: src.reliability,
            originCountry: country,
            regions,
            publishedAt: e.published ?? null,
            publishedUnknown: !e.published,
            fetchedAt: now,
            categories: concepts,
            sections,
            kind,
            availability: kind === "scholarship" || kind === "job" || kind === "internship" || kind === "event"
              ? { kind: e.published ? "deadline" : "open", remote: /remote|work from home/.test(norm(text)) ? true : kind === "job" ? false : null, applyUrl: e.link }
              : undefined,
            importance: 0, // computed after
            verification: { status: src.reliability === "official" ? "official" : "single-source", checkedAt: now },
            status: "active",
          };
          item.importance = importanceOf(item);
          batch.push(item);
        }
      } catch (err) {
        stats.failedFeeds.push({ name: src.name, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  // dedupe against store + within batch
  const { accepted, updatedExisting, rejected } = dedupe(batch, existingActive);
  stats.newItems = accepted.length;
  stats.superseded = rejected.length;

  // mark "corroborated" where independent sources agree
  for (const it of [...accepted, ...updatedExisting]) {
    if ((it.corroborations?.length ?? 0) > 0 && it.reliability !== "official") {
      it.verification = { status: "corroborated", checkedAt: now, notes: `${(it.corroborations?.length ?? 0) + 1} independent sources report the same core event.` };
    }
  }

  // scam heuristics for opportunity content
  for (const it of accepted) {
    const t = norm(`${it.title} ${it.summary}`);
    if ((it.kind === "job" || it.kind === "internship" || it.kind === "evergreen") &&
        (t.includes("guaranteed income") || /earn \$?\d+[k]?\s+per day/.test(t) || t.includes("registration fee"))) {
      it.flagged = "Unusual income/fee claims — verify carefully; prefer official links.";
    }
  }

  // expiry sweep (query-time enforcement also exists, this keeps the store tidy)
  const all = [...Object.values(store.items)];
  stats.expiredNow = applyExpiry(all, Date.parse(now)).length;

  await saveAll((st) => {
    for (const item of accepted) st.items[item.id] = item;
    for (const u of updatedExisting) st.items[u.id] = u;
    for (const ex of all) if (ex.status === "expired") st.items[ex.id] = { ...st.items[ex.id], status: "expired", expiredAt: ex.expiredAt };
  });

  await log("ingest", true, `Fetched ${stats.fetchedFeeds} feeds from ${chosen.length} sources; ${stats.newItems} new, ${stats.superseded} duplicates.`, { new: stats.newItems, feeds: stats.fetchedFeeds });
  if (stats.failedFeeds.length) await log("ingest", false, `${stats.failedFeeds.length} feed(s) failed: ${stats.failedFeeds.map((f) => f.name).join(", ")}`);
  return stats;
}
