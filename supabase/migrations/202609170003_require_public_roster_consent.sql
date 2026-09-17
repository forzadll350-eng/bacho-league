-- Make the narrow public roster consent mandatory for new registrations and
-- publish legacy registrations at the organizer's explicit direction.

update public.registrations
set
  public_roster_consent = true,
  public_roster_consented_at = coalesce(public_roster_consented_at, statement_timestamp())
where public_roster_consent is not true;

create or replace function public.submit_player_registration(
  p_sport public.sport_type,
  p_team_id text,
  p_full_name text,
  p_position public.player_position,
  p_age integer,
  p_jersey_number text,
  p_photo_url text,
  p_rules_accepted boolean,
  p_rules_version text,
  p_privacy_acknowledged boolean,
  p_privacy_notice_version text,
  p_public_roster_consent boolean
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

  if p_privacy_acknowledged is distinct from true
     or p_privacy_notice_version is distinct from 'privacy-notice-2026-09-17-v2' then
    raise exception using errcode = '23514', message = 'privacy acknowledgement is required';
  end if;

  if p_public_roster_consent is distinct from true then
    raise exception using errcode = '23514', message = 'public roster consent is required';
  end if;

  if p_sport = 'football' and (
    p_rules_accepted is distinct from true
    or p_rules_version is distinct from 'football-rules-2026-09-17-v1'
  ) then
    raise exception using errcode = '23514', message = 'football rules acceptance is required';
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
    sport,
    team_id,
    full_name,
    position,
    age,
    jersey_number,
    photo_url,
    rules_version,
    rules_accepted_at,
    privacy_notice_version,
    privacy_acknowledged_at,
    public_roster_consent,
    public_roster_consented_at
  ) values (
    p_sport,
    p_team_id,
    btrim(p_full_name),
    p_position,
    p_age,
    nullif(btrim(coalesce(p_jersey_number, '')), ''),
    nullif(btrim(coalesce(p_photo_url, '')), ''),
    case when p_sport = 'football' then p_rules_version else null end,
    case when p_sport = 'football' then statement_timestamp() else null end,
    p_privacy_notice_version,
    statement_timestamp(),
    true,
    statement_timestamp()
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.submit_player_registration(
  public.sport_type, text, text, public.player_position, integer, text, text,
  boolean, text, boolean, text, boolean
) from public;
grant execute on function public.submit_player_registration(
  public.sport_type, text, text, public.player_position, integer, text, text,
  boolean, text, boolean, text, boolean
) to anon, authenticated;

notify pgrst, 'reload schema';
