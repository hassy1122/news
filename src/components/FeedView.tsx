"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MoreVertical, RefreshCcw, Search, Settings2 } from "lucide-react";
import { usePrefs } from "./prefs-context";
import { CountrySelect } from "./CountrySelect";
import { NewsCard, CompactRow } from "./NewsCard";
import { DetailPage } from "./DetailPage";
import { EmptyState, ErrorState, SkeletonCards, Modal } from "./ui";
import type { CardItem } from "./NewsCard";

/**
 * FeedView — distraction-free main feed (requirement 19).
 * Visible chrome: section name, small country selector, subtle last-updated
 * line, feed. Search / sort / calendar-filters / refresh / settings / view
 * switch live inside the ⋯ overflow menu so they never distract reading.
 */
export function FeedView({ sectionId, title }: { sectionId: string; title: string }) {
  const { prefs, patch, savedIds, toggleSaved } = usePrefs();
  const [items, setItems] = useState<CardItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [schFilter, setSchFilter] = useState<{ degreeLevel: string; funding: string; deadline: "week" | "month" | "any" }>({ degreeLevel: "any", funding: "any", deadline: "any" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastIngest, setLastIngest] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sec = prefs?.sections?.[sectionId];
  const country = sec?.country ?? "PK";
  const daily = sec?.dailyQuantity ?? 5;
  const sort = sec?.sort ?? "latest";
  const appearance = (prefs as any)?.appearance ?? {};
  const layout: "cards" | "list" = appearance.feedLayout ?? "cards";
  const showImages: boolean = appearance.showImages ?? true;
  const language = prefs?.language ?? "en";
  const isSch = sectionId === "scholarships";

  // click-outside for the overflow menu
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const load = useCallback(async (pageNum: number, replace: boolean, appendFrom?: CardItem[]) => {
    setLoading(true); setError(null);
    const sp = new URLSearchParams({ section: sectionId, country, sort, limit: "30", page: String(pageNum) });
    if (q) sp.set("q", q);
    if (isSch) {
      sp.set("degreeLevel", schFilter.degreeLevel);
      sp.set("funding", schFilter.funding);
      sp.set("deadline", schFilter.deadline);
      const nationality = prefs?.sections?.scholarships?.country;
      if (nationality) sp.set("nationality", nationality);
    }
    try {
      const res = await fetch(`/api/feed?${sp}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setItems((prev) => (replace ? j.items : [...(appendFrom ?? prev ?? []), ...j.items]));
      setTotal(j.total);
      setLastIngest(j.lastIngestAt);
    } catch (e) {
      setError({ title: "Could not load this feed", body: `${e instanceof Error ? e.message : e}. Your existing items are kept.` });
    } finally {
      setLoading(false);
    }
  }, [sectionId, country, sort, q, schFilter, prefs, isSch]);

  const pageRef = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    pageRef.current = 0;
    const snapshot = items; // keep shown content while refetching (no blank flash)
    const t = debounce.current;
    clearTimeout(t as unknown as number);
    debounce.current = setTimeout(() => void load(0, true), q ? 250 : 0);
    void snapshot;
    return () => clearTimeout(t as unknown as number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, country, sort, q, schFilter]);

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      const j = await (await fetch("/api/ingest", { method: "POST" })).json();
      if (!j.ok) throw new Error("refresh failed");
    } catch {
      /* last good data stays; the feed reload below proves it */
    } finally {
      setRefreshing(false);
      pageRef.current = 0;
      await load(0, true, items ?? []);
    }
  };

  const setSection = (o: { country?: string; dailyQuantity?: number; sort?: string }) => {
    void patch({ sections: { [sectionId]: o } });
  };

  const openItem = items?.find((x) => x.id === openId) ?? null;

  return (
    <div className="pb-4">
      {/* compact header: name, small country selector, subtle updated time */}
      <div className="sticky top-0 z-20 bg-zinc-50/95 px-4 pb-2 pt-3 backdrop-blur dark:bg-zinc-950/95">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-1.5">
            <CountrySelect value={country} onChange={(c) => setSection({ country: c })} label={`${title} country`} compact />
            <div className="relative" ref={menuRef}>
              <button aria-label="Feed options" aria-expanded={menuOpen} className="btn-ghost p-2" onClick={() => setMenuOpen((o) => !o)}>
                <MoreVertical size={17} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input className="input py-1.5 pl-8 text-sm" placeholder="Search this feed…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search this feed" />
                  </div>
                  <label className="label mt-2">Sort</label>
                  <select className="input py-1.5 text-sm" value={sort} onChange={(e) => { setSection({ sort: e.target.value }); setMenuOpen(false); }}>
                    <option value="latest">Latest (newest first)</option>
                    <option value="important">Most Important</option>
                    <option value="relevant">Most Relevant</option>
                  </select>
                  {isSch && (
                    <>
                      <label className="label mt-2">Degree level</label>
                      <select className="input py-1.5 text-sm" value={schFilter.degreeLevel} onChange={(e) => setSchFilter({ ...schFilter, degreeLevel: e.target.value })}>
                        <option value="any">Any degree level</option>
                        <option value="Bachelor">Undergraduate</option>
                        <option value="Master">Master's</option>
                        <option value="PhD">PhD</option>
                      </select>
                      <label className="label mt-2">Funding & deadline</label>
                      <div className="flex gap-2">
                        <select className="input py-1.5 text-sm" value={schFilter.funding} onChange={(e) => setSchFilter({ ...schFilter, funding: e.target.value })}>
                          <option value="any">Any funding</option>
                          <option value="fully-funded">Fully funded</option>
                          <option value="partial">Partial</option>
                          <option value="stipend">Stipend</option>
                        </select>
                        <select className="input py-1.5 text-sm" value={schFilter.deadline} onChange={(e) => setSchFilter({ ...schFilter, deadline: e.target.value as any })}>
                          <option value="any">Any date</option>
                          <option value="week">Next week</option>
                          <option value="month">Next month</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button className="btn flex-1 border border-zinc-200 dark:border-zinc-700" onClick={() => { void manualRefresh(); setMenuOpen(false); }} disabled={refreshing}>
                      <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button className="btn flex-1 border border-zinc-200 dark:border-zinc-700" onClick={() => { patch({ appearance: { ...appearance, feedLayout: layout === "cards" ? "list" : "cards" } as any }); setMenuOpen(false); }}>
                      {layout === "cards" ? "Compact list" : "Cards"}
                    </button>
                  </div>
                  <button className="btn mt-2 w-full border border-zinc-200 dark:border-zinc-700" onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}>
                    <Settings2 size={14} /> Daily quantity & sort defaults
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {lastIngest && !Number.isNaN(Date.parse(lastIngest)) && (
          <p className="text-[11px] text-zinc-400">Updated {new Date(lastIngest).toLocaleTimeString()}</p>
        )}
        {menuOpen && isSch && <div className="h-36" />}
      </div>

      {/* body — feed only */}
      {error && <ErrorState title={error.title} body={error.body} onRetry={() => void load(0, true, items ?? [])} />}
      {!error && loading && !items && <SkeletonCards />}
      {!error && items && items.length === 0 && (
        <EmptyState
          icon={<RefreshCcw size={24} />}
          title="Nothing eligible here yet"
          body="No item currently qualifies for this country, interest and exclusion combination — or the scheduled refresh hasn't completed. Tap Refresh, or try Worldwide."
        />
      )}
      {!error && items && items.length > 0 && (
        <div className={`flex flex-col ${layout === "cards" ? "gap-2.5" : "gap-1.5"} px-3 pt-2`}>
          {items.map((it) =>
            layout === "cards" ? (
              <NewsCard key={it.id} item={it} onOpen={() => setOpenId(it.id)} showImages={showImages} lang={language} />
            ) : (
              <CompactRow key={it.id} item={it} onOpen={() => setOpenId(it.id)} />
            )
          )}
          {pageRef.current * 30 + (items?.length ?? 0) < total && (
            <div className="flex justify-center py-2">
              <button className="btn text-xs" onClick={() => { pageRef.current += 1; void load(pageRef.current, false); }} disabled={loading}>
                {loading ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* dedicated detail page — overlay keeps the feed state underneath */}
      <DetailPage
        id={openId}
        open={!!openId}
        onClose={() => setOpenId(null)}
        backLabel={title}
        lang={language}
        saved={!!openId && savedIds.has(openId)}
        onToggleSave={() => { if (openItem) void toggleSaved(openItem as any); }}
        showImages={showImages}
      />

      {/* per-section settings (daily briefing quantity + default sort) */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={`${title} — feed preferences`}>
        <div className="space-y-1 text-sm">
          <label className="label">Daily briefing quantity</label>
          <input
            className="input" type="number" min={1} max={30} value={daily}
            onChange={(e) => setSection({ dailyQuantity: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
          />
          <label className="label mt-3">Default sort</label>
          <select className="input" value={sort} onChange={(e) => setSection({ sort: e.target.value })}>
            <option value="latest">Latest (newest first — default)</option>
            <option value="important">Most Important</option>
            <option value="relevant">Most Relevant</option>
          </select>
          <p className="pt-1 text-xs text-zinc-400">The daily briefing always picks the strongest qualifying items — not simply the newest retrieval.</p>
        </div>
      </Modal>
    </div>
  );
}
