-- Seed: 8 อปท. + seasons (คู่แข่ง/ตารางคะแนนอยู่ที่ migration tournament fixtures)

insert into public.teams (id, name_th, name_en, short_name, crest_url, org_th, sort_order) values
  ('lubosawo', 'อบต.ลุโบะสาวอ', 'SAO Lubosawo', 'LS', '/crests/lubosawo.webp', 'อบต.ลุโบะสาวอ', 1),
  ('palukasamoh', 'อบต.ปะลุกาสาเมาะ', 'SAO Palukasamoh', 'PK', '/crests/palukasamoh.webp', 'อบต.ปะลุกาสาเมาะ', 2),
  ('tonsai', 'เทศบาลตำบลต้นไทร', 'Tonsai Municipality', 'TS', '/crests/tonsai.webp', 'เทศบาลตำบลต้นไทร', 3),
  ('barehtai', 'อบต.บาเระใต้', 'SAO Bare Tai', 'BT', '/crests/barehtai.webp', 'อบต.บาเระใต้', 4),
  ('bare-nuea', 'อบต.บาเระเหนือ', 'SAO Bare Nuea', 'BN', '/crests/bare-nuea.webp', 'อบต.บาเระเหนือ', 5),
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

-- Slot labels สำหรับรอบรอง/รอบชิง (ยังไม่รู้ทีมจริง)
insert into public.teams (id, name_th, name_en, short_name, crest_url, org_th, sort_order) values
  ('slot-a1', 'ที่ 1 สาย A', 'Group A #1', 'A1', '/crests/league.webp', 'รอผลสาย', 90),
  ('slot-a2', 'ที่ 2 สาย A', 'Group A #2', 'A2', '/crests/league.webp', 'รอผลสาย', 91),
  ('slot-b1', 'ที่ 1 สาย B', 'Group B #1', 'B1', '/crests/league.webp', 'รอผลสาย', 92),
  ('slot-b2', 'ที่ 2 สาย B', 'Group B #2', 'B2', '/crests/league.webp', 'รอผลสาย', 93),
  ('slot-sf1', 'ผู้ชนะรองฯ 1', 'SF1 Winner', 'SF1', '/crests/league.webp', 'รอผลรองฯ', 94),
  ('slot-sf2', 'ผู้ชนะรองฯ 2', 'SF2 Winner', 'SF2', '/crests/league.webp', 'รอผลรองฯ', 95);
