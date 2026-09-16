-- Allow unlimited futsal athlete registrations per team.
-- Deadline, jersey normalization/uniqueness, age rules, and RPC access stay unchanged.

insert into public.app_meta (key, value)
values ('futsal_reg_limit', 'unlimited')
on conflict (key) do update set value = excluded.value;

create or replace function public.enforce_registration_rules()
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

  if new.sport = 'football' then
    new.jersey_number := public.normalized_jersey(new.jersey_number);
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_registration_rules()
  from public, anon, authenticated;
