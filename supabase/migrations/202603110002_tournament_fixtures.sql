-- Replace demo fixtures with tournament day 21 Sep 2026 (BE 2569)
-- Futsal: 2 groups of 4, round-robin, then semi A1-B2 / A2-B1, final
-- Volleyball: Group A 4 teams RR; Group B 3 teams (barehtai withdrew); final A1 vs B1
-- Tiebreak: lottery (handled in admin / lottery_note) — not GD

delete from public.notifications;
delete from public.standings;
delete from public.matches;

-- Slot teams for knockout until real qualifiers are known
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

-- ----- Futsal Group A: tonsai, kayoh-mati, lubosawo, bacho-municipal -----
-- รอบ 1: 08:00 / 08:35 · พัก 20 นาที · รอบ 2: 09:30 / 10:05 · พัก 20 นาที · รอบ 3: 11:00 / 11:35
insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, group_code, stage, court_label, detail, period_label
) values
  ('fb-a-1', 'football', 'comp-football', 'season-2569-fb', 'lubosawo', 'kayoh-mati',
   '2026-09-21T08:00:00+07:00', 'สนามฟุตซอล สาย A', 'scheduled', 'A', 'group', 'สนาม A', false, 'รอบที่ 1 · นัดที่ 1'),
  ('fb-a-2', 'football', 'comp-football', 'season-2569-fb', 'tonsai', 'bacho-municipal',
   '2026-09-21T08:35:00+07:00', 'สนามฟุตซอล สาย A', 'scheduled', 'A', 'group', 'สนาม A', false, 'รอบที่ 1 · นัดที่ 2'),
  ('fb-a-3', 'football', 'comp-football', 'season-2569-fb', 'lubosawo', 'tonsai',
   '2026-09-21T09:30:00+07:00', 'สนามฟุตซอล สาย A', 'scheduled', 'A', 'group', 'สนาม A', false, 'รอบที่ 2 · นัดที่ 3'),
  ('fb-a-4', 'football', 'comp-football', 'season-2569-fb', 'kayoh-mati', 'bacho-municipal',
   '2026-09-21T10:05:00+07:00', 'สนามฟุตซอล สาย A', 'scheduled', 'A', 'group', 'สนาม A', false, 'รอบที่ 2 · นัดที่ 4'),
  ('fb-a-5', 'football', 'comp-football', 'season-2569-fb', 'lubosawo', 'bacho-municipal',
   '2026-09-21T11:00:00+07:00', 'สนามฟุตซอล สาย A', 'scheduled', 'A', 'group', 'สนาม A', false, 'รอบที่ 3 · นัดที่ 5'),
  ('fb-a-6', 'football', 'comp-football', 'season-2569-fb', 'tonsai', 'kayoh-mati',
   '2026-09-21T11:35:00+07:00', 'สนามฟุตซอล สาย A', 'scheduled', 'A', 'group', 'สนาม A', false, 'รอบที่ 3 · นัดที่ 6');

