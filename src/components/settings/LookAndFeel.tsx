"use client";

import React, { useState } from "react";
import { usePrefs } from "../prefs-context";
import { Toggle } from "../ui";
import { Contrast, Languages, Moon, Sun } from "lucide-react";

const ACCENTS: Array<{ name: string; rgb: string }> = [
  { name: "Indigo", rgb: "79 70 229" },
  { name: "Emerald", rgb: "5 150 105" },
  { name: "Rose", rgb: "225 29 72" },
  { name: "Amber", rgb: "217 119 6" },
  { name: "Sky", rgb: "2 132 199" },
  { name: "Violet", rgb: "124 58 237" },
];

export function AppearancePage() {
  const { prefs, patch } = usePrefs();
  if (!prefs) return null;
  const a = ((prefs as any).appearance ?? {}) as Record<string, any>;
  const set = (patchData: Record<string, any>) => void patch({ appearance: { ...a, ...patchData } });

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Saved with your other preferences and re-applied before the first paint of every load. The four navigation labels stay English (by design).</p>

        <div className="mt-3">
          <p className="label">Theme</p>
          <div className="flex gap-2">
            {[["light", "Light", <Sun size={15} key="l" />], ["dark", "Dark", <Moon size={15} key="d" />], ["system", "System default", <Contrast size={15} key="s" />]].map(([v, label, icon]) => (
              <button key={v as string} onClick={() => set({ theme: v })} className={`btn ${a.theme === v || (!a.theme && v === "system") ? "btn-primary" : ""}`}>
                {icon} {label as string}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="label">Accent color</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c.rgb}
                aria-label={`Accent ${c.name}`}
                onClick={() => set({ accent: c.rgb })}
                className={`h-8 w-8 rounded-full ring-offset-2 ${a.accent === c.rgb ? "ring-2 ring-zinc-500" : ""}`}
                style={{ background: `rgb(${c.rgb})` }}
              />
            ))}
            <label className="btn cursor-pointer items-center" title="Custom accent color">
              Custom
              <input
                type="color"
                className="ml-2 h-6 w-8 cursor-pointer bg-transparent"
                onChange={(e) => {
                  const hex = e.target.value.replace("#", "");
                  set({ accent: `${parseInt(hex.slice(0, 2), 16)} ${parseInt(hex.slice(2, 4), 16)} ${parseInt(hex.slice(4, 6), 16)}` });
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <label className="label">Text size
            <select className="input" value={a.textSize ?? "md"} onChange={(e) => set({ textSize: e.target.value })}>
              <option value="sm">Small</option>
              <option value="md">Medium (default)</option>
              <option value="lg">Large</option>
              <option value="xl">Extra large</option>
            </select>
          </label>
          <label className="label">Reading layout
            <select className="input" value={a.readingDensity ?? "standard"} onChange={(e) => set({ readingDensity: e.target.value })}>
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>
          <label className="label">Feed cards
            <select className="input" value={a.feedLayout ?? "cards"} onChange={(e) => set({ feedLayout: e.target.value })}>
              <option value="cards">Card view</option>
              <option value="list">Compact list view</option>
            </select>
          </label>
        </div>

        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Toggle checked={a.showImages !== false} onChange={(v) => set({ showImages: v })} label="Show relevant images" hint="Off = text-only cards; images only ever come from the publisher item" />
          <Toggle checked={a.animations !== false} onChange={(v) => { set({ animations: v }); }} label="Enable animations" hint="Subtle transitions and toasts" />
          <Toggle checked={!!a.highContrast} onChange={(v) => set({ highContrast: v })} label="High-contrast mode" hint="Stronger text contrast for accessibility" />
        </div>
      </section>
    </div>
  );
}

export function LanguagePage() {
  const { prefs, patch, aiConfigured, toast } = usePrefs();
  if (!prefs) return null;

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Language</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Content language for headlines, summaries and briefings. The interface — including the four primary
          navigation tabs — stays in English. Names, numbers, dates, URLs and technical terms are preserved exactly.
        </p>
        <div className="mt-3 flex gap-2">
          <button className={`btn ${prefs.language === "en" ? "btn-primary" : ""}`} onClick={() => void patch({ language: "en" })}>
            <Languages size={15} /> English (default)
          </button>
          <button className={`btn ${prefs.language === "ur" ? "btn-primary" : ""}`} onClick={() => void patch({ language: "ur" })}>
            اردو / Urdu
          </button>
        </div>
        {!aiConfigured && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Urdu translation needs the AI key (AI_API_KEY) — summaries remain clearly-labelled original-language
            content and are never machine-faked by a dictionary. Every detail view keeps the original source
            available. Once the key is configured, translated items are labelled “Translated (AI)”.
          </p>
        )}
        {aiConfigured && (
          <p className="mt-3 text-xs text-zinc-400">AI configured: Urdu reads are translated and labelled in each detail view, with “Show original language” available.</p>
        )}
      </section>
    </div>
  );
}