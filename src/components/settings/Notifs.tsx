"use client";

import React, { useEffect, useState } from "react";
import { BellRing, History, SendHorizonal, Trash2 } from "lucide-react";
import { usePrefs } from "../prefs-context";
import { Toggle, Badge, EmptyState } from "../ui";

export function NotifsPage() {
  const { prefs, action, toast } = usePrefs();
  const [permission, setPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  if (!prefs) return null;
  const n = prefs.notifications;

  const setN = (patch: Record<string, unknown>) => void action("notif-settings", { patch });

  /**
   * Permission is requested ONLY here, upon the user's explicit choice to
   * enable master notifications — never on app load (spec §6.A).
   */
  const enableMaster = async (on: boolean) => {
    if (!on) { setN({ enabled: false }); return; }
    if (typeof Notification === "undefined") {
      setN({ enabled: true, permissionAsked: true });
      toast("This browser does not support the Notification API — in-app alerts only.", "error");
      return;
    }
    if (Notification.permission === "denied") {
      setN({ enabled: true, permissionAsked: true });
      toast("Browser notifications are blocked in site settings. In-app alerts will still work.", "error");
      return;
    }
    if (Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res !== "granted") {
        setN({ enabled: true, permissionAsked: true });
        toast("No problem — in-app alerts remain available; you can grant permission later in the browser.", "error");
        return;
      }
    }
    setN({ enabled: true, permissionAsked: true });
    toast("Notifications enabled. Alerts respect quiet hours, caps, exclusions and duplicates.");
  };

  const sendTest = async () => {
    const res = await fetch("/api/notify", { method: "POST", body: JSON.stringify({ type: "test", permissionAsked: true }), headers: { "content-type": "application/json" } });
    const j = await res.json();
    if (j.record) {
      try {
        const reg = await navigator.serviceWorker?.ready?.catch?.(() => null) ?? null;
        if (reg) await reg.showNotification(j.record.title, { body: j.record.body });
        else if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(j.record.title, { body: j.record.body });
        else toast(`${j.record.title} — shown in-app only (permission not granted).`);
      } catch {
        toast("In-app: " + j.record.title);
      }
    }
  };

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Notification Settings</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          You decide exactly what may interrupt you. Before any notification is sent the system checks: your enabled
          categories → interests & exclusions → country/eligibility → credibility → duplicates → currency → quiet hours
          and frequency caps. Excluded topics never notify.
        </p>

        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Toggle
            checked={n.enabled}
            onChange={enableMaster}
            label="Master notification toggle"
            hint={permission === "granted" ? "Browser permission granted ✓" : permission === "denied" ? "Permission blocked in browser settings — in-app alerts only" : "Asks for browser permission when you enable this"}
          />
          <Toggle checked={n.briefingAlert} onChange={(v) => setN({ briefingAlert: v })} label="Daily briefing notification" hint={`Sent after the ${prefs.briefingTime} ${prefs.timezone} briefing is generated`} />
          <Toggle checked={n.importantNews} onChange={(v) => setN({ importantNews: v })} label="Important-news alerts" hint="High-impact verified news only" />
          <Toggle checked={n.itOpportunities} onChange={(v) => setN({ itOpportunities: v })} label="New IT opportunity alerts" />
          <Toggle checked={n.scholarshipAlerts} onChange={(v) => setN({ scholarshipAlerts: v })} label="New scholarship alerts" />
          <Toggle checked={n.deadlineReminders} onChange={(v) => setN({ deadlineReminders: v })} label="Upcoming deadline reminders" hint="72 hours before a tracked closing" />
          <Toggle checked={n.emailEnabled} onChange={(v) => { setN({ emailEnabled: v }); if (v) toast("Email delivery needs an email-service key (see README). Nothing sends until then — no pretend emails.", "error"); }} label="Email notifications" hint="Requires an email provider key; disabled until configured" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <label className="label">All enabled categories / only my topics
            <select className="input" value={n.topicMode} onChange={(e) => setN({ topicMode: e.target.value })}>
              <option value="selected">Only my selected topics</option>
              <option value="all">All enabled categories (respects exclusions)</option>
            </select>
          </label>
          <label className="label">Default for new interests
            <select className="input" value={String(n.perInterestDefault)} onChange={(e) => setN({ perInterestDefault: e.target.value === "true" })}>
              <option value="false">No notifications</option>
              <option value="true">In daily briefing</option>
            </select>
          </label>
          <label className="label">Quiet hours start
            <input className="input" type="time" value={n.quietStart} onChange={(e) => setN({ quietStart: e.target.value })} />
          </label>
          <label className="label">Quiet hours end
            <input className="input" type="time" value={n.quietEnd} onChange={(e) => setN({ quietEnd: e.target.value })} />
          </label>
          <label className="label">Max notifications / hour
            <input className="input" type="number" min={1} max={20} value={n.maxPerHour} onChange={(e) => setN({ maxPerHour: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label className="label">Max notifications / day
            <input className="input" type="number" min={1} max={100} value={n.maxPerDay} onChange={(e) => setN({ maxPerDay: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={sendTest}><SendHorizonal size={15} /> Send a real test notification</button>
          <button className="btn" onClick={() => void action("notif-clear")}><Trash2 size={15} /> Clear history</button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Background delivery while the app is closed needs Web Push (VAPID) — see README. Until configured, alerts
          generated without an open window are recorded as “generated — not delivered”, never as delivered.
        </p>
      </section>

      <section className="card p-4">
        <h3 className="flex items-center gap-2 font-semibold"><History size={16} /> Notification history</h3>
        {prefs.notificationHistory.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing has been generated yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {prefs.notificationHistory.slice(0, 25).map((h) => (
              <li key={h.id} className="rounded-xl border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="min-w-0 flex-1 truncate">{h.title}</strong>
                  <Badge tone={h.delivery === "delivered-live" ? "green" : h.delivery.startsWith("suppressed") ? "amber" : "neutral"}>{h.delivery}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">{new Date(h.createdAt).toLocaleString()} · {h.topic}{h.sourceName ? ` · ${h.sourceName}` : ""}</div>
                {h.note && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{h.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
