"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Info, Trash2 } from "lucide-react";
import { usePrefs } from "../prefs-context";
import { EmptyState, Badge, ConfirmDialog } from "../ui";
import { fmtTime, CompactRow } from "../NewsCard";
import { DetailPage } from "../DetailPage";

// ── Saved items ───────────────────────────────────────────────────────────
export function SavedPage() {
  const { prefs, action, toggleSaved } = usePrefs();
  const language = prefs?.language ?? "en";
  const [openId, setOpenId] = useState<string | null>(null);
  if (!prefs) return null;
  return (
    <div className="space-y-3">
      <h1 className="px-4 pt-3 text-xl font-bold">Saved items</h1>
      {prefs.saved.length === 0 && (
        <EmptyState icon={<Info size={26} />} title="Nothing saved yet" body="Bookmark anything from any feed with the bookmark icon. Saved items keep their summary even after the original news expires — expired snapshots carry an “Expired” label instead of pretending to be fresh." />
      )}
      {prefs.saved.map((s) => {
        const it = s.snapshot;
        return (
          <div key={s.id} className="px-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <CompactRow item={it as any} onOpen={() => setOpenId(s.itemId)} />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              saved {fmtTime(s.savedAt)} ·
              {it.status === "expired" || it.kind === "news" && new Date(it.publishedAt ?? it.fetchedAt).getTime() + 7 * 864e5 < Date.now() ? (
                <Badge tone="amber">Expired — kept as your bookmark snapshot</Badge>
              ) : (
                <Badge tone="green">Active</Badge>
              )}
              {it.kind === "scholarship" && (
                <select className="chip border border-zinc-200 bg-white py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  value={s.applicationStatus ?? "not-started"}
                  onChange={(e) => void action("saved-status", { id: s.id, status: e.target.value })}
                  aria-label="Application progress">
                  <option value="not-started">Application: not started</option>
                  <option value="applying">Applying</option>
                  <option value="submitted">Submitted</option>
                  <option value="result">Result awaited</option>
                </select>
              )}
              <button className="btn-ghost p-1" aria-label="Remove saved item" onClick={() => void action("remove-saved", { id: s.id })}><Trash2 size={13} /></button>
            </div>
          </div>
        );
      })}
      <DetailPage
        id={openId}
        open={!!openId}
        onClose={() => setOpenId(null)}
        backLabel="Saved items"
        lang={language}
        saved={!!openId}
        onToggleSave={() => { const s = prefs.saved.find((x) => x.itemId === openId); if (s) void action("remove-saved", { id: s.id }); }}
        showImages
      />
    </div>
  );
}

// ── Daily briefing history ────────────────────────────────────────────────
interface BriefingsResponse {
  briefings: Array<{
    id: string; localDate: string; createdAt: string; timezone: string;
    sections: Array<{ sectionId: string; label: string; items: Array<{ id: string; title: string; url: string; sourceName: string }> }>;
  }>;
}

