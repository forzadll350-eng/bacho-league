-- Keep the real schedule internally while allowing admins to publish only a match sequence.
-- Group-stage numbering restarts for each group. Matches without a group share one knockout sequence.

alter table public.matches
  add column if not exists match_order integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by sport, season_id, coalesce(group_code, '__knockout__')
      order by scheduled_at, id
    )::integer as match_order
  from public.matches
)
update public.matches m
set match_order = ranked.match_order
from ranked
where ranked.id = m.id
  and m.match_order is null;

alter table public.matches
  alter column match_order set default 1,
  alter column match_order set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_match_order_positive'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_match_order_positive check (match_order > 0);
  end if;
end;
$$;

create index if not exists matches_display_order_idx
  on public.matches (sport, season_id, group_code, match_order, scheduled_at);

create unique index if not exists matches_group_display_order_unique_idx
  on public.matches (sport, season_id, group_code, match_order)
  where group_code is not null;

create unique index if not exists matches_knockout_display_order_unique_idx
  on public.matches (sport, season_id, match_order)
  where group_code is null;

create or replace function public.save_match_state(
  p_match_id text,
  p_patch jsonb,
  p_goals jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_home text;
  match_away text;
  goal jsonb;
  goal_team text;
  goal_registration uuid;
  match_sport public.sport_type;
  match_season text;
  match_group text;
  old_match_order integer;
  requested_match_order integer;
  bucket_size integer;
begin
  if not public.is_bacho_admin() then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;

  select m.sport, m.season_id, m.group_code
  into match_sport, match_season, match_group
  from public.matches m
  where m.id = p_match_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'match not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'match-order:' || match_sport::text || ':' || match_season || ':'
        || coalesce(match_group, '__knockout__'),
      0
    )
  );

  select m.match_order
  into old_match_order
  from public.matches m
  where m.id = p_match_id
  for update;

  select count(*)::integer
  into bucket_size
  from public.matches m
  where m.sport = match_sport
    and m.season_id = match_season
    and m.group_code is not distinct from match_group;

  requested_match_order := coalesce(
    (p_patch ->> 'match_order')::integer,
    old_match_order
  );
  if requested_match_order not between 1 and bucket_size then
    raise exception using errcode = '23514', message = 'invalid match order';
  end if;

  if requested_match_order <> old_match_order then
    -- Move the selected match aside, then swap with the match currently occupying
    -- the requested position. The unique indexes keep every bucket unambiguous.
    update public.matches m
    set match_order = bucket_size + 1
    where m.id = p_match_id;

    update public.matches m
    set match_order = old_match_order
    where m.sport = match_sport
      and m.season_id = match_season
      and m.group_code is not distinct from match_group
      and m.match_order = requested_match_order;
  end if;

  update public.matches m
  set
    status = (p_patch ->> 'status')::public.match_status,
    home_score = (p_patch ->> 'home_score')::integer,
    away_score = (p_patch ->> 'away_score')::integer,
    home_points = coalesce((p_patch ->> 'home_points')::integer, 0),
    away_points = coalesce((p_patch ->> 'away_points')::integer, 0),
    points_set = coalesce((p_patch ->> 'points_set')::integer, 1),
    set_scores = coalesce(p_patch -> 'set_scores', '{}'::jsonb),
    live_clock = nullif(p_patch ->> 'live_clock', ''),
    period_label = nullif(p_patch ->> 'period_label', ''),
    scheduled_at = (p_patch ->> 'scheduled_at')::timestamptz,
    started_at = nullif(p_patch ->> 'started_at', '')::timestamptz,
    ends_at = nullif(p_patch ->> 'ends_at', '')::timestamptz,
    hide_schedule_time = coalesce((p_patch ->> 'hide_schedule_time')::boolean, false),
    match_order = requested_match_order,
    updated_at = statement_timestamp()
  where m.id = p_match_id
  returning m.home_team_id, m.away_team_id into match_home, match_away;

  if not found then
    raise exception using errcode = 'P0002', message = 'match not found';
  end if;

  if p_goals is null then
    return;
  end if;

  delete from public.match_goals where match_id = p_match_id;

  for goal in select value from jsonb_array_elements(p_goals)
  loop
    goal_team := goal ->> 'team_id';
    goal_registration := nullif(goal ->> 'registration_id', '')::uuid;

    if goal_team not in (match_home, match_away) then
      raise exception using errcode = '23514', message = 'goal team is not in this match';
    end if;
    if btrim(coalesce(goal ->> 'jersey_number', '')) = '' then
      raise exception using errcode = '23514', message = 'goal jersey number is required';
    end if;
    if goal_registration is not null and not exists (
      select 1 from public.registrations r
      where r.id = goal_registration
        and r.sport = 'football'
        and r.team_id = goal_team
    ) then
      raise exception using errcode = '23514', message = 'goal registration does not match team';
    end if;

    insert into public.match_goals (
      match_id, team_id, jersey_number, minute_approx, registration_id, player_name
    ) values (
      p_match_id,
      goal_team,
      btrim(goal ->> 'jersey_number'),
      nullif(goal ->> 'minute_approx', '')::integer,
      goal_registration,
      nullif(btrim(coalesce(goal ->> 'player_name', '')), '')
    );
  end loop;
end;
$$;

revoke execute on function public.save_match_state(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_match_state(text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
