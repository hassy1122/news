"use client";

import React from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className={`max-h-full w-full overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 animate-fade-in ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close" className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-zinc-300 dark:bg-zinc-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}

export function Select<T extends string>({ value, onChange, options, label, className }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label?: string; className?: string;
}) {
  return (
    <span className={className}>
      {label && <span className="label">{label}</span>}
      <select aria-label={label} className="input appearance-auto" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-10" role="status" aria-label="Loading"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
}

export function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card mx-1 my-3 flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-accent">{icon}</div>
      <div className="font-semibold">{title}</div>
      <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
    </div>
  );
}

export function SkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-3 px-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-4">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton mt-2 h-3 w-full" />
          <div className="skeleton mt-1 h-3 w-5/6" />
          <div className="skeleton mt-3 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div className="card mx-1 my-3 border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900 dark:bg-red-950/40" role="alert">
      <div className="font-semibold text-red-700 dark:text-red-300">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-red-700/80 dark:text-red-300/80">{body}</p>
      {onRetry && <button className="btn-primary mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "accent" }) {
  const tones: Record<string, string> = {
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    accent: "bg-accent-soft text-accent",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function ConfirmDialog({ open, title, body, confirmLabel = "Confirm", danger, onConfirm, onCancel }: {
  open: boolean; title: string; body: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 animate-fade-in">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "bg-red-600 text-white" : "btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
