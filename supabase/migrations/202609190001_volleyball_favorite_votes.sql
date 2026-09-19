-- Favorite athlete voting for both sports. Each voter key can vote once per
-- sport, while the existing shared-network rate limit remains in force.

drop view if exists public.favorite_vote_totals;
create view public.favorite_vote_totals
with (security_barrier = true)
as
  select v.registration_id, count(*)::integer as votes
  from public.favorite_votes v
  join public.registrations r on r.id = v.registration_id
  where v.sport = r.sport
    and r.public_roster_consent is true
  group by v.registration_id;

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
  candidate_sport public.sport_type;
begin
  if p_voter_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '23514', message = 'invalid voter key';
  end if;

  select r.sport into candidate_sport
  from public.registrations r
  where r.id = p_registration_id
    and r.sport in ('football', 'volleyball')
    and r.public_roster_consent is true;

  if candidate_sport is null then
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

  if recent_from_ip >= 5 then
    raise exception using errcode = 'PGRST',
      message = '{"message":"เครือข่ายนี้โหวตครบจำนวนที่อนุญาตแล้ว กรุณาลองใหม่ภายหลัง"}',
      detail = '{"status":429,"status_text":"Too Many Requests"}';
  end if;

  insert into public.favorite_votes (sport, registration_id, voter_key, ip_hash)
  values (candidate_sport, p_registration_id, lower(p_voter_key), fingerprint);
end;
$$;

revoke execute on function public.cast_favorite_vote(uuid, text) from public;
grant execute on function public.cast_favorite_vote(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