-- ----- Futsal Group B: barehtai, bare-nuea, bacho-sao, palukasamoh -----
-- นัด 1–4: 08:00 / 08:35 / 09:10 / 09:45 · พัก 20 นาที · นัด 5–6: 10:40 / 11:15
insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, group_code, stage, court_label, detail, period_label
) values
  ('fb-b-1', 'football', 'comp-football', 'season-2569-fb', 'barehtai', 'bare-nuea',
   '2026-09-21T08:00:00+07:00', 'สนามฟุตซอล สาย B', 'scheduled', 'B', 'group', 'สนาม B', false, 'รอบที่ 1 · นัดที่ 1'),
  ('fb-b-2', 'football', 'comp-football', 'season-2569-fb', 'bacho-sao', 'palukasamoh',
   '2026-09-21T08:35:00+07:00', 'สนามฟุตซอล สาย B', 'scheduled', 'B', 'group', 'สนาม B', false, 'รอบที่ 1 · นัดที่ 2'),
  ('fb-b-3', 'football', 'comp-football', 'season-2569-fb', 'barehtai', 'bacho-sao',
   '2026-09-21T09:10:00+07:00', 'สนามฟุตซอล สาย B', 'scheduled', 'B', 'group', 'สนาม B', false, 'รอบที่ 1 · นัดที่ 3'),
  ('fb-b-4', 'football', 'comp-football', 'season-2569-fb', 'bare-nuea', 'palukasamoh',
   '2026-09-21T09:45:00+07:00', 'สนามฟุตซอล สาย B', 'scheduled', 'B', 'group', 'สนาม B', false, 'รอบที่ 1 · นัดที่ 4'),
  ('fb-b-5', 'football', 'comp-football', 'season-2569-fb', 'barehtai', 'palukasamoh',
   '2026-09-21T10:40:00+07:00', 'สนามฟุตซอล สาย B', 'scheduled', 'B', 'group', 'สนาม B', false, 'รอบที่ 2 · นัดที่ 5'),
  ('fb-b-6', 'football', 'comp-football', 'season-2569-fb', 'bacho-sao', 'bare-nuea',
   '2026-09-21T11:15:00+07:00', 'สนามฟุตซอล สาย B', 'scheduled', 'B', 'group', 'สนาม B', false, 'รอบที่ 2 · นัดที่ 6');

-- Knockout slots — ยังไม่รู้ทีมจริง จนกว่าจะจบสาย (+จับฉลาก) แล้วแอดมินใส่ทีม
insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, group_code, stage, court_label, detail, period_label
) values
  ('fb-sf-1', 'football', 'comp-football', 'season-2569-fb', 'slot-a1', 'slot-b2',
   '2026-09-21T13:00:00+07:00', 'สนามฟุตซอล รองชนะเลิศ', 'scheduled', null, 'semi', 'รองฯ 1', false, 'A1 พบ B2'),
  ('fb-sf-2', 'football', 'comp-football', 'season-2569-fb', 'slot-a2', 'slot-b1',
   '2026-09-21T13:00:00+07:00', 'สนามฟุตซอล รองชนะเลิศ', 'scheduled', null, 'semi', 'รองฯ 2', false, 'A2 พบ B1'),
  ('fb-final', 'football', 'comp-football', 'season-2569-fb', 'slot-sf1', 'slot-sf2',
   '2026-09-21T15:00:00+07:00', 'สนามฟุตซอล นัดชิง', 'scheduled', null, 'final', 'นัดชิง', true, 'ผู้ชนะรองฯ พบกัน');

-- ----- Volleyball Group A: bacho-sao, bare-nuea, tonsai, bacho-municipal -----
insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, group_code, stage, court_label, detail
) values
  ('vb-a-1', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'bacho-sao', 'bare-nuea',
   '2026-09-21T08:00:00+07:00', 'สนามวอลเลย์ สาย A', 'scheduled', 'A', 'group', 'วอลเลย์ A', false),
  ('vb-a-2', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'tonsai', 'bacho-municipal',
   '2026-09-21T08:40:00+07:00', 'สนามวอลเลย์ สาย A', 'scheduled', 'A', 'group', 'วอลเลย์ A', false),
  ('vb-a-3', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'bacho-sao', 'tonsai',
   '2026-09-21T09:20:00+07:00', 'สนามวอลเลย์ สาย A', 'scheduled', 'A', 'group', 'วอลเลย์ A', false),
  ('vb-a-4', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'bare-nuea', 'bacho-municipal',
   '2026-09-21T10:00:00+07:00', 'สนามวอลเลย์ สาย A', 'scheduled', 'A', 'group', 'วอลเลย์ A', false),
  ('vb-a-5', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'bacho-sao', 'bacho-municipal',
   '2026-09-21T10:40:00+07:00', 'สนามวอลเลย์ สาย A', 'scheduled', 'A', 'group', 'วอลเลย์ A', false),
  ('vb-a-6', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'bare-nuea', 'tonsai',
   '2026-09-21T11:20:00+07:00', 'สนามวอลเลย์ สาย A', 'scheduled', 'A', 'group', 'วอลเลย์ A', false);

