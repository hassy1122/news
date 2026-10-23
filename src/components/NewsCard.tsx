"use client";

import React from "react";
import type { NewsItem } from "@/lib/types";

export interface CardItem extends Partial<NewsItem> {
  id: string;
  title: string;
  summary: string;
  url: string;
  corroborationCount?: number;
  interestReasons?: string[];
}

// ── display helpers (shared with the detail page) ─────────────────────────
export function fmtTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function shortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Trim to at most two sentences (≈220 chars) for the main-screen card. */
export function twoSentences(text: string, max = 220): string {
  if (!text) return "";
  const end1 = text.indexOf(". ");
  const end2 = end1 >= 0 ? text.indexOf(". ", end1 + 1) : -1;
  if (end2 >= 0 && end2 + 1 <= max) return text.slice(0, end2 + 1);
  if (end1 >= 0 && end1 + 1 <= max) return text.slice(0, end1 + 1);
  const cut = text.slice(0, max);
  return (cut.lastIndexOf(" ") > 40 ? cut.slice(0, cut.lastIndexOf(" ")) : cut) + "…";
}

export function relTime(iso?: string | null): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (Number.isNaN(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function VerificationBadge({ status, corroborationCount, seeded }: { status?: string; corroborationCount?: number; seeded?: boolean }) {
  const map: Record<string, [string, string]> = {
    official: ["green", "Official source"],
    corroborated: ["green", `Corroborated by ${corroborationCount} more source${corroborationCount === 1 ? "" : "s"}`],
    "single-source": ["neutral", "Single source"],
    flagged: ["red", "Suspicious claims"],
  };
  const [tone, label] = map[status ?? "unverified"] ?? ["neutral", "Unverified"];
  const tones: Record<string, string> = {
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    accent: "bg-accent-soft text-accent",
  };
  if (seeded) return <span className={`chip ${tones.accent}`}>Official catalog</span>;
  return <span className={`chip ${tones[tone]}`}>{label}</span>;
}

export function OpportunityFacts({ item }: { item: CardItem }) {
  const av = item.availability;
  if (!av) return null;
  const rows: string[] = [];
  if (av.degreeLevel) rows.push(`Level: ${av.degreeLevel}`);
  if (av.fields?.length) rows.push(`Field: ${av.fields.slice(0, 2).join(", ")}${av.fields.length > 2 ? "…" : ""}`);
  if (av.funding === "fully-funded") rows.push("Funding: fully funded (confirm official terms)");
  else if (av.funding && av.funding !== "varies") rows.push(`Funding: ${av.funding}`);
  else if (av.fundingNote) rows.push(`Funding: ${av.fundingNote}`);
  if (av.deadline && new Date(av.deadline) > new Date()) rows.push(`Deadline: ${fmtTime(av.deadline)}`);
  if (av.remote === true) rows.push("Work arrangement: remote");
  if (av.remote === false && item.kind === "job" && av.locations?.length) rows.push(`Employer location: ${av.locations[0]}`);
  if (av.eligibleNationalities?.length) rows.push(`Eligible nationalities: ${av.eligibleNationalities.join(", ")}`);
  if (av.benefits?.length) rows.push(`Benefits: ${av.benefits.slice(0, 3).join(", ")}`);
  if (!rows.length) return null;
  return (
    <ul className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
      {rows.map((r, i) => <li key={i}>• {r}</li>)}
      {item.kind === "scholarship" && !av.deadline && (
        <li className="text-accent">• Deadline not confirmed — always verify on the official page before applying.</li>
      )}
      {av.applyUrl && (
        <li>
          <a className="font-medium text-accent underline" href={av.applyUrl} target="_blank" rel="noreferrer noopener">
            Official application page ↗
          </a>
        </li>
      )}
    </ul>
  );
}

/**
 * Main-screen news card — deliberately minimal (requirement 19.B):
 * headline, ≤2-sentence summary, publication time, optional thumbnail.
 * The whole card opens the detail page; everything else lives there.
 */
export function NewsCard({ item, onOpen, showImages, lang }: {
  item: CardItem; onOpen: () => void; showImages: boolean; lang: string;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const showImage = showImages && !!item.imageUrl && imgOk;
  const time = item.publishedUnknown ? "" : shortDate(item.publishedAt);

  return (
    <button
      onClick={onOpen}
      className="card block w-full px-4 py-3.5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent"
      data-item-id={item.id}
      aria-label={item.title}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug">{item.title}</h3>
          <p
            className={`mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 ${lang === "ur" ? "urdu" : ""}`}
            dir={lang === "ur" ? "rtl" : "ltr"}
          >
            {twoSentences(item.summary)}
          </p>
          {time && <p className="mt-1.5 text-xs text-zinc-400">{time}</p>}
        </div>
        {showImage && (
          <img
            src={item.imageUrl}
            alt=""
            aria-hidden="true"
            className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        )}
      </div>
    </button>
  );
}

export function CompactRow({ item, onOpen }: { item: CardItem; onOpen?: () => void }) {
  return (
    <button onClick={onOpen} className="card w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/70">
      <div className="flex items-baseline justify-between gap-3">
        <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
        <span className="shrink-0 text-[11px] text-zinc-400">{item.publishedUnknown ? "" : shortDate(item.publishedAt)}</span>
      </div>
    </button>
  );
}
