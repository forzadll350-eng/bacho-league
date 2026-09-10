-- ฟุตซอลลีก · Bacho League — public read schema
-- Run in Supabase SQL Editor (or via CLI migration)

create extension if not exists "pgcrypto";

create type public.sport_type as enum ('football', 'volleyball');

create type public.match_status as enum (
  'scheduled',
  'live',
  'halftime',
  'finished',
  'postponed',
  'cancelled'
);

create table public.teams (
  id text primary key,
  name_th text not null,
  name_en text,
  short_name text not null,
  crest_url text,
  org_th text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.competitions (
  id text primary key,
  name_th text not null,
  name_en text,
  sport public.sport_type not null
);

create table public.seasons (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  name text not null,
  year_be int not null
);

create table public.matches (
  id text primary key,
  sport public.sport_type not null,
  competition_id text not null references public.competitions (id),
  season_id text not null references public.seasons (id),
  home_team_id text not null references public.teams (id),
  away_team_id text not null references public.teams (id),
  scheduled_at timestamptz not null,
  venue text,
  status public.match_status not null default 'scheduled',
  home_score int not null default 0,
  away_score int not null default 0,
  live_clock text,
  period_label text,
  detail boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.standings (
  id uuid primary key default gen_random_uuid(),
  sport public.sport_type not null,
  season_id text not null references public.seasons (id) on delete cascade,
  team_id text not null references public.teams (id),
  rank int not null,
  previous_rank int,
  played int not null default 0,
  won int,
  drawn int,
  lost int,
  points int not null default 0,
  sets_won int,
  sets_lost int,
  unique (sport, season_id, team_id)
);

create table public.notifications (
  id text primary key,
  sport public.sport_type not null,
  icon text not null default '•',
  title text not null,
  body text not null,
  time_label text not null default '',
  created_at timestamptz not null default now()
);

create table public.app_meta (
  key text primary key,
  value text not null
);

-- Public read (anon) — writes only via service role / admin later
alter table public.teams enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.matches enable row level security;
alter table public.standings enable row level security;
alter table public.notifications enable row level security;
alter table public.app_meta enable row level security;

create policy "Public read teams" on public.teams for select using (true);
create policy "Public read competitions" on public.competitions for select using (true);
create policy "Public read seasons" on public.seasons for select using (true);
create policy "Public read matches" on public.matches for select using (true);
create policy "Public read standings" on public.standings for select using (true);
create policy "Public read notifications" on public.notifications for select using (true);
create policy "Public read app_meta" on public.app_meta for select using (true);

-- Realtime for live scoreboard
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.standings;
alter publication supabase_realtime add table public.notifications;
