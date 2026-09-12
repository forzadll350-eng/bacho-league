-- Swap tonsai ↔ lubosawo positions in Futsal Group A

update public.matches set
  home_team_id = 'lubosawo',
  away_team_id = 'kayoh-mati',
  scheduled_at = '2026-09-21T08:00:00+07:00',
  ends_at = '2026-09-21T08:30:00+07:00',
  period_label = 'รอบที่ 1 · นัดที่ 1',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-a-1';

update public.matches set
  home_team_id = 'tonsai',
  away_team_id = 'bacho-municipal',
  scheduled_at = '2026-09-21T08:35:00+07:00',
  ends_at = '2026-09-21T09:05:00+07:00',
  period_label = 'รอบที่ 1 · นัดที่ 2',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-a-2';

update public.matches set
  home_team_id = 'lubosawo',
  away_team_id = 'tonsai',
  scheduled_at = '2026-09-21T09:30:00+07:00',
  ends_at = '2026-09-21T10:00:00+07:00',
  period_label = 'รอบที่ 2 · นัดที่ 3',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-a-3';

update public.matches set
  home_team_id = 'kayoh-mati',
  away_team_id = 'bacho-municipal',
  scheduled_at = '2026-09-21T10:05:00+07:00',
  ends_at = '2026-09-21T10:35:00+07:00',
  period_label = 'รอบที่ 2 · นัดที่ 4',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-a-4';

update public.matches set
  home_team_id = 'lubosawo',
  away_team_id = 'bacho-municipal',
  scheduled_at = '2026-09-21T11:00:00+07:00',
  ends_at = '2026-09-21T11:30:00+07:00',
  period_label = 'รอบที่ 3 · นัดที่ 5',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-a-5';

update public.matches set
  home_team_id = 'tonsai',
  away_team_id = 'kayoh-mati',
  scheduled_at = '2026-09-21T11:35:00+07:00',
  ends_at = '2026-09-21T12:05:00+07:00',
  period_label = 'รอบที่ 3 · นัดที่ 6',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-a-6';
