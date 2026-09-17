-- Keep attendee registration closed until the event-day check-in opens.
-- Athlete registration keeps its existing, separate deadline.

insert into public.app_meta (key, value)
values ('attendee_registration_opens_at', '2026-09-21T08:00:00+07:00')
on conflict (key) do update set value = excluded.value;

create or replace function public.enforce_attendee_deadline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if statement_timestamp() < timestamptz '2026-09-21 08:00:00+07' then
    raise exception using
      errcode = '23514',
      message = 'attendee registration is not open yet';
  end if;

  if new.team_id is null then
    raise exception using
      errcode = '23514',
      message = 'team_id is required';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_attendee_deadline()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
