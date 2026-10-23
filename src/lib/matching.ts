import { CONCEPTS, CONCEPT_BY_ID, type Concept } from "./taxonomy";

/**
 * Matching engine — semantic-lite.
 *
 * Educational audiences often expect an LLM here; that path exists (src/lib/ai.ts)
 * and runs when AI_API_KEY is configured. The deterministic matcher below is the
 * always-on core: fast, cheap, explainable, and runs on every item without cost.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "it", "its", "this", "that",
  "new", "how", "why", "what", "up", "out", "can", "will", "has", "have", "had",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function norm(text: string): string {
  return " " + text.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9+#. ]/g, " ").replace(/\s+/g, " ").trim() + " ";
}

/** Count how many times each synonym phrase occurs. */
function phraseCounts(text: string, phrases: string[], weight: number): number {
  let count = 0;
  for (const p of phrases) {
    if (norm(text).includes(` ${p} `) || norm(text).includes(` ${p}.`)) count += weight;
  }
  return count;
}

export interface ConceptMatch {
  conceptId: string;
  label: string;
  strength: number; // 0..~2 (title hits count double)
  hits: string[];
}

/** Where each concept appears in an item's text. */
export function conceptMatches(title: string, summary: string): ConceptMatch[] {
  const results: ConceptMatch[] = [];
  for (const c of CONCEPTS) {
    const hits: string[] = [];
    let strength = 0;
    for (const s of c.synonyms) {
      const t = phraseCounts(title, [s], 2);
      const s2 = phraseCounts(summary, [s], 1);
      if (t > 0) { strength += t; hits.push(s); }
      else if (s2 > 0) { strength += s2 * 0.6; hits.push(s); }
    }
    if (strength > 0) results.push({ conceptId: c.id, label: c.label, strength, hits: [...new Set(hits)].slice(0, 3) });
  }
  return results.sort((a, b) => b.strength - a.strength);
}

export function conceptsForText(title: string, summary: string): string[] {
  // A concept must be clearly present: a direct title synonym (title hits count
  // double) or multiple corroborating mentions. A single passing summary word
  // (0.6) is never enough to move an item across sections.
  return conceptMatches(title, summary).filter((m) => m.strength >= 1).map((m) => m.conceptId);
}

// ── Interests ─────────────────────────────────────────────────────────────

export interface EvaluatedInterest {
  interestId: string;
  text: string;
  matched: boolean;
  score: number; // 0..1 contribution to relevance
  conceptIds: string[];
  reason: string; // short, presentable
}

/** Expand a raw interest string into phrases + matched concepts. */
export function expandInterest(text: string): {
  phrase: string;
  tokens: string[];
  conceptIds: string[];
} {
  const phrase = norm(text).trim();
  const tokens = tokenize(text);
  const lower = text.toLowerCase();
  const conceptIds = CONCEPTS.filter(
    (c) => c.synonyms.some((s) => phrase.includes(s)) || tokenize(c.label).every((t) => tokens.includes(t))
  ).map((c) => c.id);
  return { phrase, tokens, conceptIds: conceptIds.length ? conceptIds : conceptsForText(lower, lower).slice(0, 1) };
}

/** Evaluate one interest against an item. Returns reason text — short & honest. */
export function evalInterest(
  item: { title: string; summary: string; categories: string[] },
  interest: { id: string; text: string; conceptIds?: string[] }
): EvaluatedInterest {
  const { phrase, tokens, conceptIds } = expandInterest(interest.text);
  const titleN = norm(item.title);
  const sumN = norm(item.summary);

  // direct phrase
  if (phrase.length > 3 && (titleN.includes(phrase) || (phrase.split(/\s+/).length > 2 && sumN.includes(phrase)))) {
    return { interestId: interest.id, text: interest.text, matched: true, score: 1, conceptIds: conceptIds, reason: `Matches your interest in “${interest.text}”` };
  }
  // concept expansion
  for (const cid of conceptIds) {
    const c = CONCEPT_BY_ID.get(cid);
    if (!c) continue;
    const s = phraseCounts(item.title, c.synonyms, 2) + phraseCounts(item.summary, c.synonyms, 0.6);
    const tokOverlap = tokens.length ? tokens.filter((t) => titleN.includes(` ${t} `) || sumN.includes(` ${t} `)).length / tokens.length : 0;
    if (s >= 1.2 || (s >= 0.6 && tokOverlap >= 0.34)) {
      return {
        interestId: interest.id,
        text: interest.text,
        matched: true,
        score: Math.min(1, 0.55 + 0.1 * c.synonyms.filter((sy) => titleN.includes(sy)).length),
        conceptIds: [cid, ...c.related],
        reason: `Related to your interest in “${interest.text}” (${c.includes})`,
      };
    }
  }
  // similar wording fallback
  const overlap = tokens.length
    ? tokens.filter((t) => titleN.includes(` ${t} `)).length / tokens.length
    : 0;
  if (tokens.length >= 3 && overlap >= 0.5) {
    return { interestId: interest.id, text: interest.text, matched: true, score: 0.3 + overlap * 0.3, conceptIds, reason: `Similar wording to your interest in “${interest.text}”` };
  }
  return { interestId: interest.id, text: interest.text, matched: false, score: 0, conceptIds, reason: "" };
}

