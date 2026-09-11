-- Match end time, goal scorers (jersey), favorite athlete votes

alter table public.matches
  add column if not exists ends_at timestamptz;

create table if not exists public.match_goals (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches (id) on delete cascade,
  team_id text not null references public.teams (id),
  jersey_number text not null,
  minute_approx int check (minute_approx is null or (minute_approx >= 0 and minute_approx <= 120)),
  registration_id uuid references public.registrations (id) on delete set null,
  player_name text,
  created_at timestamptz not null default now()
);

create index if not exists match_goals_match_idx on public.match_goals (match_id);
create index if not exists match_goals_team_jersey_idx on public.match_goals (team_id, jersey_number);

alter table public.match_goals enable row level security;

create policy "Public read match_goals"
  on public.match_goals for select using (true);

create policy "Authenticated insert match_goals"
  on public.match_goals for insert to authenticated with check (true);

create policy "Authenticated update match_goals"
  on public.match_goals for update to authenticated using (true) with check (true);

create policy "Authenticated delete match_goals"
  on public.match_goals for delete to authenticated using (true);

create table if not exists public.favorite_votes (
  id uuid primary key default gen_random_uuid(),
  sport public.sport_type not null default 'football',
  registration_id uuid not null references public.registrations (id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  unique (sport, voter_key)
);

create index if not exists favorite_votes_reg_idx on public.favorite_votes (registration_id);
create index if not exists favorite_votes_sport_idx on public.favorite_votes (sport);

alter table public.favorite_votes enable row level security;

create policy "Public read favorite_votes"
  on public.favorite_votes for select using (true);

create policy "Public insert favorite_votes"
  on public.favorite_votes for insert
  with check (sport = 'football' and char_length(voter_key) between 8 and 80);

do $$ begin
  alter publication supabase_realtime add table public.match_goals;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.favorite_votes;
exception when duplicate_object then null;
end $$;
