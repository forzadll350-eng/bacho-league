-- Seed: 8 อปท. + sample season 2569 (matches mock for Phase B demo)

insert into public.teams (id, name_th, name_en, short_name, crest_url, org_th, sort_order) values
  ('lubosawo', 'อบต.ลุโบะสาวอ', 'SAO Lubosawo', 'LS', '/crests/lubosawo.webp', 'อบต.ลุโบะสาวอ', 1),
  ('palukasamoh', 'อบต.ปะลุกาสาเมาะ', 'SAO Palukasamoh', 'PK', '/crests/palukasamoh.webp', 'อบต.ปะลุกาสาเมาะ', 2),
  ('tonsai', 'เทศบาลตำบลต้นไทร', 'Tonsai Municipality', 'TS', '/crests/tonsai.webp', 'เทศบาลตำบลต้นไทร', 3),
  ('barehtai', 'อบต.บาเระใต้', 'SAO Bare Tai', 'BT', '/crests/barehtai.webp', 'อบต.บาเระใต้', 4),
  ('bare-nuea', 'อบต.บาเราะเหนือ', 'SAO Bare Nuea', 'BN', '/crests/bare-nuea.webp', 'อบต.บาเราะเหนือ', 5),
  ('bacho-sao', 'อบต.บาเจาะ', 'SAO Bacho', 'BS', '/crests/bacho-sao.webp', 'อบต.บาเจาะ', 6),
  ('kayoh-mati', 'อบต.กาเยาะมาตี', 'SAO Kayoh Mati', 'KM', '/crests/kayoh-mati.webp', 'อบต.กาเยาะมาตี', 7),
  ('bacho-municipal', 'เทศบาลตำบลบาเจาะ', 'Bacho Municipality', 'BM', '/crests/bacho-municipal.webp', 'เทศบาลตำบลบาเจาะ', 8);

insert into public.competitions (id, name_th, name_en, sport) values
  ('comp-football', 'ฟุตซอลลีก', 'Futsal League', 'football'),
  ('comp-volleyball', 'วอลเลย์บอลลีก', 'Volleyball League', 'volleyball');

insert into public.seasons (id, competition_id, name, year_be) values
  ('season-2569-fb', 'comp-football', 'สายใยสัมพันธ์ 2569', 2569),
  ('season-2569-vb', 'comp-volleyball', 'สายใยสัมพันธ์ 2569', 2569);

insert into public.app_meta (key, value) values
  ('league_name_th', 'ฟุตซอลลีก'),
  ('season_name', 'สายใยสัมพันธ์ 2569');

insert into public.matches (
  id, sport, competition_id, season_id, home_team_id, away_team_id,
  scheduled_at, venue, status, home_score, away_score, live_clock, period_label, detail
) values
  ('fb-live-1', 'football', 'comp-football', 'season-2569-fb', 'bacho-municipal', 'bare-nuea',
   '2026-09-10T12:30:00+07:00', 'สนามเทศบาลบาเจาะ', 'live', 2, 1, '68:24', 'ครึ่งหลัง', true),
  ('fb-2', 'football', 'comp-football', 'season-2569-fb', 'lubosawo', 'palukasamoh',
   '2026-09-10T15:00:00+07:00', 'สนามอบต.ลุโบะสาวอ', 'scheduled', 0, 0, null, null, false),
  ('fb-3', 'football', 'comp-football', 'season-2569-fb', 'tonsai', 'kayoh-mati',
   '2026-09-10T18:00:00+07:00', 'สนามเทศบาลต้นไทร', 'scheduled', 0, 0, null, null, false),
  ('fb-4', 'football', 'comp-football', 'season-2569-fb', 'bacho-sao', 'barehtai',
   '2026-09-10T19:30:00+07:00', 'สนามอบต.บาเจาะ', 'scheduled', 0, 0, null, null, false),
  ('vb-1', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'palukasamoh', 'tonsai',
   '2026-09-10T13:00:00+07:00', 'อินดอร์ อำเภอบาเจาะ', 'finished', 1, 3, null, null, false),
  ('vb-live-1', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'lubosawo', 'bacho-municipal',
   '2026-09-10T18:30:00+07:00', 'อินดอร์ อำเภอบาเจาะ', 'live', 2, 1, 'SET 4', 'เซต 4 • 18–16', true),
  ('vb-3', 'volleyball', 'comp-volleyball', 'season-2569-vb', 'kayoh-mati', 'bare-nuea',
   '2026-09-10T20:00:00+07:00', 'กีฬาเวสน์ บาเจาะ', 'scheduled', 0, 0, null, null, false);

