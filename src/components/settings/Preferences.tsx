"use client";

import React, { useState } from "react";
import { EyeOff, Plus, RotateCcw, Trash2, Wand2, Eye } from "lucide-react";
import { usePrefs } from "../prefs-context";
import { ConfirmDialog, EmptyState, Modal, Toggle, Badge } from "../ui";
import { CountrySelect } from "../CountrySelect";

// ── Interested In ─────────────────────────────────────────────────────────
export function InterestsPage() {
  const { prefs, action, toast } = usePrefs();
  const [text, setText] = useState("");
  const [country, setCountry] = useState("WW");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [notify, setNotify] = useState<"off" | "immediate" | "digest" | "briefing">("off");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");

  if (!prefs) return null;

  const add = async () => {
    const t = text.trim();
    if (t.length < 2) { toast("Write at least a few characters.", "error"); return; }
    const res = await action("add-interest", { text: t, country, priority, notify });
    if (res?.ok) {
      toast(res.includes?.length
        ? `Added. Related tracking: ${res.includes.join(", ") || "custom topic"}.`
        : "Added as a custom topic (matched by wording).");
      setText("");
    }
  };

  const interests = prefs.interests;

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Interested In — Show Me More</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter keywords, phrases, organizations, technologies, people, industries or complete topic descriptions.
          The matcher understands related topics, alternative terms and entities — e.g. “Artificial Intelligence”
          also matches OpenAI, LLMs, generative models and AI tools. Interests boost ranking; they never bypass
          verification, freshness or your exclusions.
        </p>

        <div className="mt-3 space-y-2">
          <input className="input" placeholder='e.g. "Fully funded scholarships in Germany"' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} aria-label="New interest" />
          <div className="flex flex-wrap items-center gap-2">
            <CountrySelect value={country} onChange={setCountry} label="Interest country (optional)" compact />
            <select aria-label="Priority" className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="low">Low priority</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
            </select>
            <select aria-label="Notification preference" className="input w-auto" value={notify} onChange={(e) => setNotify(e.target.value as any)}>
              <option value="off">No notifications</option>
              <option value="immediate">Immediate notifications</option>
              <option value="digest">Digest</option>
              <option value="briefing">In daily briefing</option>
            </select>
            <button className="btn-primary" onClick={add}><Plus size={15} /> Add interest</button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {interests.length === 0 && (
            <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
              No interests yet — with none set, all feeds use a neutral relevance ranking.
            </p>
          )}
          {interests.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium">{i.text}</span>
                <span className="text-xs text-zinc-400">
                  {i.country && i.country !== "WW" ? `${i.country} · ` : ""}priority {i.priority} · notifications {i.notify.mode}
                </span>
              </div>
              <select aria-label={`Notify mode for ${i.text}`} className="input w-auto text-xs" value={i.notify.mode} onChange={(e) => void action("update-interest", { id: i.id, patch: { notify: { ...i.notify, mode: e.target.value } } })}>
                <option value="off">Notify: off</option>
                <option value="immediate">Notify: immediate</option>
                <option value="digest">Notify: digest</option>
                <option value="briefing">Notify: in briefing</option>
              </select>
              <Toggle checked={i.enabled} onChange={(v) => void action("update-interest", { id: i.id, patch: { enabled: v } })} label="Enabled" />
              <button aria-label={`Remove ${i.text}`} className="btn-ghost p-1.5" onClick={() => void action("remove-interest", { id: i.id })}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn" onClick={() => setPreviewOpen(true)}><Eye size={15} /> Test a topic (preview)</button>
        </div>

        <ResetInterestsButton />
      </section>

      <PreferenceTester open={previewOpen} setOpen={setPreviewOpen} previewText={previewText} setPreviewText={setPreviewText} />
    </div>
  );
}

function ResetInterestsButton() {
  const { action } = usePrefs();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button className="btn mt-3 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400" onClick={() => setConfirm(true)} disabled={busy}>
        <RotateCcw size={15} /> Reset Interest Preferences
      </button>
      <ConfirmDialog
        open={confirm}
        title="Reset Interest Preferences?"
        body="This clears ALL “Interested In” entries and ALL “Not Interested In” exclusions permanently. Your saved items, settings, language, notification schedules and account data are NOT affected."
        confirmLabel="Confirm Reset"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          await action("reset-interests");
          setBusy(false);
          setConfirm(false);
        }}
      />
    </>
  );
}

