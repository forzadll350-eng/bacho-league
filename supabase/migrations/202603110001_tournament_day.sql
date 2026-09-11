-- Tournament day 21 ก.ย. 2569 · groups, registrations, courts
-- Tiebreak when points equal: lottery (จับฉลาก) — not goal difference

alter table public.matches
  add column if not exists group_code text,
  add column if not exists stage text not null default 'group',
  add column if not exists court_label text;

alter table public.standings
  add column if not exists group_code text,
  add column if not exists lottery_note text;

comment on column public.matches.group_code is 'A | B | null for knockout';
comment on column public.matches.stage is 'group | semi | final';
comment on column public.standings.lottery_note is 'Filled when rank set by จับฉลาก after points tie';

create type public.player_position as enum (
  'admin_exec',
  'council',
  'civil_servant',
  'mission',
  'general',
  'contract'
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  sport public.sport_type not null,
  team_id text not null references public.teams (id) on delete cascade,
  full_name text not null,
  position public.player_position not null,
  age int not null check (age between 10 and 80),
  jersey_number text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists registrations_sport_team_idx
  on public.registrations (sport, team_id);

alter table public.registrations enable row level security;

create policy "Public read registrations"
  on public.registrations for select using (true);

create policy "Public insert registrations"
  on public.registrations for insert
  with check (
    (
      sport = 'volleyball'
    )
    or (
      sport = 'football'
      and (
        select count(*)::int
        from public.registrations r
        where r.sport = 'football'
          and r.team_id = team_id
      ) < 20
    )
  );

create policy "Authenticated delete registrations"
  on public.registrations for delete
  to authenticated
  using (true);

-- Storage bucket for optional futsal player photos (≤2MB enforced client-side)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read player photos" on storage.objects;
drop policy if exists "Public upload player photos" on storage.objects;

create policy "Public read player photos"
  on storage.objects for select
  using (bucket_id = 'player-photos');

create policy "Public upload player photos"
  on storage.objects for insert
  with check (bucket_id = 'player-photos');

-- Event meta
insert into public.app_meta (key, value) values
  ('event_date_be', '21 ก.ย. 2569'),
  ('event_date_iso', '2026-09-21'),
  ('tiebreak_rule', 'lottery'),
  ('futsal_reg_limit', '20')
on conflict (key) do update set value = excluded.value;
