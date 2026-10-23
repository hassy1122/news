# Personal Intel — your daily information assistant

A personal news, intelligence & opportunities app. It automatically **finds, filters, verifies, summarizes and delivers** the most useful, recent, relevant, credible and actionable information — with minimal reading.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**. Runs locally with **zero required API keys** (free RSS ingestion + a local JSON database). Every optional integration (AI translation/summaries, extra sources, Web Push, Supabase) degrades **honestly** when unconfigured — nothing is faked.

---

## Quick start

```bash
npm install
npm run dev            # open http://localhost:3000
```

First data arrives after the first ingest. To fill immediately:

```bash
npm run ingest         # one-shot: ingest + expiry sweep (+ briefing if due)
```

Continuous background updates (even with the browser closed):

```bash
npm run worker         # refreshes every 15 min; generates the 8:00 briefing
```

Tests, type check, production run:

```bash
npm test               # 32 automated checks of core logic
npm run typecheck
npm run build && npm start
```

## The four tabs (fixed, English labels — content language never changes them)

| Tab | What it does |
|---|---|
| **Top News** | Major national/international, politics, economy, science, public safety. Default country **Pakistan**, first option **Worldwide**, **5 items/day** briefing default (customizable). |
| **Top IT** | AI, software/web dev, security, cloud, product releases + verified internships/jobs/hackathons/courses with eligibility, remote status, deadline, official link. |
| **Top Scholarships** | Fully/partially funded programs — a live feed **plus an official-programs catalog** (Chevening, DAAD, Erasmus Mundus, Fulbright/USEFP, Commonwealth, MEXT, Rhodes, Gates Cambridge, Australia Awards, Clarendon) — each with host, destination, level, funding, nationality, **annual-cycle deadline note** (exact dates must be confirmed on the official page), and official application link. |
| **More** | Everything else (searchable grid): 14 category feeds, saved items, briefing history, custom topics, interest & exclusion preferences, notification settings, appearance, language, privacy, sources & methodology. |

Country selections are **stored per section independently**; the selector is searchable with Worldwide first; flags+name. Scholarships distinguish **applicant nationality** from **destination**; jobs distinguish **employer location** from **remote availability**.

## Personalization: Interest & Exclusion Preferences (More → Interest & exclusion preferences)

- **Interested In** — free-text topics ("Artificial Intelligence", "OpenAI", "Remote developer jobs"…). The engine expands concepts via a synonym/entity taxonomy (adding "AI" also matches LLMs, OpenAI, DeepMind, genAI tools…), and boosts ranking — without bypassing verification, freshness or your exclusions. Each interest: enable/disable, optional country, priority, notification mode, and a plain-language explanation of what it includes.
- **Not Interested In** — keywords/organizations/categories with `semantic` type. Explicit exclusions **always outrank interests**. A passing mention is *flagged, not blindly deleted* (incidental-mention rule). Per-section scope + exception topics supported.
- **Reset Interest Preferences** — confirmation dialog clears *only* interests + exclusions; saved items, settings, language, schedules stay untouched (covered by an automated test).
- **Preference tester** — paste a headline and see exactly how matching will treat it.

## Accuracy, verification & scam prevention

- Sources are permitted RSS feeds (see More → Sources) each tagged by trust tier; official sources (e.g. github.blog, educationusa) get the **Official source** badge.
- Publication time comes from the feed; **unknown dates are labelled "unknown" and never invented**.
- Parallel reporting is merged by near-duplicate detection → **Corroborated** badge with links to independent outlets.
- Unrealistic income claims / fee demands are flagged, never recommended.
- **Nothing is "verified" just because an AI summarized it** — AI (when configured) only writes grounded summaries, Urdu translation, and custom-topic parsing, with prompt-injection neutralization.

## Freshness rules (automated)

- Ordinary news expires **7 days after original publication** (not fetch time) — enforced *at query time* and by the periodic sweep.
- Opportunities expire after **deadline + 2 days**; events after they end; educational guides after 30 days.
- Failed fetches keep your last good data and show the real last-update time; retries use backoff.

## Briefing & scheduling

- Daily briefing generated at **08:00 Asia/Karachi** by default (time & timezone editable), quantity **5 per main section** by default, picking *strongest qualifying* items — not the newest fetch. History under More → Briefing history.
- Scheduling options (pick any):
  1. **Local:** `npm run worker` (Windows: Task Scheduler → `node_modules\.bin\tsx.cmd scripts\worker.ts` — README-supplied snippet below).
  2. **Vercel:** `vercel.json` registers `/api/cron/refresh` every 15 min (note: Hobby plan allows daily crons; for 15-min use option 3).
  3. **GitHub Actions:** `.github/workflows/refresh.yml` pings your deployed `/api/cron/refresh` every 15 min (free). Set repo secrets `APP_URL` + `CRON_SECRET` if configured.

## Notifications (More → Notification settings)

Master toggle (browser permission requested **only when you explicitly enable it**), briefing alert, important-news, IT/scholarship alerts, deadline reminders, quiet hours, hourly/daily caps, per-topic modes (immediate / digest / briefing / off), and both topic modes: *Only my selected topics* vs *All enabled categories* (which still respects exclusions + caps + dedupe + credibility + currency). Every record shows the **actual delivery status** — including honest `generated (not delivered)` when no live browser was open, and failures are reported as failures. Background-forced delivery needs Web Push (below).

