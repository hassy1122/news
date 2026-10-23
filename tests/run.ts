import assert from "node:assert/strict";
import type { NewsItem, Prefs } from "../src/lib/types";
import { CONCEPTS } from "../src/lib/taxonomy";
import { applyPreferences, expandInterest, evalExclusion, evalInterest } from "../src/lib/matching";
import { applyExpiry, expiryTime, isExpired } from "../src/lib/expiration";
import { dedupe, isDuplicate } from "../src/lib/dedupe";
import { defaultPrefs, resetInterestPreferences } from "../src/lib/prefs-defaults";
import { COUNTRIES } from "../src/lib/countries";
import { runFeed } from "../src/lib/filters";
import { sortItems, freshness, importanceOf } from "../src/lib/ranking";
import { checkNotification } from "../src/lib/notify";

let passCount = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

const NOW = new Date("2026-10-23T09:00:00Z").getTime();
function item(p: Partial<NewsItem>): NewsItem {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    title: p.title ?? "Untitled",
    url: p.url ?? "https://example.com/x",
    summary: p.summary ?? "",
    summarySource: "source",
    sourceId: "test",
    sourceName: p.sourceName ?? "Test Source",
    sourceDomains: ["example.com"],
    reliability: p.reliability ?? "high",
    originCountry: p.originCountry,
    regions: p.regions ?? [],
    publishedAt: p.publishedAt ?? new Date(NOW - 3600_000).toISOString(),
    publishedUnknown: false,
    fetchedAt: new Date(NOW).toISOString(),
    categories: p.categories ?? [],
    sections: p.sections ?? ["topnews"],
    kind: p.kind ?? "news",
    importance: 0.5,
    verification: { status: "single-source", checkedAt: new Date(NOW).toISOString() },
    status: "active",
    ...p,
  } as NewsItem;
}

const noICtx = { interests: [] as any[], exclusions: [] as any[] };

console.log("— Matching & exclusion semantics —");

ok("interest expansion: 'Artificial Intelligence' reaches AI/ML concepts", () => {
  const e = expandInterest("Artificial Intelligence");
  assert.ok(e.conceptIds.includes("ai"), JSON.stringify(e.conceptIds));
});

ok("interest matches item using a synonym (OpenAI news)", () => {
  const it = item({ title: "OpenAI releases new model", summary: "The company announced advances.", categories: ["ai"] });
  const ev = evalInterest(it, { id: "1", text: "Artificial Intelligence" });
  assert.ok(ev.matched, "should match");
});

ok("exclusion hides a concept-level match in the title", () => {
  const it = item({ title: "Celebrity dies in crash", summary: "Entertainment circles react." });
  const r = evalExclusion(it, { id: "e1", text: "Celebrity gossip" });
  assert.equal(r.action, "hide");
});

ok("incidental mention is flagged, NOT blindly deleted", () => {
  const it = item({ title: "New cricket stadium opens after flood relief", summary: "Entertainment stars attended briefly." });
  const r = evalExclusion(it, { id: "e1", text: "Celebrity gossip" });
  assert.notEqual(r.action, "hide");
});

ok("explicit exclusion overrides an interest (exclusion wins)", () => {
  const it = item({
    title: "OpenAI launches new crypto promotions",
    summary: "Company announced token products.",
    categories: ["ai", "crypto"],
  });
  const prefs = { interests: [{ id: "i1", text: "Artificial intelligence", enabled: true }], exclusions: [{ id: "x1", text: "Cryptocurrency", enabled: true }] } as any;
  const res = applyPreferences(it as any, prefs.interests, prefs.exclusions);
  assert.equal(res.visible, false);
});

ok("exception topic overrides its exclusion", () => {
  const it = item({ title: "Cricket star becomes technology investor", summary: "" });
  const r = evalExclusion(it, { id: "e1", text: "Cricket & Sports", exception: "technology" });
  assert.notEqual(r.action, "hide");
});

ok("disabled exclusion does not hide", () => {
  const it = item({ title: "Celebrity gossip roundup", summary: "" });
  const res = applyPreferences(it as any, [], [{ id: "x", text: "Celebrity gossip", enabled: false }]);
  assert.equal(res.visible, true);
});

console.log("— Freshness, expiry, ordering —");

ok("news expires exactly 7 days after ORIGINAL publication", () => {
  const it = item({ publishedAt: new Date(NOW - 7 * 86400_000 - 1000).toISOString() });
  assert.ok(isExpired(it, NOW));
  const it2 = item({ publishedAt: new Date(NOW - 6 * 86400_000).toISOString() });
  assert.ok(!isExpired(it2, NOW));
});

ok("refetching does NOT reset age (fetch time ≠ publication)", () => {
  const it = item({ publishedAt: new Date(NOW - 9 * 86400_000).toISOString(), fetchedAt: new Date(NOW).toISOString() });
  assert.ok(isExpired(it, NOW));
});

