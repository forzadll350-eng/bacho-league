-- Production hardening: explicit admin allowlist, private registration fields,
-- safe public registration RPCs, anti-abuse voting, atomic match saves,
-- live clock start time, and best-of-three volleyball rules.

create schema if not exists private;

create or replace function public.is_bacho_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'lubo1@bacholeague.app',
    'lubo2@bacholeague.app',
    'lubo3@bacholeague.app',
    'lubo4@bacholeague.app',
    'lubo5@bacholeague.app',
    'lubo6@bacholeague.app',
    'lubo7@bacholeague.app',
    'lubo8@bacholeague.app',
    'nitikornluboksawo@gmail.com'
  ]::text[])
$$;

revoke execute on function public.is_bacho_admin() from public, anon;
grant execute on function public.is_bacho_admin() to authenticated;

-- Every administrative policy must check the allowlist, not merely `authenticated`.
drop policy if exists "Authenticated update matches" on public.matches;
create policy "Allowlisted admins update matches"
  on public.matches for update to authenticated
  using ((select public.is_bacho_admin()))
  with check ((select public.is_bacho_admin()));

drop policy if exists "Authenticated update standings" on public.standings;
create policy "Allowlisted admins update standings"
  on public.standings for update to authenticated
  using ((select public.is_bacho_admin()))
  with check ((select public.is_bacho_admin()));

drop policy if exists "Authenticated update notifications" on public.notifications;
create policy "Allowlisted admins update notifications"
  on public.notifications for update to authenticated
  using ((select public.is_bacho_admin()))
  with check ((select public.is_bacho_admin()));

drop policy if exists "Authenticated insert match_goals" on public.match_goals;
drop policy if exists "Authenticated update match_goals" on public.match_goals;
drop policy if exists "Authenticated delete match_goals" on public.match_goals;
create policy "Allowlisted admins insert match goals"
  on public.match_goals for insert to authenticated
  with check ((select public.is_bacho_admin()));
create policy "Allowlisted admins update match goals"
  on public.match_goals for update to authenticated
  using ((select public.is_bacho_admin()))
  with check ((select public.is_bacho_admin()));
create policy "Allowlisted admins delete match goals"
  on public.match_goals for delete to authenticated
  using ((select public.is_bacho_admin()));

drop policy if exists "Authenticated delete registrations" on public.registrations;
create policy "Allowlisted admins delete registrations"
  on public.registrations for delete to authenticated
  using ((select public.is_bacho_admin()));

drop policy if exists "Authenticated read event attendees" on public.event_attendees;
drop policy if exists "Public read event attendees" on public.event_attendees;
drop policy if exists "Authenticated delete event attendees" on public.event_attendees;
create policy "Allowlisted admins read event attendees"
  on public.event_attendees for select to authenticated
  using ((select public.is_bacho_admin()));
create policy "Allowlisted admins delete event attendees"
  on public.event_attendees for delete to authenticated
  using ((select public.is_bacho_admin()));

drop policy if exists "Admin read own session" on public.admin_active_sessions;
drop policy if exists "Admin upsert own session" on public.admin_active_sessions;
drop policy if exists "Admin update own session" on public.admin_active_sessions;
drop policy if exists "Admin delete own session" on public.admin_active_sessions;
create policy "Allowlisted admin read own session"
  on public.admin_active_sessions for select to authenticated
  using ((select public.is_bacho_admin()) and (select auth.uid()) = user_id);
create policy "Allowlisted admin insert own session"
  on public.admin_active_sessions for insert to authenticated
  with check ((select public.is_bacho_admin()) and (select auth.uid()) = user_id);
create policy "Allowlisted admin update own session"
  on public.admin_active_sessions for update to authenticated
  using ((select public.is_bacho_admin()) and (select auth.uid()) = user_id)
  with check ((select public.is_bacho_admin()) and (select auth.uid()) = user_id);
create policy "Allowlisted admin delete own session"
  on public.admin_active_sessions for delete to authenticated
  using ((select public.is_bacho_admin()) and (select auth.uid()) = user_id);