## Appearance & language

Light/Dark/System, 6 accents + custom color, S/M/L/XL text, Compact/Standard/Comfortable reading, card or compact-list feeds, images on/off (text-only), animations on/off, high-contrast mode — applied before first paint, persisted. Content language: **English (default) / Urdu** — article summaries translate (AI, labelled "Translated (AI)") while **interface and nav labels stay English**; originals always accessible.

## Optional credentials (everything works without them)

Copy `.env.example` → `.env.local` and fill what you want:

| Key | What it enables | Where to get it |
|---|---|---|
| `AI_API_KEY` (+`AI_BASE_URL`, `AI_MODEL`) | Grounded summaries with "Why it matters", **Urdu translation**, custom-topic AI parsing | Any OpenAI-compatible provider (openai.com, OpenRouter…) |
| `NEWSAPI_KEY` | Extra news source (newsapi.org, 100 req/day free) | newsapi.org |
| `CRON_SECRET` | Protects `/api/cron/refresh` | Any random string |
| `VAPID_*` | True background Web Push notifications | `npx web-push generate-vapid-keys` |

Supplying an unknown key never fabricates results: missing integrations are disabled with an explicit setup note in the UI.

## Data & storage

- Local: JSON files under `data/runtime/` (auto-created, gitignored). Erase everything via More → Privacy.
- Production/multi-user: run **`docs/schema.sql`** in Supabase (tables for profiles, sections, interests/exclusions, items, corroborations, briefings, notification settings/history, push subscriptions, saved items, custom topics, feedback, job logs + **row-level security** on every user table). `src/lib/store.ts` / `prefs-store.ts` are the only files to swap.

## Deployment

1. Push to GitHub → import into Vercel (or any Node host).
2. Add env vars you want from the table above.
3. `vercel.json` registers the 15-min cron (or use the GitHub Actions workflow).
4. Supplying an unknown key never fabricates results: missing integrations are disabled with an explicit setup note in the UI.

## Windows Task Scheduler (local worker on boot)

```
Program:    C:\Program Files\nodejs\node.exe
Arguments:  node_modules\tsx\dist\src\cli.mjs scripts\worker.ts
Start in:   C:\Users\<you>\Desktop\Projects\news
Trigger:    At startup (or daily at 07:00 to catch the briefing)
```

## Automated tests (`npm test` — 32 checks)

Matching & exclusion semantics (interest expansion, synonym reach, concept-level hide, incidental-mention flagging, **exclusions override interests**, exceptions, disabled prefs) · freshness/expiry (7-day rule from original publication, refetch ≠ newness, unknown dates, deadline expiry) · dedupe/corroboration · feed filtering (Pakistan vs Worldwide, per-section independence, eligibility pacing, query-time expiry) · reset semantics · defaults (5/day, Pakistan, English, Worldwide-first) · notification gating (master off, exclusion suppression, selected-topic mode, quiet hours, id stability).

## Known limitations (honest list)

- **Translation & AI summaries require an AI key** — Urdu otherwise stays original-language, clearly labelled (never dictionary-faked).
- **Background push while everything is closed** requires VAPID config; otherwise notifications need an open window, and history says so truthfully.
- **Richest people / Top companies rankings** need a licensed data API; pages explain that rather than showing made-up numbers.
- **Deadline dates in the scholarship catalog are annual cycles** (months), not verified day-level dates — always confirm on the official page; live-feed items carry their own dates once sources publish them.
- Some feeds intermittently fail (geo/rate limits) — failures are logged per source, other sources unaffected.
- Local JSON store is single-machine/single-user; multi-user needs the Supabase migration.
- RSS country tagging is editorially focused (e.g. Dawn = Pakistan) + keyword heuristics — not perfect.

## Acceptance criteria mapping

| Requirement | Where |
|---|---|
| Exactly 4 tabs, English labels | `BottomNav.tsx`, `page.tsx` |
| Pakistan default / Worldwide first / per-section persistence | `countries.ts`, `prefs-defaults.ts`, `CountrySelect.tsx` |
| Concise cards → summary, why-it-matters, country, times, source+URL, verification, image, bookmark/share, Read Details | `NewsCard.tsx`, `ItemSheet.tsx` |
| Interests/exclusions incl. semantic, precedence, incidental rule, reset isolation, tester | `matching.ts`, `prefs-route.ts`, `Preferences.tsx`, tests |
| Selective notifications w/ quality checks & honest history | `notify.ts`, `api/notify`, `Notifs.tsx` |
| 15-min refresh, 8:00 briefing, closed-browser operation | `pipeline.ts`, `worker.ts`, cron routes |
| 7-day expiration (query-time + scheduled) | `expiration.ts`, `filters.ts`, `pipeline.ts` |
| Latest-first + important/relevant sorts | `ranking.ts`, feed settings |
| Appearance + language incl. Urdu content w/ English chrome | `LookAndFeel.tsx`, `api/translate` |
| Official links, image licensing care, verification honesty | `NewsCard.tsx`, `seed.ts`, `sources.ts` |
| DB schema + security (RLS) | `docs/schema.sql` |
| Security: secrets on server, validation (zod), rate limiting, injection-neutral prompts | API routes, `ai.ts`, `rate-limit.ts` |
