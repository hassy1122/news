"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PrefsProvider, usePrefs } from "@/components/prefs-context";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { FeedView } from "@/components/FeedView";
import { MoreGrid } from "@/components/MoreGrid";
import { InterestsPage, ExclusionsPage, CustomTopicsPage } from "@/components/settings/Preferences";
import { NotifsPage } from "@/components/settings/Notifs";
import { AppearancePage, LanguagePage } from "@/components/settings/LookAndFeel";
import { SavedPage, BriefingsPage, SourcesPage, PrivacyPage, RichestPage, CompaniesPage } from "@/components/settings/MorePages";
import { MORE_ITEMS } from "@/components/MoreGrid";

/**
 * App shell — exactly four primary navigation tabs (Top News, Top IT,
 * Top Scholarships, More). All other destinations are hash-routed under More,
 * so the bottom navigation never grows.
 */

function routeTab(): { tab: Tab; more?: string } {
  const h = location.hash.replace(/^#\/?/, "");
  if (!h || h === "news") return { tab: "news" };
  if (h === "it") return { tab: "it" };
  if (h === "scholarships") return { tab: "scholarships" };
  if (h.startsWith("more/")) return { tab: "more", more: h.slice(5) };
  if (h === "more") return { tab: "more" };
  return { tab: "news" };
}

function AppInner() {
  const { prefs } = usePrefs();
  const [route, setRoute] = useState<{ tab: Tab; more?: string }>({ tab: "news", more: undefined });

  useEffect(() => {
    const onHash = () => setRoute(routeTab());
    window.addEventListener("hashchange", onHash);
    setRoute(routeTab());
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((tab: Tab, more?: string) => {
    const hash = !more ? (tab === "news" ? "#/news" : tab === "it" ? "#/it" : tab === "scholarships" ? "#/scholarships" : "#/more") : `#/more/${more}`;
    location.hash = hash;
    setRoute(more ? { tab, more } : { tab });
    window.scrollTo({ top: 0 });
  }, []);

  if (!prefs) {
    return <div className="flex h-screen items-center justify-center text-sm text-zinc-500">Loading your assistant…</div>;
  }

  let body: React.ReactNode;
  switch (route.tab) {
    case "news":
      body = <FeedView sectionId="topnews" title="Top News" />;
      break;
    case "it":
      body = <FeedView sectionId="topit" title="Top IT" />;
      break;
    case "scholarships":
      body = <FeedView sectionId="scholarships" title="Top Scholarships" />;
      break;
    case "more":
      if (route.more === "interests") body = <SubPage title="Interest & exclusion preferences"><InterestsPage /><ExclusionsPage /></SubPage>;
      else if (route.more === "custom") body = <SubPage title="Custom topics"><CustomTopicsPage /></SubPage>;
      else if (route.more === "notifs") body = <SubPage title="Notification settings"><NotifsPage /></SubPage>;
      else if (route.more === "appearance") body = <SubPage title="Appearance"><AppearancePage /></SubPage>;
      else if (route.more === "language") body = <SubPage title="Language"><LanguagePage /></SubPage>;
      else if (route.more === "saved") body = <SavedPage />;
      else if (route.more === "briefings") body = <BriefingsPage />;
      else if (route.more === "privacy") body = <PrivacyPage />;
      else if (route.more === "sources") body = <SourcesPage />;
      else if (route.more === "richest") body = <RichestPage />;
      else if (route.more === "companies") body = <CompaniesPage />;
      else if (route.more && MORE_ITEMS.some((m) => m.id === route.more)) {
        const label = MORE_ITEMS.find((m) => m.id === route.more)!.label;
        body = <FeedView sectionId={route.more!} title={label} />;
      } else {
        body = <MoreGrid onOpen={(id) => go("more", id)} />;
      }
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-24">
      {body}
      <BottomNav tab={route.tab} onTab={(t) => go(t)} />
    </div>
  );
}

function SubPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="px-4 pt-3 text-xl font-bold">{title}</h1>
      <div className="mt-2 space-y-4">{children}</div>
    </div>
  );
}

export default function Page() {
  return (
    <PrefsProvider>
      <AppInner />
    </PrefsProvider>
  );
}
