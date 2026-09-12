-- Reschedule Futsal Group B to official 6-match day plan (21 ก.ย. 2569)
-- นัด 1–4 → พัก 20 นาที → นัด 5–6

update public.matches set
  home_team_id = 'barehtai',
  away_team_id = 'bare-nuea',
  scheduled_at = '2026-09-21T08:00:00+07:00',
  ends_at = '2026-09-21T08:30:00+07:00',
  period_label = 'รอบที่ 1 · นัดที่ 1',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-b-1';

update public.matches set
  home_team_id = 'bacho-sao',
  away_team_id = 'palukasamoh',
  scheduled_at = '2026-09-21T08:35:00+07:00',
  ends_at = '2026-09-21T09:05:00+07:00',
  period_label = 'รอบที่ 1 · นัดที่ 2',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-b-2';

update public.matches set
  home_team_id = 'barehtai',
  away_team_id = 'bacho-sao',
  scheduled_at = '2026-09-21T09:10:00+07:00',
  ends_at = '2026-09-21T09:40:00+07:00',
  period_label = 'รอบที่ 1 · นัดที่ 3',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-b-3';

update public.matches set
  home_team_id = 'bare-nuea',
  away_team_id = 'palukasamoh',
  scheduled_at = '2026-09-21T09:45:00+07:00',
  ends_at = '2026-09-21T10:15:00+07:00',
  period_label = 'รอบที่ 1 · นัดที่ 4',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-b-4';

update public.matches set
  home_team_id = 'barehtai',
  away_team_id = 'palukasamoh',
  scheduled_at = '2026-09-21T10:40:00+07:00',
  ends_at = '2026-09-21T11:10:00+07:00',
  period_label = 'รอบที่ 2 · นัดที่ 5',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-b-5';

update public.matches set
  home_team_id = 'bacho-sao',
  away_team_id = 'bare-nuea',
  scheduled_at = '2026-09-21T11:15:00+07:00',
  ends_at = '2026-09-21T11:45:00+07:00',
  period_label = 'รอบที่ 2 · นัดที่ 6',
  status = 'scheduled',
  home_score = 0,
  away_score = 0
where id = 'fb-b-6';