// ── Not Interested In ─────────────────────────────────────────────────────
export function ExclusionsPage() {
  const { prefs, action, toast } = usePrefs();
  const [text, setText] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [exception, setException] = useState("");
  if (!prefs) return null;

  const add = async () => {
    const t = text.trim();
    if (t.length < 2) { toast("Write at least a few characters.", "error"); return; }
    const res = await action("add-exclusion", { text: t, scope: scope === "all" ? "all" : [scope], exception: exception.trim() || undefined });
    if (res?.ok) {
      toast("Exclusion added. Explicit exclusions always outweigh interests.");
      setText(""); setException("");
    }
  };

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Not Interested In — Hide This Content</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Keywords, people, organizations, categories or whole topics you never want to see. Matching is
          concept-based (e.g. “Celebrity Gossip” also hides closely related showbiz items), but an article that
          only <em>mentions</em> an excluded word in passing is kept with a note, not blindly deleted. Unrelated
          elements can never be hidden because of an accidental word match.
        </p>
        <div className="mt-3 space-y-2">
          <input className="input" placeholder='e.g. "Cryptocurrency promotions"' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} aria-label="New exclusion" />
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Exclusion scope" className="input w-auto" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">Apply in all sections</option>
              <option value="topnews">Only Top News</option>
              <option value="topit">Only Top IT</option>
              <option value="scholarships">Only Top Scholarships</option>
            </select>
            <input className="input w-auto flex-1" placeholder="Exception topic (optional)" value={exception} onChange={(e) => setException(e.target.value)} aria-label="Exception topic" />
            <button className="btn bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={add}><Plus size={15} /> Add exclusion</button>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {prefs.exclusions.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium"><EyeOff size={13} className="mr-1 inline align-[-2px]" /> {x.text}</span>
                <span className="text-xs text-zinc-400">
                  {x.scope === "all" ? "all sections" : `in ${(x.scope as string[]).join(", ")}`}
                  {x.exception ? ` · exception: “${x.exception}”` : ""}
                </span>
              </div>
              <Toggle checked={x.enabled} onChange={(v) => void action("update-interest", { id: x.id, patch: { enabled: v } })} label="Enabled" />
              <button aria-label={`Remove exclusion ${x.text}`} className="btn-ghost p-1.5" onClick={() => void action("remove-exclusion", { id: x.id })}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Preference tester (transparency preview) ──────────────────────────────
