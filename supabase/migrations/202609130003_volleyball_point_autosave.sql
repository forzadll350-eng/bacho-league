-- Autosave volleyball rally points without persisting any other editor fields.

create or replace function public.save_volleyball_points(
  p_match_id text,
  p_home_points integer,
  p_away_points integer,
  p_points_set integer,
  p_set_scores jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  home_text text;
  away_text text;
begin
  if not public.is_bacho_admin() then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;

  if p_home_points is null
     or p_away_points is null
     or p_points_set is null
     or p_home_points not between 0 and 99
     or p_away_points not between 0 and 99
     or p_points_set not between 1 and 3 then
    raise exception using errcode = '23514', message = 'invalid volleyball points';
  end if;

  if p_set_scores is null or jsonb_typeof(p_set_scores) <> 'object' then
    raise exception using errcode = '23514', message = 'invalid volleyball set scores';
  end if;

  for item in
    select entry.key as set_no, entry.value as score
    from pg_catalog.jsonb_each(p_set_scores) as entry
  loop
    if item.set_no not in ('1', '2', '3') or jsonb_typeof(item.score) <> 'object' then
      raise exception using errcode = '23514', message = 'invalid volleyball set scores';
    end if;
    home_text := item.score ->> 'home';
    away_text := item.score ->> 'away';
    if coalesce(home_text, '') !~ '^[0-9]{1,2}$'
       or coalesce(away_text, '') !~ '^[0-9]{1,2}$' then
      raise exception using errcode = '23514', message = 'invalid volleyball set scores';
    end if;
  end loop;

  if not (p_set_scores ? p_points_set::text) then
    raise exception using errcode = '23514', message = 'selected volleyball set is missing';
  end if;
  if (p_set_scores -> p_points_set::text ->> 'home')::integer <> p_home_points
     or (p_set_scores -> p_points_set::text ->> 'away')::integer <> p_away_points then
    raise exception using errcode = '23514', message = 'selected volleyball points do not match';
  end if;

  update public.matches m
  set
    home_points = p_home_points,
    away_points = p_away_points,
    points_set = p_points_set,
    set_scores = p_set_scores,
    updated_at = statement_timestamp()
  where m.id = p_match_id
    and m.sport = 'volleyball';

  if not found then
    raise exception using errcode = 'P0002', message = 'volleyball match not found';
  end if;
end;
$$;

revoke execute on function public.save_volleyball_points(text, integer, integer, integer, jsonb)
  from public, anon;
grant execute on function public.save_volleyball_points(text, integer, integer, integer, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