-- Age and position stay on the private base table. Public pages receive only the
-- fields needed for the vote list and scorer display.
drop policy if exists "Public read registrations" on public.registrations;
drop policy if exists "Allowlisted admins read registrations" on public.registrations;
create policy "Allowlisted admins read registrations"
  on public.registrations for select to authenticated
  using ((select public.is_bacho_admin()));

revoke select on public.registrations from anon;
grant select on public.registrations to authenticated;

drop view if exists public.public_players;
create view public.public_players
with (security_barrier = true)
as
  select id, sport, team_id, full_name, jersey_number, photo_url
  from public.registrations;

revoke all on public.public_players from public;
grant select on public.public_players to anon, authenticated;

-- Route anonymous registration through narrow functions. The existing trigger
-- remains the source of truth for the deadline, per-team cap, and jersey lock.
drop policy if exists "Public insert registrations" on public.registrations;
drop policy if exists "Public insert event attendees" on public.event_attendees;
revoke insert on public.registrations from anon, authenticated;
revoke insert on public.event_attendees from anon, authenticated;

create or replace function public.submit_player_registration(
  p_sport public.sport_type,
  p_team_id text,
  p_full_name text,
  p_position public.player_position,
  p_age integer,
  p_jersey_number text default null,
  p_photo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  photo_prefix text;
begin
  if char_length(btrim(coalesce(p_full_name, ''))) not between 2 and 120 then
    raise exception using errcode = '23514', message = 'invalid full name';
  end if;
  if p_age not between 10 and 80 then
    raise exception using errcode = '23514', message = 'invalid age';
  end if;
  if p_sport = 'volleyball' and p_team_id = 'barehtai' then
    raise exception using errcode = '23514', message = 'team withdrew from volleyball';
  end if;
  if not exists (select 1 from public.teams t where t.id = p_team_id) then
    raise exception using errcode = '23503', message = 'invalid team';
  end if;
  photo_prefix := 'https://kaewdffisndtdxcmyjcy.supabase.co/storage/v1/object/public/player-photos/'
    || p_team_id || '/';
  if p_photo_url is not null and (
    char_length(p_photo_url) > 1000
    or left(p_photo_url, char_length(photo_prefix)) <> photo_prefix
    or substring(p_photo_url from char_length(photo_prefix) + 1)
      !~ '^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  ) then
    raise exception using errcode = '23514', message = 'invalid photo URL';
  end if;

  insert into public.registrations (
    sport, team_id, full_name, position, age, jersey_number, photo_url
  ) values (
    p_sport,
    p_team_id,
    btrim(p_full_name),
    p_position,
    p_age,
    nullif(btrim(coalesce(p_jersey_number, '')), ''),
    nullif(btrim(coalesce(p_photo_url, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.submit_player_registration(
  public.sport_type, text, text, public.player_position, integer, text, text
) from public;
grant execute on function public.submit_player_registration(
  public.sport_type, text, text, public.player_position, integer, text, text
) to anon, authenticated;

create or replace function public.submit_event_attendee(
  p_team_id text,
  p_full_name text,
  p_phone text,
  p_position_label text,
  p_subdistrict text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if char_length(btrim(coalesce(p_note, ''))) > 500 then
    raise exception using errcode = '23514', message = 'note is too long';
  end if;

  insert into public.event_attendees (
    team_id, full_name, phone, position_label, subdistrict, note
  ) values (
    p_team_id,
    btrim(p_full_name),
    btrim(p_phone),
    btrim(p_position_label),
    btrim(p_subdistrict),
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.submit_event_attendee(text, text, text, text, text, text)
  from public;
grant execute on function public.submit_event_attendee(text, text, text, text, text, text)
  to anon, authenticated;

-- The server-side Sheets proxy can prove that a submitted payload corresponds
-- to a real row without exposing attendee phone/position through the Data API.
create or replace function public.sheet_registration_matches(
  p_kind text,
  p_id uuid,
  p_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_kind = 'athlete' then exists (
      select 1
      from public.registrations r
      join public.teams t on t.id = r.team_id
      where r.id = p_id
        and r.sport::text = p_payload ->> 'sport'
        and r.team_id = p_payload ->> 'teamId'
        and t.name_th = p_payload ->> 'teamName'
        and r.full_name = p_payload ->> 'fullName'
        and r.position::text = p_payload ->> 'position'
        and (p_payload ->> 'positionLabel') = case r.position
          when 'admin_exec' then 'ฝ่ายบริหาร'
          when 'council' then 'สมาชิกสภา'
          when 'civil_servant' then 'ข้าราชการ'
          when 'mission' then 'ภารกิจ'
          when 'general' then 'ทั่วไป'
          when 'contract' then 'จ้างเหมา'
        end
        and r.age = case
          when coalesce(p_payload ->> 'age', '') ~ '^[0-9]{1,3}$'
            then (p_payload ->> 'age')::integer
          else -1
        end
        and coalesce(r.jersey_number, '') = coalesce(p_payload ->> 'jerseyNumber', '')
        and coalesce(r.photo_url, '') = coalesce(p_payload ->> 'photoUrl', '')
    )
    when p_kind = 'attendee' then exists (
      select 1
      from public.event_attendees a
      join public.teams t on t.id = a.team_id
      where a.id = p_id
        and a.team_id = p_payload ->> 'teamId'
        and coalesce(t.org_th, t.name_th) = p_payload ->> 'teamName'
        and a.full_name = p_payload ->> 'fullName'
        and a.phone = p_payload ->> 'phone'
        and a.position_label = p_payload ->> 'positionLabel'
        and a.subdistrict = p_payload ->> 'subdistrict'
        and coalesce(a.note, '') = coalesce(p_payload ->> 'note', '')
    )
    else false
  end
$$;

revoke execute on function public.sheet_registration_matches(text, uuid, jsonb) from public;
grant execute on function public.sheet_registration_matches(text, uuid, jsonb) to anon, authenticated;

-- Anonymous photo uploads are permitted only while registration is open.
drop policy if exists "Public upload player photos" on storage.objects;
create policy "Public upload player photos while registration is open"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'player-photos'
    and statement_timestamp() <= timestamptz '2026-09-19 17:00:00+07'
    and name ~ '^[a-z0-9-]+/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    and exists (
      select 1
      from public.teams t
      where t.id = split_part(name, '/', 1)
    )
  );

create or replace function public.discard_unregistered_player_photo(p_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if p_path !~ '^[a-z0-9-]+/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;
  if exists (
    select 1 from public.registrations r
    where r.photo_url like '%/player-photos/' || p_path
  ) then
    return false;
  end if;
  delete from storage.objects o
  where o.bucket_id = 'player-photos' and o.name = p_path;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke execute on function public.discard_unregistered_player_photo(text) from public;
grant execute on function public.discard_unregistered_player_photo(text) to anon, authenticated;

-- Hide raw voter keys and funnel votes through one rate-limited function.
alter table public.favorite_votes
  add column if not exists ip_hash text;

create index if not exists favorite_votes_ip_created_idx
  on public.favorite_votes (ip_hash, created_at desc)
  where ip_hash is not null;

drop policy if exists "Public read favorite_votes" on public.favorite_votes;
drop policy if exists "Public insert favorite_votes" on public.favorite_votes;
drop policy if exists "Allowlisted admins read favorite votes" on public.favorite_votes;
create policy "Allowlisted admins read favorite votes"
  on public.favorite_votes for select to authenticated
  using ((select public.is_bacho_admin()));

revoke select, insert, update, delete on public.favorite_votes from anon;
grant select on public.favorite_votes to authenticated;

drop view if exists public.favorite_vote_totals;
create view public.favorite_vote_totals
with (security_barrier = true)
as
  select registration_id, count(*)::integer as votes
  from public.favorite_votes
  where sport = 'football'
  group by registration_id;

revoke all on public.favorite_vote_totals from public;
grant select on public.favorite_vote_totals to anon, authenticated;

create or replace function public.cast_favorite_vote(
  p_registration_id uuid,
  p_voter_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers jsonb;
  client_ip text;
  fingerprint text;
  recent_from_ip integer;
begin
  if p_voter_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '23514', message = 'invalid voter key';
  end if;

  if not exists (
    select 1 from public.registrations r
    where r.id = p_registration_id and r.sport = 'football'
  ) then
    raise exception using errcode = '23503', message = 'invalid vote candidate';
  end if;

  begin
    headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    headers := '{}'::jsonb;
  end;

  client_ip := btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1));
  if client_ip = '' then
    raise exception using errcode = 'PGRST',
      message = '{"message":"ไม่พบข้อมูลเครือข่ายสำหรับตรวจสอบการโหวต"}',
      detail = '{"status":429,"status_text":"Too Many Requests"}';
  end if;

  fingerprint := encode(
    extensions.digest(convert_to(client_ip || ':bacho-league-vote-2569', 'UTF8'), 'sha256'),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('favorite-vote:' || fingerprint, 0)
  );

  select count(*)::integer into recent_from_ip
  from public.favorite_votes v
  where v.ip_hash = fingerprint
    and v.created_at >= statement_timestamp() - interval '24 hours';

  -- Five devices per public IP keeps shared municipal/Wi-Fi networks usable
  -- while stopping simple localStorage resets and automated bulk voting.
  if recent_from_ip >= 5 then
    raise exception using errcode = 'PGRST',
      message = '{"message":"เครือข่ายนี้โหวตครบจำนวนที่อนุญาตแล้ว กรุณาลองใหม่ภายหลัง"}',
      detail = '{"status":429,"status_text":"Too Many Requests"}';
  end if;

  insert into public.favorite_votes (sport, registration_id, voter_key, ip_hash)
  values ('football', p_registration_id, lower(p_voter_key), fingerprint);
end;
$$;

revoke execute on function public.cast_favorite_vote(uuid, text) from public;
grant execute on function public.cast_favorite_vote(uuid, text) to anon, authenticated;

-- Start the live clock when an admin first changes a match into a playing state.
alter table public.matches
  add column if not exists started_at timestamptz;

-- The livestream feature is retired; remove stale URLs from the public match row.
alter table public.matches
  drop column if exists live_stream_url;

create or replace function public.enforce_match_runtime_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.home_score < 0 or new.away_score < 0
     or coalesce(new.home_points, 0) < 0 or coalesce(new.away_points, 0) < 0
     or coalesce(new.points_set, 1) not between 1 and 3 then
    raise exception using errcode = '23514', message = 'invalid negative score or set';
  end if;

  if new.status in ('live', 'halftime')
     and old.status not in ('live', 'halftime')
     and new.started_at is null then
    new.started_at := statement_timestamp();
  elsif new.status in ('scheduled', 'postponed', 'cancelled') then
    new.started_at := null;
  end if;

  if new.sport = 'volleyball' then
    if new.home_score not between 0 and 2
       or new.away_score not between 0 and 2
       or (new.home_score = 2 and new.away_score = 2) then
      raise exception using errcode = '23514', message = 'invalid best-of-three volleyball score';
    end if;
    if new.home_score = 2 or new.away_score = 2 then
      new.status := 'finished';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists matches_enforce_runtime_rules on public.matches;
create trigger matches_enforce_runtime_rules
before update of status, sport, home_score, away_score, started_at
on public.matches
for each row execute function public.enforce_match_runtime_rules();

revoke execute on function public.enforce_match_runtime_rules()
  from public, anon, authenticated;

create or replace function public.validate_match_goal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  match_home text;
  match_away text;
  match_sport public.sport_type;
begin
  select m.home_team_id, m.away_team_id, m.sport
  into match_home, match_away, match_sport
  from public.matches m
  where m.id = new.match_id;

  if not found or match_sport <> 'football' or new.team_id not in (match_home, match_away) then
    raise exception using errcode = '23514', message = 'goal does not match a football fixture';
  end if;
  if new.registration_id is not null and not exists (
    select 1 from public.registrations r
    where r.id = new.registration_id
      and r.sport = 'football'
      and r.team_id = new.team_id
  ) then
    raise exception using errcode = '23514', message = 'goal registration does not match team';
  end if;
  return new;
end;
$$;

drop trigger if exists match_goals_validate_fixture on public.match_goals;
create trigger match_goals_validate_fixture
before insert or update of match_id, team_id, registration_id
on public.match_goals
for each row execute function public.validate_match_goal();

revoke execute on function public.validate_match_goal()
  from public, anon, authenticated;

-- One RPC keeps the match row and its scorer list in the same transaction.
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
begin
  if not public.is_bacho_admin() then
    raise exception using errcode = '42501', message = 'admin access required';
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