export function PreferenceTester({ open, setOpen, previewText, setPreviewText }: {
  open: boolean; setOpen: (v: boolean) => void; previewText: string; setPreviewText: (v: string) => void;
}) {
  const { action } = usePrefs();
  const [result, setResult] = useState<{ visible: boolean; reason: string; sampleMatches: Array<{ title: string; url: string; source: string }> } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setResult(null);
    const res = await action("preview-match", { text: previewText });
    setResult(res);
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Test how matching will handle a topic">
      <div className="space-y-3 text-sm">
        <input className="input" placeholder='e.g. "AI tools announcement" or a pasted headline' value={previewText} onChange={(e) => setPreviewText(e.target.value)} aria-label="Sample topic" />
        <button className="btn-primary" onClick={run} disabled={busy || previewText.length < 3}><Wand2 size={15} /> {busy ? "Checking…" : "Check matching"}</button>
        {result && (
          <div className="space-y-2">
            <div className={`rounded-xl px-3 py-2 ${result.visible ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
              <strong>{result.visible ? "Will be shown" : "Will be hidden"}.</strong> {result.reason}
            </div>
            {result.sampleMatches?.length > 0 && (
              <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/60">
                <p className="mb-1 font-medium">Currently matching live items:</p>
                {result.sampleMatches.map((m, i) => (
                  <div key={i} className="truncate">• <a className="text-accent underline" href={m.url} target="_blank" rel="noreferrer noopener">{m.title}</a> — {m.source}</div>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-400">Matching rules only — internal internals are never exposed.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Custom topics ─────────────────────────────────────────────────────────
export function CustomTopicsPage() {
  const { prefs, action, toast, aiConfigured } = usePrefs();
  const [desc, setDesc] = useState("");
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!prefs) return null;

  const parse = async () => {
    setBusy(true); setParsed(null); setGuidance(null);
    const res = await fetch("/api/prefs", { method: "PATCH", body: JSON.stringify({ description: desc }), headers: { "content-type": "application/json" } });
    const j = await res.json();
    setBusy(false);
    if (j.parsed) setParsed(j.parsed);
    else setGuidance(j.guidance ?? "Click below to create manually.");
  };

  const defaults = (p: any) => ({
    section: p?.section ?? "topit",
    quantityPerDay: p?.quantityPerDay ?? 5,
    keywords: p?.keywords ?? [],
    excludeKeywords: p?.excludeKeywords ?? [],
    country: p?.country ?? "WW",
    remoteOnly: !!p?.remoteOnly,
    requireOfficialApplicationPage: !!p?.requireOfficialApplicationPage,
    notify: p?.notify ?? "off",
    parsedBy: p ? "ai" : "heuristic",
  });

  const save = async () => {
    const p = defaults(parsed);
    const name = desc.trim().slice(0, 60) || "My topic";
    const res = await action("add-custom-topic", { name, description: desc, prefs: p });
    if (res?.ok) { toast("Custom topic saved — it appears under More → My topics."); setDesc(""); setParsed(null); }
  };

  const manual = () => {
    setParsed({ quantityPerDay: 5, keywords: [], excludeKeywords: [], section: "topit", notify: "off", country: "WW", remoteOnly: false, requireOfficialApplicationPage: false, parsedBy: "heuristic" });
    setGuidance(null);
  };

  const value = defaults(parsed) as any;
  void value;

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Custom Topics</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Describe what you want in everyday language, e.g. “Show me five new AI internships available to
          Pakistani applicants every morning. Include remote opportunities, exclude expired listings, and notify
          me only when an official application page is available.”
        </p>
        <textarea className="input mt-3 min-h-24" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Custom topic description" />
        <div className="mt-2 flex gap-2">
          <button className="btn-primary" onClick={parse} disabled={busy || desc.length < 10}>
            <Wand2 size={15} /> Parse with AI {busy && "…"}
          </button>
          <button className="btn" onClick={manual}>Manual builder</button>
        </div>
        {!aiConfigured && !parsed && <p className="mt-2 text-xs text-zinc-400">AI parsing is available after configuring an AI key — meanwhile the manual builder below covers the same options.</p>}
        {guidance && <p className="mt-2 text-xs text-amber-600">{guidance}</p>}
        {parsed && (
          <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
            <p className="font-medium">Review before saving</p>
            <div className="grid grid-cols-2 gap-2">
              <label>Section
                <select className="input" defaultValue={String((parsed as any).section ?? "topit")} onChange={(e) => { (parsed as any).section = e.target.value; }}>
                  <option value="topit">Top IT</option>
                  <option value="scholarships">Top Scholarships</option>
                  <option value="topnews">Top News</option>
                  <option value="any">All sections</option>
                </select>
              </label>
              <label>Quantity / day
                <input className="input" type="number" min={1} max={20} defaultValue={Number((parsed as any).quantityPerDay ?? 5)} onChange={(e) => { (parsed as any).quantityPerDay = Number(e.target.value); }} />
              </label>
              <label>Keywords
                <input className="input" defaultValue={((parsed as any).keywords ?? []).join(", ")} onChange={(e) => { (parsed as any).keywords = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); }} />
              </label>
              <label>Should not include
                <input className="input" defaultValue={((parsed as any).excludeKeywords ?? []).join(", ")} onChange={(e) => { (parsed as any).excludeKeywords = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); }} />
              </label>
              <label>Notify
                <select className="input" defaultValue={String((parsed as any).notify ?? "off")} onChange={(e) => { (parsed as any).notify = e.target.value; }}>
                  <option value="off">Off</option>
                  <option value="immediate">Immediate</option>
                  <option value="digest">Digest</option>
                  <option value="briefing">In daily briefing</option>
                </select>
              </label>
              <div className="flex items-end">
                <Toggle checked={!!(parsed as any).requireOfficialApplicationPage} onChange={(v) => { (parsed as any).requireOfficialApplicationPage = v; setParsed({ ...parsed }); }} label="Only official application pages" />
              </div>
            </div>
            <button className="btn-primary" onClick={save}>Save topic</button>
          </div>
        )}
      </section>
      {prefs.customTopics.length > 0 && (
        <section className="card p-4">
          <h3 className="font-medium">My topics</h3>
          {prefs.customTopics.map((t) => (
            <div key={t.id} className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <span className="block truncate">{t.name}</span>
                <span className="text-xs text-zinc-400">{t.prefs.keywords.join(", ") || "no keywords"} · {t.prefs.quantityPerDay}/day · notify {t.prefs.notify.mode}</span>
              </div>
              <button className="btn-ghost p-1.5" onClick={() => void action("remove-custom-topic", { id: t.id })}><Trash2 size={15} /></button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