// ── Exclusions ────────────────────────────────────────────────────────────

export interface EvaluatedExclusion {
  exclusionId: string;
  text: string;
  action: "hide" | "flag" | "none";
  reason: string; // shown only in the preference tester, never as internal chain-of-thought
}

/**
 * Relevance-aware exclusion:
 *  - direct phrase / concept match in the TITLE → hide
 *  - strong multi-hit in summary → hide
 *  - single weak mention in passing → flag (kept, see "flagged" chip)
 * Interests can never override a "hide".
 */
export function evalExclusion(
  item: { title: string; summary: string; categories: string[] },
  exclusion: { id: string; text: string; exception?: string; conceptIds?: string[] }
): EvaluatedExclusion {
  const { phrase, conceptIds } = expandInterest(exclusion.text); // same expansion machinery
  const titleN = norm(item.title);
  const sumN = norm(item.summary);

  // exception topics restore visibility for otherwise excluded items
  if (exclusion.exception && norm(exclusion.exception).length > 3 && titleN.includes(norm(exclusion.exception))) {
    return { exclusionId: exclusion.id, text: exclusion.text, action: "none", reason: "Exception topic applies" };
  }

  const directTitle = phrase.length > 3 && titleN.includes(phrase);
  const directSummary = phrase.length > 3 && sumN.includes(phrase);

  const conceptHits = conceptIds.flatMap((cid) => {
    const c = CONCEPT_BY_ID.get(cid);
    if (!c) return [];
    const t = phraseCounts(item.title, c.synonyms, 1);
    const s = phraseCounts(item.summary, c.synonyms, 1);
    // one direct title hit is enough to hide; summary-level needs corroboration
    return t >= 1 || t + s >= 2 ? [{ cid, label: c.label, strength: t * 1.5 + s }] : [];
  });
  const strongest = conceptHits.sort((a, b) => b.strength - a.strength)[0];

  if (directTitle || strongest || (directSummary && conceptHits.length > 0)) {
    return {
      exclusionId: exclusion.id,
      text: exclusion.text,
      action: "hide",
      reason: `Hidden because of your exclusion preference “${exclusion.text}”`,
    };
  }
  // weak, passing mention
  if (directSummary) {
    return {
      exclusionId: exclusion.id,
      text: exclusion.text,
      action: "flag",
      reason: `Faintly mentions an excluded topic — kept with a note`,
    };
  }
  return { exclusionId: exclusion.id, text: exclusion.text, action: "none", reason: "" };
}

/** Main entry used by feeds + notification gating. */
export function applyPreferences(
  item: { title: string; summary: string; categories: string[] },
  interests: Array<{ id: string; text: string; enabled: boolean }>,
  exclusions: Array<{ id: string; text: string; enabled: boolean; exception?: string }>
): { visible: boolean; flagNote?: string; interestScores: EvaluatedInterest[] } {
  for (const ex of exclusions) {
    if (!ex.enabled) continue;
    const r = evalExclusion(item, ex);
    if (r.action === "hide") return { visible: false, interestScores: [] };
    if (r.action === "flag")
      return {
        visible: true,
        flagNote: r.reason,
        interestScores: interests.filter((i) => i.enabled).map((i) => evalInterest(item, i)),
      };
  }
  return {
    visible: true,
    interestScores: interests.filter((i) => i.enabled).map((i) => evalInterest(item, i)),
  };
}

export function conceptDescription(id: string): Concept | undefined {
  return CONCEPT_BY_ID.get(id);
}