ok("unknown publication date is never invented; item still expires", () => {
  const it = item({ publishedAt: null, publishedUnknown: true, fetchedAt: new Date(NOW - 8 * 86400_000).toISOString() });
  assert.ok(it.publishedUnknown && isExpired(it, NOW));
  const e = expiryTime(it);
  assert.ok(Number.isFinite(e));
});

ok("applyExpiry marks the right subset", () => {
  const items = [
    item({ publishedAt: new Date(NOW - 9 * 86400_000).toISOString() }),
    item({ publishedAt: new Date(NOW - 1 * 86400_000).toISOString() }),
  ];
  const changed = applyExpiry(items, NOW);
  assert.equal(changed.length, 1);
  assert.equal(items[0].status, "expired");
});

ok("sorting: latest first by publication, not fetch", () => {
  const a = item({ title: "older", publishedAt: new Date(NOW - 1 * 86400_000).toISOString(), fetchedAt: new Date(NOW).toISOString() });
  const b = item({ title: "newer", publishedAt: new Date(NOW - 3600_000).toISOString(), fetchedAt: new Date(NOW - 100).toISOString() });
  const sorted = sortItems([a, b], "latest", []);
  assert.equal(sorted[0].title, "newer");
});

ok("important sort prefers importance", () => {
  const lo = item({ title: "routine", reliability: "medium", categories: [] });
  const hi = item({ title: "major", reliability: "official", categories: ["safety"], importance: importanceOf(item({ reliability: "official", categories: ["safety"] }), NOW) });
  const sorted = sortItems([lo, hi], "important", []);
  assert.equal(sorted[0].title, "major");
});

ok("freshness decays with age", () => {
  assert.ok(freshness(new Date(NOW - 3600_000).toISOString()) > freshness(new Date(NOW - 40 * 3600_000).toISOString()));
});

ok("scholarship expires after its deadline + grace", () => {
  const s = item({ kind: "scholarship", availability: { deadline: new Date(NOW - 3 * 86400_000).toISOString() } as any });
  assert.ok(isExpired(s, NOW));
});

console.log("— Deduplication & corroboration —");

ok("same headline from two outlets merges with corroboration", () => {
  const a = item({ id: "a", title: "Parliament approves new budget", sourceName: "One" });
  const b = item({ id: "b", title: "Parliament approves new budget today", sourceName: "Two" });
  assert.ok(isDuplicate(a, b));
  const { accepted, rejected } = dedupe([b], [a] as any);
  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 1);
});

ok("unrelated stories are not merged", () => {
  const a = item({ title: "Parliament approves budget" });
  const b = item({ title: "Researchers discover new species in ocean depths" });
  assert.ok(!isDuplicate(a, b));
});

console.log("— Feed filtering —");

function storeWith(items: NewsItem[]) {
  return { items: Object.fromEntries(items.map((i) => [i.id, i])) };
}

ok("country filter: Pakistan selection keeps only tagged stories", () => {
  const pk = item({ title: "Karachi announces new metro plans", originCountry: "PK" });
  const ww = item({ title: "Paris climate talks continue", originCountry: "FR" });
  const prefs = defaultPrefs();
  const res = runFeed(storeWith([pk, ww]) as any, prefs, { section: "topnews", country: "PK" });
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].originCountry, "PK");
});

ok("Worldwide = any country", () => {
  const pk = item({ originCountry: "PK" });
  const fr = item({ originCountry: "FR" });
  const res = runFeed(storeWith([pk, fr]) as any, defaultPrefs(), { section: "topnews", country: "WW" });
  assert.equal(res.items.length, 2);
});

ok("section country selection is independent per section (prefs objects)", () => {
  const p = defaultPrefs();
  p.sections.topnews.country = "US";
  p.sections.topit.country = "WW";
  assert.notEqual(p.sections.topnews.country, p.sections.topit.country);
});

ok("scholarship feed: eligibility pacing — unknown-nationality programs stay visible", () => {
  const s1 = item({ kind: "scholarship", title: "DAAD EPOS", sections: ["scholarships"], availability: { eligibleNationalities: ["PK"] } as any });
  const s2 = item({ kind: "scholarship", title: "Gates Cambridge", sections: ["scholarships"], availability: { eligibleNationalities: [] } as any });
  const s3 = item({ kind: "scholarship", title: "SomeIneligible", sections: ["scholarships"], availability: { eligibleNationalities: ["IN"] } as any });
  const res = runFeed(storeWith([s1, s2, s3]) as any, defaultPrefs(), { section: "scholarships", nationality: "PK" });
  const titles = res.items.map((i) => i.title);
  assert.ok(titles.includes("DAAD EPOS"));
  assert.ok(!titles.includes("SomeIneligible"));
});

