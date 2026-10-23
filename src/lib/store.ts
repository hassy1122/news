import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * JSON file store — the local, zero-config database.
 *
 * Deliberately simple: a personal app with one user. The access surface
 * (loadAll/saveAll) was designed so that swapping the persistence layer for
 * Supabase (docs/schema.sql) touches only this file.
 */

const DATA_DIR = path.join(process.cwd(), "data");

// Serverless hosts (Vercel, Netlify…) mount the working directory read-only and
// only expose /tmp as writable — persist there when deployed there.
const IS_SERVERLESS = process.env.VERCEL === "1";
const STORE_DIR = IS_SERVERLESS ? path.join("/tmp", "personal-intel-runtime") : path.join(DATA_DIR, "runtime");
const STORE_FILE = path.join(STORE_DIR, "store.json");

export interface StoreShape {
  version: 1;
  items: Record<string, import("./types").NewsItem>; // keyed by id (sha1 of url)
  briefings: import("./types").Briefing[];
  logs: JobLog[];
  meta: Record<string, string | number | null>; // counters, run bookkeeping
}

export interface JobLog {
  time: string;
  job: "ingest" | "cleanup" | "briefing" | "notify";
  ok: boolean;
  detail: string;
  stats?: Record<string, number | string>;
  retries?: number;
}

const EMPTY: StoreShape = { version: 1, items: {}, briefings: [], logs: [], meta: {} };

let cache: StoreShape | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function ensureDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

/** false once a write proves the runtime directory is not writable — the store
 *  then degrades to in-memory persistence for the lifetime of this process
 *  (a deployed serverless function), which keeps every API call working. */
let persistable = true;

export async function loadAll(force = false): Promise<StoreShape> {
  if (cache && !force) return cache;
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    cache = { ...EMPTY, ...parsed, items: parsed.items ?? {}, briefings: parsed.briefings ?? [], logs: parsed.logs ?? [], meta: parsed.meta ?? {} };
  } catch {
    cache = { ...EMPTY };
    cache.meta = { seeded: null };
  }
  return cache;
}

export async function saveAll(mutate: (s: StoreShape) => void): Promise<void> {
  queue = queue.then(async () => {
    const s = await loadAll();
    mutate(s);
    if (s.logs.length > 300) s.logs = s.logs.slice(-300);
    if (s.briefings.length > 120) s.briefings = s.briefings.slice(-120);
    cache = s; // in-memory is authoritative even if disk writes fail
    if (!persistable) return;
    try {
      await ensureDir();
      const tmp = STORE_FILE + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(s), "utf8");
      await fs.rename(tmp, STORE_FILE).catch(async () => {
        // Windows occasionally denies rename on fresh locks — retry once
        await fs.rename(tmp, STORE_FILE);
      });
    } catch {
      persistable = false; // read-only runtime (e.g. serverless without /tmp)
    }
  });
  try {
    await queue;
  } catch (e) {
    cache = null; // force re-read next time
    throw e;
  }
}

export async function wipe() {
  cache = { ...EMPTY };
  cache.meta = { seeded: null };
  if (!persistable) return;
  try {
    await ensureDir();
    await fs.writeFile(STORE_FILE, JSON.stringify(cache), "utf8");
  } catch {
    persistable = false;
  }
}

export function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 20);
}

export function log(job: JobLog["job"], ok: boolean, detail: string, stats?: JobLog["stats"]) {
  return saveAll((s) => {
    s.logs.push({ time: new Date().toISOString(), job, ok, detail, stats });
  });
}
