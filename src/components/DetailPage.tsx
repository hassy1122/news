"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Share2 } from "lucide-react";
import { VerificationBadge, OpportunityFacts, fmtTime, type CardItem } from "./NewsCard";
import type { NewsItem } from "@/lib/types";

interface DetailResponse { item: NewsItem; freshness: { publishedUnknown: boolean; fetchedAt: string; expired: boolean } }

/**
 * Dedicated full-screen reading page (section F: focused reading).
 *
 * Rendered as a fixed overlay so the feed underneath stays mounted — closing
 * it therefore returns to the exact feed, country, sort, filters and scroll
 * position without any refetch.
 */
export function DetailPage({ id, open, onClose, backLabel, lang, saved, onToggleSave, showImages }: {
  id: string | null; open: boolean; onClose: () => void; backLabel: string; lang: string;
  saved: boolean; onToggleSave: () => void; showImages: boolean;
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tr, setTr] = useState<{ title: string; summary: string; why?: string; label: string } | null>(null);
  const [trErr, setTrErr] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    if (!id || !open) return;
    setData(null); setErr(null); setTr(null); setTrErr(null); setShowOriginal(false); setImgOk(true);
    fetch(`/api/item/${id}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Not found");
      setData(j);
    }).catch((e) => setErr(e.message));
  }, [id, open]);

  // Content language: translate when the AI key is configured, else explain.
  useEffect(() => {
    if (!data || lang !== "ur") return;
    if (tr || trErr) return;
    fetch("/api/translate", { method: "POST", body: JSON.stringify({ id, lang }), headers: { "content-type": "application/json" } })
      .then(async (r) => {
        const j = await r.json();
        if (j.translation) setTr({ ...j.translation, label: j.label ?? "Translated (AI)" });
        else setTrErr(j.setup ?? j.error ?? "Translation unavailable.");
      })
      .catch(() => setTrErr("Translation request failed."));
  }, [data, lang, id, tr, trErr]);

  if (!open) return null;
  const it = data?.item;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-50 dark:bg-zinc-950" role="article" aria-label="News details">
      <div className="mx-auto max-w-2xl px-4 pb-16">
        {/* back to news */}
        <button
          className="btn-ghost sticky top-2 z-10 mt-2 -ml-2 bg-zinc-50/95 backdrop-blur dark:bg-zinc-950/95"
          onClick={onClose}
          aria-label={`Back to ${backLabel}`}
        >
          <ArrowLeft size={16} /> Back to {backLabel}
        </button>

        {!data && !err && <p className="text-sm text-zinc-500">Loading…</p>}
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">{err}</p>}

        {it && (
          <article className="mt-3 space-y-4">
            {/* headline + image */}
            <h1 className="text-2xl font-bold leading-snug tracking-tight">
              {tr && !showOriginal ? tr.title : it.title}
            </h1>
            {showImages && it.imageUrl && imgOk && (
              <img
                src={it.imageUrl}
                alt={it.imageAlt || it.title}
                className="max-h-64 w-full rounded-2xl object-cover"
                loading="lazy"
                onError={() => setImgOk(false)}
              />
            )}
            {data.freshness.expired && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                This item has passed its 7-day freshness window (or its deadline). Kept readable for reference only.
              </p>
            )}
            {it.flagged && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">{it.flagged}</p>}

            {/* translation controls */}
            {tr && (
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />
                Show original language
              </label>
            )}
            {trErr && <p className="text-xs text-amber-600 dark:text-amber-400">{trErr}</p>}

            {/* concise explanation */}
            <p className={`text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 ${tr && !showOriginal ? "urdu" : ""}`}
               dir={tr && !showOriginal ? "rtl" : "ltr"}>
              {tr && !showOriginal ? tr.summary : it.summary}
            </p>
            {it.whyItMatters && (
              <p className="text-[15px] font-medium leading-relaxed text-accent">
                {tr && !showOriginal ? tr.why : it.whyItMatters}
              </p>
            )}

            {/* key facts, figures, eligibility */}
            {(it.kind === "scholarship" || it.kind === "job" || it.kind === "internship" || it.kind === "event" || it.kind === "course") && it.availability && (
              <div>
                <h2 className="mb-1.5 text-sm font-semibold">Key facts</h2>
                <OpportunityFacts item={it as unknown as CardItem} />
              </div>
            )}

            {/* facts & attribution table */}
            <div className="rounded-xl bg-zinc-100/70 p-3 text-xs dark:bg-zinc-900">
              <table className="w-full">
                <tbody className="[&_td]:py-1 [&_td:first-child]:align-top [&_td:first-child]:font-medium [&_td:first-child]:text-zinc-500 [&_td:last-child]:text-zinc-700 dark:[&_td:last-child]:text-zinc-300">
                  <tr><td>Published</td><td>{it.publishedUnknown ? "Not stated by source — never invented" : fmtTime(it.publishedAt)}</td></tr>
                  {it.updatedSubstantiveAt && <tr><td>Substantive update</td><td>{fmtTime(it.updatedSubstantiveAt)}</td></tr>}
                  <tr><td>Retrieved</td><td>{fmtTime(it.fetchedAt)}</td></tr>
                  <tr><td>Source</td><td><a className="text-accent underline" href={it.url} target="_blank" rel="noreferrer noopener">{it.sourceName}</a></td></tr>
                  <tr><td>Country / region</td><td>{it.originCountry ?? "Worldwide"}{it.regions?.length ? ` (${it.regions.join(", ")})` : ""}</td></tr>
                  <tr><td>Verification</td><td><VerificationBadge status={it.verification?.status} corroborationCount={it.corroborations?.length} seeded={it.seeded} /></td></tr>
                  {it.verification?.notes && <tr><td></td><td className="text-zinc-400">{it.verification.notes}</td></tr>}
                  {it.seedNote && <tr><td>Note</td><td>{it.seedNote}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* related coverage only when real corroboration exists */}
            {((it.corroborations?.length ?? 0) > 0) && (
              <div>
                <h2 className="mb-1 font-medium text-sm">Related coverage ({it.corroborations!.length})</h2>
                <ul className="list-inside list-disc text-sm text-accent">
                  {it.corroborations!.map((c, i) => (
                    <li key={i}><a href={c.url} target="_blank" rel="noreferrer noopener" className="underline">{c.sourceName}</a></li>
                  ))}
                </ul>
              </div>
            )}

            {/* actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <a className="btn-primary" href={it.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={14} /> Original source</a>
              {it.availability?.applyUrl && it.availability.applyUrl !== it.url && (
                <a className="btn" href={it.availability.applyUrl} target="_blank" rel="noreferrer noopener">Official application page</a>
              )}
              <button className="btn" onClick={onToggleSave}>
                {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {saved ? "Bookmarked" : "Bookmark"}
              </button>
              <button
                className="btn"
                onClick={async () => {
                  if (navigator.share) { try { await navigator.share({ title: it.title, url: it.url }); } catch {}}
                  else { await navigator.clipboard.writeText(`${it.title} — ${it.url}`); }
                }}
              ><Share2 size={14} /> Share</button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
