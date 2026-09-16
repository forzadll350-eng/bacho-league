-- Official 21 Sep 2026 schedule synchronized from the supplied competition documents.
-- Futsal slot: 10m first half + 5m halftime + 10m second half + 5m team change.
-- Volleyball slot: 40m. Competitions continue through noon without a lunch stoppage.
-- Bare Tai remains blocked from volleyball registration, but stays in Group B fixtures;
-- admins record each forfeit only when that match time arrives (opponent wins 2-0, 15-0/15-0).

-- Some production databases predate the standings migration. Recreate the canonical
-- calculator here so every finished group match refreshes points and volleyball set totals.
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
      ), 0)::int as points,
      coalesce(sum(m.home_score), 0)::int as sets_won,
      coalesce(sum(m.away_score), 0)::int as sets_lost
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
      ), 0)::int as points,
      coalesce(sum(m.away_score), 0)::int as sets_won,
      coalesce(sum(m.home_score), 0)::int as sets_lost
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
      coalesce(sum(r.points), 0)::int as points,
      coalesce(sum(r.sets_won), 0)::int as sets_won,
      coalesce(sum(r.sets_lost), 0)::int as sets_lost
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
    points = t.points,
    sets_won = case when p_sport = 'volleyball' then t.sets_won else s.sets_won end,
    sets_lost = case when p_sport = 'volleyball' then t.sets_lost else s.sets_lost end
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

insert into public.teams (id, name_th, name_en, short_name, crest_url, org_th, sort_order) values
  ('slot-sf1-loser', 'ผู้แพ้รองฯ 1', 'SF1 Loser', 'L1', '/crests/league.webp', 'รอผลรองฯ', 96),
  ('slot-sf2-loser', 'ผู้แพ้รองฯ 2', 'SF2 Loser', 'L2', '/crests/league.webp', 'รอผลรองฯ', 97)
on conflict (id) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  short_name = excluded.short_name,
  crest_url = excluded.crest_url,
  org_th = excluded.org_th,
  sort_order = excluded.sort_order;

-- Futsal group A: A1 Tonsai, A2 Kayoh Mati, A3 Lubosawo, A4 Bacho Municipality.
update public.matches
set match_order = match_order + 100
where sport = 'football'
  and season_id = 'season-2569-fb'
  and group_code in ('A', 'B');

update public.matches as m set
  home_team_id = v.home_team_id,
  away_team_id = v.away_team_id,
  scheduled_at = v.scheduled_at,
  ends_at = v.ends_at,
  venue = 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
  court_label = 'สนามที่ 1',
  period_label = v.period_label,
  status = 'scheduled',
  home_score = 0,
  away_score = 0,
  home_points = 0,
  away_points = 0,
  points_set = 1,
  set_scores = '{}'::jsonb,
  started_at = null,
  hide_schedule_time = false,
  match_order = v.match_order,
  updated_at = statement_timestamp()
from (values
  ('fb-a-1', 'tonsai', 'kayoh-mati',      '2026-09-21T10:00:00+07:00'::timestamptz, '2026-09-21T10:25:00+07:00'::timestamptz, 'รอบที่ 1 · นัดที่ 1', 1),
  ('fb-a-2', 'lubosawo', 'bacho-municipal', '2026-09-21T10:30:00+07:00'::timestamptz, '2026-09-21T10:55:00+07:00'::timestamptz, 'รอบที่ 1 · นัดที่ 2', 2),
  ('fb-a-3', 'tonsai', 'lubosawo',        '2026-09-21T11:00:00+07:00'::timestamptz, '2026-09-21T11:25:00+07:00'::timestamptz, 'รอบที่ 2 · นัดที่ 3', 3),
  ('fb-a-4', 'kayoh-mati', 'bacho-municipal', '2026-09-21T11:30:00+07:00'::timestamptz, '2026-09-21T11:55:00+07:00'::timestamptz, 'รอบที่ 2 · นัดที่ 4', 4),
  ('fb-a-5', 'tonsai', 'bacho-municipal', '2026-09-21T12:00:00+07:00'::timestamptz, '2026-09-21T12:25:00+07:00'::timestamptz, 'รอบที่ 3 · นัดที่ 5', 5),
  ('fb-a-6', 'kayoh-mati', 'lubosawo',    '2026-09-21T12:30:00+07:00'::timestamptz, '2026-09-21T12:55:00+07:00'::timestamptz, 'รอบที่ 3 · นัดที่ 6', 6)
) as v(id, home_team_id, away_team_id, scheduled_at, ends_at, period_label, match_order)
where m.id = v.id;

