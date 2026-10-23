-- ══════════════════════════════════════════════════════════════════════════
-- Personal Intel — full PostgreSQL schema (Supabase-ready)
--
-- The local JSON store (src/lib/store.ts + src/lib/prefs-store.ts) mirrors
-- these tables 1:1. To move from single-machine storage to hosted, multi-user
-- Supabase:
--   1. Run this file in the Supabase SQL editor.
--   2. Enable Supabase Auth (email magic-link is enough).
--   3. Replace the reads/writes in store.ts / prefs-store.ts with queries
--      against these tables (the function boundaries were kept for this).
--   4. Move the ingestion pipeline to a Supabase Edge Function scheduled by
--      pg_cron (SQL at the bottom).
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── users & per-user data isolation ───────────────────────────────────────
-- (auth.users comes from Supabase Auth; all tables key on user_id)

create table if not exists public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  language        text not null default 'en' check (language in ('en','ur')),
  timezone        text not null default 'Asia/Karachi',
  briefing_time   text not null default '08:00',
  refresh_minutes int  not null default 15 check (refresh_minutes between 10 and 240),
  appearance      jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- ── section settings (country / quantity / sort per section) ──────────────
create table if not exists public.section_prefs (
  user_id        uuid not null references public.profiles(user_id) on delete cascade,
  section_id     text not null,          -- 'topnews' | 'topit' | 'scholarships' | more category / custom topic id
  country        text not null default 'PK',  -- ISO code or 'WW'
  daily_quantity int  not null default 5 check (daily_quantity between 1 and 30),
  sort           text not null default 'latest' check (sort in ('latest','important','relevant')),
  primary key (user_id, section_id)
);

-- ── interested / not-interested preferences ───────────────────────────────
create table if not exists public.interests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  text       text not null,
  enabled    boolean not null default true,
  category   text,                        -- optional taxonomy hint
  country    text default 'WW',
  priority   text not null default 'normal' check (priority in ('low','normal','high')),
  notify_mode text not null default 'off' check (notify_mode in ('off','immediate','digest','briefing')),
  created_at timestamptz not null default now()
);

create table if not exists public.exclusions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  text       text not null,
  enabled    boolean not null default true,
  type       text not null default 'semantic',
  scope      text not null default 'all', -- 'all' or csv of section ids
  exception  text,                        -- topic that overrides this exclusion
  created_at timestamptz not null default now()
);

-- ── items (news & opportunities) — global, shared across users ────────────
create table if not exists public.sources (
  id          text primary key,
  name        text not null,
  homepage    text not null,
  reliability text not null check (reliability in ('official','high','medium','low')),
  feeds       jsonb not null default '[]'
);

create table if not exists public.items (
  id                     text primary key,      -- sha1(url)
  title                  text not null,
  url                    text not null unique,
  summary                text not null default '',
  summary_source         text not null default 'source' check (summary_source in ('source','ai')),
  why_it_matters         text,
  image_url              text,
  source_id              text references public.sources(id),
  source_name            text not null,
  reliability            text not null,
  origin_country         text,
  regions                jsonb not null default '[]',
  published_at           timestamptz,           -- NULL = unknown; never invented
  published_unknown      boolean not null default true,
  updated_substantive_at timestamptz,
  fetched_at             timestamptz not null default now(),
  categories             jsonb not null default '[]',
  sections               jsonb not null default '[]',
  kind                   text not null default 'news',
  availability           jsonb,                 -- deadline, funding, nationalities, apply_url, remote, ...
  importance             real not null default 0,
  status                 text not null default 'active' check (status in ('active','expired')),
  expired_at             timestamptz,
  verification_status    text not null default 'unverified'
                         check (verification_status in ('official','corroborated','single-source','flagged','unverified')),
  verification_notes     text,
  flagged                text,
  seeded                 boolean not null default false,
  ai                     jsonb
);

-- QUERY-TIME EXPIRATION ENFORCED HERE, matching lib/expiration.ts:
--   ordinary news:   published_at + interval '7 days'
--   unknown pubdate: fetched_at + interval '7 days'
--   deadlines:       availability->>'deadline' + 2 days grace
create or replace function public.item_expired(it public.items)
returns boolean language sql immutable as $$
  select coalesce(
    (it.availability->>'deadline')::timestamptz + interval '2 days' < now()
      when it.kind in ('scholarship','job','internship') and it.availability->>'deadline' is not null
    else null
  ) or (
    it.status = 'expired'
  ) or (
    it.kind in ('scholarship','job','internship')
      and not it.seeded
      and coalesce(it.published_at, it.fetched_at) + interval '7 days' < now()
  ) or (
    it.kind in ('news','event')
      and coalesce(it.published_at, it.fetched_at) + interval '7 days' < now()
  )
$$;

create index if not exists items_status_sections on public.items using gin (sections) where status = 'active';
create index if not exists items_published_idx   on public.items (coalesce(published_at, fetched_at) desc);
create index if not exists items_kind_idx        on public.items (kind) where status = 'active';

