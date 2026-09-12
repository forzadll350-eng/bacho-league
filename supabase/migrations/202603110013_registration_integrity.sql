-- บังคับกติกาลงทะเบียนที่ฐานข้อมูล ไม่พึ่งเฉพาะ validation หน้าเว็บ

create or replace function public.normalized_jersey(value text)
returns text
language sql
immutable
returns null on null input
as $$
  select case
    when btrim(value) ~ '^[0-9]+$'
      then coalesce(nullif(ltrim(btrim(value), '0'), ''), '0')
    else lower(btrim(value))
  end
$$;

update public.registrations
set jersey_number = public.normalized_jersey(jersey_number)
where sport = 'football'
  and jersey_number is not null
  and jersey_number is distinct from public.normalized_jersey(jersey_number);

drop index if exists public.registrations_football_team_jersey_uidx;
create unique index registrations_football_team_jersey_uidx
  on public.registrations (team_id, public.normalized_jersey(jersey_number))
  where sport = 'football'
    and jersey_number is not null
    and btrim(jersey_number) <> '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'registrations_football_rules'
      and conrelid = 'public.registrations'::regclass
  ) then
    alter table public.registrations
      add constraint registrations_football_rules check (
        sport <> 'football'
        or (
          jersey_number is not null
          and btrim(jersey_number) <> ''
          and (position <> 'contract' or age >= 35)
        )
      );
  end if;
end;
$$;

create or replace function public.enforce_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  if statement_timestamp() > timestamptz '2026-09-19 17:00:00+07' then
    raise exception using
      errcode = '23514',
      message = 'registration deadline has passed';
  end if;

  if new.sport = 'football' then
    new.jersey_number := public.normalized_jersey(new.jersey_number);
    perform pg_advisory_xact_lock(hashtextextended('registration:' || new.team_id, 0));
    select count(*)::int into current_count
    from public.registrations r
    where r.sport = 'football' and r.team_id = new.team_id;
    if current_count >= 20 then
      raise exception using
        errcode = '23514',
        message = 'football registration limit reached';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_enforce_rules on public.registrations;
create trigger registrations_enforce_rules
before insert on public.registrations
for each row execute function public.enforce_registration_rules();

alter table public.event_attendees
  add column if not exists team_id text references public.teams (id) on delete restrict;

update public.event_attendees a
set team_id = t.id
from public.teams t
where a.team_id is null
  and btrim(a.subdistrict) in (btrim(t.org_th), btrim(t.name_th));

create index if not exists event_attendees_team_idx
  on public.event_attendees (team_id);

create or replace function public.enforce_attendee_deadline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if statement_timestamp() > timestamptz '2026-09-19 17:00:00+07' then
    raise exception using
      errcode = '23514',
      message = 'registration deadline has passed';
  end if;
  if new.team_id is null then
    raise exception using
      errcode = '23514',
      message = 'team_id is required';
  end if;
  return new;
end;
$$;

drop trigger if exists event_attendees_enforce_deadline on public.event_attendees;
create trigger event_attendees_enforce_deadline
before insert on public.event_attendees
for each row execute function public.enforce_attendee_deadline();

drop policy if exists "Public read event attendees" on public.event_attendees;
drop policy if exists "Authenticated read event attendees" on public.event_attendees;
create policy "Authenticated read event attendees"
  on public.event_attendees for select
  to authenticated
  using (true);

revoke execute on function public.enforce_registration_rules()
  from public, anon, authenticated;
revoke execute on function public.enforce_attendee_deadline()
  from public, anon, authenticated;