insert into public.standings (sport, season_id, team_id, rank, previous_rank, played, won, drawn, lost, points) values
  ('football', 'season-2569-fb', 'bacho-municipal', 1, 2, 7, 6, 0, 1, 18),
  ('football', 'season-2569-fb', 'lubosawo', 2, 1, 7, 5, 1, 1, 16),
  ('football', 'season-2569-fb', 'bare-nuea', 3, 3, 7, 4, 2, 1, 14),
  ('football', 'season-2569-fb', 'kayoh-mati', 4, 4, 7, 4, 0, 3, 12),
  ('football', 'season-2569-fb', 'palukasamoh', 5, 5, 7, 3, 1, 3, 10),
  ('football', 'season-2569-fb', 'tonsai', 6, 6, 7, 2, 3, 2, 9),
  ('football', 'season-2569-fb', 'bacho-sao', 7, 7, 7, 2, 1, 4, 7),
  ('football', 'season-2569-fb', 'barehtai', 8, 8, 7, 1, 1, 5, 4);

insert into public.standings (sport, season_id, team_id, rank, previous_rank, played, points, sets_won, sets_lost) values
  ('volleyball', 'season-2569-vb', 'lubosawo', 1, 1, 7, 15, 18, 6),
  ('volleyball', 'season-2569-vb', 'bacho-municipal', 2, 2, 7, 13, 16, 8),
  ('volleyball', 'season-2569-vb', 'kayoh-mati', 3, 4, 7, 12, 14, 9),
  ('volleyball', 'season-2569-vb', 'tonsai', 4, 3, 7, 10, 12, 11),
  ('volleyball', 'season-2569-vb', 'bare-nuea', 5, 5, 7, 8, 10, 12),
  ('volleyball', 'season-2569-vb', 'palukasamoh', 6, 6, 7, 7, 9, 14),
  ('volleyball', 'season-2569-vb', 'barehtai', 7, 7, 7, 5, 7, 15),
  ('volleyball', 'season-2569-vb', 'bacho-sao', 8, 8, 7, 3, 5, 16);

insert into public.notifications (id, sport, icon, title, body, time_label) values
  ('n1', 'football', 'G', 'ประตู! อบต.บาเราะเหนือไล่มา 2–1', 'เดนิลสันทำประตูในนาทีที่ 68', '1 นาที'),
  ('n2', 'football', 'Y', 'ใบเหลือง', 'สารัชได้รับใบเหลือง นาที 35', '34 นาที'),
  ('n3', 'football', 'L', 'เริ่มครึ่งหลัง', 'การแข่งขันกลับมาเริ่มอีกครั้ง', '23 นาที'),
  ('vn1', 'volleyball', 'P', 'แต้มล่าสุด 18–16', 'อบต.ลุโบะสาวอนำในเซตที่ 4', 'ตอนนี้'),
  ('vn2', 'volleyball', 'T', 'เทศบาลตำบลบาเจาะขอเวลานอก', 'ช่วงเซตที่ 4 คะแนน 17–16', '1 นาที'),
  ('vn3', 'volleyball', 'W', 'จบเซต 3', 'อบต.ลุโบะสาวอชนะ 25–18', '18 นาที');
