-- ตารางคะแนนมาจากผลแข่งรอบแบ่งสายที่จบแล้วเท่านั้น
-- ชนะ 3 · เสมอ 1 · แพ้ 0 และแต้มเท่ากันคงลำดับเดิมเพื่อให้จับฉลากเอง

create or replace function public.recalculate_tournament_standings(
  p_sport public.sport_type,
  p_season_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with team_results as (
    select
      m.home_team_id as team_id,
      count(*)::int as played,
      count(*) filter (where m.home_score > m.away_score)::int as won,
      count(*) filter (where m.home_score = m.away_score)::int as drawn,
      count(*) filter (where m.home_score < m.away_score)::int as lost,
      coalesce(sum(
        case
          when m.home_score > m.away_score then 3
          when m.home_score = m.away_score then 1
          else 0
        end
      ), 0)::int as points
    from public.matches m
    where m.sport = p_sport
      and m.season_id = p_season_id
      and m.status = 'finished'
      and m.stage = 'group'
      and m.group_code in ('A', 'B')
    group by m.home_team_id

    union all

    select
      m.away_team_id as team_id,
      count(*)::int as played,
      count(*) filter (where m.away_score > m.home_score)::int as won,
      count(*) filter (where m.away_score = m.home_score)::int as drawn,
      count(*) filter (where m.away_score < m.home_score)::int as lost,
      coalesce(sum(
        case
          when m.away_score > m.home_score then 3
          when m.away_score = m.home_score then 1
          else 0
        end
      ), 0)::int as points
    from public.matches m
    where m.sport = p_sport
      and m.season_id = p_season_id
      and m.status = 'finished'
      and m.stage = 'group'
      and m.group_code in ('A', 'B')
    group by m.away_team_id
  ), totals as (
    select
      s.id,
      coalesce(sum(r.played), 0)::int as played,
      coalesce(sum(r.won), 0)::int as won,
      coalesce(sum(r.drawn), 0)::int as drawn,
      coalesce(sum(r.lost), 0)::int as lost,
      coalesce(sum(r.points), 0)::int as points
    from public.standings s
    left join team_results r on r.team_id = s.team_id
    where s.sport = p_sport and s.season_id = p_season_id
    group by s.id
  )
  update public.standings s
  set
    played = t.played,
    won = t.won,
    drawn = t.drawn,
    lost = t.lost,
    points = t.points
  from totals t
  where s.id = t.id;

  with ranked as (
    select
      s.id,
      row_number() over (
        partition by s.group_code
        order by s.points desc, s.rank, s.team_id
      )::int as new_rank
    from public.standings s
    where s.sport = p_sport and s.season_id = p_season_id
  )
  update public.standings s
  set
    previous_rank = case when s.rank <> r.new_rank then s.rank else s.previous_rank end,
    rank = r.new_rank
  from ranked r
  where s.id = r.id and s.rank <> r.new_rank;
end;
$$;

create or replace function public.refresh_standings_after_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_tournament_standings(old.sport, old.season_id);
    return old;
  end if;

  if tg_op = 'UPDATE'
     and (old.sport is distinct from new.sport
          or old.season_id is distinct from new.season_id) then
    perform public.recalculate_tournament_standings(old.sport, old.season_id);
  end if;

  perform public.recalculate_tournament_standings(new.sport, new.season_id);
  return new;
end;
$$;

drop trigger if exists matches_refresh_standings on public.matches;
create trigger matches_refresh_standings
after insert or update of sport, season_id, status, home_score, away_score,
  home_team_id, away_team_id, group_code, stage or delete
on public.matches
for each row execute function public.refresh_standings_after_match();

revoke execute on function public.recalculate_tournament_standings(public.sport_type, text)
  from public, anon, authenticated;
revoke execute on function public.refresh_standings_after_match()
  from public, anon, authenticated;

do $$
declare
  item record;
begin
  for item in select distinct sport, season_id from public.standings loop
    perform public.recalculate_tournament_standings(item.sport, item.season_id);
  end loop;
end;
$$;