export function BriefingsPage() {
  const [data, setData] = useState<BriefingsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => fetch("/api/briefing").then((r) => r.json()).then(setData);
  useEffect(() => { void load(); }, []);

  const generate = async () => {
    setBusy(true);
    await fetch("/api/briefing", { method: "POST", body: JSON.stringify({ regenerate: true }), headers: { "content-type": "application/json" } });
    await load();
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-xl font-bold">Briefing history</h1>
        <button className="btn" onClick={generate} disabled={busy}>{busy ? "Regenerating…" : "Regenerate today"}</button>
      </div>
      {!data && <p className="px-4 text-sm text-zinc-500">Loading…</p>}
      {data?.briefings.length === 0 && <p className="px-4 text-sm text-zinc-500">No briefing generated yet. The scheduler creates one every morning at your configured time.</p>}
      {data?.briefings.map((b) => (
        <section key={b.id} className="card mx-3 p-4">
          <h2 className="font-semibold">{b.localDate}</h2>
          <p className="text-xs text-zinc-400">generated {fmtTime(b.createdAt)} · {b.timezone}</p>
          {b.sections.map((s) => (
            <div key={s.sectionId} className="mt-2">
              <h3 className="text-sm font-semibold text-accent">{s.label} ({s.items.length})</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {s.items.map((it) => (
                  <li key={it.id} className="truncate">• <a className="hover:underline" href={it.url} target="_blank" rel="noreferrer noopener">{it.title}</a> <span className="text-xs text-zinc-400">({it.sourceName})</span></li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// ── Sources & methodology ─────────────────────────────────────────────────
interface StatusResponse {
  counts: Record<string, number>;
  sources: Array<{ id: string; name: string; homepage: string; reliability: string; official: boolean; bestFor: string[]; failures: number }>;
  logTail: Array<{ time: string; job: string; ok: boolean; detail: string }>;
  lastIngestAt: string | null;
}

export function SourcesPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const { action, toast } = usePrefs();
  useEffect(() => { fetch("/api/ingest").then((r) => r.json()).then(setData); }, []);

  return (
    <div className="space-y-4">
      <h1 className="px-4 pt-3 text-xl font-bold">Sources & verification methodology</h1>

      <section className="card mx-3 p-4 text-sm leading-relaxed">
        <h2 className="font-semibold">How information is verified</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-zinc-600 dark:text-zinc-400">
          <li>Only permitted feeds from reputable/official sources are ingested (listed below with their trust tier).</li>
          <li>Publication time is taken from the source feed — never invented. Missing dates are labelled “unknown”.</li>
          <li>Near-duplicate reports across independent outlets are merged; merged items show a “Corroborated” badge with links.</li>
          <li>Official government / university / company sources get an “Official source” badge.</li>
          <li>Opportunities with aggressive income claims or fees are flagged, never recommended as verified.</li>
          <li>An item is never “verified” just because any system summarized it. AI summaries (when configured) are grounded in the source text only.</li>
        </ol>
      </section>

      <section className="card mx-3 p-4">
        <h2 className="font-semibold">Feed sources</h2>
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-zinc-400"><tr><th className="py-1">Source</th><th>Tier</th><th>Feeds used for</th><th>Failures</th></tr></thead>
          <tbody>
            {data?.sources.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5"><a className="text-accent hover:underline" href={s.homepage} target="_blank" rel="noreferrer noopener">{s.name} <ExternalLink size={10} className="inline" /></a></td>
                <td><Badge tone={s.official ? "green" : s.reliability === "high" ? "green" : "neutral"}>{s.official ? "official" : s.reliability}</Badge></td>
                <td className="text-zinc-500">{s.bestFor.join(", ")}</td>
                <td>{s.failures > 0 ? <Badge tone="red">{s.failures}</Badge> : "0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-zinc-400">Failures are recorded honestly (rate limits, downtime). Past items remain available.</p>
      </section>

      <section className="card mx-3 p-4">
        <h2 className="font-semibold">Recent system activity</h2>
        <ul className="mt-2 space-y-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
          {data?.logTail.slice().reverse().map((l, i) => (
            <li key={i}>{fmtTime(l.time)} · {l.job} · {l.ok ? "ok" : "FAILED"} · {l.detail}</li>
          ))}
        </ul>
      </section>

      <section className="card mx-3 p-4">
        <h2 className="font-semibold">Feedback</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Tell us if something was inaccurate, irrelevant or broken. Feedback is stored with your profile.</p>
        <div className="mt-2 flex gap-2">
          <select className="input w-auto" value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Feedback type">
            <option value="" disabled>Select…</option>
            <option value="inaccurate">Inaccurate</option>
            <option value="not-relevant">Not relevant</option>
            <option value="other">Other</option>
          </select>
          <input className="input flex-1" placeholder="Details (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-primary" disabled={!rating} onClick={async () => { await action("feedback", { rating, comment }); toast("Thanks — feedback recorded."); setRating(""); setComment(""); }}>Send</button>
        </div>
      </section>
    </div>
  );
}

// ── Privacy & account ─────────────────────────────────────────────────────
export function PrivacyPage() {
  const { action, toast } = usePrefs();
  const [confirmWipe, setConfirm] = useState(false);
  return (
    <div className="space-y-4">
      <h1 className="px-4 pt-3 text-xl font-bold">Privacy & account</h1>
      <section className="card mx-3 p-4 text-sm leading-relaxed">
        <h2 className="font-semibold">What this app stores</h2>
        <ul className="mt-2 list-disc pl-4 text-zinc-600 dark:text-zinc-400">
          <li>Your preferences, saved items, briefings and notification history — locally on this machine (see deployment notes for the Supabase, multi-device option).</li>
          <li>Article metadata and excerpts from permitted public feeds — never your personal content.</li>
          <li>No analytics, no third-party trackers, no advertising SDKs.</li>
        </ul>
        <h2 className="mt-4 font-semibold">External-content security</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Fetched web content is treated strictly as data. Embedded instructions in any feed or page cannot alter
          app behaviour, and all rendered content is React-escaped. Page scripts never run; images load lazily and
          fail silently to a neutral state.
        </p>
      </section>
      <section className="card mx-3 p-4">
        <h2 className="font-semibold">Local data controls</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn" onClick={() => void action("notif-clear")}><Trash2 size={14} /> Clear notification history</button>
          <button className="btn border border-red-300 text-red-600 dark:border-red-900" onClick={() => setConfirm(true)}>
            <AlertTriangle size={14} /> Erase all app data & preferences
          </button>
        </div>
        <ConfirmDialog
          open={confirmWipe}
          title="Erase all app data?"
          body="This permanently deletes cached articles, your preferences, saved items, briefings and history from this device. This cannot be undone."
          confirmLabel="Erase everything"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={async () => { await action("wipe-all", { confirm: "DELETE" }); toast("All app data erased."); setConfirm(false); }}
        />
      </section>
    </div>
  );
}

// ── Richest people / top companies (honest data-source page) ──────────────
export function RichestPage() {
  return (
    <div>
      <h1 className="px-4 pt-3 text-xl font-bold">Richest people in the world</h1>
      <EmptyState
        icon={<Info size={26} />}
        title="Rankings need a live data source"
        body="Net-worth rankings change minute-to-minute. To show real estimates with source and methodology — rather than made-up numbers — this page requires a rankings API key (e.g. a permitted financial data provider). Add the provider to Sources settings and it will render here with estimate dates, currency, source and ranking methodology. Estimates always fluctuate."
      />
    </div>
  );
}

export function CompaniesPage() {
  return (
    <div>
      <h1 className="px-4 pt-3 text-xl font-bold">Top companies</h1>
      <EmptyState
        icon={<Info size={26} />}
        title="Rankings need a live data source"
        body="Company rankings by revenue, market capitalization or profit require a permitted financial data API. Once configured (see README §Optional credentials), rankings will display with the period and source labelled clearly. Company-related news already appears in Top IT and Top News."
      />
    </div>
  );
}
