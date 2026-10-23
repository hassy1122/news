import fs from "node:fs/promises";
import path from "node:path";
import { defaultPrefs, resetInterestPreferences } from "./prefs-defaults";
import type { Prefs } from "./types";

/**
 * Per-profile preferences storage. Today: local JSON (single-user personal
 * app). The module boundary matches docs/schema.sql so migrating to Supabase
 * storage (with real accounts + row-level security) replaces only this file.
 */

const IS_SERVERLESS = process.env.VERCEL === "1";
const P_DIR = IS_SERVERLESS ? path.join("/tmp", "personal-intel-runtime", "prefs") : path.join(process.cwd(), "data", "runtime", "prefs");

const queue: Promise<unknown> = Promise.resolve();
const mem = new Map<string, Prefs>();
let persistable = true;

export async function loadPrefs(profileId = "local"): Promise<Prefs> {
  if (mem.has(profileId)) return mem.get(profileId)!;
  try {
    const raw = await fs.readFile(path.join(P_DIR, `${profileId}.json`), "utf8");
    const parsed = JSON.parse(raw);
    const prefs = { ...defaultPrefs(profileId), ...parsed, notifications: { ...defaultPrefs(profileId).notifications, ...(parsed.notifications ?? {}) } };
    mem.set(profileId, prefs);
  } catch {
    mem.set(profileId, defaultPrefs(profileId));
  }
  return mem.get(profileId)!;
}

export async function savePrefs(updater: (p: Prefs) => Prefs, profileId = "local"): Promise<Prefs> {
  void queue;
  const current = await loadPrefs(profileId);
  const next = updater(current);
  mem.set(profileId, next); // in-memory is authoritative even if disk writes fail
  if (persistable) {
    try {
      await fs.mkdir(P_DIR, { recursive: true });
      await fs.writeFile(path.join(P_DIR, `${profileId}.json`), JSON.stringify(next, null, 2), "utf8");
    } catch {
      persistable = false; // read-only runtime — keep session-only preferences
    }
  }
  return next;
}

export async function resetInterests(profileId = "local"): Promise<Prefs> {
  return savePrefs((p) => resetInterestPreferences(p), profileId);
}

export async function wipePrefs(profileId = "local"): Promise<Prefs> {
  await savePrefs(() => defaultPrefs(profileId), profileId);
  return defaultPrefs(profileId);
}
