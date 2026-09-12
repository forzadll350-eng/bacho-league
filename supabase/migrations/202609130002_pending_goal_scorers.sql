-- Let admins record a real goal immediately and identify its scorer later.
-- A pending scorer is stored as jersey_number = ''. Public clients hide these rows.

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
  goal_jersey text;
  goal_registration uuid;
  goal_minute integer;
  match_sport public.sport_type;
  match_season text;
  match_group text;
  old_match_order integer;
  requested_match_order integer;
  bucket_size integer;
  target_home_score integer;
  target_away_score integer;
  home_goal_count integer := 0;
  away_goal_count integer := 0;
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

  requested_match_order := coalesce((p_patch ->> 'match_order')::integer, old_match_order);
  if requested_match_order not between 1 and bucket_size then
    raise exception using errcode = '23514', message = 'invalid match order';
  end if;

  if requested_match_order <> old_match_order then
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

  target_home_score := (p_patch ->> 'home_score')::integer;
  target_away_score := (p_patch ->> 'away_score')::integer;

  update public.matches m
  set
    status = (p_patch ->> 'status')::public.match_status,
    home_score = target_home_score,
    away_score = target_away_score,
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
    goal_jersey := btrim(coalesce(goal ->> 'jersey_number', ''));
    goal_registration := nullif(goal ->> 'registration_id', '')::uuid;
    goal_minute := nullif(goal ->> 'minute_approx', '')::integer;

    if goal_team not in (match_home, match_away) then
      raise exception using errcode = '23514', message = 'goal team is not in this match';
    end if;
    if goal_minute is not null and goal_minute not between 0 and 120 then
      raise exception using errcode = '23514', message = 'goal minute must be between 0 and 120';
    end if;
    if goal_registration is not null and not exists (
      select 1 from public.registrations r
      where r.id = goal_registration
        and r.sport = 'football'
        and r.team_id = goal_team
    ) then
      raise exception using errcode = '23514', message = 'goal registration does not match team';
    end if;

    if goal_team = match_home then
      home_goal_count := home_goal_count + 1;
      if home_goal_count > target_home_score then
        raise exception using errcode = '23514', message = 'home goal rows exceed home score';
      end if;
    else
      away_goal_count := away_goal_count + 1;
      if away_goal_count > target_away_score then
        raise exception using errcode = '23514', message = 'away goal rows exceed away score';
      end if;
    end if;

    insert into public.match_goals (
      match_id, team_id, jersey_number, minute_approx, registration_id, player_name
    ) values (
      p_match_id,
      goal_team,
      goal_jersey,
      goal_minute,
      case when goal_jersey = '' then null else goal_registration end,
      case
        when goal_jersey = '' then null
        else nullif(btrim(coalesce(goal ->> 'player_name', '')), '')
      end
    );
  end loop;
end;
$$;

revoke execute on function public.save_match_state(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_match_state(text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
