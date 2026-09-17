-- Anonymous project-satisfaction survey with a dated opening, one response per
-- browser token, and allowlisted-admin-only reporting.

create table if not exists public.evaluation_settings (
  id boolean primary key default true check (id),
  opens_at timestamptz not null default '2026-09-21 08:00:00+07',
  manually_closed boolean not null default false,
  closed_at timestamptz,
  updated_at timestamptz not null default statement_timestamp()
);

insert into public.evaluation_settings (id, opens_at)
values (true, '2026-09-21 08:00:00+07')
on conflict (id) do update
set opens_at = excluded.opens_at;

create table if not exists public.evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id),
  respondent_type text not null check (
    respondent_type in ('athlete', 'attendee', 'organizer', 'spectator', 'other')
  ),
  publicity_score smallint not null check (publicity_score between 1 and 5),
  registration_score smallint not null check (registration_score between 1 and 5),
  schedule_score smallint not null check (schedule_score between 1 and 5),
  venue_score smallint not null check (venue_score between 1 and 5),
  officiating_score smallint not null check (officiating_score between 1 and 5),
  live_score_score smallint not null check (live_score_score between 1 and 5),
  organization_score smallint not null check (organization_score between 1 and 5),
  overall_score smallint not null check (overall_score between 1 and 5),
  join_again boolean not null,
  comment text,
  device_hash text not null unique check (device_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  constraint evaluation_comment_length check (char_length(coalesce(comment, '')) <= 1000)
);

create index if not exists evaluation_responses_created_at_idx
  on public.evaluation_responses (created_at desc);
create index if not exists evaluation_responses_team_id_idx
  on public.evaluation_responses (team_id);

alter table public.evaluation_settings enable row level security;
alter table public.evaluation_responses enable row level security;

drop policy if exists "Allowlisted admins read evaluation settings"
  on public.evaluation_settings;
create policy "Allowlisted admins read evaluation settings"
  on public.evaluation_settings for select to authenticated
  using ((select public.is_bacho_admin()));

drop policy if exists "Allowlisted admins update evaluation settings"
  on public.evaluation_settings;
create policy "Allowlisted admins update evaluation settings"
  on public.evaluation_settings for update to authenticated
  using ((select public.is_bacho_admin()))
  with check ((select public.is_bacho_admin()));

drop policy if exists "Allowlisted admins read evaluation responses"
  on public.evaluation_responses;
create policy "Allowlisted admins read evaluation responses"
  on public.evaluation_responses for select to authenticated
  using ((select public.is_bacho_admin()));

revoke all on public.evaluation_settings from anon, authenticated;
revoke all on public.evaluation_responses from anon, authenticated;
grant select, update on public.evaluation_settings to authenticated;
grant select on public.evaluation_responses to authenticated;

create or replace function public.get_evaluation_status()
returns table (
  opens_at timestamptz,
  is_open boolean,
  manually_closed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.opens_at,
    statement_timestamp() >= s.opens_at and not s.manually_closed as is_open,
    s.manually_closed
  from public.evaluation_settings s
  where s.id is true;
$$;

revoke execute on function public.get_evaluation_status() from public;
grant execute on function public.get_evaluation_status() to anon, authenticated;

create or replace function public.submit_satisfaction_evaluation(
  p_team_id text,
  p_respondent_type text,
  p_publicity_score integer,
  p_registration_score integer,
  p_schedule_score integer,
  p_venue_score integer,
  p_officiating_score integer,
  p_live_score_score integer,
  p_organization_score integer,
  p_overall_score integer,
  p_join_again boolean,
  p_comment text,
  p_device_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_row public.evaluation_settings%rowtype;
  new_id uuid;
begin
  select * into settings_row
  from public.evaluation_settings
  where id is true;

  if settings_row.id is null
     or statement_timestamp() < settings_row.opens_at
     or settings_row.manually_closed then
    raise exception using errcode = '42501', message = 'evaluation is closed';
  end if;

  if not exists (select 1 from public.teams t where t.id = p_team_id) then
    raise exception using errcode = '23503', message = 'invalid team';
  end if;

  if p_respondent_type not in ('athlete', 'attendee', 'organizer', 'spectator', 'other') then
    raise exception using errcode = '23514', message = 'invalid respondent type';
  end if;

  if p_device_hash is null or p_device_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '23514', message = 'invalid device token';
  end if;

  insert into public.evaluation_responses (
    team_id,
    respondent_type,
    publicity_score,
    registration_score,
    schedule_score,
    venue_score,
    officiating_score,
    live_score_score,
    organization_score,
    overall_score,
    join_again,
    comment,
    device_hash
  ) values (
    p_team_id,
    p_respondent_type,
    p_publicity_score,
    p_registration_score,
    p_schedule_score,
    p_venue_score,
    p_officiating_score,
    p_live_score_score,
    p_organization_score,
    p_overall_score,
    p_join_again,
    nullif(btrim(coalesce(p_comment, '')), ''),
    p_device_hash
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.submit_satisfaction_evaluation(
  text, text, integer, integer, integer, integer, integer, integer,
  integer, integer, boolean, text, text
) from public;
grant execute on function public.submit_satisfaction_evaluation(
  text, text, integer, integer, integer, integer, integer, integer,
  integer, integer, boolean, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';