-- ----- Volleyball Group B (3): kayoh-mati, palukasamoh, lubosawo — barehtai withdrew -----
insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, group_code, stage, court_label, detail
) values
  ('vb-b-1', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'kayoh-mati', 'palukasamoh',
   '2026-09-21T08:00:00+07:00', 'สนามวอลเลย์ สาย B', 'scheduled', 'B', 'group', 'วอลเลย์ B', false),
  ('vb-b-2', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'palukasamoh', 'lubosawo',
   '2026-09-21T08:40:00+07:00', 'สนามวอลเลย์ สาย B', 'scheduled', 'B', 'group', 'วอลเลย์ B', false),
  ('vb-b-3', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'lubosawo', 'kayoh-mati',
   '2026-09-21T09:20:00+07:00', 'สนามวอลเลย์ สาย B', 'scheduled', 'B', 'group', 'วอลเลย์ B', false);

insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, group_code, stage, court_label, detail, period_label
) values
  ('vb-final', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'slot-a1', 'slot-b1',
   '2026-09-21T14:00:00+07:00', 'สนามวอลเลย์ นัดชิง', 'scheduled', null, 'final', 'นัดชิง', true, 'ที่ 1 สาย A พบ ที่ 1 สาย B');

-- Initial standings (0 pts) by group
insert into public.standings (sport, season_id, team_id, group_code, rank, previous_rank, played, won, drawn, lost, points) values
  ('football', 'season-2569-fb', 'tonsai', 'A', 1, 1, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'kayoh-mati', 'A', 2, 2, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'lubosawo', 'A', 3, 3, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'bacho-municipal', 'A', 4, 4, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'barehtai', 'B', 1, 1, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'bare-nuea', 'B', 2, 2, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'bacho-sao', 'B', 3, 3, 0, 0, 0, 0, 0),
  ('football', 'season-2569-fb', 'palukasamoh', 'B', 4, 4, 0, 0, 0, 0, 0);

insert into public.standings (sport, season_id, team_id, group_code, rank, previous_rank, played, points, sets_won, sets_lost) values
  ('volleyball', 'season-2569-vb', 'bacho-sao', 'A', 1, 1, 0, 0, 0, 0),
  ('volleyball', 'season-2569-vb', 'bare-nuea', 'A', 2, 2, 0, 0, 0, 0),
  ('volleyball', 'season-2569-vb', 'tonsai', 'A', 3, 3, 0, 0, 0, 0),
  ('volleyball', 'season-2569-vb', 'bacho-municipal', 'A', 4, 4, 0, 0, 0, 0),
  ('volleyball', 'season-2569-vb', 'kayoh-mati', 'B', 1, 1, 0, 0, 0, 0),
  ('volleyball', 'season-2569-vb', 'palukasamoh', 'B', 2, 2, 0, 0, 0, 0),
  ('volleyball', 'season-2569-vb', 'lubosawo', 'B', 3, 3, 0, 0, 0, 0);

insert into public.notifications (id, sport, icon, title, body, time_label) values
  ('n-day', 'football', 'L', 'วันแข่ง 21 ก.ย. 2569', 'ฟุตซอล 2 สาย · สองสนามพร้อมกัน · เสมอกันใช้จับฉลาก', 'วันนี้'),
  ('vn-day', 'volleyball', 'L', 'วอลเลย์บอลหญิง 21 ก.ย. 2569', 'สาย B ไม่มีบาเระใต้ · ที่ 1 แต่ละสายชิงเลย · เซตละ 15', 'วันนี้');