-- ── corroboration links (from dedupe) ─────────────────────────────────────
create table if not exists public.corroborations (
  item_id     text not null references public.items(id) on delete cascade,
  url         text not null,
  source_name text not null,
  published_at timestamptz,
  primary key (item_id, url)
);

-- ── briefings ─────────────────────────────────────────────────────────────
create table if not exists public.briefings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(user_id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),
  timezone   text not null,
  sections   jsonb not null default '[]'   -- [{section,label,itemIds,items snapshot}]
);
create unique index if not exists briefings_unique_date on public.briefings (user_id, local_date);

-- ── notifications ─────────────────────────────────────────────────────────
create table if not exists public.notification_settings (
  user_id            uuid primary key references public.profiles(user_id) on delete cascade,
  enabled            boolean not null default false,
  permission_asked   boolean not null default false,
  briefing_alert     boolean not null default false,
  important_news     boolean not null default true,
  it_opportunities   boolean not null default true,
  scholarship_alerts boolean not null default true,
  deadline_reminders boolean not null default true,
  topic_mode         text not null default 'selected' check (topic_mode in ('selected','all')),
  quiet_start        text not null default '22:00',
  quiet_end          text not null default '07:00',
  max_per_hour       int not null default 4,
  max_per_day        int not null default 24,
  email_enabled      boolean not null default false
);

create table if not exists public.push_subscriptions (
  user_id    uuid primary key references public.profiles(user_id) on delete cascade,
  endpoint   text unique not null,
  keys       jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  title      text not null,
  body       text,
  url        text,
  topic      text,
  source_name text,
  delivery   text not null check (delivery in
    ('generated','delivered-live','suppressed-quiet','suppressed-duplicate','suppressed-expired','suppressed-excluded','failed')),
  note       text
);

-- ── saved items (+ application tracking for scholarships) ─────────────────
create table if not exists public.saved_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(user_id) on delete cascade,
  item_id             text references public.items(id) on delete set null,
  saved_at            timestamptz not null default now(),
  snapshot            jsonb not null,       -- keeps content after item expiry
  application_status  text default 'not-started'
                      check (application_status in ('not-started','applying','submitted','result'))
);

-- ── custom topics ─────────────────────────────────────────────────────────
create table if not exists public.custom_topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  name        text not null,
  description text not null,
  prefs       jsonb not null default '{}',
  parsed_by   text not null default 'heuristic' check (parsed_by in ('heuristic','ai')),
  created_at  timestamptz not null default now()
);

-- ── feedback ──────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  item_id    text,
  rating     text not null check (rating in ('accurate','inaccurate','not-relevant','other')),
  comment    text
);

-- ── job execution log (ingest / cleanup / briefing / notify) ──────────────
create table if not exists public.job_logs (
  id         bigserial primary key,
  time       timestamptz not null default now(),
  job        text not null check (job in ('ingest','cleanup','briefing','notify')),
  ok         boolean not null,
  detail     text not null,
  stats      jsonb
);

-- ═══════ Row Level Security — user data isolation ═════════════════════════
alter table public.profiles               enable row level security;
alter table public.section_prefs          enable row level security;
alter table public.interests              enable row level security;
alter table public.exclusions             enable row level security;
alter table public.briefings              enable row level security;
alter table public.notification_settings  enable row level security;
alter table public.push_subscriptions     enable row level security;
alter table public.notification_history   enable row level security;
alter table public.saved_items            enable row level security;
alter table public.custom_topics          enable row level security;
alter table public.feedback               enable row level security;

create policy "own profile"     on public.profiles              for all using (auth.uid() = user_id);
create policy "own sections"    on public.section_prefs         for all using (auth.uid() = user_id);
create policy "own interests"   on public.interests             for all using (auth.uid() = user_id);
create policy "own exclusions"  on public.exclusions            for all using (auth.uid() = user_id);
create policy "own briefings"   on public.briefings             for all using (auth.uid() = user_id);
create policy "own notif cfg"   on public.notification_settings for all using (auth.uid() = user_id);
create policy "own push subs"   on public.push_subscriptions    for all using (auth.uid() = user_id);
create policy "own notif hist"  on public.notification_history  for all using (auth.uid() = user_id);
create policy "own saved"       on public.saved_items           for all using (auth.uid() = user_id);
create policy "own topics"      on public.custom_topics         for all using (auth.uid() = user_id);
create policy "own feedback"    on public.feedback              for all using (auth.uid() = user_id);

-- items / sources / job_logs are shared read; writes only via service role.
alter table public.items   enable row level security;
create policy "read items" on public.items for select using (true);

-- ═══════ Scheduled pipeline (pg_cron + edge function) ═════════════════════
-- select cron.schedule('refresh-feed', '*/15 * * * *', $$
--   select net.http_post(
--     url    := 'https://<project>.supabase.co/functions/v1/refresh',
--     headers:= '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
--   );
-- $$);
-- The `refresh` Edge Function calls the same pipeline used by
-- /api/cron/refresh (ingest → expiry sweep → briefing → notification plan).
