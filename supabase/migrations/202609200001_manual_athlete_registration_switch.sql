-- Reopen both athlete sports until the organizer explicitly closes registration.
-- Change only this row to 'false' to close; anon/authenticated cannot update app_meta.
insert into public.app_meta (key, value)
values ('athlete_registration_open', 'true')
on conflict (key) do update set value = excluded.value;

create or replace function public.enforce_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.app_meta
    where key = 'athlete_registration_open' and value = 'true'
  ) then
    raise exception using
      errcode = '23514',
      message = 'athlete registration is closed';
  end if;

  if new.sport = 'football' then
    new.jersey_number := public.normalized_jersey(new.jersey_number);
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_registration_rules()
  from public, anon, authenticated;

drop policy if exists "Public upload player photos" on storage.objects;
drop policy if exists "Public upload player photos while registration is open" on storage.objects;
create policy "Public upload player photos while registration is open"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'player-photos'
    and exists (
      select 1 from public.app_meta
      where key = 'athlete_registration_open' and value = 'true'
    )
    and name ~ '^[a-z0-9-]+/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    and exists (
      select 1 from public.teams t
      where t.id = split_part(name, '/', 1)
    )
  );