-- Futsal group B: B1 Bare Tai, B2 Bare Nuea, B3 Bacho SAO, B4 Palukasamoh.
update public.matches as m set
  home_team_id = v.home_team_id,
  away_team_id = v.away_team_id,
  scheduled_at = v.scheduled_at,
  ends_at = v.ends_at,
  venue = 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
  court_label = 'สนามที่ 2',
  period_label = v.period_label,
  status = 'scheduled',
  home_score = 0,
  away_score = 0,
  home_points = 0,
  away_points = 0,
  points_set = 1,
  set_scores = '{}'::jsonb,
  started_at = null,
  hide_schedule_time = false,
  match_order = v.match_order,
  updated_at = statement_timestamp()
from (values
  ('fb-b-1', 'barehtai', 'bare-nuea',     '2026-09-21T10:00:00+07:00'::timestamptz, '2026-09-21T10:25:00+07:00'::timestamptz, 'รอบที่ 1 · นัดที่ 1', 1),
  ('fb-b-2', 'bacho-sao', 'palukasamoh', '2026-09-21T10:30:00+07:00'::timestamptz, '2026-09-21T10:55:00+07:00'::timestamptz, 'รอบที่ 1 · นัดที่ 2', 2),
  ('fb-b-3', 'barehtai', 'bacho-sao',    '2026-09-21T11:00:00+07:00'::timestamptz, '2026-09-21T11:25:00+07:00'::timestamptz, 'รอบที่ 2 · นัดที่ 3', 3),
  ('fb-b-4', 'bare-nuea', 'palukasamoh', '2026-09-21T11:30:00+07:00'::timestamptz, '2026-09-21T11:55:00+07:00'::timestamptz, 'รอบที่ 2 · นัดที่ 4', 4),
  ('fb-b-5', 'barehtai', 'palukasamoh',  '2026-09-21T12:00:00+07:00'::timestamptz, '2026-09-21T12:25:00+07:00'::timestamptz, 'รอบที่ 3 · นัดที่ 5', 5),
  ('fb-b-6', 'bare-nuea', 'bacho-sao',   '2026-09-21T12:30:00+07:00'::timestamptz, '2026-09-21T12:55:00+07:00'::timestamptz, 'รอบที่ 3 · นัดที่ 6', 6)
) as v(id, home_team_id, away_team_id, scheduled_at, ends_at, period_label, match_order)
where m.id = v.id;

-- Give every existing futsal knockout row a temporary order before rebuilding 1-4.
update public.matches
set match_order = match_order + 100
where sport = 'football'
  and season_id = 'season-2569-fb'
  and group_code is null;

update public.matches as m set
  home_team_id = v.home_team_id,
  away_team_id = v.away_team_id,
  scheduled_at = v.scheduled_at,
  ends_at = v.ends_at,
  venue = 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
  court_label = 'สนามที่ 1',
  period_label = v.period_label,
  status = 'scheduled',
  home_score = 0,
  away_score = 0,
  started_at = null,
  hide_schedule_time = false,
  match_order = v.match_order,
  updated_at = statement_timestamp()
from (values
  ('fb-sf-1', 'slot-a1', 'slot-b2', '2026-09-21T13:30:00+07:00'::timestamptz, '2026-09-21T13:55:00+07:00'::timestamptz, 'รองชนะเลิศ 1 · A1 พบ B2', 1),
  ('fb-sf-2', 'slot-b1', 'slot-a2', '2026-09-21T14:00:00+07:00'::timestamptz, '2026-09-21T14:25:00+07:00'::timestamptz, 'รองชนะเลิศ 2 · B1 พบ A2', 2),
  ('fb-final','slot-sf1', 'slot-sf2', '2026-09-21T15:00:00+07:00'::timestamptz, '2026-09-21T15:25:00+07:00'::timestamptz, 'ชิงชนะเลิศ · ผู้ชนะรองฯ พบกัน', 4)
) as v(id, home_team_id, away_team_id, scheduled_at, ends_at, period_label, match_order)
where m.id = v.id;

insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, ends_at, venue, status, group_code, stage, court_label,
  detail, period_label, hide_schedule_time, match_order
) values (
  'fb-third', 'football', 'comp-football', 'season-2569-fb',
  'slot-sf1-loser', 'slot-sf2-loser',
  '2026-09-21T14:30:00+07:00', '2026-09-21T14:55:00+07:00',
  'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
  'scheduled', null, 'third', 'สนามที่ 1', false,
  'ชิงอันดับ 3 · ผู้แพ้รองฯ พบกัน', false, 3
)
on conflict (id) do update set
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  scheduled_at = excluded.scheduled_at,
  ends_at = excluded.ends_at,
  venue = excluded.venue,
  status = excluded.status,
  group_code = excluded.group_code,
  stage = excluded.stage,
  court_label = excluded.court_label,
  period_label = excluded.period_label,
  hide_schedule_time = excluded.hide_schedule_time,
  match_order = excluded.match_order,
  home_score = 0,
  away_score = 0,
  started_at = null,
  updated_at = statement_timestamp();

-- Volleyball groups: both courts run continuously in 40-minute slots.
update public.matches
set match_order = match_order + 100
where sport = 'volleyball'
  and season_id = 'season-2569-vb'
  and group_code in ('A', 'B');

update public.matches as m set
  home_team_id = v.home_team_id,
  away_team_id = v.away_team_id,
  scheduled_at = v.scheduled_at,
  ends_at = v.ends_at,
  venue = 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
  court_label = v.court_label,
  period_label = v.period_label,
  status = 'scheduled',
  home_score = 0,
  away_score = 0,
  home_points = 0,
  away_points = 0,
  points_set = 1,
  set_scores = '{}'::jsonb,
  started_at = null,
  hide_schedule_time = false,
  match_order = v.match_order,
  updated_at = statement_timestamp()
from (values
  ('vb-a-1', 'bacho-sao', 'bare-nuea',      '2026-09-21T10:00:00+07:00'::timestamptz, '2026-09-21T10:40:00+07:00'::timestamptz, 'สนามที่ 1', 'รอบที่ 1 · นัดที่ 1', 1),
  ('vb-a-2', 'tonsai', 'bacho-municipal',  '2026-09-21T10:40:00+07:00'::timestamptz, '2026-09-21T11:20:00+07:00'::timestamptz, 'สนามที่ 1', 'รอบที่ 1 · นัดที่ 2', 2),
  ('vb-a-3', 'bacho-sao', 'tonsai',         '2026-09-21T11:20:00+07:00'::timestamptz, '2026-09-21T12:00:00+07:00'::timestamptz, 'สนามที่ 1', 'รอบที่ 2 · นัดที่ 3', 3),
  ('vb-a-4', 'bare-nuea', 'bacho-municipal','2026-09-21T12:00:00+07:00'::timestamptz, '2026-09-21T12:40:00+07:00'::timestamptz, 'สนามที่ 1', 'รอบที่ 2 · นัดที่ 4', 4),
  ('vb-a-5', 'bacho-sao', 'bacho-municipal','2026-09-21T12:40:00+07:00'::timestamptz, '2026-09-21T13:20:00+07:00'::timestamptz, 'สนามที่ 1', 'รอบที่ 3 · นัดที่ 5', 5),
  ('vb-a-6', 'bare-nuea', 'tonsai',         '2026-09-21T13:20:00+07:00'::timestamptz, '2026-09-21T14:00:00+07:00'::timestamptz, 'สนามที่ 1', 'รอบที่ 3 · นัดที่ 6', 6),
  ('vb-b-1', 'kayoh-mati', 'palukasamoh',   '2026-09-21T10:00:00+07:00'::timestamptz, '2026-09-21T10:40:00+07:00'::timestamptz, 'สนามที่ 2', 'รอบที่ 1 · นัดที่ 1', 1),
  ('vb-b-2', 'barehtai', 'lubosawo',        '2026-09-21T10:40:00+07:00'::timestamptz, '2026-09-21T11:20:00+07:00'::timestamptz, 'สนามที่ 2', 'รอบที่ 1 · นัดที่ 2', 2),
  ('vb-b-3', 'kayoh-mati', 'barehtai',      '2026-09-21T11:20:00+07:00'::timestamptz, '2026-09-21T12:00:00+07:00'::timestamptz, 'สนามที่ 2', 'รอบที่ 2 · นัดที่ 3', 3)
) as v(id, home_team_id, away_team_id, scheduled_at, ends_at, court_label, period_label, match_order)
where m.id = v.id;

insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, ends_at, venue, status, group_code, stage, court_label,
  detail, period_label, hide_schedule_time, match_order
) values
  ('vb-b-4', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'palukasamoh', 'lubosawo',
   '2026-09-21T12:00:00+07:00', '2026-09-21T12:40:00+07:00', 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
   'scheduled', 'B', 'group', 'สนามที่ 2', false, 'รอบที่ 2 · นัดที่ 4', false, 4),
  ('vb-b-5', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'kayoh-mati', 'lubosawo',
   '2026-09-21T12:40:00+07:00', '2026-09-21T13:20:00+07:00', 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
   'scheduled', 'B', 'group', 'สนามที่ 2', false, 'รอบที่ 3 · นัดที่ 5', false, 5),
  ('vb-b-6', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'palukasamoh', 'barehtai',
   '2026-09-21T13:20:00+07:00', '2026-09-21T14:00:00+07:00', 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
   'scheduled', 'B', 'group', 'สนามที่ 2', false, 'รอบที่ 3 · นัดที่ 6', false, 6)
on conflict (id) do update set
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  scheduled_at = excluded.scheduled_at,
  ends_at = excluded.ends_at,
  venue = excluded.venue,
  status = excluded.status,
  group_code = excluded.group_code,
  stage = excluded.stage,
  court_label = excluded.court_label,
  period_label = excluded.period_label,
  hide_schedule_time = excluded.hide_schedule_time,
  match_order = excluded.match_order,
  home_score = 0,
  away_score = 0,
  home_points = 0,
  away_points = 0,
  points_set = 1,
  set_scores = '{}'::jsonb,
  started_at = null,
  updated_at = statement_timestamp();

update public.matches set
  scheduled_at = '2026-09-21T14:30:00+07:00',
  ends_at = '2026-09-21T15:10:00+07:00',
  venue = 'สนามสวนราเปี่ยมสุข อำเภอเมือง จังหวัดนราธิวาส',
  court_label = 'สนามที่ 1',
  period_label = 'ชิงชนะเลิศ · ที่ 1 สาย A พบ ที่ 1 สาย B',
  status = 'scheduled',
  home_score = 0,
  away_score = 0,
  home_points = 0,
  away_points = 0,
  points_set = 1,
  set_scores = '{}'::jsonb,
  started_at = null,
  hide_schedule_time = false,
  match_order = 1,
  updated_at = statement_timestamp()
where id = 'vb-final';

update public.standings set rank = 4, previous_rank = 4
where sport = 'volleyball'
  and season_id = 'season-2569-vb'
  and team_id = 'lubosawo';

insert into public.standings (
  sport, season_id, team_id, group_code, rank, previous_rank,
  played, won, drawn, lost, points, sets_won, sets_lost
) values (
  'volleyball', 'season-2569-vb', 'barehtai', 'B', 3, 3,
  0, 0, 0, 0, 0, 0, 0
)
on conflict (sport, season_id, team_id) do update set
  group_code = excluded.group_code,
  rank = excluded.rank,
  previous_rank = excluded.previous_rank;

update public.notifications set
  title = 'วอลเลย์บอลหญิง 21 ก.ย. 2569',
  body = 'เริ่ม 10:00 น. · แข่งต่อเนื่องไม่หยุดเที่ยง · สาย B มีบาเระใต้ในโปรแกรมแต่ปิดรับสมัคร · ที่ 1 แต่ละสายชิงชนะเลิศ'
where id = 'vn-day';

update public.notifications set
  title = 'วันแข่ง 21 ก.ย. 2569',
  body = 'เริ่ม 10:00 น. · ครึ่งละ 10 นาที · พักครึ่ง 5 นาที · เปลี่ยนทีม 5 นาที · ไม่หยุดเที่ยง'
where id = 'n-day';

select public.recalculate_tournament_standings('football'::public.sport_type, 'season-2569-fb'::text);
select public.recalculate_tournament_standings('volleyball'::public.sport_type, 'season-2569-vb'::text);

comment on column public.matches.stage is 'group | semi | third | final';

notify pgrst, 'reload schema';