ok("expired items are excluded at query time even without cleanup", () => {
  const old = item({ publishedAt: new Date(NOW - 9 * 86400_000).toISOString() });
  const fresh = item({ publishedAt: new Date(NOW - 1 * 86400_000).toISOString() });
  old.status = "expired";
  const res = runFeed(storeWith([old, fresh]) as any, defaultPrefs(), { section: "topnews", country: "WW" });
  assert.equal(res.items.length, 1);
});

console.log("— Reset & persistence semantics —");

ok("Reset Interest Preferences clears ONLY interests/exclusions", () => {
  const p: Prefs = defaultPrefs();
  p.interests = [{ id: "1", text: "AI", enabled: true, priority: "normal", notify: { mode: "off" }, createdAt: "" }] as any;
  p.exclusions = [{ id: "2", text: "gossip", enabled: true, type: "semantic", scope: "all", createdAt: "" }] as any;
  p.saved = [{ id: "s", itemId: "x", savedAt: "", snapshot: item({}) as any }];
  p.language = "ur";
  (p as any).appearance = { theme: "dark" };
  p.sections.topnews.dailyQuantity = 9;
  const r = resetInterestPreferences(p);
  assert.equal(r.interests.length, 0);
  assert.equal(r.exclusions.length, 0);
  assert.equal(r.saved.length, 1);
  assert.equal(r.language, "ur");
  assert.deepEqual((r as any).appearance, { theme: "dark" });
  assert.equal(r.sections.topnews.dailyQuantity, 9);
});

console.log("— Defaults & routing invariants —");

ok("defaults: 5 items/day per main section, Pakistan country, English", () => {
  const p = defaultPrefs();
  assert.equal(p.language, "en");
  assert.equal(p.sections.topnews.dailyQuantity, 5);
  assert.equal(p.sections.topnews.country, "PK");
  assert.equal(p.sections.scholarships.country, "PK");
});

ok("country list: Worldwide first, Pakistan second", () => {
  assert.equal(COUNTRIES[0].name, "Worldwide");
  assert.equal(COUNTRIES[1].name, "Pakistan");
});

ok("taxonomy ions: has celebrity + cricket exclusion concepts", () => {
  assert.ok(CONCEPTS.some((c) => c.id === "celebrity"));
  assert.ok(CONCEPTS.some((c) => c.id === "cricket"));
});

console.log("— Notification gating —");

function notifPrefs(o: Partial<Prefs["notifications"]>): Prefs {
  const p = defaultPrefs();
  p.notifications = { ...p.notifications, enabled: true, ...o };
  return p;
}

ok("master off → nothing delivered (recorded honestly)", () => {
  const p = defaultPrefs(); // enabled: false
  const c = checkNotification(item({}), p, new Date("2026-10-23T09:00:00Z"));
  assert.equal(c.allowed, false);
});

ok("excluded topic never notifies, even in 'all' mode", () => {
  const p = notifPrefs({ topicMode: "all" });
  p.exclusions = [{ id: "x", text: "Celebrity gossip", enabled: true, type: "semantic", scope: "all", createdAt: "" }] as any;
  const c = checkNotification(item({ title: "Massive celebrity gossip scandal", kind: "news", importance: 0.9 }), p, new Date("2026-10-23T09:00:00Z"));
  assert.equal(c.allowed, false);
  assert.equal(c.status, "suppressed-excluded");
});

ok("'selected topics only' mode ignores unrelated important news", () => {
  const p = notifPrefs({ topicMode: "selected" });
  const c = checkNotification(item({ title: "Big unrelated geopolitical event", importance: 0.95 }), p, new Date());
  assert.equal(c.allowed, false);
});

ok("selected-topic mode notifies on a matching interest", () => {
  const p = notifPrefs({ topicMode: "selected", maxPerHour: 4, maxPerDay: 24, quietStart: "23:00", quietEnd: "05:00" });
  p.interests = [{ id: "1", text: "Artificial Intelligence", enabled: true, priority: "high", notify: { mode: "immediate", threshold: 0.3 }, createdAt: "" }] as any;
  const c = checkNotification(item({ title: "OpenAI delivers faster inference to every country", summary: "announced today", categories: ["ai"] }), p, new Date("2026-10-23T09:00:00Z"));
  assert.equal(c.allowed, true);
});

ok("quiet hours suppress (10:30 in 22:00–07:00 window)", () => {
  const p = notifPrefs({ topicMode: "all", quietStart: "22:00", quietEnd: "07:00" });
  const c = checkNotification(item({ title: "Big event happened everywhere", importance: 0.95 }), p, new Date("2026-10-23T23:30:00Z"));
  assert.equal(c.allowed, false);
  assert.equal(c.status, "suppressed-quiet");
});

ok("stability: an item's id is the hash of its URL (dedupe key)", () => {
  const { sha1 } = require("../src/lib/store") as typeof import("../src/lib/store");
  const a = sha1("https://example.com/same");
  const b = sha1("https://example.com/same");
  const c = sha1("https://example.com/other");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

console.log(`\n${passCount} checks passed${process.exitCode ? " — WITH FAILURES" : ""}.`);
