"use client";

import React, { useState } from "react";
import {
  Award, Banknote, Bot, Briefcase, Building2, CalendarDays, DollarSign, FlaskConical,
  Landmark, Search, Server, Sparkles, Trophy, Users, Bookmark, History,
  Sliders, Bell, Palette, Languages, ShieldCheck, Lock,
} from "lucide-react";

export interface MoreItem { id: string; label: string; icon: React.ReactNode; hint: string }

// All "More" destinations — spec §2, item ids are URL slugs (#/more/<id>).
export const MORE_ITEMS: MoreItem[] = [
  { id: "conferences", label: "Conventions & Conferences", icon: <CalendarDays size={20} />, hint: "Tech events & conventions" },
  { id: "internships", label: "Internships", icon: <Briefcase size={20} />, hint: "Internship opportunities" },
  { id: "jobs", label: "Jobs & remote work", icon: <Server size={20} />, hint: "Jobs, remote & freelance" },
  { id: "companies", label: "Top companies", icon: <Building2 size={20} />, hint: "Company rankings (needs data key)" },
  { id: "richest", label: "Richest people", icon: <Trophy size={20} />, hint: "Net-worth rankings (needs data key)" },
  { id: "earnings", label: "Online earning methods", icon: <DollarSign size={20} />, hint: "Realistic earning, risk-flagged" },
  { id: "business", label: "Business & entrepreneurship", icon: <Banknote size={20} />, hint: "Business developments" },
  { id: "ai-tools", label: "New AI tools & releases", icon: <Bot size={20} />, hint: "AI tools, launches, models" },
  { id: "courses", label: "Free courses & certifications", icon: <Award size={20} />, hint: "MOOCs & certificates" },
  { id: "hackathons", label: "Hackathons & tech events", icon: <Sparkles size={20} />, hint: "Competitions & hackathons" },
  { id: "gov", label: "Government programs", icon: <Landmark size={20} />, hint: "Public schemes & programs" },
  { id: "science", label: "Science & research", icon: <FlaskConical size={20} />, hint: "Research developments" },
  { id: "finance", label: "Finance & economy", icon: <Banknote size={20} />, hint: "Economic developments" },
  { id: "custom", label: "Custom topics", icon: <Users size={20} />, hint: "Natural-language topics" },
  { id: "saved", label: "Saved items", icon: <Bookmark size={20} />, hint: "Your bookmarks" },
  { id: "briefings", label: "Briefing history", icon: <History size={20} />, hint: "Past daily briefings" },
  { id: "interests", label: "Interest & exclusion preferences", icon: <Sliders size={20} />, hint: "Personalize relevance" },
  { id: "notifs", label: "Notification settings", icon: <Bell size={20} />, hint: "What may interrupt you" },
  { id: "appearance", label: "Appearance", icon: <Palette size={20} />, hint: "Theme, text, layout" },
  { id: "language", label: "Language", icon: <Languages size={20} />, hint: "Content language" },
  { id: "privacy", label: "Privacy & account", icon: <Lock size={20} />, hint: "Data & security" },
  { id: "sources", label: "Sources & verification", icon: <ShieldCheck size={20} />, hint: "Methodology & feedback" },
];

export function MoreGrid({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = MORE_ITEMS.filter((m) => (m.label + m.hint).toLowerCase().includes(q.toLowerCase()));

  // grouped layout
  const groups: Array<{ title: string; ids: string[] }> = [
    { title: "Categories", ids: ["conferences", "internships", "jobs", "companies", "richest", "earnings", "business", "ai-tools", "courses", "hackathons", "gov", "science", "finance", "custom"] },
    { title: "My information", ids: ["saved", "briefings"] },
    { title: "Preferences", ids: ["interests", "notifs", "appearance", "language", "privacy", "sources"] },
  ];

  const byId = new Map(MORE_ITEMS.map((m) => [m.id, m]));

  return (
    <div className="px-4 pt-3">
      <h1 className="text-xl font-bold">More</h1>
      <div className="relative mt-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input className="input pl-9" placeholder="Search categories and settings…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search More" />
      </div>

      <div className="mt-3 space-y-4 pb-4">
        {groups.map((g) => {
          const items = g.ids.map((id) => byId.get(id)!).filter(Boolean).filter((m) => (m.label + m.hint).toLowerCase().includes(q.toLowerCase()));
          if (!items.length) return null;
          return (
            <section key={g.title}>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{g.title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((m) => (
                  <button
                    key={m.id}
                    className="card flex h-full flex-col items-start gap-1 p-3 text-left transition-shadow hover:shadow-md"
                    onClick={() => onOpen(m.id)}
                  >
                    <span className="text-accent">{m.icon}</span>
                    <span className="text-sm font-medium leading-tight">{m.label}</span>
                    <span className="text-[11px] text-zinc-400">{m.hint}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {/* custom-topic user feeds appear alongside categories via prefs */}
    </div>
  );
}
