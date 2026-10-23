import fs from "node:fs/promises";
import path from "node:path";
import { defaultPrefs, resetInterestPreferences } from "./prefs-defaults";
import type { Prefs } from "./types";

/**
 * Per-profile preferences storage. Today: local JSON (single-user personal
 * app). The module boundary matches docs/schema.sql so migrating to Supabase
 * storage (with real accounts + row-level security) replaces only this file.
 */

const P_DIR = path.join(process.cwd(), "data", "runtime", "prefs");

const queue: Promise<unknown> = Promise.resolve();

export async function loadPrefs(profileId = "local"): Promise<Prefs> {
  try {
    const raw = await fs.readFile(path.join(P_DIR, `${profileId}.json`), "utf8");
    const parsed = JSON.parse(raw);
    return { ...defaultPrefs(profileId), ...parsed, notifications: { ...defaultPrefs(profileId).notifications, ...(parsed.notifications ?? {}) } };
  } catch {
    return defaultPrefs(profileId);
  }
}

export async function savePrefs(updater: (p: Prefs) => Prefs, profileId = "local"): Promise<Prefs> {
  await queue;
  const current = await loadPrefs(profileId);
  const next = updater(current);
  await fs.mkdir(P_DIR, { recursive: true });
  await fs.writeFile(path.join(P_DIR, `${profileId}.json`), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function resetInterests(profileId = "local"): Promise<Prefs> {
  return savePrefs((p) => resetInterestPreferences(p), profileId);
}

export async function wipePrefs(profileId = "local"): Promise<Prefs> {
  await savePrefs(() => defaultPrefs(profileId), profileId);
  return defaultPrefs(profileId);
}
