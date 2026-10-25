import type { NewsItem, Prefs, SectionId } from "./types";
import { applyPreferences, tokenize } from "./matching";
import { sortItems, type SortMode } from "./ranking";
import { isExpired } from "./expiration";
import { isRegion } from "./countries";
import { CATEGORY_BY_ID } from "./taxonomy";

/**
 * Feed query engine. Order of operations matters:
 *  1. expiry (query-time enforcement, independent of cleanup schedule)
 *  2. section/category membership
 *  3. geographic filter (Worldwide = any country; country = tagged or region)
 *     — Worldwide does NOT imply eligibility for Pakistani applicants; that is
 *       a separate scholarship filter below.
 *  4. exclusions FIRST (explicit exclusions always win over interests)
 *  5. search terms
 *  6. sort + slice
 */

export interface FeedParams {
  section: SectionId; // "topnews" | "topit" | "scholarships" | more-category id
  country?: string;
  sort?: SortMode;
  q?: string;
  page?: number;
  limit?: number;
  // scholarship filters
  nationality?: string; // applicant ISO
  destination?: string; // study destination ISO
  degreeLevel?: string;
  funding?: string;
  deadline?: "week" | "month" | "any";
  // jobs
  remoteOnly?: boolean;
}

export interface FeedResult {
  items: NewsItem[];
  totalBeforeFilters: number;
  total: number;
}

function inSection(item: NewsItem, section: string): boolean {
  const cat = CATEGORY_BY_ID.get(section);
  if (cat) {
    return item.sections.includes(section) || item.categories.some((k) => cat.concepts.includes(k));
  }
  // any other id = a custom topic
  if (item.sections.includes(section)) return true;
  return item.categories.includes(section);
}

function geoMatch(item: NewsItem, country: string): boolean {
  if (!country || country === "WW") return true;
  if (isRegion(country)) return item.regions.includes(country) || item.originCountry === country;
  if (item.originCountry === country) return true;
  if (item.regions.includes(country)) return true;
  // country filter across availability fields (study destination, employer)
  const av = item.availability;
  if (av?.destinationCountry === country) return true;
  if (av?.locations?.some((l) => l.toLowerCase().includes(country.toLowerCase()))) return true;
  if (av?.eligibleNationalities?.includes(country)) return true;
  return false;
}

export function runFeed(store: { items: Record<string, NewsItem> }, prefs: Prefs, params: FeedParams): FeedResult {
  const all = Object.values(store.items);
  const before = all.length;
  const now = Date.now();

  // 1+2+3: expiry → membership → geo. For scholarships the country selector
  // means the APPLICANT's country (nationality), not story geography, so the
  // geo filter is skipped and the nationality rule below governs instead.
  const country = params.country || prefs.sections[params.section]?.country || "WW";
  let pool = all.filter(
    (i) =>
      i.status === "active" &&
      !isExpired(i, now) &&
      params.section !== "all" &&
      inSection(i, params.section) &&
      (params.section === "scholarships" ? true : geoMatch(i, country))
  );

  // scholarship-specific filters (selector = applicant nationality)
  if (params.section === "scholarships") {
    const nat = params.nationality || country;
    if (nat && nat !== "WW") {
      pool = pool.filter(
        (i) => !i.availability || i.availability.eligibleNationalities === undefined || (i.availability.eligibleNationalities?.length ?? 0) === 0 || i.availability.eligibleNationalities.includes(nat),
      );
    }
    if (params.destination && params.destination !== "WW") pool = pool.filter((i) => i.availability?.destinationCountry === params.destination);
    if (params.degreeLevel && params.degreeLevel !== "any") pool = pool.filter((i) => (i.availability?.degreeLevel ?? "").toLowerCase().includes(params.degreeLevel!.toLowerCase()));
    if (params.funding && params.funding !== "any") pool = pool.filter((i) => i.availability?.funding === params.funding);
    if (params.deadline === "week") {
      pool = pool.filter((i) => i.availability?.deadline && Date.parse(i.availability.deadline) - now < 7 * 864e5);
    } else if (params.deadline === "month") {
      pool = pool.filter((i) => i.availability?.deadline && Date.parse(i.availability.deadline) - now < 31 * 864e5);
    }
  }

  // jobs remote filter
  if (params.remoteOnly) pool = pool.filter((i) => i.availability?.remote === true);

  // 4: exclusions (and interest scoring for ranking + explanations)
  const interests = prefs.interests;
  const exclusions = prefs.exclusions;
  const scored = [] as Array<{ item: NewsItem; visible: boolean; note?: string; reasons: string[] }>;
  const relevanceCache = new Map<string, number>();
  for (const item of pool) {
    const res = applyPreferences(item, interests, exclusions);
    if (!res.visible) continue;
    const reasons = res.interestScores.filter((s) => s.matched).map((s) => s.reason).slice(0, 2);
    if (res.interestScores.length) {
      relevanceCache.set(item.id, Math.max(...res.interestScores.map((s) => s.score), 0));
      if (reasons.length < 2) for (const s of res.interestScores) if (s.matched && !reasons.includes(s.reason)) { reasons.push(s.reason); break; }
    }
    scored.push({ item, visible: true, note: res.flagNote, reasons });
  }

  // custom-topic keyword routing for topical feeds
  if (params.section !== "topnews" && params.section !== "topit" && params.section !== "scholarships") {
    const ct = prefs.customTopics.find((t) => t.id === params.section);
    if (ct) {
      const keys = ct.prefs.keywords.map((k) => normPhrase(k));
      const exk = ct.prefs.excludeKeywords.map((k) => normPhrase(k));
      if (keys.length || exk.length) {
        pool = scored.map((s) => s.item).filter((item) => {
          const hay = normPhrase(`${item.title} ${item.summary}`);
          const okKey = !keys.length || keys.some((k) => hay.includes(k));
          const okEx = !exk.some((k) => hay.includes(k));
          return okKey && okEx;
        });
      }
    }
  }

  // 5: search terms
  if (params.q) {
    const terms = tokenize(params.q);
    if (terms.length) {
      pool = scored
        .map((s) => s.item)
        .filter((it) => {
          const hay = ` ${it.title.toLowerCase()} ${it.summary.toLowerCase()} `;
          return terms.every((t) => hay.includes(` ${t}`));
        });
    }
  } else {
    pool = scored.map((s) => s.item);
  }

  const total = pool.length;
  const sortMode: SortMode = params.sort || prefs.sections[params.section]?.sort || "latest";
  const sorted = sortItems(pool, sortMode, prefs.interests);
  const limit = Math.max(1, Math.min(100, params.limit ?? 30));
  const page = Math.max(0, params.page ?? 0);
  const items = sorted.slice(page * limit, page * limit + limit);
  return { items, totalBeforeFilters: before, total };
}

function normPhrase(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()} `;
}
