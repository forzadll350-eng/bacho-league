-- Knockout slots until real teams are known

insert into public.teams (id, name_th, name_en, short_name, crest_url, org_th, sort_order) values
  ('slot-a1', 'ที่ 1 สาย A', 'Group A #1', 'A1', '/crests/league.webp', 'รอผลสาย', 90),
  ('slot-a2', 'ที่ 2 สาย A', 'Group A #2', 'A2', '/crests/league.webp', 'รอผลสาย', 91),
  ('slot-b1', 'ที่ 1 สาย B', 'Group B #1', 'B1', '/crests/league.webp', 'รอผลสาย', 92),
  ('slot-b2', 'ที่ 2 สาย B', 'Group B #2', 'B2', '/crests/league.webp', 'รอผลสาย', 93),
  ('slot-sf1', 'ผู้ชนะรองฯ 1', 'SF1 Winner', 'SF1', '/crests/league.webp', 'รอผลรองฯ', 94),
  ('slot-sf2', 'ผู้ชนะรองฯ 2', 'SF2 Winner', 'SF2', '/crests/league.webp', 'รอผลรองฯ', 95)
on conflict (id) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  short_name = excluded.short_name,
  crest_url = excluded.crest_url,
  org_th = excluded.org_th,
  sort_order = excluded.sort_order;

update public.matches set
  home_team_id = 'slot-a1',
  away_team_id = 'slot-b2',
  period_label = 'A1 พบ B2',
  home_score = 0,
  away_score = 0,
  status = 'scheduled'
where id = 'fb-sf-1';

update public.matches set
  home_team_id = 'slot-a2',
  away_team_id = 'slot-b1',
  period_label = 'A2 พบ B1',
  home_score = 0,
  away_score = 0,
  status = 'scheduled'
where id = 'fb-sf-2';

update public.matches set
  home_team_id = 'slot-sf1',
  away_team_id = 'slot-sf2',
  period_label = 'ผู้ชนะรองฯ พบกัน',
  home_score = 0,
  away_score = 0,
  status = 'scheduled'
where id = 'fb-final';

update public.matches set
  home_team_id = 'slot-a1',
  away_team_id = 'slot-b1',
  period_label = 'ที่ 1 สาย A พบ ที่ 1 สาย B',
  home_score = 0,
  away_score = 0,
  status = 'scheduled'
where id = 'vb-final';
