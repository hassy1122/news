"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

/**
 * Reusable, searchable country selector.
 * - "Worldwide" is always the first option.
 * - Per-section selections are stored independently by the caller.
 */
export function CountrySelect({ value, onChange, label = "Country", includeRegions = false, compact }: {
  value: string; onChange: (code: string) => void; label?: string; includeRegions?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const sel = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const list = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 400);

  return (
    <div className="relative" ref={ref}>
      <button
        className={`btn hover:bg-zinc-100 dark:hover:bg-zinc-800 ${compact ? "px-2 text-sm" : ""}`}
        aria-label={`${label}: ${sel.name}`}
        aria-expanded={open}
        onClick={() => { setOpen((o) => !o); setQ(""); }}
      >
        <span className="text-lg leading-none">{sel.flag}</span>
        {!compact && <span className="max-w-[110px] truncate">{sel.name}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-80 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <input autoFocus className="input py-1.5" placeholder="Search country…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox" aria-label={label}>
            {[COUNTRIES[0], ...(list.filter((c) => c.code !== "WW"))].map((c) => (
              <li key={c.code}>
                <button
                  role="option"
                  aria-selected={c.code === value}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${c.code === value ? "text-accent" : ""}`}
                  onClick={() => { onChange(c.code); setOpen(false); }}
                >
                  <span>{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-zinc-400">{c.region}</span>
                  {c.code === value && <Check size={14} />}
                </button>
              </li>
            ))}
          </ul>
          {includeRegions && (
            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
              <div className="mb-1 flex items-center gap-1 px-1 text-xs font-medium text-zinc-400"><Globe size={12} /> Filter by region instead</div>
              <div className="flex flex-wrap gap-1">
                {["south-asia", "europe", "Middle East", "Africa", "North America", "East Asia", "South-East Asia"].map((r) => (
                  <button key={r} className={`chip px-2 ${value === r ? "bg-accent-soft text-accent" : "bg-zinc-100 dark:bg-zinc-800"}`} onClick={() => { onChange(r); setOpen(false); }}>{r}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
