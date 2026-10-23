"use client";

import React from "react";
import { GraduationCap, LayoutGrid, Newspaper, Cpu } from "lucide-react";

export type Tab = "news" | "it" | "scholarships" | "more";

// Tab labels stay in English regardless of content language (spec §11).
const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "news", label: "Top News", icon: <Newspaper size={20} /> },
  { id: "it", label: "Top IT", icon: <Cpu size={20} /> },
  { id: "scholarships", label: "Top Scholarships", icon: <GraduationCap size={20} /> },
  { id: "more", label: "More", icon: <LayoutGrid size={20} /> },
];

export function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              tab === t.id ? "text-accent" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            onClick={() => onTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
