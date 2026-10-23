"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Prefs, NewsItem } from "@/lib/types";

interface PrefsCtx {
  prefs: Prefs | null; // null while loading
  patch: (data: Record<string, unknown>) => Promise<void>;
  action: (type: string, payload?: Record<string, unknown>) => Promise<any>;
  toast: (msg: string, kind?: "info" | "error") => void;
  savedIds: Set<string>;
  toggleSaved: (item: NewsItem) => Promise<void>;
  aiConfigured: boolean;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePrefs outside provider");
  return c;
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; kind: "info" | "error" }>>([]);
  const [aiConfigured, setAiConfigured] = useState(false);

  const toast = useCallback((msg: string, kind: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    fetch("/api/prefs").then((r) => r.json()).then((p) => {
      setPrefs(p);
      // cache appearance for the pre-paint script
      localStorage.setItem("piu.appearance", JSON.stringify((p as any).appearance ?? {}));
    });
    fetch("/api/ingest").then((r) => r.json()).then((s) => setAiConfigured(!!s.aiConfigured)).catch(() => {});
  }, []);

  const applyAppearance = useCallback((p: Prefs) => {
    const a = (p as any).appearance ?? {};
    const d = document.documentElement;
    if (a.accent) d.style.setProperty("--accent", a.accent);
    d.setAttribute("data-text", a.textSize ?? "md");
    const dark = a.theme === "dark" || ((!a.theme || a.theme === "system") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    d.classList.toggle("dark", !!dark && a.theme !== "light");
    d.classList.toggle("high-contrast", !!a.highContrast);
    d.classList.toggle("anim-none", a.animations === false);
    localStorage.setItem("piu.appearance", JSON.stringify(a));
  }, []);

  const patch = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch("/api/prefs", { method: "PUT", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
    const next = await res.json();
    setPrefs(next);
    applyAppearance(next);
  }, [applyAppearance]);

  const action = useCallback(async (type: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch("/api/prefs", { method: "POST", body: JSON.stringify({ type, ...payload }), headers: { "content-type": "application/json" } });
    const j = await res.json();
    if (j?.prefs?.profileId) {
      setPrefs(j.prefs);
      applyAppearance(j.prefs);
    }
    if (!res.ok && j?.error?.formErrors) {
      toast(`Invalid input: ${Object.values(j.error.formErrors).flat().join(", ")}`, "error");
    }
    return j;
  }, [applyAppearance, toast]);

  const toggleSaved = useCallback(async (item: NewsItem) => {
    if (!prefs) return;
    const has = prefs.saved.some((s) => s.itemId === item.id);
    await action("toggle-item", { itemId: item.id, snapshot: item });
    toast(has ? "Removed from saved items." : "Saved. Find it under More → Saved items.");
  }, [prefs, action, toast]);

  const value = useMemo<PrefsCtx>(() => ({
    prefs, patch, action, toast,
    savedIds: new Set(prefs?.saved.map((s) => s.itemId) ?? []),
    toggleSaved,
    aiConfigured,
  }), [prefs, patch, action, toast, toggleSaved, aiConfigured]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md rounded-xl px-4 py-2.5 text-sm shadow-lg animate-fade-in ${
              t.kind === "error" ? "bg-red-600 text-white" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
